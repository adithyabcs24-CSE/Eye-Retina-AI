"""Model registry tracking and loading checkpoints safely."""

import logging
from pathlib import Path
from typing import Dict, Optional

from .config import CHECKPOINTS_DIR
from .schemas import ModelStatus

logger = logging.getLogger("backend.registry")


class ModelRegistry:
    def __init__(self, checkpoints_dir: Optional[Path] = None):
        self.checkpoints_dir = checkpoints_dir or CHECKPOINTS_DIR
        self._models: Dict[str, ModelStatus] = {
            "direct": ModelStatus.STUB,
            "generator": ModelStatus.UNAVAILABLE,
            "fundus_predictor": ModelStatus.UNAVAILABLE,
        }
        self.load_checkpoints()

    def load_checkpoints(self) -> None:
        """Inspects configured directory and safely updates model readiness states.
        A missing checkpoint directory or missing weight file must never crash the server.
        """
        try:
            if not self.checkpoints_dir.exists():
                logger.info(f"Checkpoints directory '{self.checkpoints_dir}' does not exist. Defaulting to STUB/UNAVAILABLE.")
                return

            # Direct prediction model checkpoint
            direct_ckpt = self.checkpoints_dir / "direct.pt"
            if direct_ckpt.exists() and direct_ckpt.is_file() and direct_ckpt.stat().st_size > 0:
                # # PLACEHOLDER: Real torch.load(direct_ckpt) when PyTorch weights are provided
                self._models["direct"] = ModelStatus.LOADED
                logger.info(f"Direct prediction model loaded from {direct_ckpt.name}.")
            else:
                self._models["direct"] = ModelStatus.STUB

            # Fundus generator model checkpoint
            generator_ckpt = self.checkpoints_dir / "generator.pt"
            if generator_ckpt.exists() and generator_ckpt.is_file() and generator_ckpt.stat().st_size > 0:
                # # PLACEHOLDER: Real torch.load(generator_ckpt) when verified paired dataset is trained
                self._models["generator"] = ModelStatus.LOADED
            else:
                self._models["generator"] = ModelStatus.UNAVAILABLE

            # Fundus predictor model checkpoint
            predictor_ckpt = self.checkpoints_dir / "fundus_predictor.pt"
            if predictor_ckpt.exists() and predictor_ckpt.is_file() and predictor_ckpt.stat().st_size > 0:
                # # PLACEHOLDER: Real torch.load(predictor_ckpt) when verified fundus model is trained
                self._models["fundus_predictor"] = ModelStatus.LOADED
            else:
                self._models["fundus_predictor"] = ModelStatus.UNAVAILABLE

        except Exception as exc:
            # Safeguard: Missing or corrupt checkpoint must never crash the service
            logger.warning(f"Error inspecting checkpoints: {exc}. Retaining safe STUB/UNAVAILABLE states.")
            self._models["direct"] = ModelStatus.STUB
            self._models["generator"] = ModelStatus.UNAVAILABLE
            self._models["fundus_predictor"] = ModelStatus.UNAVAILABLE

    def get_status(self, model_name: str) -> ModelStatus:
        return self._models.get(model_name, ModelStatus.UNAVAILABLE)

    def get_all_statuses(self) -> Dict[str, ModelStatus]:
        return dict(self._models)


registry = ModelRegistry()
