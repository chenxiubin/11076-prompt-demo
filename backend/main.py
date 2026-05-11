from __future__ import annotations

import io
import json
import math
import os
import base64
from pathlib import Path
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import cv2
import numpy as np
import requests
from alibabacloud_imageseg20191230 import models as imageseg_models
from alibabacloud_imageseg20191230.client import Client as ImagesegClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_tea_util import models as util_models
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageOps

try:
    import torch
    from torchvision import transforms
    from transformers import AutoModelForImageSegmentation
except ImportError:
    torch = None
    transforms = None
    AutoModelForImageSegmentation = None

try:
    from rembg import new_session, remove
except ImportError:
    new_session = None
    remove = None

load_dotenv(Path(__file__).with_name(".env"))

Aspect = Literal["1:1", "4:3", "3:4", "9:16"]
Material = Literal[
    "general",
    "giftbox_packaging",
    "newyear_goods",
    "giftbox_display",
    "stationery",
    "giftbox",
    "metal",
    "leather",
    "glass",
    "fabric",
    "food",
]
Engine = Literal["aliyun", "gemini", "qwen"]
Mode = Literal["standard", "quality", "hd"]


@dataclass(frozen=True)
class AspectSpec:
    width: int
    height: int
    fill: float
    center_y: float


ASPECTS: dict[str, AspectSpec] = {
    "1:1": AspectSpec(4096, 4096, 0.78, 0.50),
    "4:3": AspectSpec(4096, 3072, 0.82, 0.50),
    "3:4": AspectSpec(3072, 4096, 0.80, 0.48),
    "9:16": AspectSpec(2304, 4096, 0.76, 0.46),
}

MATERIAL_LABELS: dict[str, str] = {
    "giftbox": "礼盒",
    "metal": "金属",
    "leather": "皮革",
    "glass": "玻璃",
    "fabric": "布料",
    "food": "食品",
    "general": "通用",
}

MODE_TO_ENGINE: dict[str, str] = {
    "standard": "aliyun",
    "quality": "qwen",
    "hd": "gemini",
}

app = FastAPI(title="E-commerce White Background Retouch API", version="1.0.0")
_rembg_session = None
_birefnet_model = None
_birefnet_device = None
_aliyun_client = None

BIREFNET_MODEL_ID = "ZhengPeng7/BiRefNet_HR-matting"
BIREFNET_IMAGE_SIZE = (2048, 2048)
BIREFNET_CPU_IMAGE_SIZE = (1536, 1536)
ALIYUN_IMAGESEG_ENDPOINT = os.getenv("ALIYUN_IMAGESEG_ENDPOINT", "imageseg.cn-shanghai.aliyuncs.com")
ALIYUN_MAX_IMAGE_SIZE = 3 * 1024 * 1024
ALIYUN_MAX_SIDE = 1999
ALIYUN_RETURN_FORM = os.getenv("ALIYUN_RETURN_FORM", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image-preview").strip()
GEMINI_API_BASE = os.getenv("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
GEMINI_PREVIEW_MAX_SIDE = 1280
GEMINI_FINAL_MAX_SIDE = 3072
QWEN_API_KEY = os.getenv("QWEN_API_KEY", os.getenv("DASHSCOPE_API_KEY", "")).strip()
QWEN_IMAGE_MODEL = os.getenv("QWEN_IMAGE_MODEL", "qwen-image-2.0-pro").strip()
QWEN_API_URL = os.getenv(
    "QWEN_API_URL",
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
).strip()
QWEN_PREVIEW_MAX_SIDE = 1280
QWEN_FINAL_MAX_SIDE = 1664

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    aspect: Aspect = Form("1:1"),
    material: Material = Form("general"),
    mode: str | None = Form(None),
    engine: str | None = Form(None),
    preserve_text_logo: bool = Form(False),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_w: int = Form(0),
    crop_h: int = Form(0),
) -> Response:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Please upload one image.")

    spec = ASPECTS[aspect]
    actual_mode = normalize_mode(mode, engine)
    actual_engine = engine_for_mode(actual_mode)
    try:
        output = retouch_image(
            raw,
            spec,
            material,
            actual_mode,
            aspect,
            (crop_x, crop_y, crop_w, crop_h),
            preserve_text_logo=preserve_text_logo,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{file.filename or 'image'} could not be processed: {exc}",
        ) from exc

    stem = safe_stem(file.filename or "image")
    filename = f"{stem}-{aspect.replace(':', 'x')}-{material}-{actual_mode}.png"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Actual-Mode": actual_mode,
        "X-Actual-Engine": actual_engine,
    }
    return Response(content=output, media_type="image/png", headers=headers)


@app.post("/api/preview")
async def preview_image(
    file: UploadFile = File(...),
    aspect: Aspect = Form("1:1"),
    material: Material = Form("general"),
    mode: str | None = Form(None),
    engine: str | None = Form(None),
    preserve_text_logo: bool = Form(False),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_w: int = Form(0),
    crop_h: int = Form(0),
) -> Response:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Please upload one image for preview.")

    actual_mode = normalize_mode(mode, engine)
    actual_engine = engine_for_mode(actual_mode)
    try:
        output = build_preview_image(
            raw,
            material,
            actual_mode,
            aspect,
            (crop_x, crop_y, crop_w, crop_h),
            preserve_text_logo=preserve_text_logo,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Preview could not be generated: {exc}") from exc

    headers = {"X-Actual-Mode": actual_mode, "X-Actual-Engine": actual_engine}
    return Response(content=output, media_type="image/png", headers=headers)


def retouch_image(
    raw: bytes,
    spec: AspectSpec,
    material: str,
    mode: str,
    aspect: str,
    crop_box: tuple[int, int, int, int],
    preserve_text_logo: bool = False,
) -> bytes:
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image).convert("RGBA")
    crop = crop_image(image, crop_box)
    if mode == "standard":
        cutout = segment_with_aliyun_preserve_pixels(crop)
        return image_to_png_bytes(compose_cutout_on_white_preserve(cutout))
    elif mode == "quality":
        generated = qwen_retouch_product(crop, aspect, material, preview=False)
        return image_to_png_bytes(generated)
    else:
        generated = gemini_retouch_product(crop, aspect, material, preview=False)
        return image_to_png_bytes(generated)


def build_preview_image(
    raw: bytes,
    material: str,
    mode: str,
    aspect: str,
    crop_box: tuple[int, int, int, int],
    preserve_text_logo: bool = False,
) -> bytes:
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image).convert("RGBA")
    crop = crop_image(image, crop_box)
    if mode == "standard":
        cutout = segment_with_aliyun_preserve_pixels(crop)
        return image_to_png_bytes(compose_cutout_on_white_preserve(cutout))
    elif mode == "quality":
        generated = qwen_retouch_product(crop, aspect, material, preview=False)
        return image_to_png_bytes(generated)
    else:
        generated = gemini_retouch_product(crop, aspect, material, preview=False)
        return image_to_png_bytes(generated)


def remove_background(image: Image.Image, engine: str) -> Image.Image:
    if engine == "aliyun":
        return aliyun_segment_commodity(image)
    return birefnet_remove(image)


def normalize_mode(mode: str | None, engine: str | None) -> str:
    if mode in MODE_TO_ENGINE:
        return mode
    if engine in {"gemini", "qwen"}:
        return "quality"
    if engine in {None, "", "aliyun"}:
        return "standard"
    raise RuntimeError(f"Unsupported retouch mode or engine: mode={mode!r}, engine={engine!r}")


def engine_for_mode(mode: str) -> str:
    try:
        return MODE_TO_ENGINE[mode]
    except KeyError as exc:
        raise RuntimeError(f"Unsupported retouch mode: {mode}") from exc


