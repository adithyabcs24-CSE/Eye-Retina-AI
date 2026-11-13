"""API route definitions conforming strictly to contracts/api_contract.md."""

import os
import time
from typing import Any, Dict, List
from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from ..config import (
    get_capabilities_config,
    get_model_card_config,
    OUTPUTS_DIR,
    MODEL_CARD_FILE
)
from ..quality import inspect_image_quality
from ..registry import registry
from ..security import validate_uploaded_image
from ..schemas import (
    CapabilitiesResponse,
    DirectPredictResponse,
    ErrorDetail,
    ErrorResponse,
    HealthModels,
    HealthResponse,
    IndirectPredictResponse,
    ModelStatus,
    QualityResponse
)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    statuses = registry.get_all_statuses()
    direct_status = statuses.get("direct", ModelStatus.UNAVAILABLE)
    overall_status = direct_status
    return HealthResponse(
        status=overall_status,
        models=HealthModels(
            direct=direct_status,
            generator=statuses.get("generator", ModelStatus.UNAVAILABLE),
            fundus_predictor=statuses.get("fundus_predictor", ModelStatus.UNAVAILABLE),
        )
    )


@router.get("/capabilities", response_model=CapabilitiesResponse)
def get_capabilities() -> CapabilitiesResponse:
    cfg = get_capabilities_config()
    return CapabilitiesResponse(**cfg)


@router.post("/quality", response_model=QualityResponse)
async def post_quality(image: UploadFile = File(...)):
    """Pre-inference quality inspection gate for anterior ocular photographs."""
    image_bytes = await image.read()

    # Requirement E: In-memory validation (MIME, size, magic bytes, Pillow decode)
    is_valid, err_code, err_msg = validate_uploaded_image(
        filename=image.filename,
        content_type=image.content_type,
        image_bytes=image_bytes
    )
    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error=ErrorDetail(code=err_code, message=err_msg)
            ).model_dump()
        )

    # In-memory inspection only. Zero image bytes written to disk.
    report = inspect_image_quality(image_bytes)
    return report


@router.post("/predict/direct", response_model=DirectPredictResponse)
async def predict_direct(
    image: UploadFile = File(...),
    target_id: str = Form(...)
):
    """Pathway A: Direct prediction (external-eye -> preprocess -> CNN encoder -> head)."""
    start_time = time.perf_counter()

    # 1. Target validation
    caps = get_capabilities_config()
    target_meta = next((t for t in caps.get("targets", []) if t["id"] == target_id), None)
    if not target_meta:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="UNKNOWN_TARGET",
                    message=f"Biomarker target '{target_id}' is not recognized by system capabilities."
                )
            ).model_dump()
        )

    # 2. Pathway availability for this target
    if "direct" not in target_meta.get("pathways", []):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="PATHWAY_UNAVAILABLE",
                    message=f"Pathway A (direct) is not supported for target '{target_id}'."
                )
            ).model_dump()
        )

    # 3. Upload security validation (in-memory)
    image_bytes = await image.read()
    is_valid, err_code, err_msg = validate_uploaded_image(
        filename=image.filename,
        content_type=image.content_type,
        image_bytes=image_bytes
    )
    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error=ErrorDetail(code=err_code, message=err_msg)
            ).model_dump()
        )

    # 4. Quality gate enforcement: Failed quality => rejection reasons and NO prediction
    quality_result = inspect_image_quality(image_bytes)
    if not quality_result.passed:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="QUALITY_GATE_FAILED",
                    message=f"Quality inspection failed. Cannot proceed to prediction: {'; '.join(quality_result.reasons)}"
                )
            ).model_dump()
        )

    latency_ms = (time.perf_counter() - start_time) * 1000.0
    direct_status = registry.get_status("direct")

    # Anti-hallucination rule 3: STUB status must return prediction: null
    if direct_status == ModelStatus.STUB:
        return DirectPredictResponse(
            status="stub",
            target_id=target_id,
            task_type=target_meta.get("task_type", "regression"),
            prediction=None,
            units=target_meta.get("units"),
            model_version="ResNet50_IMAGENET1K_V2_STUB",
            latency_ms=round(latency_ms, 2),
            warnings=["Demo mode: no trained model loaded"]
        )

    # # PLACEHOLDER: Real forward pass when checkpoint status is LOADED
    return DirectPredictResponse(
        status="stub",
        target_id=target_id,
        task_type=target_meta.get("task_type", "regression"),
        prediction=None,
        units=target_meta.get("units"),
        model_version="ResNet50_IMAGENET1K_V2_STUB",
        latency_ms=round(latency_ms, 2),
        warnings=["Demo mode: no trained model loaded"]
    )


