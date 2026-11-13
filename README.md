# Ophthalmic & Systemic Biomarker Research Prototype

> **Investigational Research Prototype. Not a medical device. Not for clinical diagnosis.**

An engineering workbench exploring machine learning feasibility for predicting systemic and ocular biomarkers from non-invasive external-eye photography, evaluating whether cross-modal synthetic retinal reconstruction (Pathway B) adds predictive value over direct end-to-end anterior inference (Pathway A).

---

## ⚡ Quick Start (`npm start`)

You can now start the entire application directly with:

```bash
npm start
```

This will automatically release port 8000 if occupied, activate the Python environment, start the Uvicorn server with auto-reload, and print the live web addresses.

Then open your browser at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

To run all 34 automated unit and contract tests:
```bash
npm test
```

---

## Architectural Pathways

- **Pathway A (Direct Prediction)**:
  `external-eye -> preprocess -> CNN encoder -> biomarker head`
- **Pathway B (Indirect Reconstruction)**:
  `external-eye -> preprocess -> fundus generator -> synthetic fundus -> fundus predictor`
  *(Strictly gated: marked `UNAVAILABLE` and returns HTTP 409 until a verified paired clinical dataset is acquired).*

---

## Key Features & Pages

- 🏠 **Home & Hero ([index.html](http://127.0.0.1:8000/index.html))**: Overview of research question, candidate targets, and live backend health.
- ⚡ **Upload & Evaluator Showcase ([upload.html](http://127.0.0.1:8000/upload.html))**:
  - One-click synthetic evaluator test cases (no local file search needed).
  - Photographic quality gate (Laplacian blur, brightness, glare, resolution).
  - Client-side **Robustness Lab** (simulate defocus blur, exposure, and sensor noise via canvas).
  - Anatomical biomarker signal map (bulbar/palpebral conjunctiva, limbus, iris).
- 📋 **Project Evaluator Dossier ([evaluator.html](http://127.0.0.1:8000/evaluator.html))**:
  - Comparative architecture matrix (Pathway A vs Pathway B).
  - Section 15 compliance verification board.
  - Engineering audit badges (34 tests passing, 0 CVEs, 3.54 ms latency).
- 📊 **Results & Comparison ([results.html](http://127.0.0.1:8000/results.html))**:
  - Side-by-side pathway outputs with disagreement indicator.
  - Reconstruction fidelity panel (L1, PSNR, SSIM).
  - Session-only history with clear button.
  - Printable laboratory report (`window.print()`, no identity fields).
- 📖 **Model Card & Metrics ([model-card.html](http://127.0.0.1:8000/model-card.html))**:
  - Intended and out-of-scope use, Section 15 limitations.
  - Plain SVG metrics dashboard (empty state: *"Not yet evaluated"*).
  - Plain-language evaluation glossary (Sensitivity, Calibration, AUC, MAE).
- 📡 **Researcher Telemetry Portal ([researcher.html](http://127.0.0.1:8000/researcher.html))**:
  - Token-protected latency percentiles (p50, p90, p99) and request distribution. Token: `researcher-secret-key-123`.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `CHECKPOINTS_DIR` | `web-app/checkpoints` | Path to PyTorch model weights directory |
| `CORS_ORIGINS` | `*` | Comma-separated CORS origins allowlist |
| `RATE_LIMIT_PER_MINUTE` | `60` | In-memory rate limiting threshold per IP |
| `RESEARCHER_TOKEN` | `researcher-secret-key-123` | Authentication token for `/api/researcher` portal |
