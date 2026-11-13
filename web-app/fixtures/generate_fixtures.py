"""
Generate synthetic image fixtures for testing and local development.
NOTICE: These images are entirely synthetic procedural shapes (ellipses/gradients).
They contain ZERO patient data or real human biological imagery.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

def create_fixtures():
    fixtures_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(fixtures_dir, exist_ok=True)

    # 1. Valid synthetic external-eye 1 (PNG)
    img1 = Image.new("RGB", (256, 256), color=(240, 230, 220))
    draw1 = ImageDraw.Draw(img1)
    # Sclera
    draw1.ellipse([28, 64, 228, 192], fill=(245, 245, 250), outline=(200, 180, 180))
    # Iris
    draw1.ellipse([96, 96, 160, 160], fill=(70, 110, 140))
    # Pupil
    draw1.ellipse([116, 116, 140, 140], fill=(20, 20, 20))
    # Palpebral conjunctival lower rim
    draw1.arc([40, 120, 216, 200], start=0, end=180, fill=(220, 120, 120), width=6)
    img1.save(os.path.join(fixtures_dir, "valid_external_eye_1.png"))

    # 2. Valid synthetic external-eye 2 (JPEG)
    img2 = Image.new("RGB", (320, 240), color=(235, 225, 215))
    draw2 = ImageDraw.Draw(img2)
    draw2.ellipse([40, 50, 280, 190], fill=(240, 242, 245), outline=(190, 170, 170))
    draw2.ellipse([120, 80, 200, 160], fill=(90, 70, 50))
    draw2.ellipse([145, 105, 175, 135], fill=(15, 15, 15))
    img2.save(os.path.join(fixtures_dir, "valid_external_eye_2.jpg"), format="JPEG")

    # 3. Blurred synthetic image (fails sharpness threshold)
    img_blurred = img1.filter(ImageFilter.GaussianBlur(radius=8))
    img_blurred.save(os.path.join(fixtures_dir, "blurred_synthetic.png"))

    # 4. Low contrast synthetic image (fails contrast threshold)
    img_low_contrast = Image.new("RGB", (256, 256), color=(128, 128, 128))
    draw_lc = ImageDraw.Draw(img_low_contrast)
    draw_lc.ellipse([64, 64, 192, 192], fill=(130, 130, 130))
    img_low_contrast.save(os.path.join(fixtures_dir, "low_contrast_synthetic.png"))

    # 5. Corrupted image file
    with open(os.path.join(fixtures_dir, "corrupted_image.png"), "wb") as f:
        f.write(b"NOT_A_VALID_IMAGE_HEADER_DATA_STREAM")

    print("[FIXTURES: generated 5 synthetic fixtures in fixtures/]")

if __name__ == "__main__":
    create_fixtures()

