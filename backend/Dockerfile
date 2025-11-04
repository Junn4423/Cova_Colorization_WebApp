FROM python:3.11-slim

# System deps (optional, keep minimal)
RUN apt-get update && apt-get install -y --no-install-recommends     curl  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY download_models.py /app/download_models.py
COPY app /app/app
COPY models /app/models

# Download models on start if missing, then run API
CMD bash -lc "python /app/download_models.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"
