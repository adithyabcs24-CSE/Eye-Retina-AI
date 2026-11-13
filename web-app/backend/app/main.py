"""FastAPI main application serving API endpoints and static frontend assets."""

import os
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, FRONTEND_DIR, FIXTURES_DIR
from .middleware import OperationalSecurityMiddleware
from .routes.api import router as api_router
from .schemas import ErrorDetail, ErrorResponse

app = FastAPI(
    title="Ophthalmic & Systemic Biomarker Research Prototype API",
    description="Research prototype evaluating direct prediction vs indirect reconstruction from external-eye photos.",
    version="1.0.0"
)

# 1. Operational security middleware (Request IDs, rate limiting, structured privacy logs)
app.add_middleware(OperationalSecurityMiddleware)

# 2. CORS configuration with allowlist from env
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include API routes
app.include_router(api_router)


# 4. Global sanitized exception handlers per Anti-Hallucination Rule 8
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_400_BAD_REQUEST:
        code = "BAD_REQUEST"
    elif exc.status_code == status.HTTP_409_CONFLICT:
        code = "CONFLICT"
    elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "RATE_LIMIT_EXCEEDED"

    message = str(exc.detail) if isinstance(exc.detail, str) else "An HTTP error occurred."
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=ErrorDetail(code=code, message=message)).model_dump()
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message="Invalid request parameters or payload format."
            )
        ).model_dump()
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Strictly redacts internal traceback and filesystem paths
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected internal server error occurred."
            )
        ).model_dump()
    )


# 5. Serve fixtures for evaluator testbed
if FIXTURES_DIR.exists():
    app.mount("/fixtures", StaticFiles(directory=str(FIXTURES_DIR)), name="fixtures")

# 6. Serve frontend/ as static files at root /
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
