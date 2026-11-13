# Deployment & Operational Hardening Guide

## 1. Production Architecture Recommendations

For production or cloud sandbox deployment (e.g. Google Cloud Run, AWS ECS, or Kubernetes):

```text
[Internet / HTTPS]
       │
       ▼
[Cloud Load Balancer / Reverse Proxy (e.g. Nginx, Cloudflare)]
       │  - TLS Termination
       │  - DDoS Protection & Global Rate Limiting
       │  - Client Body Limit (max 10MB)
       ▼
[FastAPI Backend Container (Port 8000, unprivileged appuser)]
       │  - In-memory upload parsing (zero disk writes)
       │  - CSP & Security Headers
       │  - Model Checkpoint Inference (PyTorch)
```

## 2. Security Headers & CSP
The backend automatically injects the following headers into all responses via `OperationalSecurityMiddleware`:
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none';`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 3. Container Deployment (Docker)
The included `Dockerfile` uses a multi-stage `python:3.12-slim-bookworm` base and runs as an unprivileged user (`appuser`, UID 1000).

```bash
# Build container image
docker build -t ophthalmic-biomarker-app:latest -f web-app/Dockerfile web-app/

# Run container with restricted resources
docker run -d \
  --name biomarker-app \
  -p 8000:8000 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e RESEARCHER_TOKEN="your-secure-production-token" \
  ophthalmic-biomarker-app:latest
```

## 4. Health Checks & Monitoring
- **Liveness & Readiness**: Query `GET /api/health` every 30 seconds.
- **Telemetry Observability**: Query `GET /api/researcher` with `X-Researcher-Token` header to monitor latency percentiles (p50, p90, p99) and 4xx/5xx error frequencies.