def birefnet_remove(image: Image.Image) -> Image.Image:
    model, device = get_birefnet_model()
    rgb = image.convert("RGB")
    original_size = rgb.size
    image_size = BIREFNET_IMAGE_SIZE if device.type == "cuda" else BIREFNET_CPU_IMAGE_SIZE
    transform_image = transforms.Compose(
        [
            transforms.Resize(image_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    input_tensor = transform_image(rgb).unsqueeze(0).to(device)
    if device.type == "cuda":
        input_tensor = input_tensor.half()

    with torch.inference_mode():
        outputs = model(input_tensor)
        pred = extract_birefnet_prediction(outputs)

    mask = transforms.ToPILImage()(pred)
    mask = mask.resize(original_size, Image.Resampling.LANCZOS)
    rgba = rgb.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def get_birefnet_model():
    global _birefnet_model, _birefnet_device
    if torch is None or AutoModelForImageSegmentation is None:
        raise RuntimeError("Local BiRefNet engine is not installed. Use the aliyun, qwen, or gemini engine.")
    if _birefnet_model is not None and _birefnet_device is not None:
        return _birefnet_model, _birefnet_device

    torch.set_float32_matmul_precision("high")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AutoModelForImageSegmentation.from_pretrained(
        BIREFNET_MODEL_ID,
        trust_remote_code=True,
    )
    model.to(device)
    model.eval()
    if device.type == "cuda":
        model.half()

    _birefnet_model = model
    _birefnet_device = device
    return _birefnet_model, _birefnet_device


def extract_birefnet_prediction(outputs) -> torch.Tensor:
    if isinstance(outputs, (tuple, list)):
        pred = outputs[-1]
    elif hasattr(outputs, "logits"):
        pred = outputs.logits
    else:
        pred = outputs

    if isinstance(pred, (tuple, list)):
        pred = pred[-1]

    pred = pred[0].sigmoid().float().cpu()
    if pred.ndim == 3:
        pred = pred.squeeze(0)
    return pred


def get_rembg_session():
    global _rembg_session
    if new_session is None:
        raise RuntimeError("rembg is not installed in this deployment.")
    if _rembg_session is None:
        _rembg_session = new_session("isnet-general-use")
    return _rembg_session


def get_aliyun_client() -> ImagesegClient:
    global _aliyun_client
    if _aliyun_client is not None:
        return _aliyun_client

    access_key_id = os.getenv("ALIYUN_ACCESS_KEY_ID")
    access_key_secret = os.getenv("ALIYUN_ACCESS_KEY_SECRET")
    if not access_key_id or not access_key_secret:
        raise RuntimeError("Aliyun engine requires ALIYUN_ACCESS_KEY_ID and ALIYUN_ACCESS_KEY_SECRET.")

    config = open_api_models.Config(
        access_key_id=access_key_id,
        access_key_secret=access_key_secret,
        endpoint=ALIYUN_IMAGESEG_ENDPOINT,
    )
    _aliyun_client = ImagesegClient(config)
    return _aliyun_client


def crop_image(image: Image.Image, crop_box: tuple[int, int, int, int]) -> Image.Image:
    width, height = image.size
    x, y, w, h = crop_box
    if w <= 0 or h <= 0:
        return image.copy()
    w = max(1, int(round(w)))
    h = max(1, int(round(h)))
    x = int(round(x))
    y = int(round(y))

    canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    overlap_left = max(0, x)
    overlap_top = max(0, y)
    overlap_right = min(width, x + w)
    overlap_bottom = min(height, y + h)

    if overlap_right <= overlap_left or overlap_bottom <= overlap_top:
        return canvas

    cropped = image.crop((overlap_left, overlap_top, overlap_right, overlap_bottom))
    paste_x = overlap_left - x
    paste_y = overlap_top - y
    canvas.paste(cropped, (paste_x, paste_y), cropped if cropped.mode == "RGBA" else None)
    return canvas


def segment_with_aliyun_pipeline(image: Image.Image) -> Image.Image:
    cutout, prepared_source = aliyun_segment_commodity(image)
    cutout = suppress_background_residue(cutout, prepared_source)
    if cutout.size != image.size:
        cutout = cutout.resize(image.size, Image.Resampling.LANCZOS)
    return cutout


def segment_with_aliyun_preserve_pixels(image: Image.Image) -> Image.Image:
    cutout, prepared_source = aliyun_segment_commodity(image)
    cutout = suppress_background_residue(cutout, prepared_source)
    alpha = cutout.getchannel("A")
    if alpha.size != image.size:
        alpha = alpha.resize(image.size, Image.Resampling.LANCZOS)
    preserved = image.convert("RGBA")
    preserved.putalpha(alpha)
    return preserved


def compose_cutout_on_white_preserve(rgba: Image.Image) -> Image.Image:
    rgba = rgba.convert("RGBA")
    canvas = Image.new("RGB", rgba.size, "white")
    canvas.paste(rgba.convert("RGB"), (0, 0), rgba.getchannel("A"))
    return canvas


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def gemini_retouch_product(image: Image.Image, aspect: str, material: str, preview: bool) -> Image.Image:
    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini line requires GEMINI_API_KEY in backend/.env.")

    prepared_bytes, mime_type = prepare_gemini_input(image, preview)
    base64_image = base64.b64encode(prepared_bytes).decode("utf-8")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": build_gemini_product_prompt(material, preview)},
                    {"inline_data": {"mime_type": mime_type, "data": base64_image}},
                ]
            }
        ],
        "generationConfig": build_gemini_generation_config(aspect, preview),
    }

    url = f"{GEMINI_API_BASE}/models/{GEMINI_IMAGE_MODEL}:generateContent"
    response = requests.post(
        url,
        headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=(20, 180),
    )
    if not response.ok:
        raise RuntimeError(format_gemini_error(response))
    result = response.json()
    generated_bytes = extract_gemini_image_bytes(result)
    return Image.open(io.BytesIO(generated_bytes)).convert("RGBA")


