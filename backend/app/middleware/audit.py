"""Audit context middleware — captures request metadata."""

from __future__ import annotations

from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

audit_ip: ContextVar[str | None] = ContextVar("audit_ip", default=None)
audit_user_agent: ContextVar[str | None] = ContextVar("audit_user_agent", default=None)


class AuditContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        audit_ip.set(request.client.host if request.client else None)
        audit_user_agent.set(request.headers.get("user-agent"))
        return await call_next(request)
