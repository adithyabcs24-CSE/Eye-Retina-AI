"""Middleware for request IDs, structured privacy logging, rate limiting, and security headers."""

import json
import logging
import time
import uuid
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from .config import RATE_LIMIT_PER_MINUTE
from .schemas import ErrorDetail, ErrorResponse
from .telemetry import telemetry

logger = logging.getLogger("backend.access")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class RateLimiter:
    """In-memory rate limiter tracking timestamps per IP address."""
    def __init__(self, max_requests: int = 60, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, ip: str) -> bool:
        now = time.time()
        timestamps = self._requests[ip]
        while timestamps and timestamps[0] <= now - self.window_seconds:
            timestamps.pop(0)

        if len(timestamps) >= self.max_requests:
            return True

        timestamps.append(now)
        return False

    def clear(self):
        self._requests.clear()


limiter = RateLimiter(max_requests=RATE_LIMIT_PER_MINUTE)


def apply_security_headers(res: Response, req_id: str) -> Response:
    """Applies strict security and Content-Security-Policy headers."""
    res.headers["X-Request-ID"] = req_id
    res.headers["X-Content-Type-Options"] = "nosniff"
    res.headers["X-Frame-Options"] = "DENY"
    res.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    res.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    res.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none';"
    )
    return res


class OperationalSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Request ID assignment
        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = req_id

        # 2. Rate limiting check (for /api routes)
        client_ip = request.client.host if request.client else "unknown"
        if request.url.path.startswith("/api/") and limiter.is_rate_limited(client_ip):
            err_content = ErrorResponse(
                error=ErrorDetail(
                    code="RATE_LIMIT_EXCEEDED",
                    message="Request limit exceeded for this client. Please wait before retrying."
                )
            ).model_dump()
            res = JSONResponse(status_code=HTTP_429_TOO_MANY_REQUESTS, content=err_content)
            telemetry.record(request.url.path, 429, 0.5)
            return apply_security_headers(res, req_id)

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            telemetry.record(request.url.path, 500, latency_ms)

            log_entry = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "latency_ms": round(latency_ms, 2),
                "error": "INTERNAL_SERVER_ERROR"
            }
            logger.info(json.dumps(log_entry))

            res = JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error=ErrorDetail(
                        code="INTERNAL_SERVER_ERROR",
                        message="An unexpected internal server error occurred."
                    )
                ).model_dump()
            )
            return apply_security_headers(res, req_id)

        latency_ms = (time.perf_counter() - start_time) * 1000.0
        telemetry.record(request.url.path, response.status_code, latency_ms)
        apply_security_headers(response, req_id)

        # 3. Structured Logging: Strictly sanitized, no image bytes, no client file paths
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "request_id": req_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": round(latency_ms, 2)
        }
        logger.info(json.dumps(log_entry))

        return response
