# CarPrint Verification AI

A vehicle-inspection prototype for the automotive supply chain. The English interface follows a graphite / teal visual system and connects **Factory → Arrival Terminal → Dealership**.

Live site: https://aka-orcin.vercel.app

## Available today

- `/`: cinematic overview, the supplied videos playing in the order **0 → 1 → 0**, transparent navigation, and clearly labelled concept imagery.
- `/scanner`: upload or mobile camera input, vehicle alias and checkpoint, real server measurements of brightness, sharpness, resolution and SIFT features. Preliminary retake advice. Explicitly save an inspection on this device.
- `/compare`: real SIFT feature matching, ratio filtering, RANSAC verification, local alignment, keypoint evidence, a keyboard-accessible overlay, and JSON export. Load two saved inspections of the same alias in chronological order, or upload photographs directly.
- `/journey`: chronological inspections, photographs, inspector and notes, quality results and SHA-256 hashes. Compare any checkpoint with its preceding inspection.
- `/reports`: saved comparisons, source hashes and measured geometry; full evidence JSON; printable report with browser **Save as PDF** support.
- `/analytics`: counts and preliminary quality-check timings from this browser's actual inspections. Synthetic comparison examples are counted separately.
- `/technology`: implementation, limitations and source links.
- `/business`: a proposed three-month pilot and locally downloadable pilot brief. The form does not send an enquiry; no recipient or CRM is configured.

## Scope and limits

**No trained damage model is connected.** Quality checks and geometric alignment do not identify vehicle parts, confirm vehicle identity, classify damage or establish legal liability. The site states this wherever relevant. No invented accuracy, defect counts, customers, unit economics or benchmark percentages are presented.

Quality thresholds (mean grayscale brightness below 30 / above 230, Laplacian variance below 35, shortest processed dimension below 300 px) are preliminary heuristics, not calibrated quality scores. Images are resized to a maximum dimension of 1200 px before measurement. Parts, ALIKED / LightGlue, damage segmentation, VIN verification, shared accounts and cloud inspection storage remain future work.

Each request returns measured processing latency; this excludes upload, network and cold-start time. Field accuracy, p50/p95 latency, cost per inspection and performance across visually identical vehicles require a representative labelled dataset and a measured pilot. The test suite checks correctness on controlled inputs, not field accuracy.

## Data handling

The browser accepts JPEG, PNG and WebP files up to **2 MiB each** (at most two per comparison). This keeps a two-image multipart request below Vercel's request-size ceiling. The API verifies magic bytes, rejects invalid images and images smaller than 96 × 96, and caps decoding at 20 megapixels.

Images are processed transiently and are not saved by the application server. A saved inspection stores the original file, a preview, notes and results in **IndexedDB on the current device**. There is a 20-inspection limit. The most recent 20 comparison reports are retained. Clear local records removes these browser records, including photos. Browser storage is not an archival or multi-user system. Download reports before clearing data. Use aliases and photographs that you are permitted to process; avoid identifiable faces and registration plates.

There is no global distributed rate limiter in this prototype. Configure the hosting provider's WAF/rate limits before exposing the demo to sustained traffic. Request-size validation and bounded feature extraction do not replace deployment-level abuse controls.

## Local development

Node.js 22+ and Python 3.12 are supported. Create a virtual environment and install the runtime requirements:

```sh
python -m venv .venv
# Windows: .venv/Scripts/python.exe
.venv/bin/python -m pip install -r server/requirements.txt
npm ci
```

Run the backend and frontend in separate terminals:

```sh
.venv/bin/python -m uvicorn server.app:app --host 127.0.0.1 --port 8000
npm run dev:web
```

If port 8000 is occupied, start the backend on another port and set `CARPRINT_API_TARGET` to its origin before launching Vite. For example, in PowerShell:

```powershell
$env:CARPRINT_API_TARGET='http://127.0.0.1:8001'
npm run dev:web
```

## Validation

```sh
npm run build
.venv/bin/python -m pip install pytest httpx
.venv/bin/python -m pytest server/test_app.py -q
npm run test:e2e
```

Playwright expects the frontend on port 5173 and a working API through the Vite proxy. Set `CHROMIUM_PATH` to an installed Chromium/Edge executable when a Playwright browser is not installed. Tests use controlled generated textures or the explicitly synthetic sample; no real customer inspection dataset is bundled.

The suite covers successful and insufficient alignment, identical/unrelated images, corrupt and oversized inputs, measured quality and hashes, two saved checkpoints across a refresh, comparison and report export, analytics and local deletion, English copy and responsive routes, errors and retry, keyboard comparison controls, video looping, reduced motion and media failure.

## Deployment

`vercel.json` keeps the Vite frontend and registers `api/index.py` as the FastAPI ASGI entrypoint. `requirements.txt` includes the existing Python runtime dependencies. API paths are routed to that function; the seven client routes rewrite to the frontend index. Large frontend-only assets and development files are excluded from the Python bundle. The generated marketing illustration is not included in the processing backend; the separate synthetic example asset is included.

For a single-container deployment:

```sh
docker build -t carprint .
docker run --rm -p 8000:8000 carprint
```

FastAPI serves the built frontend and its direct page routes in the container. No API key or external AI service is needed for the current CV pipeline.

## Dependencies, sources and assets

- React, Vite, FastAPI: MIT licences.
- OpenCV 4: Apache 2.0; NumPy: BSD 3-Clause. See installed distributions for full notices.
- Lucide: ISC. Manrope and IBM Plex Mono: SIL Open Font License.
- `public/images/car-studio.png`: existing AI-generated concept image, used to create the disclosed synthetic alignment pair. The second image is an affine/brightness transformation, not an independent inspection.
- `public/images/cobalt-inspection.png`: generated with built-in ImageGen for this redesign. Marketing illustration only. Prompt: “A photorealistic white Chevrolet Cobalt sedan in a dark graphite vehicle inspection bay at a logistics terminal. Three-quarter front view, entire vehicle and wheels clearly visible. Crisp pale bodywork, subtle teal strip lights, realistic industrial environment and soft floor reflection. No people, text, UI labels, licence number or damage.”
- `public/videos/hero-sequence.mp4`: user-supplied `0.MOV`, followed by `1.MOV`; silent H.264, 24 fps, 10.083 seconds, native loop. Labelled **Concept film**. A poster and manual playback support reduced-motion preferences.

The commercial plan is a proposal. No manufacturer is represented as a confirmed customer or partner.
