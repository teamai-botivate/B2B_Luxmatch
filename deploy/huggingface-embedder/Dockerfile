# syntax=docker/dockerfile:1.7

FROM python:3.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    HF_HOME=/data/.huggingface

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN python -m pip install --upgrade pip \
    && python -m pip install --index-url https://download.pytorch.org/whl/cpu \
       torch==2.5.1 torchvision==0.20.1 \
    && python -m pip install -r requirements.txt

COPY embedder.py ./

EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
    CMD curl --fail http://localhost:7860/health || exit 1

CMD ["sh", "-c", "python -m uvicorn embedder:app --host 0.0.0.0 --port ${PORT:-7860}"]