def qwen_retouch_product(image: Image.Image, aspect: str, material: str, preview: bool) -> Image.Image:
    if not QWEN_API_KEY:
        raise RuntimeError("Qwen quality line requires QWEN_API_KEY or DASHSCOPE_API_KEY in backend/.env.")

    prepared_bytes, mime_type = prepare_qwen_input(image, preview)
    base64_image = base64.b64encode(prepared_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_image}"
    parameters: dict[str, object] = {
        "n": 1,
        "negative_prompt": (
            "low quality, blurry, dirty background, stains, artifacts, jagged edges, "
            "rewritten text, garbled text, extra text, watermark, extra objects, "
            "added lanterns, added tassels, added hanging charms, added ornaments, added props, "
            "changed composition, changed camera angle, changed perspective, changed product scale, "
            "moved product, resized product, redrawn product structure, altered product layout"
        ),
        "prompt_extend": True,
        "watermark": False,
    }
    size = qwen_output_size(aspect, preview)
    if qwen_model_supports_size(QWEN_IMAGE_MODEL):
        parameters["size"] = size

    payload = {
        "model": QWEN_IMAGE_MODEL,
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"image": data_url},
                        {"text": build_qwen_product_prompt_ascii(material, aspect, preview)},
                    ],
                }
            ]
        },
        "parameters": parameters,
    }

    response = requests.post(
        QWEN_API_URL,
        headers={"Authorization": f"Bearer {QWEN_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=(20, 240),
    )
    if not response.ok:
        raise RuntimeError(format_qwen_error(response))
    result = response.json()
    generated_bytes = extract_qwen_image_bytes(result)
    return Image.open(io.BytesIO(generated_bytes)).convert("RGBA")


def build_gemini_product_prompt(material: str, preview: bool) -> str:
    return (
        "Use the provided product photo as the only reference. "
        "Remove the original background and place the existing product on a clean pure white background. "
        "Do not beautify, redesign, repaint, enhance material texture, sharpen details, or change lighting. "
        "Strictly preserve the same product, crop composition, camera angle, perspective, position, scale, orientation, proportions, silhouette, colors, logos, printed text, and packaging graphics. "
        "Do not rewrite, redraw, translate, hallucinate, or add any text. "
        "Do not add props, lanterns, tassels, hanging charms, ornaments, accessories, stains, watermarks, extra shadows, extra objects, or dirty background artifacts. "
        "Return only the model output image."
    )


def build_qwen_product_prompt_ascii(material: str, aspect: str, preview: bool) -> str:
    return (
        "Use the provided product photo as the only reference. Remove the original background and output a clean pure white background. "
        "Do not beautify, redesign, repaint, enhance material texture, sharpen details, or change lighting. "
        "Strictly keep the exact same crop composition, camera angle, perspective, product position, product scale, orientation, proportions, silhouette, layout, real colors, logos, printed text, and packaging graphics. "
        "Do not move, resize, rotate, recenter, reframe, straighten, crop tighter, zoom in, zoom out, change perspective, "
        "or redraw the product structure. "
        "Do not rewrite, redraw, translate, hallucinate, or add any text. "
        f"Keep the image aspect ratio {aspect}. "
        "Do not add props, lanterns, tassels, hanging charms, ornaments, accessories, stains, watermarks, extra shadows, extra objects, or dirty background artifacts. "
        "Return only the model output image."
    )


def build_qwen_product_prompt(material: str, aspect: str, preview: bool) -> str:
    material_hint = {
        "giftbox": "礼盒包装层次、纸面质感、烫金/印刷清晰度",
        "metal": "金属高光、反射层次、抛光或拉丝质感",
        "leather": "皮革纹理、压纹、缝线和柔和光泽",
        "glass": "玻璃通透感、反光边缘和高光过渡",
        "fabric": "布料织纹、纤维细节和自然柔软感",
        "food": "食品表面细节、色泽和新鲜质感",
        "general": "真实材质、细节层次和商品轮廓",
    }.get(material, "真实材质、细节层次和商品轮廓")
    quality_hint = "用于快速预览，保持真实自然。" if preview else "用于最终电商白底成图，画面干净高质感。"
    return (
        "请基于输入图片做电商产品白底质感精修。保持同一产品、同一裁剪构图、同一视角、同一比例，"
        "严格保留原有文字、LOGO、包装图案和真实颜色，不要改写、重绘或新增任何文字。"
        "去除原背景，输出纯白背景。重点增强"
        f"{material_hint}，同时处理边缘抗锯齿，让轮廓干净自然。"
        f"保持画面比例 {aspect}。不要新增道具、污渍、水印、多余阴影或脏点。{quality_hint}"
    )


def build_gemini_generation_config(aspect: str, preview: bool) -> dict[str, object]:
    return {
        "responseModalities": ["IMAGE"],
        "imageConfig": {
            "aspectRatio": aspect,
            "imageSize": "1K" if preview else "4K",
        },
    }


def format_gemini_error(response: requests.Response) -> str:
    prefix = f"Gemini API error {response.status_code}"
    try:
        payload = response.json()
    except ValueError:
        text = response.text.strip()
        return f"{prefix}: {text or response.reason}"

    error = payload.get("error", {}) if isinstance(payload, dict) else {}
    message = error.get("message") or payload
    status = error.get("status")
    details = error.get("details")
    parts = [prefix]
    if status:
        parts.append(str(status))
    if message:
        parts.append(str(message))
    if details:
        parts.append(json.dumps(details, ensure_ascii=False))
    return " | ".join(parts)


def format_qwen_error(response: requests.Response) -> str:
    prefix = f"Qwen API error {response.status_code}"
    try:
        payload = response.json()
    except ValueError:
        text = response.text.strip()
        return f"{prefix}: {text or response.reason}"

    code = payload.get("code") if isinstance(payload, dict) else None
    message = payload.get("message") if isinstance(payload, dict) else payload
    request_id = payload.get("request_id") if isinstance(payload, dict) else None
    parts = [prefix]
    if code:
        parts.append(str(code))
    if message:
        parts.append(str(message))
    if request_id:
        parts.append(f"request_id={request_id}")
    return " | ".join(parts)


def prepare_gemini_input(image: Image.Image, preview: bool) -> tuple[bytes, str]:
    rgb = image.convert("RGB")
    max_side = GEMINI_PREVIEW_MAX_SIDE if preview else GEMINI_FINAL_MAX_SIDE
    width, height = rgb.size
    scale = min(1.0, max_side / max(width, height))
    if scale < 1.0:
        rgb = rgb.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.Resampling.LANCZOS,
        )

    max_bytes = 4 * 1024 * 1024 if preview else 12 * 1024 * 1024
    qualities = [88, 82, 76] if preview else [94, 90, 86, 82]
    for quality in qualities:
        buffer = io.BytesIO()
        rgb.save(buffer, format="JPEG", quality=quality, optimize=True)
        data = buffer.getvalue()
        if len(data) <= max_bytes:
            return data, "image/jpeg"

    fallback = io.BytesIO()
    rgb.save(fallback, format="JPEG", quality=70 if preview else 78, optimize=True)
    return fallback.getvalue(), "image/jpeg"


def prepare_qwen_input(image: Image.Image, preview: bool) -> tuple[bytes, str]:
    rgb = image.convert("RGB")
    max_side = QWEN_PREVIEW_MAX_SIDE if preview else QWEN_FINAL_MAX_SIDE
    width, height = rgb.size
    scale = min(1.0, max_side / max(width, height))
    if scale < 1.0:
        rgb = rgb.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.Resampling.LANCZOS,
        )

    for quality in [92, 88, 84, 80]:
        buffer = io.BytesIO()
        rgb.save(buffer, format="JPEG", quality=quality, optimize=True)
        data = buffer.getvalue()
        if len(data) <= 10 * 1024 * 1024:
            return data, "image/jpeg"

    fallback = io.BytesIO()
    rgb.save(fallback, format="JPEG", quality=76, optimize=True)
    return fallback.getvalue(), "image/jpeg"


def extract_gemini_image_bytes(payload: dict) -> bytes:
    for candidate in payload.get("candidates", []):
        content = candidate.get("content", {})
        for part in content.get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError("Gemini returned no image data.")


def extract_qwen_image_bytes(payload: dict) -> bytes:
    image_ref = find_qwen_image_reference(payload)
    if not image_ref:
        raise RuntimeError("Qwen returned no image URL or image data.")
    if image_ref.startswith("data:image/"):
        return decode_data_url_image(image_ref)

    response = requests.get(image_ref, timeout=(20, 240))
    if not response.ok:
        raise RuntimeError(f"Qwen image download failed {response.status_code}: {response.reason}")
    return response.content


def find_qwen_image_reference(node: object) -> str | None:
    if isinstance(node, dict):
        for key in ("image", "url", "image_url", "output_url"):
            value = node.get(key)
            if isinstance(value, str) and is_qwen_image_reference(value):
                return value
        for value in node.values():
            found = find_qwen_image_reference(value)
            if found:
                return found
    elif isinstance(node, list):
        for item in node:
            found = find_qwen_image_reference(item)
            if found:
                return found
    elif isinstance(node, str) and is_qwen_image_reference(node):
        return node
    return None


def is_qwen_image_reference(value: str) -> bool:
    return value.startswith("data:image/") or value.startswith("http://") or value.startswith("https://")


def decode_data_url_image(data_url: str) -> bytes:
    try:
        _, encoded = data_url.split(",", 1)
    except ValueError as exc:
        raise RuntimeError("Qwen returned invalid base64 image data.") from exc
    return base64.b64decode(encoded)


def qwen_output_size(aspect: str, preview: bool) -> str:
    width, height = qwen_output_dimensions(aspect, preview)
    return f"{width}*{height}"


def qwen_output_dimensions(aspect: str, preview: bool) -> tuple[int, int]:
    max_side = 1280 if preview else 2048
    sizes = {
        "1:1": (max_side, max_side),
        "4:3": (max_side, round(max_side * 3 / 4)),
        "3:4": (round(max_side * 3 / 4), max_side),
        "9:16": (round(max_side * 9 / 16), max_side),
    }
    width, height = sizes.get(aspect, (max_side, max_side))
    return round_to_multiple(width, 16), round_to_multiple(height, 16)


def round_to_multiple(value: int, multiple: int) -> int:
    return max(multiple, int(round(value / multiple)) * multiple)


