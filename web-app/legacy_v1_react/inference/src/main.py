import io
import json
import os
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, Form, UploadFile, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from src.quality import QualityGate
from src.preprocessing import ImagePreprocessor
from src.model_registry import ModelRegistry

app = FastAPI(
    title="Ophthalmic Biomarker Inference Service",
    description="Research prototype backend. Not a medical diagnosis.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config")
OUTPUTS_METRICS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "outputs", "metrics")

quality_gate = QualityGate()
preprocessor = ImagePreprocessor()
registry = ModelRegistry()

def load_upload_config() -> Dict[str, Any]:
    cfg_path = os.path.join(CONFIG_DIR, "upload.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "allowed_extensions": [".jpg", ".jpeg", ".png"],
        "allowed_mime_types": ["image/jpeg", "image/png"],
        "max_file_size_bytes": 10485760
    }

def load_capabilities_config() -> Dict[str, Any]:
    cfg_path = os.path.join(CONFIG_DIR, "capabilities.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_model_card_config() -> Dict[str, Any]:
    cfg_path = os.path.join(CONFIG_DIR, "model_card.json")
    with open(cfg_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Rule 8: Never log stack traces, file paths, or image bytes to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An internal error occurred."}}
    )

@app.get("/health")
@app.get("/api/health")
def get_health():
    return {
        "gateway": "LOADED",
        "inference": "LOADED",
        "models": registry.get_statuses()
    }

@app.get("/api/capabilities")
def get_capabilities():
    return load_capabilities_config()

@app.post("/api/quality")
@app.post("/quality")
async def post_quality(image: UploadFile = File(...)):
    upload_cfg = load_upload_config()
    content = await image.read()

    if len(content) > upload_cfg["max_file_size_bytes"]:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "Uploaded image exceeds configured file size limit."}}
        )

    # In-memory validation, never persist to disk
    try:
        pil_img = Image.open(io.BytesIO(content))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(content))
    except Exception:
        return JSONResponse(
            status_code=200,
            content={
                "passed": False,
                "checks": [
                    {"name": "file_integrity", "value": 0.0, "threshold": 1.0, "passed": False}
                ],
                "reasons": ["Uploaded file is corrupted or not a valid image."]
            }
        )

    report = quality_gate.evaluate(pil_img)
    return report.to_dict()

@app.post("/api/predict/direct")
@app.post("/predict/direct")
async def predict_direct(image: UploadFile = File(...), target_id: str = Form(...)):
    start_time = time.perf_counter()
    upload_cfg = load_upload_config()
    content = await image.read()

    if not content:
        return JSONResponse(status_code=400, content={"error": {"code": "EMPTY_PAYLOAD", "message": "Image payload is empty."}})

    if len(content) > upload_cfg["max_file_size_bytes"]:
        return JSONResponse(status_code=400, content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "Uploaded image exceeds size limit."}})

    # Decode in memory
    try:
        pil_img = Image.open(io.BytesIO(content))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(content))
    except Exception:
        return JSONResponse(status_code=400, content={"error": {"code": "CORRUPTED_IMAGE", "message": "File cannot be decoded as an image."}})

    # Run Quality Gate
    q_report = quality_gate.evaluate(pil_img)
    if not q_report.passed:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "QUALITY_CHECK_FAILED", "message": f"Image failed quality check: {'; '.join(q_report.reasons)}"}}
        )

    # Validate target_id
    capabilities = load_capabilities_config()
    target_meta = next((t for t in capabilities["targets"] if t["id"] == target_id), None)
    if not target_meta:
        return JSONResponse(status_code=400, content={"error": {"code": "UNKNOWN_TARGET", "message": f"Unknown target ID '{target_id}'."}})

    # Validate pathway availability for this target
    if "direct" not in target_meta.get("pathways", []):
        return JSONResponse(
            status_code=409,
            content={"error": {"code": "PATHWAY_UNAVAILABLE", "message": f"Pathway 'direct' is not available for target '{target_id}'."}}
        )

    # Preprocess
    tensor = preprocessor.preprocess_image(pil_img)
    latency = round((time.perf_counter() - start_time) * 1000, 2)

    result = registry.predict_direct(tensor=tensor, target_id=target_id, target_meta=target_meta, latency_ms=latency)
    return result

