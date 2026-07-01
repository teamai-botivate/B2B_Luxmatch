---
title: LuxeMatch Embedder
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# LuxeMatch Embedder

OpenCLIP ViT-B-32 embedding API for LuxeMatch image, text, and hybrid search.

Create a Hugging Face Space with the Docker SDK, then upload every file from
this directory to the root of the Space repository.

Optional Space secrets:

- `EMBEDDER_API_KEY`: bearer token required by embedding routes.
- `EMBEDDER_ALLOWED_ORIGINS`: comma-separated web origins.

After the Space reports `Running`, verify:

```text
https://<owner>-<space-name>.hf.space/health
```

Then configure the LuxeMatch web service:

```env
EMBEDDER_URL=https://<owner>-<space-name>.hf.space
EMBEDDER_API_KEY=<same value as the Space secret>
```

The first startup downloads the OpenCLIP weights and can take several minutes.
