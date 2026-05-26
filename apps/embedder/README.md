# LuxeMatch Embedder

A tiny FastAPI service that turns images and short text into 512-d L2-normalised
OpenCLIP embeddings. LuxeMatch's Hono BFF calls this service for product
indexing and search.

Same model + checkpoint as `Jewellery_AI/backend/models.py`:

- Model: `ViT-B-32`
- Pretrained: `laion2b_s34b_b79k`
- Dim: `512`

## Run locally

```bash
cd apps/embedder
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Optional but recommended in production
export EMBEDDER_API_KEY=$(openssl rand -hex 32)

# Use `python -m uvicorn` (not bare `uvicorn`) so the venv's Python is used
# instead of any pre-existing system uvicorn that may be earlier on PATH.
python -m uvicorn embedder:app --host 0.0.0.0 --port 8001
```

The first run downloads the OpenCLIP weights (~350 MB) to your HuggingFace
cache. Subsequent boots are instant.

## Environment variables

| Var                       | Required | Description                                     |
| ------------------------- | -------- | ----------------------------------------------- |
| `EMBEDDER_API_KEY`        | prod     | Bearer token for all POST endpoints             |
| `EMBEDDER_ALLOWED_ORIGINS`| no       | CSV of allowed origins (default `*`)            |

## Endpoints

```
GET  /health                  → { status, model, dim, device }
POST /embed/image             multipart file → { embedding: number[512] }
POST /embed/image/batch       multipart files → { embeddings: (number[] | null)[] }
POST /embed/text              { text }      → { embedding: number[512] }
POST /embed/hybrid            multipart text + file + optional weight (0..1)
                              → { embedding: number[512] }
```

All POST endpoints require `Authorization: Bearer <EMBEDDER_API_KEY>` when
the key is set.

## Deploying

- **Local dev / single shop**: run with `uvicorn` on the shop device's host
  network or on a small box on the local network. ~150 ms per image embed on
  CPU; under 30 ms with a GPU.
- **Shared cloud**: ship as a Docker container to Railway / Fly / a small
  GPU pod. The LuxeMatch Next.js app reaches it via `EMBEDDER_URL`.

## Quick smoke test

```bash
# Text
curl -X POST http://localhost:8001/embed/text \
  -H "Authorization: Bearer $EMBEDDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"22k gold polki necklace"}' | jq '.dim, .embedding | length'

# Image
curl -X POST http://localhost:8001/embed/image \
  -H "Authorization: Bearer $EMBEDDER_API_KEY" \
  -F "file=@sample.jpg" | jq '.dim, .embedding | length'
```
