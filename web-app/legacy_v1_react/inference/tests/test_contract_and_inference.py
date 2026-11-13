import os
import json
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "fixtures")

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["gateway"] == "LOADED"
    assert data["inference"] == "LOADED"
    assert data["models"]["direct"] == "STUB"
    assert data["models"]["generator"] == "UNAVAILABLE"
    assert data["models"]["fundus_predictor"] == "UNAVAILABLE"

def test_capabilities_endpoint():
    res = client.get("/api/capabilities")
    assert res.status_code == 200
    data = res.json()
    assert "targets" in data
    assert isinstance(data["targets"], list)
    assert len(data["targets"]) == 6
    assert data["pathway_b_available"] is False
    for target in data["targets"]:
        assert target["status"] == "STUB"
        assert target["pathways"] == ["direct"]

def test_quality_gate_valid_fixture():
    fixture_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(fixture_path, "rb") as f:
        res = client.post("/api/quality", files={"image": ("valid_external_eye_1.png", f, "image/png")})
    assert res.status_code == 200
    data = res.json()
    assert data["passed"] is True
    assert len(data["reasons"]) == 0

def test_quality_gate_corrupted_fixture():
    fixture_path = os.path.join(FIXTURES_DIR, "corrupted_image.png")
    with open(fixture_path, "rb") as f:
        res = client.post("/api/quality", files={"image": ("corrupted_image.png", f, "image/png")})
    assert res.status_code == 200
    data = res.json()
    assert data["passed"] is False
    assert len(data["reasons"]) > 0

def test_predict_direct_stub_response():
    fixture_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(fixture_path, "rb") as f:
        res = client.post(
            "/api/predict/direct",
            files={"image": ("valid_external_eye_1.png", f, "image/png")},
            data={"target_id": "haemoglobin_anaemia"}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "stub"
    assert data["prediction"] is None
    assert data["target_id"] == "haemoglobin_anaemia"
    assert any("Demo mode" in w for w in data["warnings"])

def test_predict_indirect_stub_response():
    fixture_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(fixture_path, "rb") as f:
        res = client.post(
            "/api/predict/indirect",
            files={"image": ("valid_external_eye_1.png", f, "image/png")},
            data={"target_id": "diabetes_status"}
        )
    assert res.status_code == 409
    data = res.json()
    assert data["error"]["code"] == "PATHWAY_UNAVAILABLE"

def test_predict_compare_stub_response():
    fixture_path = os.path.join(FIXTURES_DIR, "valid_external_eye_1.png")
    with open(fixture_path, "rb") as f:
        res = client.post(
            "/api/predict/compare",
            files={"image": ("valid_external_eye_1.png", f, "image/png")},
            data={"target_id": "haemoglobin_anaemia"}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["direct"]["prediction"] is None
    assert data["indirect"]["prediction"] is None
    assert data["disagreement_summary"]["reconstruction_adds_value"] is None

def test_metrics_empty():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    assert res.json() == []

def test_model_card():
    res = client.get("/api/model-card")
    assert res.status_code == 200
    data = res.json()
    assert "versions" in data
    assert "limitations" in data

