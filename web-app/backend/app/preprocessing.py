"""Image preprocessing matching src/data/preprocessing.py from the ML pipeline."""

import io
from PIL import Image
import numpy as np


def preprocess_image(image_bytes: bytes, target_size: tuple = (224, 224)) -> np.ndarray:
    """Preprocesses an external-eye image:
    1. Loads bytes into PIL Image
    2. Converts to RGB
    3. Resizes to target_size (default 224x224) using bilinear interpolation
    4. Normalizes pixel values using ImageNet mean & std
    
    Source: Matches src/data/preprocessing.py in ML pipeline.
    """
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    pil_img = pil_img.resize(target_size, Image.Resampling.BILINEAR)
    
    arr = np.array(pil_img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    norm = (arr - mean) / std
    
    # HWC -> CHW format
    return np.transpose(norm, (2, 0, 1))

