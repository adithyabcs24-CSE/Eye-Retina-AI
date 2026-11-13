"""Pydantic schemas mirroring contracts/api_contract.md exactly."""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class ModelStatus(str, Enum):
    LOADED = "LOADED"
    STUB = "STUB"
    UNAVAILABLE = "UNAVAILABLE"


class HealthModels(BaseModel):
    direct: ModelStatus
    generator: ModelStatus
    fundus_predictor: ModelStatus


class HealthResponse(BaseModel):
    status: ModelStatus
    models: HealthModels


class TargetItem(BaseModel):
    id: str
    label: str
    task_type: Literal["classification", "regression"]
    units: Optional[str] = None
    pathways: List[Literal["direct", "indirect"]]
    status: ModelStatus


class CapabilitiesResponse(BaseModel):
    targets: List[TargetItem]
    pathway_b_available: bool


class QualityCheck(BaseModel):
    name: str
    value: str
    threshold: str
    passed: bool


class QualityResponse(BaseModel):
    passed: bool
    checks: List[QualityCheck]
    reasons: List[str] = Field(default_factory=list)


class DirectPredictResponse(BaseModel):
    status: Literal["loaded", "stub", "unavailable"]
    target_id: str
    task_type: str
    prediction: Optional[Union[float, str]] = None
    units: Optional[str] = None
    model_version: str
    latency_ms: float
    warnings: List[str] = Field(default_factory=list)


class IndirectPredictResponse(DirectPredictResponse):
    generated_image: Optional[str] = None
    generated_image_warning: str = "AI-generated. May not reflect the real retina."


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail

