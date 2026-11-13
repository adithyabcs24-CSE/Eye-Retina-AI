"""
Model Registry managing model checkpoints, lifecycle statuses, and stub execution.
Models:
- direct: Direct CNN encoder + head for external-eye prediction (Pathway A)
- generator: Cross-modal external-eye to fundus generator (Pathway B)
- fundus_predictor: Downstream predictor operating on fundus representations
"""

from __future__ import annotations
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np

logger = logging.getLogger("inference.model_registry")

class ModelRegistry:
    def __init__(self, checkpoints_dir: str | Path | None = None):
        if checkpoints_dir is None:
            self.checkpoints_dir = Path(os.environ.get("CHECKPOINTS_DIR", Path(__file__).resolve().parent.parent / "checkpoints"))
        else:
            self.checkpoints_dir = Path(checkpoints_dir)

        self.models_status: Dict[str, str] = {
            "direct": "STUB",
            "generator": "UNAVAILABLE",
            "fundus_predictor": "UNAVAILABLE"
        }
        self.model_instances: Dict[str, Any] = {}
        self.load_checkpoints()

    def load_checkpoints(self) -> None:
        """
        Inspect checkpoint directory and load available weights.
        A missing checkpoint NEVER crashes the service.
        """
        if not self.checkpoints_dir.exists():
            logger.info("Checkpoints directory %s does not exist; operating in STUB mode.", self.checkpoints_dir)
            self.models_status["direct"] = "STUB"
            self.models_status["generator"] = "UNAVAILABLE"
            self.models_status["fundus_predictor"] = "UNAVAILABLE"
            return

        # 1. Direct Model Checkpoint
        direct_pt = self.checkpoints_dir / "direct_baseline.pt"
        if direct_pt.is_file():
            try:
                # # PLACEHOLDER: Real torch.load(direct_pt) when weights exist
                logger.info("Found direct baseline checkpoint: %s", direct_pt)
                self.models_status["direct"] = "LOADED"
            except Exception as e:
                logger.warning("Failed to load direct checkpoint %s: %s; falling back to STUB.", direct_pt, e)
                self.models_status["direct"] = "STUB"
        else:
            self.models_status["direct"] = "STUB"

        # 2. Generator Checkpoint (Pathway B)
        gen_pt = self.checkpoints_dir / "fundus_generator.pt"
        if gen_pt.is_file():
            try:
                self.models_status["generator"] = "LOADED"
            except Exception as e:
                logger.warning("Failed to load generator checkpoint: %s; setting UNAVAILABLE.", e)
                self.models_status["generator"] = "UNAVAILABLE"
        else:
            self.models_status["generator"] = "UNAVAILABLE"

        # 3. Fundus Predictor Checkpoint
        fundus_pred_pt = self.checkpoints_dir / "fundus_predictor.pt"
        if fundus_pred_pt.is_file():
            try:
                self.models_status["fundus_predictor"] = "LOADED"
            except Exception as e:
                logger.warning("Failed to load fundus predictor checkpoint: %s; setting UNAVAILABLE.", e)
                self.models_status["fundus_predictor"] = "UNAVAILABLE"
        else:
            self.models_status["fundus_predictor"] = "UNAVAILABLE"

    def get_statuses(self) -> Dict[str, str]:
        return dict(self.models_status)

    def predict_direct(self, tensor: np.ndarray, target_id: str, target_meta: Dict[str, Any], latency_ms: float) -> Dict[str, Any]:
        """
        Direct prediction (Pathway A).
        STUB rule: Returns status 'stub' and prediction null. Never invents realistic numbers.
        """
        status = self.models_status.get("direct", "STUB").lower()
        if status == "stub":
            return {
                "status": "stub",
                "target_id": target_id,
                "task_type": target_meta["task_type"],
                "prediction": None,
                "units": target_meta.get("units"),
                "model_version": "0.1.0-stub",
                "latency_ms": latency_ms,
                "warnings": [
                    "Demo mode: no trained model loaded.",
                    "Research prototype. Not a medical diagnosis."
                ]
            }
        
        # # PLACEHOLDER: Real inference when direct model status is LOADED
        return {
            "status": "loaded",
            "target_id": target_id,
            "task_type": target_meta["task_type"],
            "prediction": None,
            "units": target_meta.get("units"),
            "model_version": "1.0.0",
            "latency_ms": latency_ms,
            "warnings": ["Research prototype. Not a medical diagnosis."]
        }

    def predict_indirect(self, tensor: np.ndarray, target_id: str, target_meta: Dict[str, Any], latency_ms: float) -> Dict[str, Any]:
        """
        Indirect prediction (Pathway B).
        STUB rule: When generator is unavailable or stub, returns blocked status and null prediction.
        """
        status = self.models_status.get("generator", "UNAVAILABLE").lower()
        return {
            "status": "stub" if status == "stub" else "unavailable",
            "target_id": target_id,
            "task_type": target_meta["task_type"],
            "prediction": None,
            "units": target_meta.get("units"),
            "model_version": "0.1.0-stub",
            "latency_ms": latency_ms,
            "warnings": [
                "Demo mode: no trained model loaded.",
                "Research prototype. Not a medical diagnosis."
            ],
            "generated_image": None,
            "generated_image_warning": "AI-generated. May not reflect the real retina. Pathway B models are currently unavailable."
        }

    def get_gradcam(self, target_id: str) -> Dict[str, str]:
        """
        Grad-CAM activation map hook.
        Implemented only if direct model is LOADED and supports it.
        """
        if self.models_status.get("direct") == "LOADED" and "direct" in self.model_instances:
            # # PLACEHOLDER: Compute real Grad-CAM heatmaps from CNN convolutional feature maps
            return {"status": "available", "heatmap_base64": ""}
        return {
            "status": "not_available",
            "message": "Grad-CAM explanation is not available in stub mode or when direct model is not loaded."
        }

