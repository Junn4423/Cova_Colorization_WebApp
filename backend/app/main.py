from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2 as cv
import os
from colorizers import eccv16, preprocess_img, postprocess_tens
from typing import Optional

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

def enhance_quality(image: np.ndarray) -> np.ndarray:
    """Apply lightweight detail enhancement for high quality mode."""
    lab = cv.cvtColor(image, cv.COLOR_BGR2LAB)
    l, a, b = cv.split(lab)
    clahe = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv.merge((l, a, b))
    enhanced = cv.cvtColor(lab, cv.COLOR_LAB2BGR)
    blurred = cv.GaussianBlur(enhanced, (0, 0), 1.0)
    sharpened = cv.addWeighted(enhanced, 1.4, blurred, -0.4, 0)
    return sharpened

def apply_color_variation(image: np.ndarray) -> np.ndarray:
    """Inject subtle randomness so identical inputs can receive different styles."""
    rng = np.random.default_rng()

    lab = cv.cvtColor(image, cv.COLOR_BGR2LAB).astype(np.float32)
    l, a, b = cv.split(lab)

    lightness_gain = rng.uniform(0.96, 1.06)
    lightness_shift = rng.uniform(-6, 6)
    l = np.clip(l * lightness_gain + lightness_shift, 0, 255)

    centered_a = a - 128.0
    centered_b = b - 128.0
    saturation_scale = rng.uniform(0.88, 1.25)
    hue_rotation = rng.normal(0.0, 9.0)
    hue_balance = rng.normal(0.0, 9.0)

    centered_a = np.clip(centered_a * saturation_scale + hue_rotation, -128, 127)
    centered_b = np.clip(centered_b * saturation_scale + hue_balance, -128, 127)

    varied_lab = cv.merge((l, centered_a + 128.0, centered_b + 128.0))
    varied_bgr = cv.cvtColor(varied_lab.astype(np.uint8), cv.COLOR_LAB2BGR)

    hsv = cv.cvtColor(varied_bgr, cv.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + rng.uniform(-10, 10)) % 180.0
    hsv[..., 1] = np.clip(hsv[..., 1] * rng.uniform(0.9, 1.2), 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * rng.uniform(0.92, 1.08) + rng.uniform(-12, 12), 0, 255)

    return cv.cvtColor(hsv.astype(np.uint8), cv.COLOR_HSV2BGR)

def clamp_dimension(dim: Optional[int]) -> Optional[int]:
    if dim is None:
        return None
    if dim <= 0:
        return None
    return int(min(dim, 4096))

def resize_image(image: np.ndarray, target_width: Optional[int], target_height: Optional[int]) -> np.ndarray:
    if target_width is None and target_height is None:
        return image

    h, w = image.shape[:2]
    new_w, new_h = w, h

    if target_width is not None and target_height is not None:
        new_w, new_h = target_width, target_height
    elif target_width is not None:
        ratio = target_width / w
        new_w = target_width
        new_h = max(1, int(round(h * ratio)))
    elif target_height is not None:
        ratio = target_height / h
        new_h = target_height
        new_w = max(1, int(round(w * ratio)))

    interpolation = cv.INTER_AREA if new_w < w or new_h < h else cv.INTER_CUBIC
    return cv.resize(image, (new_w, new_h), interpolation=interpolation)

@app.on_event("startup")
def _startup():
    load_model()

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/colorize")
async def colorize(
    file: UploadFile = File(...),
    high_quality: bool = Form(False),
    output_width: Optional[int] = Form(None),
    output_height: Optional[int] = Form(None),
):
    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    bgr = cv.imdecode(arr, cv.IMREAD_COLOR)
    if bgr is None:
        return JSONResponse({"error": "Invalid image"}, status_code=400)

    # optional resize to speed up
    max_side = 1600 if high_quality else 1024
    h, w = bgr.shape[:2]
    if max(h, w) > max_side:
        ratio = max_side / max(h, w)
        bgr = cv.resize(bgr, (int(w*ratio), int(h*ratio)))

    out = colorize_bgr(bgr)
    out = apply_color_variation(out)
    if high_quality:
        out = enhance_quality(out)

    output_width = clamp_dimension(output_width)
    output_height = clamp_dimension(output_height)
    out = resize_image(out, output_width, output_height)

    quality = 96 if high_quality else 92
    ok, buf = cv.imencode(".jpg", out, [int(cv.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        return JSONResponse({"error": "Encode failed"}, status_code=500)
    return Response(content=buf.tobytes(), media_type="image/jpeg")