@app.post("/api/predict/indirect")
@app.post("/predict/indirect")
async def predict_indirect(image: UploadFile = File(...), target_id: str = Form(...)):
    start_time = time.perf_counter()
    upload_cfg = load_upload_config()
    content = await image.read()

    if not content:
        return JSONResponse(status_code=400, content={"error": {"code": "EMPTY_PAYLOAD", "message": "Image payload is empty."}})

    if len(content) > upload_cfg["max_file_size_bytes"]:
        return JSONResponse(status_code=400, content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "Uploaded image exceeds size limit."}})

    # Decode in memory
    try:
        pil_img = Image.open(io.BytesIO(content))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(content))
    except Exception:
        return JSONResponse(status_code=400, content={"error": {"code": "CORRUPTED_IMAGE", "message": "File cannot be decoded as an image."}})

    # Run Quality Gate
    q_report = quality_gate.evaluate(pil_img)
    if not q_report.passed:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "QUALITY_CHECK_FAILED", "message": f"Image failed quality check: {'; '.join(q_report.reasons)}"}}
        )

    # Validate target_id
    capabilities = load_capabilities_config()
    target_meta = next((t for t in capabilities["targets"] if t["id"] == target_id), None)
    if not target_meta:
        return JSONResponse(status_code=400, content={"error": {"code": "UNKNOWN_TARGET", "message": f"Unknown target ID '{target_id}'."}})

    # Check Pathway B availability
    if not capabilities.get("pathway_b_available", False) or "indirect" not in target_meta.get("pathways", []):
        return JSONResponse(
            status_code=409,
            content={"error": {"code": "PATHWAY_UNAVAILABLE", "message": "Pathway B (indirect cross-modal reconstruction) is unavailable: no verified patient-matched training data exists."}}
        )

    tensor = preprocessor.preprocess_image(pil_img)
    latency = round((time.perf_counter() - start_time) * 1000, 2)
    return registry.predict_indirect(tensor=tensor, target_id=target_id, target_meta=target_meta, latency_ms=latency)

@app.post("/api/predict/compare")
@app.post("/predict/compare")
async def predict_compare(image: UploadFile = File(...), target_id: str = Form(...)):
    start_time = time.perf_counter()
    upload_cfg = load_upload_config()
    content = await image.read()

    if not content:
        return JSONResponse(status_code=400, content={"error": {"code": "EMPTY_PAYLOAD", "message": "Image payload is empty."}})

    if len(content) > upload_cfg["max_file_size_bytes"]:
        return JSONResponse(status_code=400, content={"error": {"code": "PAYLOAD_TOO_LARGE", "message": "Uploaded image exceeds size limit."}})

    try:
        pil_img = Image.open(io.BytesIO(content))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(content))
    except Exception:
        return JSONResponse(status_code=400, content={"error": {"code": "CORRUPTED_IMAGE", "message": "File cannot be decoded as an image."}})

    q_report = quality_gate.evaluate(pil_img)
    if not q_report.passed:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "QUALITY_CHECK_FAILED", "message": f"Image failed quality check: {'; '.join(q_report.reasons)}"}}
        )

    capabilities = load_capabilities_config()
    target_meta = next((t for t in capabilities["targets"] if t["id"] == target_id), None)
    if not target_meta:
        return JSONResponse(status_code=400, content={"error": {"code": "UNKNOWN_TARGET", "message": f"Unknown target ID '{target_id}'."}})

    tensor = preprocessor.preprocess_image(pil_img)
    latency = round((time.perf_counter() - start_time) * 1000, 2)
    direct_res = registry.predict_direct(tensor=tensor, target_id=target_id, target_meta=target_meta, latency_ms=latency)
    indirect_res = registry.predict_indirect(tensor=tensor, target_id=target_id, target_meta=target_meta, latency_ms=latency)

    return {
        "target_id": target_id,
        "task_type": target_meta["task_type"],
        "direct": direct_res,
        "indirect": indirect_res,
        "disagreement_summary": {
            "reconstruction_adds_value": None,
            "delta": None,
            "note": "Reconstruction value cannot be evaluated in stub mode. Research prototype. Not a medical diagnosis."
        }
    }

@app.get("/api/explain/gradcam")
@app.get("/explain/gradcam")
def explain_gradcam(target_id: str):
    return registry.get_gradcam(target_id=target_id)

@app.get("/api/metrics")
def get_metrics():
    metrics = []
    if os.path.exists(OUTPUTS_METRICS_DIR):
        for fname in sorted(os.listdir(OUTPUTS_METRICS_DIR)):
            if fname.endswith(".json"):
                fpath = os.path.join(OUTPUTS_METRICS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as mf:
                        metrics.append(json.load(mf))
                except Exception:
                    pass
    return metrics

@app.get("/api/model-card")
def get_model_card():
    return load_model_card_config()
