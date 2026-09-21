"""Simple in-memory rate limiting middleware."""

from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket style rate limiter per client IP."""

    def __init__(self, app, requests_per_minute: int = 120) -> None:
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60
        hits = self._hits[client_ip]
        while hits and hits[0] < window_start:
            hits.popleft()
        if len(hits) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "detail": "Try again in a minute"},
            )
        hits.append(now)
        return await call_next(request)