def bounded_output_size(image_size: tuple[int, int], max_side: int) -> tuple[int, int]:
    width, height = image_size
    scale = min(1.0, max_side / max(width, height))
    return max(1, round(width * scale)), max(1, round(height * scale))


def qwen_model_supports_size(model: str) -> bool:
    return model.startswith("qwen-image-2.0") or model.startswith("qwen-image-edit-plus") or model.startswith(
        "qwen-image-edit-max"
    )


def aliyun_segment_commodity(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    client = get_aliyun_client()
    prepared_image, prepared_buffer = prepare_aliyun_input(image)
    request_kwargs = {"image_urlobject": prepared_buffer}
    if ALIYUN_RETURN_FORM:
        request_kwargs["return_form"] = ALIYUN_RETURN_FORM
    request = imageseg_models.SegmentCommodityAdvanceRequest(**request_kwargs)
    runtime = util_models.RuntimeOptions(
        read_timeout=20000,
        connect_timeout=10000,
        autoretry=True,
        max_attempts=3,
    )
    response = client.segment_commodity_advance(request, runtime)
    image_url = response.body.data.image_url if response and response.body and response.body.data else None
    if not image_url:
        raise RuntimeError("Aliyun SegmentCommodity returned no image URL.")
    result = requests.get(image_url, timeout=30)
    result.raise_for_status()
    return Image.open(io.BytesIO(result.content)).convert("RGBA"), prepared_image


def prepare_aliyun_input(image: Image.Image) -> tuple[Image.Image, io.BytesIO]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    scale = min(1.0, ALIYUN_MAX_SIDE / max(width, height))
    if scale < 1.0:
        rgb = rgb.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.Resampling.LANCZOS,
        )

    for quality in [92, 88, 84, 80, 75, 70, 65]:
        buf = io.BytesIO()
        rgb.save(buf, format="JPEG", quality=quality, optimize=True)
        if buf.tell() <= ALIYUN_MAX_IMAGE_SIZE:
            buf.seek(0)
            return rgb, buf

    shrink = rgb
    for _ in range(4):
        shrink = shrink.resize(
            (max(1, round(shrink.width * 0.85)), max(1, round(shrink.height * 0.85))),
            Image.Resampling.LANCZOS,
        )
        buf = io.BytesIO()
        shrink.save(buf, format="JPEG", quality=65, optimize=True)
        if buf.tell() <= ALIYUN_MAX_IMAGE_SIZE:
            buf.seek(0)
            return shrink, buf

    raise RuntimeError("Image could not be reduced below Aliyun SegmentCommodity limits.")


