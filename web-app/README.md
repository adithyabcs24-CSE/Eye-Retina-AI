# Ophthalmic & Systemic Biomarker Research Prototype

> **Investigational Research Prototype. Not a medical device. Not for clinical diagnosis.**

An engineering workbench exploring machine learning feasibility for predicting systemic and ocular biomarkers from non-invasive external-eye photography, evaluating whether cross-modal synthetic retinal reconstruction (Pathway B) adds predictive value over direct end-to-end anterior inference (Pathway A).

---

## Architectural Pathways

- **Pathway A (Direct Prediction)**:
  `external-eye -> preprocess -> CNN encoder -> biomarker head`
- **Pathway B (Indirect Reconstruction)**:
  `external-eye -> preprocess -> fundus generator -> synthetic fundus -> fundus predictor`
  *(Strictly gated: marked `UNAVAILABLE` and returns HTTP 409 until a verified paired clinical dataset is acquired).*

---

## Project Structure

```text
web-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & static router
│   │   ├── config.py            # Environment & JSON config loaders
│   │   ├── schemas.py           # Pydantic contract schemas
│   │   ├── registry.py          # Model loader with graceful STUB fallback
│   │   ├── quality.py           # 5-check photo quality assessment module
│   │   ├── preprocessing.py     # ImageNet normalization matching ML training
│   │   ├── security.py          # Magic bytes, MIME, and Pillow decode validation
│   │   ├── telemetry.py         # Latency percentile & error counters
│   │   ├── middleware.py        # Rate limiting, Request IDs, CSP, and privacy logs
│   │   └── routes/
│   │       └── api.py           # REST endpoints conforming to contracts/api_contract.md
│   ├── tests/                   # 23 Pytest unit, contract & security tests
│   └── requirements.txt         # Pinned backend dependencies (pip-audit clean)
├── frontend/                    # Vanilla ES2022 JavaScript, HTML5, and CSS3
│   ├── index.html               # Home, pathway explanation, health status
│   ├── about.html               # Research hypothesis, candidate targets, Section 15
│   ├── upload.html              # Drag-drop, preview, quality gate, Robustness Lab
│   ├── results.html             # Pathway A/B cards, disagreement indicator, print report
│   ├── model-card.html          # Metadata, Section 15 limits, metrics dashboard, glossary
│   ├── researcher.html         # Token-protected latency percentiles and error metrics
│   ├── css/style.css            # WCAG AA design system with dark mode & print styles
│   ├── js/                      # Modular ES2022 client architecture (XSS safe)
│   └── tests/api.test.js        # Node.js native unit tests (node --test)
├── config/                      # JSON configuration files
│   ├── capabilities.json        # 6 candidate targets & Pathway B status
│   ├── quality_thresholds.json  # Resolution, blur, brightness, glare parameters
│   └── model_card.json          # Operational scope and Section 15 limitations
├── outputs/metrics/             # Empirical benchmark outputs (empty = "Not yet evaluated")
├── fixtures/                    # Synthetic non-patient test images
├── contracts/                   # Canonical API contract specification
└── docs/                        # Architecture, privacy, API, limitations, deployment
```

---

## Installation & Running

### Prerequisites
- Python 3.12+
- Node.js 18+ (for running frontend tests; no npm install needed)

### 1. Set Up Backend Virtual Environment
```bash
cd web-app/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Test Suites
```bash
# Run backend test suite (23 passing tests)
cd web-app/backend
PYTHONPATH=. .venv/bin/pytest -v

# Run frontend test suite (11 passing tests)
cd web-app/frontend
node --test tests/api.test.js
```

### 3. Start Application Server
```bash
cd web-app/backend
PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open your browser at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CHECKPOINTS_DIR` | `web-app/checkpoints` | Path to PyTorch model weights directory |
| `CORS_ORIGINS` | `*` | Comma-separated CORS origins allowlist |
| `RATE_LIMIT_PER_MINUTE` | `60` | In-memory rate limiting threshold per IP |
| `RESEARCHER_TOKEN` | `researcher-secret-key-123` | Authentication token for `/api/researcher` portal |
