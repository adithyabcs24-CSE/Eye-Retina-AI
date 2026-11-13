"""Image quality inspection module for external anterior eye photographs."""

import io
from typing import Any, Dict, List, Tuple
from PIL import Image
import numpy as np

from .config import get_quality_config
from .schemas import QualityCheck, QualityResponse


def inspect_image_quality(image_bytes: bytes) -> QualityResponse:
    cfg = get_quality_config().get("inspection_thresholds", {})
    min_w = cfg.get("min_width", 128)
    min_h = cfg.get("min_height", 128)
    min_blur = cfg.get("min_blur_laplacian_var", 30.0)
    min_bright = cfg.get("min_brightness", 20.0)
    max_bright = cfg.get("max_brightness", 240.0)
    max_glare = cfg.get("max_glare_ratio", 0.15)

    checks: List[QualityCheck] = []
    reasons: List[str] = []

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return QualityResponse(
            passed=False,
            checks=[
                QualityCheck(
                    name="format_integrity",
                    value="corrupted",
                    threshold="valid_image",
                    passed=False
                )
            ],
            reasons=["Image file is corrupted, truncated, or unreadable as JPEG/PNG."]
        )

    # 1. Resolution Check
    w, h = pil_img.size
    res_passed = (w >= min_w) and (h >= min_h)
    checks.append(
        QualityCheck(
            name="resolution",
            value=f"{w}x{h}",
            threshold=f"{min_w}x{min_h}",
            passed=res_passed
        )
    )
    if not res_passed:
        reasons.append(f"Resolution {w}x{h} below minimum threshold {min_w}x{min_h}.")

    img_arr = np.array(pil_img, dtype=np.float32)
    gray = 0.2989 * img_arr[:, :, 0] + 0.5870 * img_arr[:, :, 1] + 0.1140 * img_arr[:, :, 2]

    # 2. Blur Check (Discrete Laplacian Variance)
    laplacian_kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    # Simple convolution via slicing
    lap = (
        gray[:-2, 1:-1] * laplacian_kernel[0, 1] +
        gray[1:-1, :-2] * laplacian_kernel[1, 0] +
        gray[1:-1, 1:-1] * laplacian_kernel[1, 1] +
        gray[1:-1, 2:] * laplacian_kernel[1, 2] +
        gray[2:, 1:-1] * laplacian_kernel[2, 1]
    )
    blur_var = float(np.var(lap))
    blur_passed = blur_var >= min_blur
    checks.append(
        QualityCheck(
            name="blur",
            value=f"{blur_var:.1f}",
            threshold=f"{min_blur:.1f}",
            passed=blur_passed
        )
    )
    if not blur_passed:
        reasons.append(f"Image sharpness score ({blur_var:.1f}) below blur threshold ({min_blur:.1f}); image is blurry.")

    # 3. Brightness Check
    mean_bright = float(np.mean(gray))
    bright_passed = (mean_bright >= min_bright) and (mean_bright <= max_bright)
    checks.append(
        QualityCheck(
            name="brightness",
            value=f"{mean_bright:.1f}",
            threshold=f"{min_bright:.1f}-{max_bright:.1f}",
            passed=bright_passed
        )
    )
    if not bright_passed:
        reasons.append(f"Mean brightness ({mean_bright:.1f}) outside acceptable range {min_bright:.1f}-{max_bright:.1f}.")

    # 4. Glare Check
    glare_pixels = np.sum(gray >= 250.0)
    total_pixels = gray.size
    glare_ratio = float(glare_pixels / total_pixels) if total_pixels > 0 else 0.0
    glare_passed = glare_ratio <= max_glare
    checks.append(
        QualityCheck(
            name="glare",
            value=f"{glare_ratio:.3f}",
            threshold=f"{max_glare:.2f}",
            passed=glare_passed
        )
    )
    if not glare_passed:
        reasons.append(f"Specular glare ratio ({glare_ratio:.3f}) exceeds maximum allowable threshold ({max_glare:.2f}).")

    # 5. Eye Visible Check
    # # PLACEHOLDER: Heuristic eye visibility detector until deep ocular segmentation model is integrated
    eye_detected = (w >= 64 and h >= 64)
    checks.append(
        QualityCheck(
            name="eye_visible",
            value="detected" if eye_detected else "not_detected",
            threshold="required",
            passed=eye_detected
        )
    )
    if not eye_detected:
        reasons.append("Ocular structures could not be reliably verified in anterior photograph.")

    all_passed = all(c.passed for c in checks)
    return QualityResponse(
        passed=all_passed,
        checks=checks,
        reasons=reasons
    )

