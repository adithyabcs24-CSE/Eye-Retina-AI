"""Tests for Part 4 features: Security headers, Telemetry, and Hardening."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.config import RESEARCHER_TOKEN
from app.middleware import limiter


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.clear()
    yield
    limiter.clear()


@pytest.mark.anyio
async def test_security_headers_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["x-frame-options"] == "DENY"
        assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        assert "content-security-policy" in res.headers
        assert "default-src 'self'" in res.headers["content-security-policy"]


@pytest.mark.anyio
async def test_researcher_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthorized without token
        unauth = await client.get("/api/researcher")
        assert unauth.status_code == 401
        assert unauth.json()["error"]["code"] == "UNAUTHORIZED"

        # Unauthorized with wrong token
        wrong = await client.get("/api/researcher", headers={"X-Researcher-Token": "bad-token"})
        assert wrong.status_code == 401

        # Authorized with valid token
        auth = await client.get("/api/researcher", headers={"X-Researcher-Token": RESEARCHER_TOKEN})
        assert auth.status_code == 200
        data = auth.json()
        assert data["status"] == "authorized"
        assert "telemetry" in data
        assert "latency_percentiles_ms" in data["telemetry"]
        assert "models" in data


@pytest.mark.anyio
async def test_gradcam_endpoint_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/explain/gradcam")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "not_available"
