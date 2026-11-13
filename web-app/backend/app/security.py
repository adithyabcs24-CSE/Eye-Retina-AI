"""Upload validation and security utilities (memory-only, magic-byte checks)."""

import io
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image

from .config import get_quality_config


def validate_uploaded_image(
    filename: Optional[str],
    content_type: Optional[str],
    image_bytes: bytes
) -> Tuple[bool, Optional[str], Optional[str]]:
    """Validates an uploaded image strictly in memory.
    
    Checks:
    1. Size limit (from config/quality_thresholds.json)
    2. MIME type check
    3. File extension check
    4. Magic byte signature verification (prevents extension spoofing)
    5. Pillow decode integrity check
    
    Returns:
        (is_valid, error_code, error_message)
    """
    quality_cfg = get_quality_config()
    upload_limits = quality_cfg.get("upload_limits", {})
    max_size = upload_limits.get("max_size_bytes", 10485760)
    allowed_mime = upload_limits.get("allowed_mime_types", ["image/jpeg", "image/png"])
    allowed_exts = upload_limits.get("allowed_extensions", [".jpg", ".jpeg", ".png"])

    # 1. Size check
    if not image_bytes or len(image_bytes) == 0:
        return False, "EMPTY_FILE", "Uploaded file is empty (0 bytes)."
    if len(image_bytes) > max_size:
        return False, "FILE_TOO_LARGE", f"File size ({len(image_bytes)/(1024*1024):.2f} MB) exceeds maximum limit of {max_size/(1024*1024):.1f} MB."

    # 2. MIME type check
    if not content_type or content_type.lower() not in [m.lower() for m in allowed_mime]:
        return False, "INVALID_FILE_TYPE", f"MIME type '{content_type}' is not permitted. Only JPEG and PNG are allowed."

    # 3. File extension check
    if filename:
        ext = Path(filename).suffix.lower()
        if ext not in allowed_exts:
            return False, "INVALID_FILE_EXTENSION", f"File extension '{ext}' is not permitted. Only .jpg, .jpeg, and .png are allowed."

    # 4. Magic-byte verification (Strict anti-spoofing)
    is_jpeg_magic = image_bytes.startswith(b"\xff\xd8\xff")
    is_png_magic = image_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    if not (is_jpeg_magic or is_png_magic):
        return False, "MAGIC_BYTE_MISMATCH", "File magic bytes do not match valid JPEG or PNG signatures (spoofed extension or non-image)."

    if is_jpeg_magic and content_type == "image/png":
        return False, "MIME_MAGIC_MISMATCH", "MIME type indicates PNG, but payload header contains JPEG signature."
    if is_png_magic and content_type in ["image/jpeg", "image/jpg"]:
        return False, "MIME_MAGIC_MISMATCH", "MIME type indicates JPEG, but payload header contains PNG signature."

    # 5. Pillow decode check
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.verify()
        # Verify invalidates the buffer; re-open and load pixel data
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.load()
        if pil_img.format not in ["JPEG", "PNG"]:
            return False, "UNSUPPORTED_IMAGE_FORMAT", f"Decoded image format '{pil_img.format}' is not supported."
    except Exception as exc:
        return False, "CORRUPT_IMAGE", f"Image file is corrupt, truncated, or unreadable: {str(exc)}"

    return True, None, None