def suppress_background_residue(cutout: Image.Image, source: Image.Image) -> Image.Image:
    cutout_arr = np.array(cutout).astype(np.float32)
    source_arr = np.array(source.convert("RGB")).astype(np.float32)
    alpha = cutout_arr[:, :, 3]
    bg = estimate_border_color(source_arr)
    distance = np.linalg.norm(source_arr - bg, axis=2)
    gray = cv2.cvtColor(source_arr.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient = cv2.magnitude(grad_x, grad_y)
    hsv = cv2.cvtColor(source_arr.astype(np.uint8), cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]

    bg_like = ((distance < 34) & (gradient < 16) & (alpha > 0)).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    bg_like = cv2.morphologyEx(bg_like, cv2.MORPH_OPEN, kernel, iterations=1)
    bg_like = cv2.morphologyEx(bg_like, cv2.MORPH_CLOSE, kernel, iterations=2)

    border_connected = border_connected_mask(bg_like)
    large_flat = large_flat_residue_mask(bg_like, saturation, gradient)
    remove_mask = np.maximum(border_connected, large_flat)

    feather = cv2.GaussianBlur(remove_mask, (0, 0), 2.2).astype(np.float32) / 255.0
    alpha = alpha * (1.0 - feather)
    alpha[remove_mask > 245] = 0
    cutout_arr[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(cutout_arr.astype(np.uint8), mode="RGBA")


def estimate_border_color(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    margin = max(8, round(min(h, w) * 0.035))
    samples = np.concatenate(
        [
            rgb[:margin, :, :].reshape(-1, 3),
            rgb[-margin:, :, :].reshape(-1, 3),
            rgb[:, :margin, :].reshape(-1, 3),
            rgb[:, -margin:, :].reshape(-1, 3),
        ],
        axis=0,
    )
    return np.median(samples, axis=0)


def border_connected_mask(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    flood = mask.copy()
    border = np.zeros((h + 2, w + 2), dtype=np.uint8)
    for x in range(w):
        if flood[0, x]:
            cv2.floodFill(flood, border, (x, 0), 128)
        if flood[h - 1, x]:
            cv2.floodFill(flood, border, (x, h - 1), 128)
    for y in range(h):
        if flood[y, 0]:
            cv2.floodFill(flood, border, (0, y), 128)
        if flood[y, w - 1]:
            cv2.floodFill(flood, border, (w - 1, y), 128)
    return (flood == 128).astype(np.uint8) * 255


def large_flat_residue_mask(mask: np.ndarray, saturation: np.ndarray, gradient: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    clean = np.zeros_like(mask)
    min_area = max(1800, round(mask.size * 0.0015))
    for label in range(1, count):
        component = labels == label
        area = stats[label, cv2.CC_STAT_AREA]
        if area < min_area:
            continue
        mean_sat = float(np.mean(saturation[component]))
        mean_grad = float(np.mean(gradient[component]))
        if mean_sat < 42 and mean_grad < 8:
            clean[component] = 255
    return clean


def compose_framed_on_white(
    rgba: Image.Image, output_size: tuple[int, int] | None = None
) -> tuple[np.ndarray, np.ndarray]:
    rgba = clean_cutout_edges(rgba)
    target_size = output_size or rgba.size
    original_size = rgba.size
    if rgba.size != target_size:
        rgba = rgba.resize(target_size, Image.Resampling.LANCZOS)

    alpha = rgba.getchannel("A")
    scale_ratio = max(target_size[0] / max(1, original_size[0]), target_size[1] / max(1, original_size[1]))
    alpha = antialias_alpha(alpha, scale_ratio)
    rgba = neutralize_edge_color(rgba, alpha)

    canvas = Image.new("RGB", target_size, "white")
    canvas.paste(rgba.convert("RGB"), (0, 0), alpha)
    mask = np.array(alpha)
    bgr = cv2.cvtColor(np.array(canvas), cv2.COLOR_RGB2BGR)
    return bgr, mask


def compose_generated_on_white(
    image: Image.Image, output_size: tuple[int, int], reference_mask: np.ndarray | None = None
) -> tuple[np.ndarray, np.ndarray]:
    rgb = image.convert("RGB")
    if rgb.size != output_size:
        rgb = rgb.resize(output_size, Image.Resampling.LANCZOS)
    bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    if reference_mask is not None:
        mask = resize_mask(reference_mask, output_size)
        mask = refine_reference_mask_for_composite(mask)
        bgr = keep_background_white(bgr, mask)
    else:
        mask = estimate_subject_mask_from_white_background(bgr)
        mask = prune_generated_subject_mask(bgr, mask)
        bgr = force_generated_background_white(bgr, mask)
    return bgr, mask


def resize_mask(mask: np.ndarray, output_size: tuple[int, int]) -> np.ndarray:
    width, height = output_size
    if mask.shape[:2] == (height, width):
        return mask
    return cv2.resize(mask, (width, height), interpolation=cv2.INTER_LINEAR)


def refine_reference_mask_for_composite(mask: np.ndarray) -> np.ndarray:
    mask = (mask > 12).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=0.65, sigmaY=0.65)
    return np.clip(mask, 0, 255).astype(np.uint8)


def get_reference_subject_mask(image: Image.Image) -> np.ndarray | None:
    try:
        cutout = segment_with_aliyun_preserve_pixels(image)
    except Exception:
        return None

    alpha = np.array(cutout.getchannel("A"))
    if alpha.shape[:2] != (image.height, image.width):
        alpha = cv2.resize(alpha, image.size, interpolation=cv2.INTER_LINEAR)
    _, mask = cv2.threshold(alpha, 20, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    return mask


def align_generated_to_reference(
    generated: Image.Image, target_size: tuple[int, int], reference_mask: np.ndarray | None
) -> Image.Image:
    generated_rgb = generated.convert("RGB")
    if generated_rgb.size != target_size:
        generated_rgb = generated_rgb.resize(target_size, Image.Resampling.LANCZOS)
    if reference_mask is None:
        return generated_rgb.convert("RGBA")

    generated_bgr = cv2.cvtColor(np.array(generated_rgb), cv2.COLOR_RGB2BGR)
    generated_mask = estimate_subject_mask_from_white_background(generated_bgr)
    generated_mask = prune_generated_subject_mask(generated_bgr, generated_mask)
    reference_anchor_mask = dominant_subject_mask(reference_mask)
    generated_anchor_mask = dominant_subject_mask(generated_mask)

    reference_bbox = bbox_from_alpha(reference_anchor_mask)
    generated_anchor_bbox = bbox_from_alpha(generated_anchor_mask)
    generated_full_bbox = bbox_from_alpha(generated_mask)
    if reference_bbox is None or generated_anchor_bbox is None or generated_full_bbox is None:
        return generated_rgb.convert("RGBA")

    if not should_align_generated(reference_bbox, generated_anchor_bbox, target_size):
        return generated_rgb.convert("RGBA")

    aligned = scale_and_place_generated(
        generated_rgb,
        generated_mask,
        generated_full_bbox,
        generated_anchor_bbox,
        reference_bbox,
        target_size,
    )
    return aligned.convert("RGBA")


def should_align_generated(
    reference_bbox: tuple[int, int, int, int], generated_bbox: tuple[int, int, int, int], target_size: tuple[int, int]
) -> bool:
    ref_cx, ref_cy, ref_w, ref_h = bbox_center_size(reference_bbox)
    gen_cx, gen_cy, gen_w, gen_h = bbox_center_size(generated_bbox)
    if min(ref_w, ref_h, gen_w, gen_h) <= 6:
        return False

    width, height = target_size
    center_delta = math.hypot((ref_cx - gen_cx) / max(width, 1), (ref_cy - gen_cy) / max(height, 1))
    scale_delta = max(abs(ref_w - gen_w) / max(ref_w, 1), abs(ref_h - gen_h) / max(ref_h, 1))
    return center_delta > 0.018 or scale_delta > 0.035


def dominant_subject_mask(mask: np.ndarray) -> np.ndarray:
    binary = (mask > 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        return mask

    best_label = 0
    best_area = 0
    for label in range(1, count):
        area = stats[label, cv2.CC_STAT_AREA]
        if area > best_area:
            best_label = label
            best_area = area
    if best_label == 0:
        return mask

    dominant = np.where(labels == best_label, 255, 0).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dominant = cv2.morphologyEx(dominant, cv2.MORPH_CLOSE, kernel, iterations=1)
    return dominant


def scale_and_place_generated(
    generated_rgb: Image.Image,
    generated_mask: np.ndarray,
    generated_full_bbox: tuple[int, int, int, int],
    generated_anchor_bbox: tuple[int, int, int, int],
    reference_anchor_bbox: tuple[int, int, int, int],
    target_size: tuple[int, int],
) -> Image.Image:
    gen_x1, gen_y1, gen_x2, gen_y2 = pad_bbox(generated_full_bbox, target_size, 0.012)
    ref_x1, ref_y1, ref_x2, ref_y2 = pad_bbox(reference_anchor_bbox, target_size, 0.012)
    gen_w = max(1, gen_x2 - gen_x1)
    gen_h = max(1, gen_y2 - gen_y1)
    _, _, gen_anchor_w, gen_anchor_h = bbox_center_size(generated_anchor_bbox)
    _, _, ref_w, ref_h = bbox_center_size(reference_anchor_bbox)

    scale = min(ref_w / max(gen_anchor_w, 1), ref_h / max(gen_anchor_h, 1))
    scale = clamp_float(scale, 0.68, 1.48)
    crop = generated_rgb.crop((gen_x1, gen_y1, gen_x2, gen_y2)).convert("RGB")
    alpha = Image.fromarray(generated_mask).crop((gen_x1, gen_y1, gen_x2, gen_y2))

    new_size = (max(1, round(gen_w * scale)), max(1, round(gen_h * scale)))
    crop = crop.resize(new_size, Image.Resampling.LANCZOS)
    alpha = alpha.resize(new_size, Image.Resampling.LANCZOS)
    alpha = antialias_alpha(alpha, scale)

    ref_cx, ref_cy, _, _ = bbox_center_size(reference_anchor_bbox)
    gen_anchor_cx, gen_anchor_cy, _, _ = bbox_center_size(generated_anchor_bbox)
    anchor_offset_x = (gen_anchor_cx - gen_x1) * scale
    anchor_offset_y = (gen_anchor_cy - gen_y1) * scale
    left = round(ref_cx - anchor_offset_x)
    top = round(ref_cy - anchor_offset_y)

    canvas = Image.new("RGB", target_size, "white")
    paste_clipped(canvas, crop, alpha, left, top)
    return canvas


def paste_clipped(canvas: Image.Image, source: Image.Image, mask: Image.Image, left: int, top: int) -> None:
    canvas_w, canvas_h = canvas.size
    source_w, source_h = source.size
    paste_left = max(0, left)
    paste_top = max(0, top)
    paste_right = min(canvas_w, left + source_w)
    paste_bottom = min(canvas_h, top + source_h)
    if paste_right <= paste_left or paste_bottom <= paste_top:
        return

    src_left = paste_left - left
    src_top = paste_top - top
    src_right = src_left + paste_right - paste_left
    src_bottom = src_top + paste_bottom - paste_top
    canvas.paste(
        source.crop((src_left, src_top, src_right, src_bottom)),
        (paste_left, paste_top),
        mask.crop((src_left, src_top, src_right, src_bottom)),
    )


def bbox_center_size(bbox: tuple[int, int, int, int]) -> tuple[float, float, int, int]:
    x1, y1, x2, y2 = bbox
    return (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1


def compose_on_white(rgba: Image.Image, spec: AspectSpec) -> tuple[np.ndarray, np.ndarray]:
    rgba = clean_cutout_edges(rgba)
    alpha = np.array(rgba.getchannel("A"))
    bbox = bbox_from_alpha(alpha)

    if bbox is None:
        rgb = Image.new("RGB", rgba.size, "white")
        rgb.paste(rgba.convert("RGB"), mask=rgba.getchannel("A"))
        bgr = cv2.cvtColor(np.array(rgb.resize((spec.width, spec.height))), cv2.COLOR_RGB2BGR)
        return bgr, np.zeros((spec.height, spec.width), dtype=np.uint8)

    x1, y1, x2, y2 = pad_bbox(bbox, rgba.size, 0.035)
    subject = rgba.crop((x1, y1, x2, y2))
    subject_alpha = subject.getchannel("A")
    subject_w, subject_h = subject.size

    max_w = spec.width * spec.fill
    max_h = spec.height * spec.fill
    scale = min(max_w / max(subject_w, 1), max_h / max(subject_h, 1))
    new_size = (max(1, round(subject_w * scale)), max(1, round(subject_h * scale)))
    subject = subject.resize(new_size, Image.Resampling.LANCZOS)
    subject_alpha = subject_alpha.resize(new_size, Image.Resampling.LANCZOS)
    subject_alpha = antialias_alpha(subject_alpha, scale)
    subject = neutralize_edge_color(subject, subject_alpha)

    canvas = Image.new("RGB", (spec.width, spec.height), "white")
    mask_canvas = Image.new("L", (spec.width, spec.height), 0)
    thirds_x = (spec.width / 3, spec.width / 2, spec.width * 2 / 3)
    target_x = thirds_x[1]
    target_y = spec.height * spec.center_y

    left = round(target_x - new_size[0] / 2)
    top = round(target_y - new_size[1] / 2)
    left = clamp(left, round(spec.width * 0.04), spec.width - new_size[0] - round(spec.width * 0.04))
    top = clamp(top, round(spec.height * 0.035), spec.height - new_size[1] - round(spec.height * 0.035))

    canvas.paste(subject.convert("RGB"), (left, top), subject_alpha)
    mask_canvas.paste(subject_alpha, (left, top))
    mask = np.array(mask_canvas)
    bgr = cv2.cvtColor(np.array(canvas), cv2.COLOR_RGB2BGR)
    return bgr, mask


def estimate_subject_mask_from_white_background(bgr: np.ndarray) -> np.ndarray:
    min_channel = np.min(bgr, axis=2)
    max_channel = np.max(bgr, axis=2)
    near_white = (min_channel > 242) & ((max_channel - min_channel) < 18)
    mask = np.where(near_white, 0, 255).astype(np.uint8)
    mask = cv2.medianBlur(mask, 5)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    if cv2.countNonZero(mask) < mask.size * 0.02:
        return np.full(mask.shape, 255, dtype=np.uint8)
    return mask


def prune_generated_subject_mask(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats((mask > 0).astype(np.uint8), 8)
    if count <= 1:
        return mask

    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    min_area = max(180, round(mask.size * 0.00018))
    clean = np.zeros_like(mask)
    for label in range(1, count):
        component = labels == label
        area = stats[label, cv2.CC_STAT_AREA]
        if area < min_area and float(np.mean(saturation[component])) < 55:
            continue
        clean[component] = 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    clean = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, kernel, iterations=1)
    return clean if cv2.countNonZero(clean) else mask


def force_generated_background_white(bgr: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    result = bgr.copy()
    hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
    min_channel = np.min(result, axis=2)
    max_channel = np.max(result, axis=2)
    near_white = (min_channel > 218) & (hsv[:, :, 1] < 54) & ((max_channel - min_channel) < 38)
    background = (subject_mask == 0) | near_white

    gray = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
    speckles = ((gray > 170) & (hsv[:, :, 1] < 72) & (subject_mask < 245)).astype(np.uint8) * 255
    speckles = remove_large_components(speckles, max_area=max(80, round(bgr.size / 9000)))
    background = background | (speckles > 0)

    result[background] = [255, 255, 255]
    return result


def compose_preview_on_white(rgba: Image.Image, original_size: tuple[int, int]) -> np.ndarray:
    rgba = clean_cutout_edges(rgba)
    alpha = rgba.getchannel("A")
    canvas = Image.new("RGB", original_size, "white")
    canvas.paste(rgba.convert("RGB"), (0, 0), alpha)
    return cv2.cvtColor(np.array(canvas), cv2.COLOR_RGB2BGR)


def clean_cutout_edges(rgba: Image.Image) -> Image.Image:
    arr = np.array(rgba)
    alpha = arr[:, :, 3]
    hard = (alpha > 6).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    hard = cv2.morphologyEx(hard, cv2.MORPH_OPEN, kernel, iterations=1)
    hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, kernel, iterations=1)
    soft = cv2.GaussianBlur(hard, (0, 0), sigmaX=0.85, sigmaY=0.85)
    merged = np.maximum(alpha.astype(np.float32) * 0.94, soft.astype(np.float32) * 0.72)
    arr[:, :, 3] = np.clip(merged, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, mode="RGBA")


def antialias_alpha(alpha: Image.Image, scale: float) -> Image.Image:
    alpha_arr = np.array(alpha).astype(np.float32)
    sigma = 0.75 if scale >= 1.5 else 0.55
    blurred = cv2.GaussianBlur(alpha_arr, (0, 0), sigmaX=sigma, sigmaY=sigma)
    mixed = cv2.addWeighted(alpha_arr, 0.72, blurred, 0.28, 0)
    return Image.fromarray(np.clip(mixed, 0, 255).astype(np.uint8), mode="L")


def neutralize_edge_color(subject: Image.Image, alpha: Image.Image) -> Image.Image:
    rgba = np.array(subject).astype(np.float32)
    alpha_arr = np.array(alpha).astype(np.float32)
    edge = (alpha_arr > 10) & (alpha_arr < 245)
    if not np.any(edge):
        return subject

    rgb = rgba[:, :, :3]
    white = np.full_like(rgb, 255.0)
    blend = np.clip((245.0 - alpha_arr) / 245.0, 0.0, 1.0)
    blend = (blend * 0.34)[:, :, None]
    rgb[edge] = rgb[edge] * (1.0 - blend[edge]) + white[edge] * blend[edge]
    rgba[:, :, :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(rgba.astype(np.uint8), mode="RGBA")


def bbox_from_alpha(alpha: np.ndarray, threshold: int = 12) -> tuple[int, int, int, int] | None:
    points = cv2.findNonZero((alpha > threshold).astype(np.uint8))
    if points is None:
        return None
    x, y, w, h = cv2.boundingRect(points)
    return x, y, x + w, y + h


def pad_bbox(
    bbox: tuple[int, int, int, int], image_size: tuple[int, int], ratio: float
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = bbox
    width, height = image_size
    pad = round(max(x2 - x1, y2 - y1) * ratio)
    return (
        max(0, x1 - pad),
        max(0, y1 - pad),
        min(width, x2 + pad),
        min(height, y2 + pad),
    )


def apply_material_pipeline(bgr: np.ndarray, material: str, subject_mask: np.ndarray) -> np.ndarray:
    pipelines = {
        "giftbox_packaging": [
            lambda img: adjust_lab(img, contrast=1.11, brightness=2),
            lambda img: adjust_saturation(img, 1.08),
            lambda img: denoise_surface(img, strength=3),
            lambda img: unsharp_mask(img, amount=0.92, radius=0.95),
        ],
        "newyear_goods": [
            lambda img: adjust_lab(img, contrast=1.13, brightness=2),
            lambda img: adjust_saturation(img, 1.13),
            lambda img: edge_preserving_polish(img),
            lambda img: unsharp_mask(img, amount=1.04, radius=0.85),
        ],
        "giftbox_display": [
            lambda img: adjust_lab(img, contrast=1.08, brightness=2),
            lambda img: adjust_saturation(img, 1.07),
            lambda img: denoise_surface(img, strength=2),
            lambda img: unsharp_mask(img, amount=0.76, radius=1.05),
        ],
        "stationery": [
            lambda img: adjust_lab(img, contrast=1.10, brightness=1),
            lambda img: adjust_saturation(img, 1.05),
            lambda img: denoise_surface(img, strength=2),
            lambda img: unsharp_mask(img, amount=1.05, radius=0.75),
        ],
        "giftbox": [
            lambda img: adjust_lab(img, contrast=1.10, brightness=2),
            lambda img: adjust_saturation(img, 1.10),
            lambda img: denoise_surface(img, strength=3),
            lambda img: unsharp_mask(img, amount=0.85, radius=1.1),
        ],
        "metal": [
            lambda img: adjust_lab(img, contrast=1.18, brightness=0),
            lambda img: adjust_saturation(img, 0.88),
            lambda img: edge_preserving_polish(img),
            lambda img: unsharp_mask(img, amount=1.35, radius=0.8),
        ],
        "leather": [
            lambda img: adjust_lab(img, contrast=1.08, brightness=1),
            lambda img: adjust_saturation(img, 1.06),
            lambda img: bilateral_texture(img, diameter=7),
            lambda img: unsharp_mask(img, amount=0.70, radius=1.4),
        ],
        "glass": [
            lambda img: adjust_lab(img, contrast=1.14, brightness=4),
            lambda img: adjust_saturation(img, 0.96),
            lambda img: denoise_surface(img, strength=4),
            lambda img: unsharp_mask(img, amount=1.10, radius=0.7),
        ],
        "fabric": [
            lambda img: adjust_lab(img, contrast=1.06, brightness=1),
            lambda img: adjust_saturation(img, 1.04),
            lambda img: bilateral_texture(img, diameter=9),
            lambda img: unsharp_mask(img, amount=0.55, radius=1.6),
        ],
        "food": [
            lambda img: adjust_lab(img, contrast=1.08, brightness=3),
            lambda img: adjust_saturation(img, 1.16),
            lambda img: denoise_surface(img, strength=2),
            lambda img: unsharp_mask(img, amount=0.80, radius=1.0),
        ],
        "general": [
            lambda img: adjust_lab(img, contrast=1.09, brightness=2),
            lambda img: adjust_saturation(img, 1.06),
            lambda img: denoise_surface(img, strength=3),
            lambda img: unsharp_mask(img, amount=0.85, radius=1.0),
        ],
    }

    original = bgr.copy()
    result = bgr.copy()
    subject_mask = refine_subject_mask(subject_mask)
    for step in pipelines.get(material, pipelines["general"]):
        result = step(result)

    result = soften_subject_edges(result, original, subject_mask)
    result = remove_small_defects(result, subject_mask)
    result = keep_background_white(result, subject_mask)
    return result


def apply_standard_preserve_pipeline(bgr: np.ndarray, material: str, subject_mask: np.ndarray) -> np.ndarray:
    preserve_steps = {
        "general": [
            lambda img: adjust_lab(img, contrast=1.02, brightness=0),
            lambda img: adjust_saturation(img, 1.01),
        ],
        "giftbox_packaging": [
            lambda img: adjust_lab(img, contrast=1.025, brightness=0),
            lambda img: adjust_saturation(img, 1.02),
        ],
        "newyear_goods": [
            lambda img: adjust_lab(img, contrast=1.025, brightness=0),
            lambda img: adjust_saturation(img, 1.04),
        ],
        "giftbox_display": [
            lambda img: adjust_lab(img, contrast=1.018, brightness=0),
            lambda img: adjust_saturation(img, 1.015),
        ],
        "stationery": [
            lambda img: adjust_lab(img, contrast=1.018, brightness=0),
            lambda img: adjust_saturation(img, 1.0),
        ],
    }

    original = bgr.copy()
    result = bgr.copy()
    for step in preserve_steps.get(material, preserve_steps["general"]):
        result = step(result)

    subject_mask = refine_subject_mask(subject_mask)
    result = soften_subject_edges(result, original, subject_mask)
    return keep_background_white(result, subject_mask)


def apply_preview_material_pipeline(bgr: np.ndarray, material: str) -> np.ndarray:
    preview_steps = {
        "giftbox_packaging": [
            lambda img: adjust_lab(img, contrast=1.05, brightness=1),
            lambda img: adjust_saturation(img, 1.05),
        ],
        "newyear_goods": [
            lambda img: adjust_lab(img, contrast=1.06, brightness=1),
            lambda img: adjust_saturation(img, 1.08),
        ],
        "giftbox_display": [
            lambda img: adjust_lab(img, contrast=1.04, brightness=1),
            lambda img: adjust_saturation(img, 1.04),
        ],
        "stationery": [
            lambda img: adjust_lab(img, contrast=1.05, brightness=0),
            lambda img: adjust_saturation(img, 1.03),
        ],
        "giftbox": [
            lambda img: adjust_lab(img, contrast=1.05, brightness=1),
            lambda img: adjust_saturation(img, 1.06),
        ],
        "metal": [
            lambda img: adjust_lab(img, contrast=1.08, brightness=0),
            lambda img: adjust_saturation(img, 0.94),
        ],
        "leather": [
            lambda img: adjust_lab(img, contrast=1.04, brightness=1),
            lambda img: adjust_saturation(img, 1.03),
        ],
        "glass": [
            lambda img: adjust_lab(img, contrast=1.06, brightness=2),
            lambda img: adjust_saturation(img, 0.98),
        ],
        "fabric": [
            lambda img: adjust_lab(img, contrast=1.03, brightness=1),
            lambda img: adjust_saturation(img, 1.02),
        ],
        "food": [
            lambda img: adjust_lab(img, contrast=1.04, brightness=2),
            lambda img: adjust_saturation(img, 1.08),
        ],
        "general": [
            lambda img: adjust_lab(img, contrast=1.04, brightness=1),
            lambda img: adjust_saturation(img, 1.03),
        ],
    }
    result = bgr.copy()
    for step in preview_steps.get(material, preview_steps["general"]):
        result = step(result)
    return result


def adjust_lab(bgr: np.ndarray, contrast: float, brightness: int) -> np.ndarray:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.convertScaleAbs(l, alpha=contrast, beta=brightness)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def adjust_saturation(bgr: np.ndarray, factor: float) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * factor, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def denoise_surface(bgr: np.ndarray, strength: int) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(bgr, None, strength, strength, 7, 21)


def bilateral_texture(bgr: np.ndarray, diameter: int) -> np.ndarray:
    smooth = cv2.bilateralFilter(bgr, diameter, 36, 36)
    return cv2.addWeighted(bgr, 0.72, smooth, 0.28, 0)


def edge_preserving_polish(bgr: np.ndarray) -> np.ndarray:
    return cv2.edgePreservingFilter(bgr, flags=1, sigma_s=24, sigma_r=0.16)


def unsharp_mask(bgr: np.ndarray, amount: float, radius: float) -> np.ndarray:
    blurred = cv2.GaussianBlur(bgr, (0, 0), radius)
    return cv2.addWeighted(bgr, 1 + amount, blurred, -amount, 0)


def refine_subject_mask(mask: np.ndarray) -> np.ndarray:
    mask = (mask > 8).astype(np.uint8) * 255
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.dilate(mask, kernel, iterations=1)
    return mask


def soften_subject_edges(processed: np.ndarray, original: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    edge_outer = cv2.dilate(subject_mask, kernel, iterations=1)
    edge_inner = cv2.erode(subject_mask, kernel, iterations=1)
    edge_band = cv2.subtract(edge_outer, edge_inner)
    if int(edge_band.sum()) == 0:
        return processed

    feather = cv2.GaussianBlur(edge_band.astype(np.float32), (0, 0), sigmaX=1.2, sigmaY=1.2) / 255.0
    feather = feather[:, :, None] * 0.65
    blended = processed.astype(np.float32) * (1.0 - feather) + original.astype(np.float32) * feather
    return np.clip(blended, 0, 255).astype(np.uint8)


def remove_small_defects(bgr: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    median = cv2.medianBlur(gray, 5)
    delta = cv2.absdiff(gray, median)
    defect_mask = ((delta > 34) & (subject_mask > 0)).astype(np.uint8) * 255
    defect_mask = remove_large_components(defect_mask, max_area=70)
    if int(defect_mask.sum()) == 0:
        return bgr
    return cv2.inpaint(bgr, defect_mask, 2, cv2.INPAINT_TELEA)


def remove_large_components(mask: np.ndarray, max_area: int) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    clean = np.zeros_like(mask)
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] <= max_area:
            clean[labels == label] = 255
    return clean


def keep_background_white(bgr: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    result = bgr.copy()
    background = subject_mask == 0
    result[background] = [255, 255, 255]
    return result


def restore_original_subject_surface(
    base_bgr: np.ndarray,
    original_image: Image.Image,
    subject_mask: np.ndarray,
    strength: float = 0.5,
) -> np.ndarray:
    rgb = original_image.convert("RGB")
    target_size = (base_bgr.shape[1], base_bgr.shape[0])
    if rgb.size != target_size:
        rgb = rgb.resize(target_size, Image.Resampling.LANCZOS)

    original_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    original_lab = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2LAB)
    original_hsv = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2GRAY)
    gradient_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gradient_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient = cv2.magnitude(gradient_x, gradient_y)

    subject = refine_subject_mask(subject_mask)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    interior = cv2.erode(subject, kernel, iterations=1)

    light_or_printed = (
        ((original_lab[:, :, 0] > 112) & (original_hsv[:, :, 1] < 150))
        | (gradient > 13)
    ).astype(np.uint8) * 255
    protected = cv2.bitwise_and(interior, light_or_printed)
    if int(protected.sum()) == 0:
        protected = interior

    alpha = cv2.GaussianBlur(protected.astype(np.float32), (0, 0), sigmaX=1.2, sigmaY=1.2) / 255.0
    alpha = np.clip(alpha[:, :, None] * strength, 0.0, 0.78)

    blended = base_bgr.astype(np.float32) * (1.0 - alpha) + original_bgr.astype(np.float32) * alpha
    result = np.clip(blended, 0, 255).astype(np.uint8)
    return keep_background_white(result, subject_mask)


def reinject_original_detail(
    base_bgr: np.ndarray,
    original_image: Image.Image,
    subject_mask: np.ndarray,
    amount: float = 0.35,
    blur_radius: float = 1.25,
) -> np.ndarray:
    rgb = original_image.convert("RGB")
    target_size = (base_bgr.shape[1], base_bgr.shape[0])
    if rgb.size != target_size:
        rgb = rgb.resize(target_size, Image.Resampling.LANCZOS)

    original_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    base_lab = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    original_lab = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    original_l = original_lab[:, :, 0]
    high_pass = original_l - cv2.GaussianBlur(original_l, (0, 0), sigmaX=blur_radius, sigmaY=blur_radius)

    boosted_lab = base_lab.copy()
    boosted_lab[:, :, 0] = np.clip(boosted_lab[:, :, 0] + high_pass * amount, 0, 255)
    boosted = cv2.cvtColor(boosted_lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    mask = refine_subject_mask(subject_mask).astype(np.float32) / 255.0
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=1.8, sigmaY=1.8)
    mask = np.clip(mask[:, :, None], 0.0, 1.0)

    blended = base_bgr.astype(np.float32) * (1.0 - mask) + boosted.astype(np.float32) * mask
    return np.clip(blended, 0, 255).astype(np.uint8)


def reinject_text_logo_regions(
    base_bgr: np.ndarray,
    original_image: Image.Image,
    subject_mask: np.ndarray,
    strength: float = 0.68,
) -> np.ndarray:
    rgb = original_image.convert("RGB")
    target_size = (base_bgr.shape[1], base_bgr.shape[0])
    if rgb.size != target_size:
        rgb = rgb.resize(target_size, Image.Resampling.LANCZOS)

    original_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    alignment_score = estimate_reinjection_alignment(base_bgr, original_bgr, subject_mask)
    if alignment_score < 0.42:
        return base_bgr

    text_mask = detect_text_logo_mask(original_bgr, base_bgr, subject_mask)
    if int(text_mask.sum()) == 0:
        return base_bgr

    base_lab = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    original_lab = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)

    original_l = original_lab[:, :, 0]
    detail = original_l - cv2.GaussianBlur(original_l, (0, 0), sigmaX=0.9, sigmaY=0.9)

    protected_lab = base_lab.copy()
    protected_lab[:, :, 0] = np.clip(
        base_lab[:, :, 0] * (1.0 - strength) + original_l * strength + detail * 0.28,
        0,
        255,
    )
    protected_lab[:, :, 1] = np.clip(base_lab[:, :, 1] * 0.72 + original_lab[:, :, 1] * 0.28, 0, 255)
    protected_lab[:, :, 2] = np.clip(base_lab[:, :, 2] * 0.72 + original_lab[:, :, 2] * 0.28, 0, 255)
    protected_bgr = cv2.cvtColor(protected_lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    alpha = cv2.GaussianBlur(text_mask.astype(np.float32), (0, 0), sigmaX=0.85, sigmaY=0.85) / 255.0
    alpha = np.clip(alpha[:, :, None] * min(0.74, 0.32 + alignment_score * 0.62), 0.0, 1.0)
    blended = base_bgr.astype(np.float32) * (1.0 - alpha) + protected_bgr.astype(np.float32) * alpha
    return np.clip(blended, 0, 255).astype(np.uint8)


def detect_text_logo_mask(original_bgr: np.ndarray, base_bgr: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2GRAY)
    subject = trusted_reinjection_area(base_bgr, subject_mask)
    if int(subject.sum()) == 0:
        return np.zeros(subject_mask.shape, dtype=np.uint8)

    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gradient = cv2.magnitude(grad_x, grad_y)
    gradient_u8 = cv2.normalize(gradient, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    laplace = cv2.convertScaleAbs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3))

    _, gradient_mask = cv2.threshold(gradient_u8, 42, 255, cv2.THRESH_BINARY)
    _, laplace_mask = cv2.threshold(laplace, 24, 255, cv2.THRESH_BINARY)

    hsv = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    _, saturated_edges = cv2.threshold(cv2.bitwise_and(gradient_u8, saturation), 34, 255, cv2.THRESH_BINARY)

    mask = cv2.bitwise_or(gradient_mask, laplace_mask)
    mask = cv2.bitwise_or(mask, saturated_edges)
    mask = cv2.bitwise_and(mask, subject)

    small_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    group_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, small_kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, group_kernel, iterations=1)
    mask = keep_text_like_components(mask, min_area=8, max_area=max(220, mask.size // 110))
    mask = cv2.dilate(mask, small_kernel, iterations=1)
    return cv2.bitwise_and(mask, subject)


def trusted_reinjection_area(base_bgr: np.ndarray, subject_mask: np.ndarray) -> np.ndarray:
    subject = (subject_mask > 230).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    subject = cv2.erode(subject, kernel, iterations=1)

    hsv = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2HSV)
    min_channel = np.min(base_bgr, axis=2)
    max_channel = np.max(base_bgr, axis=2)
    non_white_product = ((min_channel < 232) | (hsv[:, :, 1] > 42) | ((max_channel - min_channel) > 28)).astype(np.uint8) * 255
    non_white_product = cv2.morphologyEx(non_white_product, cv2.MORPH_CLOSE, kernel, iterations=1)
    return cv2.bitwise_and(subject, non_white_product)


def estimate_reinjection_alignment(base_bgr: np.ndarray, original_bgr: np.ndarray, subject_mask: np.ndarray) -> float:
    trusted = trusted_reinjection_area(base_bgr, subject_mask)
    if cv2.countNonZero(trusted) < trusted.size * 0.015:
        return 0.0

    base_gray = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2GRAY)
    original_gray = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2GRAY)
    base_edges = cv2.Canny(base_gray, 60, 150)
    original_edges = cv2.Canny(original_gray, 60, 150)
    base_edges = cv2.bitwise_and(base_edges, trusted)
    original_edges = cv2.bitwise_and(original_edges, trusted)

    if cv2.countNonZero(base_edges) < 40 or cv2.countNonZero(original_edges) < 40:
        return 0.0

    base_float = base_edges.astype(np.float32) / 255.0
    original_float = original_edges.astype(np.float32) / 255.0
    overlap = float(np.sum(base_float * original_float))
    denominator = math.sqrt(float(np.sum(base_float * base_float) * np.sum(original_float * original_float)))
    if denominator <= 0:
        return 0.0
    return max(0.0, min(1.0, overlap / denominator))


def keep_text_like_components(mask: np.ndarray, min_area: int, max_area: int) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    clean = np.zeros_like(mask)
    for label in range(1, count):
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        width = stats[label, cv2.CC_STAT_WIDTH]
        height = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]
        if area < min_area or area > max_area:
            continue
        if width < 2 or height < 2:
            continue
        if width > mask.shape[1] * 0.42 or height > mask.shape[0] * 0.28:
            continue
        aspect = width / max(height, 1)
        if aspect > 18 or aspect < 0.06:
            continue
        fill_ratio = area / max(width * height, 1)
        if fill_ratio > 0.74:
            continue
        clean[labels == label] = 255
    return clean


def clamp(value: int, low: int, high: int) -> int:
    if high < low:
        return math.floor((low + high) / 2)
    return max(low, min(value, high))


def clamp_float(value: float, low: float, high: float) -> float:
    if high < low:
        return (low + high) / 2
    return max(low, min(value, high))


def safe_stem(filename: str) -> str:
    stem = filename.rsplit(".", 1)[0]
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-._")
    return stem[:48] or "product"
