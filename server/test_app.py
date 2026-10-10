import cv2
import numpy as np
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)


def encoded(image):
    return cv2.imencode('.png', image)[1].tobytes()


def pair(first, second):
    return client.post('/api/compare', files={
        'reference': ('reference.png', first, 'image/png'),
        'current': ('current.png', second, 'image/png'),
    })


def texture(seed=12):
    rng = np.random.default_rng(seed)
    image = np.full((480, 640, 3), 120, dtype=np.uint8)
    for _ in range(120):
        point = tuple(int(n) for n in rng.integers([0, 0], [640, 480]))
        color = tuple(int(n) for n in rng.integers(20, 240, 3))
        cv2.circle(image, point, int(rng.integers(3, 18)), color, -1)
    return image


def test_known_geometric_transform_produces_explainable_evidence():
    image = texture()
    transform = cv2.getRotationMatrix2D((320, 240), 5, .94)
    transformed = cv2.warpAffine(image, transform, (640, 480))
    response = pair(encoded(image), encoded(transformed))
    assert response.status_code == 200
    result = response.json()
    assert result['geometry'] == 'MATCHED'
    assert result['decision'] == 'REVIEW'  # No unsupported physical-identity claim.
    assert result['inliers'] > 30
    assert result['reprojection_error_px'] < 2
    assert result['aligned_image'].startswith('data:image/jpeg;base64,')
    assert result['sha256'][0] != result['sha256'][1]


def test_unrelated_images_do_not_get_identity_confirmation():
    result = pair(encoded(texture(11)), encoded(texture(907))).json()
    assert result['geometry'] == 'INSUFFICIENT'
    assert result['decision'] == 'REVIEW'
    assert result['aligned_image'] is None


def test_blank_image_requests_better_evidence():
    blank = encoded(np.zeros((256, 256, 3), dtype=np.uint8))
    response = pair(blank, blank)
    assert response.status_code == 200
    result = response.json()
    assert result['inliers'] == 0
    assert result['geometry'] == 'INSUFFICIENT'
    assert any('same file' in warning for warning in result['warnings'])
    assert any('too dark' in warning for warning in result['warnings'])


def test_non_image_and_corrupt_files_are_rejected():
    image = encoded(texture())
    assert pair(b'<script>not-an-image</script>', image).status_code == 415
    assert pair(b'\x89PNG\r\n\x1a\ncorrupt', image).status_code == 422


def test_oversized_upload_and_tiny_image_are_rejected():
    image = encoded(texture())
    assert pair(b'x' * (8 * 1024 * 1024 + 1), image).status_code == 413
    assert pair(encoded(np.zeros((20, 20, 3), dtype=np.uint8)), image).status_code == 422


def test_missing_upload_is_rejected():
    assert client.post('/api/compare').status_code == 422


def test_disclosed_example_is_processed_by_real_pipeline():
    original = client.get('/api/example/reference')
    current = client.get('/api/example/current')
    assert original.status_code == current.status_code == 200
    assert original.content != current.content
    result = pair(original.content, current.content).json()
    assert result['geometry'] == 'MATCHED'
    assert result['inliers'] > 30
    assert result['elapsed_ms'] > 0


def test_health_and_unknown_example():
    assert client.get('/api/health').json()['status'] == 'ok'
    assert client.get('/api/example/unknown').status_code == 404


def test_presets_list_and_scenario_images():
    response = client.get('/api/presets')
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 4
    preset_ids = [p['id'] for p in presets]
    assert 'service-intake' in preset_ids
    assert 'cobalt-negative' in preset_ids

    # Test fetching preset images
    ref = client.get('/api/presets/service-intake/reference')
    cur = client.get('/api/presets/service-intake/current')
    assert ref.status_code == 200 and cur.status_code == 200
    assert ref.headers['content-type'] == 'image/jpeg'

    # Run analysis on the service-intake preset
    result = pair(ref.content, cur.content).json()
    assert result['geometry'] == 'MATCHED'
    assert 'quality_gate' in result
    assert result['quality_gate']['overall'] in ('PASS', 'WARNING')
    assert 'distinctiveness' in result
    assert 'damage_timeline' in result

