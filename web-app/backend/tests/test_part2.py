"""Comprehensive unit, security, and contract tests for Part 2 backend logic."""

import io
import os
import shutil
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.main import app
from app.registry import ModelRegistry, registry
from app.schemas import (
    CapabilitiesResponse,
    DirectPredictResponse,
    HealthResponse,
    ModelStatus,
    QualityResponse
)

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.middleware import limiter
    limiter.clear()
    yield
    limiter.clear()


# 1. Quality checks on synthetic fixtures
@pytest.mark.anyio
async def test_quality_check_sharp_fixture():
    transport = ASGITransport(app=app)
    sharp_img = FIXTURES_DIR / "valid_external_eye_1.png"
    assert sharp_img.exists()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(sharp_img, "rb") as f:
            files = {"image": ("valid_eye.png", f, "image/png")}
            res = await client.post("/api/quality", files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is True
        assert len(data["checks"]) >= 5
        assert len(data["reasons"]) == 0
        QualityResponse(**data)  # Validates schema


@pytest.mark.anyio
async def test_quality_check_blurry_fixture():
    transport = ASGITransport(app=app)
    blurry_img = FIXTURES_DIR / "blurred_synthetic.png"
    assert blurry_img.exists()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(blurry_img, "rb") as f:
            files = {"image": ("blurry.png", f, "image/png")}
            res = await client.post("/api/quality", files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is False
        blur_check = next((c for c in data["checks"] if c["name"] == "blur"), None)
        assert blur_check is not None
        assert blur_check["passed"] is False
        assert any("blurry" in r.lower() for r in data["reasons"])


@pytest.mark.anyio
async def test_quality_check_dark_fixture():
    transport = ASGITransport(app=app)
    dark_img = FIXTURES_DIR / "dark_synthetic.png"
    assert dark_img.exists()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(dark_img, "rb") as f:
            files = {"image": ("dark.png", f, "image/png")}
            res = await client.post("/api/quality", files=files)

        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is False
        bright_check = next((c for c in data["checks"] if c["name"] == "brightness"), None)
        assert bright_check is not None
        assert bright_check["passed"] is False
        assert any("brightness" in r.lower() for r in data["reasons"])


# 2. Quality gate enforcement: Failed quality => rejection reasons and NO prediction
@pytest.mark.anyio
async def test_quality_failure_blocks_prediction():
    transport = ASGITransport(app=app)
    blurry_img = FIXTURES_DIR / "blurred_synthetic.png"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(blurry_img, "rb") as f:
            files = {"image": ("blurry.png", f, "image/png")}
            data = {"target_id": "haemoglobin_anaemia"}
            res = await client.post("/api/predict/direct", files=files, data=data)

        # Rejection with 422 Unprocessable Entity
        assert res.status_code == 422
        body = res.json()
        assert "error" in body
        assert body["error"]["code"] == "QUALITY_GATE_FAILED"
        assert "Quality inspection failed" in body["error"]["message"]
        assert "prediction" not in body  # Strictly no prediction returned


# 3. Stub behavior verification
@pytest.mark.anyio
async def test_stub_behavior():
    transport = ASGITransport(app=app)
    valid_img = FIXTURES_DIR / "valid_external_eye_1.png"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(valid_img, "rb") as f:
            files = {"image": ("valid_eye.png", f, "image/png")}
            data = {"target_id": "haemoglobin_anaemia"}
            res = await client.post("/api/predict/direct", files=files, data=data)

        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "stub"
        assert body["prediction"] is None
        assert body["target_id"] == "haemoglobin_anaemia"
        assert "latency_ms" in body
        assert "Demo mode: no trained model loaded" in body["warnings"]
        DirectPredictResponse(**body)  # Validates schema


# 4. Missing checkpoint safety
def test_missing_checkpoint_safety(tmp_path):
    missing_dir = tmp_path / "does_not_exist_checkpoints"
    reg = ModelRegistry(checkpoints_dir=missing_dir)
    # Must not raise an exception; reports safe fallback states
    assert reg.get_status("direct") == ModelStatus.STUB
    assert reg.get_status("generator") == ModelStatus.UNAVAILABLE
    assert reg.get_status("fundus_predictor") == ModelStatus.UNAVAILABLE


# 5. Unknown target_id => 400 Bad Request
@pytest.mark.anyio
async def test_unknown_target_rejection():
    transport = ASGITransport(app=app)
    valid_img = FIXTURES_DIR / "valid_external_eye_1.png"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(valid_img, "rb") as f:
            files = {"image": ("valid.png", f, "image/png")}
            data = {"target_id": "unknown_biomarker_xyz"}
            res = await client.post("/api/predict/direct", files=files, data=data)

        assert res.status_code == 400
        body = res.json()
        assert "error" in body
        assert body["error"]["code"] == "UNKNOWN_TARGET"


# 6. Unavailable pathway => 409 Conflict
@pytest.mark.anyio
async def test_unavailable_pathway_rejection():
    transport = ASGITransport(app=app)
    valid_img = FIXTURES_DIR / "valid_external_eye_1.png"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(valid_img, "rb") as f:
            files = {"image": ("valid.png", f, "image/png")}
            data = {"target_id": "haemoglobin_anaemia"}
            res = await client.post("/api/predict/indirect", files=files, data=data)

        assert res.status_code == 409
        body = res.json()
        assert "error" in body
        assert body["error"]["code"] == "PATHWAY_UNAVAILABLE"
        assert "Pathway B is formally disabled" in body["error"]["message"]


# 7. Upload security: Wrong MIME type
@pytest.mark.anyio
async def test_wrong_file_type_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"image": ("test.txt", io.BytesIO(b"Hello world"), "text/plain")}
        res = await client.post("/api/quality", files=files)

        assert res.status_code == 400
        body = res.json()
        assert body["error"]["code"] == "INVALID_FILE_TYPE"


# 8. Upload security: Oversized file (> 10MB)
@pytest.mark.anyio
async def test_oversized_file_rejection():
    transport = ASGITransport(app=app)
    # Generate 11MB payload
    oversized_bytes = b"\xff\xd8\xff\xe0" + (b"\x00" * (11 * 1024 * 1024))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"image": ("huge.jpg", io.BytesIO(oversized_bytes), "image/jpeg")}
        res = await client.post("/api/quality", files=files)

        assert res.status_code == 400
        body = res.json()
        assert body["error"]["code"] == "FILE_TOO_LARGE"


