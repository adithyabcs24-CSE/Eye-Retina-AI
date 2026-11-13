"""Unit and contract tests for Part 1 backend."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.anyio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert "status" in data
        assert "models" in data
        assert data["models"]["direct"] in ["LOADED", "STUB", "UNAVAILABLE"]
        assert data["models"]["generator"] in ["LOADED", "STUB", "UNAVAILABLE"]
        assert data["models"]["fundus_predictor"] in ["LOADED", "STUB", "UNAVAILABLE"]


@pytest.mark.anyio
async def test_capabilities_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/capabilities")
        assert res.status_code == 200
        data = res.json()
        assert "targets" in data
        assert isinstance(data["targets"], list)
        assert data["pathway_b_available"] is False
        for t in data["targets"]:
            assert "id" in t
            assert "label" in t
            assert "task_type" in t
            assert "status" in t


@pytest.mark.anyio
async def test_model_card_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/model-card")
        assert res.status_code == 200
        data = res.json()
        assert "versions" in data
        assert "intended_use" in data
        assert "limitations" in data


@pytest.mark.anyio
async def test_metrics_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/metrics")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)


@pytest.mark.anyio
async def test_static_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        assert "Ophthalmic" in res.text

