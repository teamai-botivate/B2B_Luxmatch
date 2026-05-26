"""
LuxeMatch Embedder
==================

FastAPI service exposing 512-d OpenCLIP embeddings for images and text. The
LuxeMatch Hono BFF calls this for product indexing and search; the embedder
is the single source of vectors so the index and queries stay in the same
space.

Model: ViT-B-32 / laion2b_s34b_b79k — identical to Jewellery_AI/backend/models.py.
"""

from __future__ import annotations

import io
import os
from typing import List, Optional

import numpy as np
import open_clip
import torch
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

CLIP_MODEL = "ViT-B-32"
CLIP_PRETRAINED = "laion2b_s34b_b79k"
EMBEDDING_DIM = 512

API_KEY = os.environ.get("EMBEDDER_API_KEY")
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("EMBEDDER_ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
]


# ─────────────────────────────────────────────────────────────────────────────
# Model singleton — loaded once at startup
# ─────────────────────────────────────────────────────────────────────────────

class Embedder:
    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(
            f"[OpenCLIP] Loading {CLIP_MODEL} ({CLIP_PRETRAINED}) on {self.device}…"
        )
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            CLIP_MODEL, pretrained=CLIP_PRETRAINED, device=self.device
        )
        self.model.eval()
        self.tokenizer = open_clip.get_tokenizer(CLIP_MODEL)
        print("[OpenCLIP] Ready.")

    # ── images ────────────────────────────────────────────────────────────
    def _to_tensor(self, raw: bytes) -> torch.Tensor:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        return self.preprocess(image).unsqueeze(0).to(self.device)

    def embed_image(self, raw: bytes) -> np.ndarray:
        tensor = self._to_tensor(raw)
        with torch.no_grad():
            features = self.model.encode_image(tensor)
        vec = features.cpu().numpy().flatten().astype(np.float32)
        return _l2_normalize(vec)

    def embed_image_batch(self, raws: List[bytes]) -> List[Optional[np.ndarray]]:
        """Returns one slot per input. None for images that fail to decode."""
        tensors: List[torch.Tensor] = []
        valid_indices: List[int] = []
        out: List[Optional[np.ndarray]] = [None] * len(raws)

        for i, raw in enumerate(raws):
            try:
                tensors.append(self._to_tensor(raw))
                valid_indices.append(i)
            except Exception as exc:
                print(f"[OpenCLIP] Skipping image {i}: {exc}")

        if not tensors:
            return out

        batch = torch.cat(tensors, dim=0)
        with torch.no_grad():
            features = self.model.encode_image(batch)
        embeddings = features.cpu().numpy().astype(np.float32)
        for j, orig_idx in enumerate(valid_indices):
            out[orig_idx] = _l2_normalize(embeddings[j])
        return out

    # ── text ──────────────────────────────────────────────────────────────
    def embed_text(self, text: str) -> np.ndarray:
        tokens = self.tokenizer([text]).to(self.device)
        with torch.no_grad():
            features = self.model.encode_text(tokens)
        vec = features.cpu().numpy().flatten().astype(np.float32)
        return _l2_normalize(vec)


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    return vec / (norm + 1e-10)


embedder = Embedder()


# ─────────────────────────────────────────────────────────────────────────────
# Auth dependency
# ─────────────────────────────────────────────────────────────────────────────

def require_api_key(authorization: Optional[str] = Header(default=None)) -> None:
    if not API_KEY:
        # If no key configured, run open — convenient for local dev.
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if authorization.removeprefix("Bearer ") != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid bearer token")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LuxeMatch Embedder",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    model: str
    pretrained: str
    dim: int
    device: str


class EmbedResponse(BaseModel):
    dim: int = Field(default=EMBEDDING_DIM)
    embedding: List[float]


class BatchEmbedResponse(BaseModel):
    dim: int = Field(default=EMBEDDING_DIM)
    embeddings: List[Optional[List[float]]]


class TextBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model=CLIP_MODEL,
        pretrained=CLIP_PRETRAINED,
        dim=EMBEDDING_DIM,
        device=embedder.device,
    )


@app.post("/embed/image", response_model=EmbedResponse, dependencies=[Depends(require_api_key)])
async def embed_image(file: UploadFile = File(...)) -> EmbedResponse:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        vec = embedder.embed_image(raw)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot decode image: {exc}")
    return EmbedResponse(embedding=vec.tolist())


@app.post(
    "/embed/image/batch",
    response_model=BatchEmbedResponse,
    dependencies=[Depends(require_api_key)],
)
async def embed_image_batch(files: List[UploadFile] = File(...)) -> BatchEmbedResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    raws = [await f.read() for f in files]
    vectors = embedder.embed_image_batch(raws)
    serialised = [vec.tolist() if vec is not None else None for vec in vectors]
    return BatchEmbedResponse(embeddings=serialised)


@app.post("/embed/text", response_model=EmbedResponse, dependencies=[Depends(require_api_key)])
def embed_text(body: TextBody) -> EmbedResponse:
    vec = embedder.embed_text(body.text)
    return EmbedResponse(embedding=vec.tolist())


@app.post("/embed/hybrid", response_model=EmbedResponse, dependencies=[Depends(require_api_key)])
async def embed_hybrid(
    text: Optional[str] = Form(default=None),
    weight: float = Form(default=0.5),
    file: Optional[UploadFile] = File(default=None),
) -> EmbedResponse:
    """
    Hybrid embedding: weighted average of text + image vectors, re-normalised.
    weight = 0.0 → image only. weight = 1.0 → text only. Default 0.5.
    """
    if text is None and file is None:
        raise HTTPException(status_code=400, detail="Provide text, file, or both")
    if weight < 0 or weight > 1:
        raise HTTPException(status_code=400, detail="weight must be in [0, 1]")

    text_vec: Optional[np.ndarray] = None
    image_vec: Optional[np.ndarray] = None

    if text:
        text_vec = embedder.embed_text(text)
    if file is not None:
        raw = await file.read()
        if raw:
            try:
                image_vec = embedder.embed_image(raw)
            except Exception as exc:
                raise HTTPException(
                    status_code=422, detail=f"Cannot decode image: {exc}"
                )

    if text_vec is not None and image_vec is not None:
        combined = weight * text_vec + (1.0 - weight) * image_vec
        vec = _l2_normalize(combined)
    elif text_vec is not None:
        vec = text_vec
    else:
        assert image_vec is not None
        vec = image_vec

    return EmbedResponse(embedding=vec.tolist())
