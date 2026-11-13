"""
Quality evaluation module for external-eye photographs.
Evaluates:
- Resolution (width, height)
- Blur / Sharpness (variance of 2D discrete Laplacian)
- Mean Brightness (underexposure / darkness check)
- Exposure / Glare (fraction of saturated pixels > 250)
- Eye Visibility (heuristic anatomical aspect and contrast check)
"""

from __future__ import annotations
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Tuple
import numpy as np
from PIL import Image

@dataclass
class QualityItem:
    name: str
    value: float
    threshold: float
    passed: bool

@dataclass
class QualityReport:
    passed: bool
    checks: List[QualityItem] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "checks": [
                {
                    "name": c.name,
                    "value": round(c.value, 4),
                    "threshold": round(c.threshold, 4),
                    "passed": c.passed
                }
                for c in self.checks
            ],
            "reasons": self.reasons
        }

class QualityGate:
    def __init__(self, config_path: str | Path | None = None):
        if config_path is None:
            config_path = Path(__file__).resolve().parent.parent / "config" / "quality_thresholds.json"
        
        with open(config_path, "r", encoding="utf-8") as f:
            self.cfg: Dict[str, Any] = json.load(f)

        self.min_width = int(self.cfg.get("min_width", 128))
        self.min_height = int(self.cfg.get("min_height", 128))
        self.min_brightness = float(self.cfg.get("min_brightness", 20.0))
        self.max_brightness = float(self.cfg.get("max_brightness", 240.0))
        self.min_contrast = float(self.cfg.get("min_contrast", 10.0))
        self.min_blur_score = float(self.cfg.get("min_blur_score", 30.0))
        self.max_glare_ratio = float(self.cfg.get("max_glare_ratio", 0.15))
        self.min_eye_visibility_score = float(self.cfg.get("min_eye_visibility_score", 0.40))

    @staticmethod
    def compute_laplacian_variance(gray_arr: np.ndarray) -> float:
        """2D Discrete Laplacian kernel variance for focus and sharpness."""
        h, w = gray_arr.shape
        if h < 3 or w < 3:
            return 0.0
        lap = (
            gray_arr[0:-2, 1:-1]
            + gray_arr[2:, 1:-1]
            + gray_arr[1:-1, 0:-2]
            + gray_arr[1:-1, 2:]
            - 4.0 * gray_arr[1:-1, 1:-1]
        )
        return float(np.var(lap))

    def _check_eye_visibility_heuristic(self, gray_arr: np.ndarray, w: int, h: int) -> Tuple[float, bool]:
        """
        # PLACEHOLDER: Eye visible check implemented as a heuristic ocular presence estimator
        until an anatomical landmark/iris segmentation neural detector is attached.
        Evaluates horizontal aspect ratio, central luminance difference, and ocular contrast.
        """
        aspect_ratio = w / max(h, 1)
        # Eye photos typically have width-to-height ratio between 0.6 and 2.5
        aspect_ok = 0.5 <= aspect_ratio <= 2.5
        
        # Central vs peripheral gradient (iris/pupil region typically darker than surrounding sclera)
        ch_start, ch_end = int(h * 0.3), int(h * 0.7)
        cw_start, cw_end = int(w * 0.3), int(w * 0.7)
        central_region = gray_arr[ch_start:ch_end, cw_start:cw_end]
        peripheral_region = np.concatenate([
            gray_arr[:ch_start, :].ravel(),
            gray_arr[ch_end:, :].ravel(),
            gray_arr[ch_start:ch_end, :cw_start].ravel(),
            gray_arr[ch_start:ch_end, cw_end:].ravel()
        ])
        
        contrast_score = float(np.std(gray_arr)) / 128.0
        score = 0.5 if aspect_ok else 0.2
        if len(peripheral_region) > 0 and central_region.size > 0:
            diff = abs(float(np.mean(peripheral_region)) - float(np.mean(central_region))) / 128.0
            score += min(diff * 0.3 + contrast_score * 0.2, 0.5)

        score = float(min(max(score, 0.0), 1.0))
        passed = score >= self.min_eye_visibility_score
        return score, passed

    def evaluate(self, image: Image.Image) -> QualityReport:
        w, h = image.size
        # Convert to RGB array and Grayscale luminance array
        rgb_image = image.convert("RGB")
        rgb_arr = np.array(rgb_image, dtype=np.float32)
        # Luminance per ITU-R BT.601
        gray_arr = 0.299 * rgb_arr[:, :, 0] + 0.587 * rgb_arr[:, :, 1] + 0.114 * rgb_arr[:, :, 2]

        checks: List[QualityItem] = []
        reasons: List[str] = []

        # 1. Resolution checks
        min_dim = min(w, h)
        res_passed = (w >= self.min_width) and (h >= self.min_height)
        checks.append(QualityItem(
            name="min_resolution",
            value=float(min_dim),
            threshold=float(min(self.min_width, self.min_height)),
            passed=res_passed
        ))
        if not res_passed:
            reasons.append(f"Image resolution {w}x{h} is below minimum requirement {self.min_width}x{self.min_height}.")

        # 2. Blur / Sharpness check
        blur_score = self.compute_laplacian_variance(gray_arr)
        blur_passed = blur_score >= self.min_blur_score
        checks.append(QualityItem(
            name="sharpness_laplacian",
            value=blur_score,
            threshold=self.min_blur_score,
            passed=blur_passed
        ))
        if not blur_passed:
            reasons.append(f"Image sharpness score ({blur_score:.1f}) is below threshold ({self.min_blur_score:.1f}); image is blurry.")

        # 3. Brightness check
        mean_brightness = float(np.mean(gray_arr))
        bright_passed = (self.min_brightness <= mean_brightness <= self.max_brightness)
        checks.append(QualityItem(
            name="mean_brightness",
            value=mean_brightness,
            threshold=self.min_brightness,
            passed=bright_passed
        ))
        if not bright_passed:
            if mean_brightness < self.min_brightness:
                reasons.append(f"Image is severely underexposed (brightness {mean_brightness:.1f} < {self.min_brightness:.1f}).")
            else:
                reasons.append(f"Image is severely overexposed (brightness {mean_brightness:.1f} > {self.max_brightness:.1f}).")

        # 4. Exposure / Glare check
        glare_ratio = float(np.mean(gray_arr > 250.0))
        glare_passed = glare_ratio <= self.max_glare_ratio
        checks.append(QualityItem(
            name="glare_ratio",
            value=glare_ratio,
            threshold=self.max_glare_ratio,
            passed=glare_passed
        ))
        if not glare_passed:
            reasons.append(f"Sensor saturation / specular glare ratio ({glare_ratio * 100:.1f}%) exceeds maximum threshold ({self.max_glare_ratio * 100:.1f}%).")

        # 5. Eye visibility check (heuristic / placeholder detector)
        eye_score, eye_passed = self._check_eye_visibility_heuristic(gray_arr, w, h)
        checks.append(QualityItem(
            name="eye_visible",
            value=eye_score,
            threshold=self.min_eye_visibility_score,
            passed=eye_passed
        ))
        if not eye_passed:
            reasons.append(f"Ocular feature confidence ({eye_score:.2f}) is below threshold ({self.min_eye_visibility_score:.2f}); no eye detected.")

        overall_passed = len(reasons) == 0
        return QualityReport(passed=overall_passed, checks=checks, reasons=reasons)

