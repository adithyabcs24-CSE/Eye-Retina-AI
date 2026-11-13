import os
import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from src.main import app
from src.quality import QualityGate
from src.preprocessing import ImagePreprocessor
from src.model_registry import ModelRegistry

client = TestClient(app)
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "fixtures")

def test_quality_checks_synthetic_fixtures():
    q_gate = QualityGate()

    # 1. Sharp valid fixture
    sharp_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    sharp_img = Image.open(sharp_path)
    report_sharp = q_gate.evaluate(sharp_img)
    assert report_sharp.passed is True
    assert len(report_sharp.reasons) == 0

    # 2. Blurry fixture (fails Laplacian blur score)
    blurry_path = os.path.join(FIXTURES_DIR, "blurred_synthetic.png")
    blurry_img = Image.open(blurry_path)
    report_blurry = q_gate.evaluate(blurry_img)
    assert report_blurry.passed is False
    assert any("blurry" in r for r in report_blurry.reasons)

    # 3. Low-contrast synthetic fixture
    low_contrast_path = os.path.join(FIXTURES_DIR, "low_contrast_synthetic.png")
    lc_img = Image.open(low_contrast_path)
    report_lc = q_gate.evaluate(lc_img)
    assert report_lc.passed is False
    assert len(report_lc.reasons) > 0

    # 4. Corrupted fixture via /api/quality endpoint
    corrupt_path = os.path.join(FIXTURES_DIR, "corrupted_image.png")
    with open(corrupt_path, "rb") as f:
        res = client.post("/api/quality", files={"image": ("corrupted.png", f, "image/png")})
    assert res.status_code == 200
    data = res.json()
    assert data["passed"] is False
    assert any("corrupted" in r for r in data["reasons"])

def test_stub_behavior():
    valid_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(valid_path, "rb") as f:
        res = client.post(
            "/api/predict/direct",
            files={"image": ("valid.png", f, "image/png")},
            data={"target_id": "haemoglobin_anaemia"}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "stub"
    assert data["prediction"] is None
    assert data["latency_ms"] > 0
    assert any("Demo mode" in w for w in data["warnings"])
    assert any("Not a medical diagnosis" in w for w in data["warnings"])

def test_missing_checkpoint_safety(tmp_path):
    # Pass a non-existent directory to ModelRegistry
    empty_checkpoint_dir = tmp_path / "empty_checkpoints"
    empty_checkpoint_dir.mkdir()
    registry = ModelRegistry(checkpoints_dir=empty_checkpoint_dir)
    statuses = registry.get_statuses()
    assert statuses["direct"] == "STUB"
    assert statuses["generator"] == "UNAVAILABLE"
    assert statuses["fundus_predictor"] == "UNAVAILABLE"

def test_unknown_target():
    valid_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(valid_path, "rb") as f:
        res = client.post(
            "/api/predict/direct",
            files={"image": ("valid.png", f, "image/png")},
            data={"target_id": "non_existent_target_xyz"}
        )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "UNKNOWN_TARGET"

def test_unavailable_pathway():
    valid_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(valid_path, "rb") as f:
        res = client.post(
            "/api/predict/indirect",
            files={"image": ("valid.png", f, "image/png")},
            data={"target_id": "haemoglobin_anaemia"}
        )
    assert res.status_code == 409
    data = res.json()
    assert data["error"]["code"] == "PATHWAY_UNAVAILABLE"
    assert "Pathway B" in data["error"]["message"]

def test_quality_failure_blocks_prediction():
    blurry_path = os.path.join(FIXTURES_DIR, "blurred_synthetic.png")
    with open(blurry_path, "rb") as f:
        res = client.post(
            "/api/predict/direct",
            files={"image": ("blurry.png", f, "image/png")},
            data={"target_id": "haemoglobin_anaemia"}
        )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "QUALITY_CHECK_FAILED"
    assert "prediction" not in data

def test_gradcam_endpoint():
    res = client.get("/api/explain/gradcam?target_id=haemoglobin_anaemia")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_available"

def test_preprocessing_shape_and_norm():
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    img = Image.new("RGB", (300, 200), color=(100, 150, 200))
    tensor = preprocessor.preprocess_image(img)
    assert tensor.shape == (3, 224, 224)
    assert tensor.dtype.name == "float32"

