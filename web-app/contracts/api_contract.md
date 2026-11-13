# API Contract: Ophthalmic & Systemic Biomarker Research Prototype

> **CLINICAL NOTICE**:
> **Research prototype. Not a medical diagnosis.**
> This API is designed strictly for scientific algorithm benchmarking. It is never used for clinical patient diagnosis, screening, or medical decision-making.

---

## 1. Global Specifications

- **Base URL**: `http://127.0.0.1:8000/api`
- **Protocol**: HTTP/1.1, JSON payload responses.
- **Upload Restrictions**: External-eye photographs only (never retinal fundus images).
  - Allowed formats: `image/jpeg`, `image/png` (configured in `config/quality_thresholds.json`).
  - Max upload size: $10\text{ MB}$ (10,485,760 bytes, configured in `config/quality_thresholds.json`).
- **Standard Error Structure**:
  ```json
  {
    "error": {
      "code": "STRING_ERROR_CODE",
      "message": "Human-readable sanitized message without stack traces or internal paths"
    }
  }
  ```

---

## 2. Endpoints

### 2.1 GET `/api/health`
Inspects operational health of service and model registry statuses.

- **Response (200 OK)**:
  ```json
  {
    "status": "LOADED | STUB | UNAVAILABLE",
    "models": {
      "direct": "LOADED | STUB | UNAVAILABLE",
      "generator": "LOADED | STUB | UNAVAILABLE",
      "fundus_predictor": "LOADED | STUB | UNAVAILABLE"
    }
  }
  ```

### 2.2 GET `/api/capabilities`
Dynamic capability discovery read directly from `config/capabilities.json`.

- **Response (200 OK)**:
  ```json
  {
    "targets": [
      {
        "id": "haemoglobin_anaemia",
        "label": "Haemoglobin & Anaemia",
        "task_type": "regression",
        "units": "g/dL",
        "pathways": ["direct"],
        "status": "STUB"
      }
    ],
    "pathway_b_available": false
  }
  ```

### 2.3 POST `/api/quality`
Pre-inference quality gate for anterior external-eye photographs.

- **Request**: Multipart form-data with `image` (binary).
- **Response (200 OK)**:
  ```json
  {
    "passed": true,
    "checks": [
      {
        "name": "resolution",
        "value": "800x600",
        "threshold": "128x128",
        "passed": true
      },
      {
        "name": "blur",
        "value": "114.5",
        "threshold": "30.0",
        "passed": true
      },
      {
        "name": "brightness",
        "value": "128.2",
        "threshold": "20.0-240.0",
        "passed": true
      },
      {
        "name": "glare",
        "value": "0.02",
        "threshold": "0.15",
        "passed": true
      },
      {
        "name": "eye_visible",
        "value": "detected",
        "threshold": "required",
        "passed": true
      }
    ],
    "reasons": []
  }
  ```

### 2.4 POST `/api/predict/direct`
Pathway A: External-eye $\to$ Preprocess $\to$ CNN Encoder $\to$ Biomarker Head.

- **Request**: Multipart form-data:
  - `image`: binary file.
  - `target_id`: string (candidate target identifier).
- **Response (200 OK - STUB mode)**:
  ```json
  {
    "status": "stub",
    "target_id": "haemoglobin_anaemia",
    "task_type": "regression",
    "prediction": null,
    "units": "g/dL",
    "model_version": "ResNet50_STUB",
    "latency_ms": 14.2,
    "warnings": ["Demo mode: no trained model loaded"]
  }
  ```
- **Response (400 Bad Request)**: Unknown `target_id` or invalid file format/size.
- **Response (422 Unprocessable Content)**: Quality gate failed with rejection reasons.

### 2.5 POST `/api/predict/indirect`
Pathway B: External-eye $\to$ Preprocess $\to$ Fundus Generator $\to$ Synthetic Fundus $\to$ Predictor.

- **Request**: Multipart form-data:
  - `image`: binary file.
  - `target_id`: string.
- **Response (200 OK - When trained & verified)**:
  ```json
  {
    "status": "stub",
    "target_id": "haemoglobin_anaemia",
    "task_type": "regression",
    "prediction": null,
    "units": "g/dL",
    "model_version": "UNAVAILABLE",
    "latency_ms": 0.0,
    "warnings": ["Demo mode: no trained model loaded"],
    "generated_image": null,
    "generated_image_warning": "AI-generated. May not reflect the real retina."
  }
  ```
- **Response (409 Conflict - When pathway is unavailable)**:
  ```json
  {
    "error": {
      "code": "PATHWAY_UNAVAILABLE",
      "message": "Pathway B is formally disabled: no verified paired external-eye and fundus dataset exists."
    }
  }
  ```

### 2.6 GET `/api/metrics`
Reads validation summaries from `outputs/metrics/*.json`. Returns `[]` if directory is empty.

- **Response (200 OK)**:
  ```json
  []
  ```

### 2.7 GET `/api/model-card`
Reads standardized model specifications, training cohort data, and Section 15 limitations from `config/model_card.json`.

- **Response (200 OK)**:
  ```json
  {
    "versions": {
      "direct_encoder": "ResNet50_IMAGENET1K_V2_STUB",
      "fundus_generator": "UNAVAILABLE",
      "fundus_predictor": "UNAVAILABLE",
      "pipeline_version": "0.1.0-stub"
    },
    "training_data": {
      "name": "Synthetic Fixtures & Demo Cohort Stubs",
      "provenance": "No real patient data loaded in stub mode",
      "pairs_verified": false
    },
    "intended_use": "Investigational research prototype to benchmark feasibility of direct biomarker prediction vs cross-modal reconstruction from anterior external-eye photographs.",
    "out_of_scope_use": "Clinical patient diagnosis, triage, disease screening, or medical advice. Not an FDA/CE approved device.",
    "limitations": [
      "Optical barrier: External photography captures anterior eye segment only; no direct visualization of posterior retina microvasculature.",
      "No paired external-fundus datasets are currently loaded; Pathway B is strictly disabled to prevent generative hallucination.",
      "Ambient lighting, white-balance variation, and conjunctival inflammation introduce systemic colorimetric confounding."
    ]
  }
  ```

