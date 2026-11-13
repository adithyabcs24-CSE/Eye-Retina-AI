"""Configuration loader for the backend service."""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

# Base paths:
# app/ is in backend/app/
# web-app/ is two levels up from app/
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

CONFIG_DIR = ROOT_DIR / "config"
OUTPUTS_DIR = ROOT_DIR / "outputs" / "metrics"
FRONTEND_DIR = ROOT_DIR / "frontend"
CHECKPOINTS_DIR = Path(os.getenv("CHECKPOINTS_DIR", str(ROOT_DIR / "checkpoints")))

CAPABILITIES_FILE = CONFIG_DIR / "capabilities.json"
QUALITY_THRESHOLDS_FILE = CONFIG_DIR / "quality_thresholds.json"
MODEL_CARD_FILE = CONFIG_DIR / "model_card.json"

# CORS and Operational Security Configuration
CORS_ORIGINS: List[str] = [
    orig.strip() for orig in os.getenv("CORS_ORIGINS", "*").split(",") if orig.strip()
]
RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))


def load_json_file(file_path: Path, default: Any = None) -> Any:
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return default or {}
    return default or {}


def get_capabilities_config() -> Dict[str, Any]:
    return load_json_file(CAPABILITIES_FILE, {"targets": [], "pathway_b_available": False})


def get_quality_config() -> Dict[str, Any]:
    return load_json_file(
        QUALITY_THRESHOLDS_FILE,
        {
            "upload_limits": {
                "max_size_bytes": 10485760,
                "allowed_mime_types": ["image/jpeg", "image/png"],
                "allowed_extensions": [".jpg", ".jpeg", ".png"]
            },
            "inspection_thresholds": {
                "min_width": 128,
                "min_height": 128,
                "min_blur_laplacian_var": 30.0,
                "min_brightness": 20.0,
                "max_brightness": 240.0,
                "max_glare_ratio": 0.15
            }
        }
    )


def get_model_card_config() -> Dict[str, Any]:
    return load_json_file(MODEL_CARD_FILE, {})

RESEARCHER_TOKEN: str = os.getenv("RESEARCHER_TOKEN", "researcher-secret-key-123")

FIXTURES_DIR = ROOT_DIR / "fixtures"
