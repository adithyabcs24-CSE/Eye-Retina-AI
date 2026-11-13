# System Architecture & Technical Specifications

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    Client["User Browser (Vanilla ES2022 / HTML5 / CSS3)"]
    
    subgraph FastAPI_Backend ["FastAPI Application (Port 8000)"]
        Middleware["Operational Security Middleware\n(CSP, Headers, Rate Limiting, Request ID, Privacy Log)"]
        StaticRoute["Static File Server (frontend/)"]
        APIRoute["REST API Router (/api/*)"]
        
        subgraph Security_Gate ["Upload Security & Quality Inspection"]
            MemoryValidation["Magic Byte & MIME Inspection\n(io.BytesIO in RAM)"]
            QualityEngine["Quality Assessment Engine\n(Laplacian blur, brightness, glare, resolution)"]
        end
        
        subgraph Model_Registry ["Model Registry (Fault-Tolerant)"]
            DirectLoader["Direct CNN Checkpoint Loader\n(Status: LOADED | STUB | UNAVAILABLE)"]
            GeneratorLoader["Fundus Generator Loader\n(Status: Gated / UNAVAILABLE)"]
            PredictorLoader["Fundus Predictor Loader\n(Status: Gated / UNAVAILABLE)"]
        end
        
        subgraph Telemetry_Collector ["Telemetry & Observability"]
            LatencyTracker["Latency Percentiles (p50, p90, p99)"]
            ErrorCounter["Status Code Aggregator"]
        end
    end
    
    Client -->|HTTP GET /| StaticRoute
    Client -->|POST /api/quality| Middleware
    Client -->|POST /api/predict/direct| Middleware
    Client -->|GET /api/researcher| Middleware
    
    Middleware --> APIRoute
    APIRoute --> MemoryValidation
    MemoryValidation --> QualityEngine
    QualityEngine -->|Pass| DirectLoader
    QualityEngine -->|Fail| RejectionResponse["422 / Reject with Coaching Tips"]
    
    Middleware --> Telemetry_Collector
```

## 2. Component Design Principles

### Frontend Architecture
- **Vanilla ES2022**: Zero external JavaScript frameworks (no React, Vue, or Angular) and zero frontend npm packages. No transpilation or build step.
- **XSS Protection**: Strictly avoids `innerHTML` for dynamic content rendering; uses `document.createElement`, `textContent`, and safe DOM utilities in `js/ui.js`.
- **Accessibility (WCAG AA)**: Skip links (`#main-content`), ARIA live regions (`aria-live="polite"`), high-contrast CSS variable tokens, focus rings (`:focus-visible`), and media query support for `prefers-reduced-motion` and `prefers-color-scheme`.

### Backend Architecture
- **Fault-Tolerant Model Registry**: Missing model weight files never crash the process. The loader evaluates checkpoints on startup and reports `LOADED`, `STUB`, or `UNAVAILABLE`.
- **Quality Gating**: Evaluates 5 photographic parameters (resolution, blur via Laplacian variance, brightness, glare via overexposed pixel ratio, and ocular landmark presence). Any failing check immediately blocks prediction and returns actionable coaching tips.
- **Strict In-Memory Processing**: Uploaded binary data is decoded strictly in RAM via `io.BytesIO` and Pillow. Zero bytes or image artifacts are written to disk.
