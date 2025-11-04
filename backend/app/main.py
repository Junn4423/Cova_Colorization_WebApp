from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2 as cv
from pathlib import Path
import os
from colorizers import eccv16, preprocess_img, postprocess_tens

app = FastAPI(title="Cova Studio API", version="0.1.0")

# CORS (allow any origin by default or read from env)
origins = os.environ.get("CORS_ORIGINS", "*")
allow_all = origins == "*" or origins == "*,*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else [o.strip() for o in origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

colorizer = None

def load_model():
    global colorizer
    colorizer = eccv16(pretrained=True).eval()

def colorize_bgr(bgr: np.ndarray) -> np.ndarray:
    img_rgb = cv.cvtColor(bgr, cv.COLOR_BGR2RGB)
    (tens_l_orig, tens_l_rs) = preprocess_img(img_rgb, HW=(256,256))
    out_ab = colorizer(tens_l_rs)
    out_rgb = postprocess_tens(tens_l_orig, out_ab)
    out_bgr = cv.cvtColor((out_rgb * 255).astype(np.uint8), cv.COLOR_RGB2BGR)
    return out_bgr

@app.on_event("startup")
def _startup():
    load_model()

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/colorize")
async def colorize(file: UploadFile = File(...)):
    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    bgr = cv.imdecode(arr, cv.IMREAD_COLOR)
    if bgr is None:
        return JSONResponse({"error": "Invalid image"}, status_code=400)

    # optional resize to speed up
    max_side = 1024
    h, w = bgr.shape[:2]
    if max(h, w) > max_side:
        ratio = max_side / max(h, w)
        bgr = cv.resize(bgr, (int(w*ratio), int(h*ratio)))

    out = colorize_bgr(bgr)
    ok, buf = cv.imencode(".jpg", out, [int(cv.IMWRITE_JPEG_QUALITY), 92])
    if not ok:
        return JSONResponse({"error": "Encode failed"}, status_code=500)
    return Response(content=buf.tobytes(), media_type="image/jpeg")