@router.post("/predict/indirect", response_model=IndirectPredictResponse)
async def predict_indirect(
    image: UploadFile = File(...),
    target_id: str = Form(...)
):
    """Pathway B: Indirect reconstruction (external-eye -> generator -> synthetic fundus -> predictor)."""
    start_time = time.perf_counter()

    # 1. Global Pathway B availability check
    caps = get_capabilities_config()
    pathway_b_avail = caps.get("pathway_b_available", False)
    if not pathway_b_avail:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="PATHWAY_UNAVAILABLE",
                    message="Pathway B is formally disabled: no verified paired external-eye and fundus dataset exists."
                )
            ).model_dump()
        )

    # 2. Target check
    target_meta = next((t for t in caps.get("targets", []) if t["id"] == target_id), None)
    if not target_meta:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="UNKNOWN_TARGET",
                    message=f"Biomarker target '{target_id}' is not recognized."
                )
            ).model_dump()
        )

    if "indirect" not in target_meta.get("pathways", []):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="PATHWAY_UNAVAILABLE",
                    message=f"Pathway B (indirect) is not supported for target '{target_id}'."
                )
            ).model_dump()
        )

    # 3. Security validation
    image_bytes = await image.read()
    is_valid, err_code, err_msg = validate_uploaded_image(
        filename=image.filename,
        content_type=image.content_type,
        image_bytes=image_bytes
    )
    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorResponse(
                error=ErrorDetail(code=err_code, message=err_msg)
            ).model_dump()
        )

    # 4. Quality gate
    quality_result = inspect_image_quality(image_bytes)
    if not quality_result.passed:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="QUALITY_GATE_FAILED",
                    message=f"Quality inspection failed. Cannot proceed to prediction: {'; '.join(quality_result.reasons)}"
                )
            ).model_dump()
        )

    latency_ms = (time.perf_counter() - start_time) * 1000.0

    # # PLACEHOLDER: Implementation when verified paired dataset is trained
    return IndirectPredictResponse(
        status="stub",
        target_id=target_id,
        task_type=target_meta.get("task_type", "regression"),
        prediction=None,
        units=target_meta.get("units"),
        model_version="UNAVAILABLE",
        latency_ms=round(latency_ms, 2),
        warnings=["Demo mode: no trained model loaded"],
        generated_image=None,
        generated_image_warning="AI-generated. May not reflect the real retina."
    )


@router.get("/metrics")
def get_metrics() -> List[Dict[str, Any]]:
    """Reads empirical evaluation benchmark files from outputs/metrics/*.json.
    Returns [] if missing or empty.
    """
    metrics = []
    if OUTPUTS_DIR.exists():
        import json
        for file in os.listdir(OUTPUTS_DIR):
            if file.endswith(".json"):
                try:
                    with open(OUTPUTS_DIR / file, "r", encoding="utf-8") as mf:
                        metrics.append(json.load(mf))
                except Exception:
                    continue
    return metrics


@router.get("/model-card")
def get_model_card():
    """Reads standardized model card specification. Returns 404 with error structure if missing."""
    if not MODEL_CARD_FILE.exists():
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="MODEL_CARD_NOT_FOUND",
                    message="Model card specification file is not available."
                )
            ).model_dump()
        )

    data = get_model_card_config()
    if not data:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="MODEL_CARD_NOT_FOUND",
                    message="Model card specification file is empty or unreadable."
                )
            ).model_dump()
        )
    return data


from fastapi import Header, Query
from ..config import RESEARCHER_TOKEN
from ..telemetry import telemetry

@router.get("/researcher")
def get_researcher_metrics(
    x_researcher_token: str = Header(None, alias="X-Researcher-Token"),
    token: str = Query(None)
):
    """Secure endpoint for system telemetry and latency percentiles.
    Protected by env-configured token. Contains strictly no user data or images.
    """
    provided_token = x_researcher_token or token
    if not provided_token or provided_token != RESEARCHER_TOKEN:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="UNAUTHORIZED",
                    message="Invalid or missing researcher token."
                )
            ).model_dump()
        )

    return {
        "status": "authorized",
        "models": registry.get_all_statuses(),
        "telemetry": telemetry.get_summary()
    }


@router.get("/explain/gradcam")
def get_gradcam_status():
    """Grad-CAM explanation endpoint. Returns 'not_available' if direct model is not loaded."""
    direct_status = registry.get_status("direct")
    if direct_status != ModelStatus.LOADED:
        return {
            "status": "not_available",
            "message": "Grad-CAM explanation is not available because the direct model checkpoint is not loaded."
        }
    return {
        "status": "available",
        "message": "Grad-CAM computation enabled."
    }
