# REST API Specification

This document summarizes the REST endpoints conforming to `contracts/api_contract.md`.

## 1. System Health & Capabilities

### `GET /api/health`
Returns service availability and status for each registered model.
- **Response**: `200 OK`
```json
{
  "status": "STUB",
  "models": {
    "direct": "STUB",
    "generator": "UNAVAILABLE",
    "fundus_predictor": "UNAVAILABLE"
  }
}
```

### `GET /api/capabilities`
Returns candidate biomarker targets and Pathway B availability.
- **Response**: `200 OK`
```json
{
  "pathway_b_available": false,
  "targets": [
    {
      "id": "diabetes_status",
      "label": "Diabetes Mellitus Status",
      "task_type": "classification",
      "units": null,
      "pathways": ["direct"],
      "status": "STUB"
    }
  ]
}
```

---

## 2. Quality & Inference

### `POST /api/quality`
Performs photographic signal-to-noise quality evaluation on multipart image.
- **Request**: Multipart Form (`image`: binary JPEG/PNG)
- **Response**: `200 OK`
```json
{
  "passed": true,
  "checks": [
    { "name": "resolution", "value": 256.0, "threshold": 224.0, "passed": true },
    { "name": "blur", "value": 450.2, "threshold": 100.0, "passed": true },
    { "name": "brightness", "value": 115.4, "threshold": [40.0, 220.0], "passed": true },
    { "name": "exposure_glare", "value": 0.02, "threshold": 0.15, "passed": true },
    { "name": "eye_visible", "value": true, "threshold": true, "passed": true }
  ],
  "reasons": []
}
```

### `POST /api/predict/direct`
Executes Pathway A end-to-end direct inference from external-eye photograph.
- **Request**: Multipart Form (`image`: binary, `target_id`: string)
- **Response**: `200 OK` (when STUB)
```json
{
  "status": "stub",
  "target_id": "diabetes_status",
  "task_type": "classification",
  "prediction": null,
  "units": null,
  "model_version": null,
  "latency_ms": 3.4,
  "warnings": ["Demo mode: no trained model loaded"]
}
```

### `POST /api/predict/indirect`
Executes Pathway B cross-modal synthetic fundus reconstruction.
- **Response**: `409 Conflict` (when `pathway_b_available: false`)
```json
{
  "error": {
    "code": "PATHWAY_UNAVAILABLE",
    "message": "Pathway B is disabled because no verified paired dataset exists."
  }
}
```

---

## 3. Observability & Metadata

### `GET /api/model-card`
Returns standardized Section 15 governance, intended scope, and limits.

### `GET /api/metrics`
Returns array of empirical evaluation benchmark JSONs from `outputs/metrics/` (returns `[]` if unpopulated).

### `GET /api/researcher`
Protected by `X-Researcher-Token`. Returns system uptime, latency percentiles (`p50`, `p90`, `p99`), and request distributions. Zero user data.

### `GET /api/explain/gradcam`
Returns `{ "status": "not_available" }` when direct CNN weights are unpopulated.