# 9. Upload security: Spoofed extension (Non-PNG magic bytes in a .png file)
@pytest.mark.anyio
async def test_spoofed_extension_rejection():
    transport = ASGITransport(app=app)
    fake_png_payload = b"GIF89a Fake GIF content pretending to be PNG"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"image": ("malicious.png", io.BytesIO(fake_png_payload), "image/png")}
        res = await client.post("/api/quality", files=files)

        assert res.status_code == 400
        body = res.json()
        assert body["error"]["code"] in ["MAGIC_BYTE_MISMATCH", "MIME_MAGIC_MISMATCH"]


# 10. Operational Security: Rate Limiting
@pytest.mark.anyio
async def test_rate_limiting():
    from app.middleware import limiter
    limiter.clear()
    limiter.max_requests = 3  # Set temporary low threshold for testing

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for _ in range(3):
            r = await client.get("/api/health")
            assert r.status_code == 200

        # 4th request must be rate limited
        r4 = await client.get("/api/health")
        assert r4.status_code == 429
        body = r4.json()
        assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"


# 11. Operational Security: Error Redaction (No stack traces or internal paths)
@pytest.mark.anyio
async def test_error_redaction(monkeypatch):
    from app.registry import registry

    def bugged_statuses():
        raise RuntimeError("SecretInternalDatabaseException at /var/secret/path.py line 42")

    monkeypatch.setattr(registry, "get_all_statuses", bugged_statuses)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 500
        body = res.json()
        assert "error" in body
        assert body["error"]["code"] == "INTERNAL_SERVER_ERROR"
        # Verify stack trace and file path are not leaked
        assert "/var/secret" not in body["error"]["message"]
        assert "line 42" not in body["error"]["message"]
        assert "Traceback" not in str(body)


# 12. Schema Conformance: Health, Capabilities, Model-Card
@pytest.mark.anyio
async def test_schema_conformance():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health schema
        res_h = await client.get("/api/health")
        assert res_h.status_code == 200
        HealthResponse(**res_h.json())

        # Capabilities schema
        res_c = await client.get("/api/capabilities")
        assert res_c.status_code == 200
        CapabilitiesResponse(**res_c.json())


# 13. Privacy Test: Zero image files persisted to disk
@pytest.mark.anyio
async def test_privacy_no_disk_persistence():
    backend_root = Path(__file__).resolve().parent.parent
    uploads_dir = backend_root.parent / "uploads"

    # Count files before
    def count_img_files():
        found = []
        for search_dir in [backend_root, uploads_dir]:
            if search_dir.exists():
                for root, _, files in os.walk(search_dir):
                    if ".venv" in root:
                        continue
                    for f in files:
                        if f.endswith((".png", ".jpg", ".jpeg", ".tmp")):
                            found.append(os.path.join(root, f))
        return found

    before_files = set(count_img_files())

    # Perform multiple uploads
    transport = ASGITransport(app=app)
    valid_img = FIXTURES_DIR / "valid_external_eye_1.png"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open(valid_img, "rb") as f:
            files = {"image": ("test_upload_1.png", f, "image/png")}
            r1 = await client.post("/api/quality", files=files)
            assert r1.status_code == 200

        with open(valid_img, "rb") as f:
            files = {"image": ("test_upload_2.png", f, "image/png")}
            data = {"target_id": "haemoglobin_anaemia"}
            r2 = await client.post("/api/predict/direct", files=files, data=data)
            assert r2.status_code == 200

    after_files = set(count_img_files())
    new_files = after_files - before_files
    # Assert zero new files created on disk
    assert len(new_files) == 0, f"Privacy violation: image files were persisted to disk: {new_files}"
