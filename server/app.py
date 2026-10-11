"""Local, explainable image registration. No physical-identity classifier is claimed."""
import os
os.environ.setdefault('OPENCV_IO_MAX_IMAGE_PIXELS', '20000000')

import base64
import hashlib
import time
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[1]
app = FastAPI(title='CarPrint Geometry API', version='0.1.0')
cv2.setNumThreads(2)
MAX_BYTES = 2 * 1024 * 1024


def jpeg(image):
    ok, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        raise HTTPException(500, 'Could not prepare the image.')
    return encoded.tobytes()


def data_url(image):
    return 'data:image/jpeg;base64,' + base64.b64encode(jpeg(image)).decode()


def decode(data):
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(413, 'Each image must be between 1 byte and 2 MB.')
    # Only JPEG, PNG and WebP are supported; SVG and arbitrary files are rejected.
    if not (data.startswith(b'\xff\xd8\xff') or data.startswith(b'\x89PNG\r\n\x1a\n') or (data.startswith(b'RIFF') and data[8:12] == b'WEBP')):
        raise HTTPException(415, 'Supported image formats are JPG, PNG and WebP.')
    try:
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    except cv2.error:
        image = None
    if image is None:
        raise HTTPException(422, 'Could not read the image. Please try a different file.')
    h, w = image.shape[:2]
    if min(h, w) < 96:
        raise HTTPException(422, 'The image is too small. Use at least 96 × 96 pixels.')
    if max(h, w) > 1200:
        scale = 1200 / max(h, w)
        image = cv2.resize(image, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    return image


def quality(gray):
    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return {'brightness': round(brightness, 1), 'sharpness': round(sharpness, 1),
            'width': gray.shape[1], 'height': gray.shape[0]}


def analyze(reference_bytes, current_bytes):
    started = time.perf_counter()
    images = [decode(reference_bytes), decode(current_bytes)]
    gray = [cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) for im in images]
    qualities = [quality(g) for g in gray]
    sift = cv2.SIFT_create(nfeatures=2500)
    (kp1, des1), (kp2, des2) = [sift.detectAndCompute(g, None) for g in gray]
    good = []
    if des1 is not None and des2 is not None and len(des2) >= 2:
        pairs = cv2.BFMatcher().knnMatch(des1, des2, k=2)
        good = [p[0] for p in pairs if len(p) == 2 and p[0].distance < .72 * p[1].distance]
        # Enforce unique target features before estimating geometry.
        unique = {}
        for m in sorted(good, key=lambda m: m.distance):
            unique.setdefault(m.trainIdx, m)
        good = list(unique.values())
    inliers = []
    error = None
    coverage = 0.0
    transform = None
    if len(good) >= 4:
        p1 = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        p2 = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        transform, mask = cv2.findHomography(p2, p1, cv2.RANSAC, 4.0)
        if transform is not None and mask is not None and np.isfinite(transform).all():
            selected = mask.ravel().astype(bool)
            inliers = [m for m, use in zip(good, selected) if use]
            if selected.any():
                projected = cv2.perspectiveTransform(p2[selected], transform)
                error = round(float(np.median(np.linalg.norm(projected - p1[selected], axis=2))), 2)
                hull = cv2.convexHull(p1[selected])
                coverage = round(float(cv2.contourArea(hull) / (gray[0].size) * 100), 1)
        else:
            transform = None
    reliable = len(inliers) >= 12 and coverage >= 2 and error is not None and error <= 4
    warnings = ['Matching geometry does not confirm vehicle identity: mass-produced parts can look alike.']
    if reference_bytes == current_bytes:
        warnings.append('The same file was uploaded twice. This tests the algorithm, not an independent follow-up inspection.')
    if any(q['brightness'] < 30 or q['brightness'] > 230 for q in qualities):
        warnings.append('One photo is too dark or too bright. Retake it under even lighting.')
    if any(q['sharpness'] < 35 for q in qualities):
        warnings.append('There is limited texture or sharpness. Capture distinctive details more closely; the quality threshold is preliminary.')
    if not reliable:
        warnings.append('Not enough stable matches. Photograph the same detail from a similar angle.')
    shown = sorted(inliers, key=lambda m: m.distance)[:45]
    visualization = cv2.drawMatches(images[0], kp1, images[1], kp2, shown, None,
        matchColor=(107, 246, 193), singlePointColor=(150, 150, 150),
        flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
    aligned = None
    if reliable and transform is not None:
        aligned = cv2.warpPerspective(images[1], transform, (images[0].shape[1], images[0].shape[0]))
    return {
        'decision': 'REVIEW', 'geometry': 'MATCHED' if reliable else 'INSUFFICIENT',
        'message': 'Geometric alignment found' if reliable else 'Not enough visual evidence',
        'keypoints': [len(kp1), len(kp2)], 'candidate_matches': len(good), 'inliers': len(inliers),
        'reprojection_error_px': error, 'coverage_percent': coverage, 'quality': qualities,
        'warnings': warnings, 'algorithm': 'SIFT + ratio test (0.72) + RANSAC (4 px)',
        'algorithm_version': 'carprint-geometry-0.1.0',
        'sha256': [hashlib.sha256(b).hexdigest() for b in (reference_bytes, current_bytes)],
        'evidence_image': data_url(visualization), 'reference_image': data_url(images[0]),
        'aligned_image': data_url(aligned) if aligned is not None else None,
        'elapsed_ms': round((time.perf_counter() - started) * 1000),
        'limitations': 'Does not detect damage, provide a calibrated SAME/DIFFERENT classification or offer a legal assessment. Final review must be performed by a specialist.',
    }


@app.get('/api/health')
def health():
    return {'status': 'ok', 'algorithm': 'SIFT + RANSAC', 'version': '0.1.0'}


@app.post('/api/compare')
def compare(reference: UploadFile = File(...), current: UploadFile = File(...)):
    return analyze(reference.file.read(MAX_BYTES + 1), current.file.read(MAX_BYTES + 1))


@app.post('/api/inspect')
def inspect(photo: UploadFile = File(...)):
    """Real preliminary quality measurements; no damage or identity classification."""
    started = time.perf_counter()
    raw = photo.file.read(MAX_BYTES + 1)
    image = decode(raw)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    metrics = quality(gray)
    points = cv2.SIFT_create(nfeatures=2500).detect(gray, None)
    warnings = []
    if metrics['brightness'] < 30 or metrics['brightness'] > 230:
        warnings.append('The photograph is too dark or too bright. Retake under even lighting.')
    if metrics['sharpness'] < 35:
        warnings.append('Limited texture or sharpness. Move closer to a distinctive detail and keep the camera steady.')
    if min(gray.shape) < 300:
        warnings.append('Low resolution. A photograph of at least 300 pixels on each side is recommended.')
    return {
        'status': 'RETAKE' if warnings else 'READY', 'quality': metrics,
        'keypoints': len(points), 'warnings': warnings, 'preview': data_url(image),
        'sha256': hashlib.sha256(raw).hexdigest(),
        'elapsed_ms': round((time.perf_counter() - started) * 1000),
        'algorithm_version': 'carprint-quality-0.1.0',
    }


@app.get('/api/example/{view}')
def example(view: str):
    if view not in ('reference', 'current'):
        raise HTTPException(404, 'Photo not found.')
    image = cv2.imread(str(ROOT / 'public/images/car-studio.png'))
    if image is None:
        raise HTTPException(503, 'Sample images are unavailable.')
    # Synthetic, disclosed pair; never presented as independently captured vehicle data.
    image = image[300:850, 350:1500]
    if view == 'current':
        h, w = image.shape[:2]
        matrix = cv2.getRotationMatrix2D((w / 2, h / 2), 3, .96)
        image = cv2.warpAffine(image, matrix, (w, h), borderMode=cv2.BORDER_REFLECT)
        image = cv2.convertScaleAbs(image, alpha=.92, beta=8)
    return Response(jpeg(image), media_type='image/jpeg', headers={'Cache-Control': 'public, max-age=3600'})


if (ROOT / 'dist').exists():
    def frontend_page():
        return FileResponse(ROOT / 'dist/index.html')

    for page in ('scanner', 'compare', 'journey', 'reports', 'analytics', 'technology', 'business'):
        app.add_api_route('/' + page, frontend_page, methods=['GET'], include_in_schema=False)

    app.mount('/', StaticFiles(directory=ROOT / 'dist', html=True), name='frontend')
