"""
# SOURCE: src/data/preprocessing.py from Ophthalmic Biomarker ML pipeline
# Medical image preprocessing and standard normalization.
# Strictly preserves medical colorimetric information without artificial color jitter.
"""

from __future__ import annotations
from typing import Tuple
import numpy as np
from PIL import Image

# ImageNet default standardization parameters
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

class ImagePreprocessor:
    """Preprocesses external-eye and fundus images for CNN feature extraction."""

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size

    def preprocess_image(self, image: Image.Image) -> np.ndarray:
        """
        Converts an image to standardized 3-channel RGB, resizes to target_size,
        and scales to [0, 1] followed by ImageNet mean/std normalization.
        
        Returns:
            np.ndarray of shape (3, target_height, target_width) with dtype float32.
        """
        # 1. Consistent RGB conversion
        rgb_image = image.convert("RGB")
        
        # 2. High-quality bilinear resize
        resized = rgb_image.resize(self.target_size, Image.Resampling.BILINEAR)
        
        # 3. Scale to [0.0, 1.0]
        arr = np.array(resized, dtype=np.float32) / 255.0
        
        # 4. Standardize with mean/std
        normalized = (arr - IMAGENET_MEAN) / IMAGENET_STD
        
        # 5. Channel-first transpose (C, H, W)
        ch_first = np.transpose(normalized, (2, 0, 1))
        return ch_first

