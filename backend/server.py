"""
Deployment shim for Emergent Cloud Build.

This repo is a single-package TanStack Start (Vite + React) app that lives at
/app root. The Emergent default deployment template expects a FastAPI backend
at /app/backend and a separate frontend at /app/frontend. This module exists
solely to satisfy the deployment builder — it does NOT contain the app's
business logic.

At runtime it does exactly one useful thing: reverse-proxy every incoming
request to http://127.0.0.1:3000 where the real TanStack Start Node server
runs (started by the default [program:frontend] via /app/frontend). It also
exposes /api/health for the deployment healthcheck.

Requires: fastapi, uvicorn[standard], httpx (see requirements.txt).
"""

from __future__ import annotations

import os
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

UPSTREAM = os.environ.get("UPSTREAM_URL", "http://127.0.0.1:3000")

app = FastAPI(title="AcadArchiv edge proxy", docs_url=None, redoc_url=None)

# Long-lived pooled client — better than per-request creation.
_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup() -> None:
    global _client
    _client = httpx.AsyncClient(
        base_url=UPSTREAM,
        timeout=httpx.Timeout(60.0, connect=10.0),
        follow_redirects=False,
    )


@app.on_event("shutdown")
async def _shutdown() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


@app.get("/api/health")
async def health() -> JSONResponse:
    """Deployment healthcheck endpoint."""
    return JSONResponse({"status": "ok", "upstream": UPSTREAM})


# Hop-by-hop headers that must not be forwarded per RFC 7230 §6.1.
_HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host",
    "content-length", "content-encoding",
}


def _clean_headers(src) -> dict[str, str]:
    return {k: v for k, v in src.items() if k.lower() not in _HOP_BY_HOP}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request) -> Response:
    """Forward everything else to the TanStack Start Node server."""
    assert _client is not None
    url = f"/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    body = await request.body()
    try:
        upstream_resp = await _client.request(
            method=request.method,
            url=url,
            headers=_clean_headers(request.headers),
            content=body,
        )
    except httpx.HTTPError as exc:
        return JSONResponse({"error": f"upstream unreachable: {exc}"}, status_code=502)

    async def _body_iter() -> AsyncIterator[bytes]:
        async for chunk in upstream_resp.aiter_raw():
            yield chunk

    return StreamingResponse(
        _body_iter(),
        status_code=upstream_resp.status_code,
        headers=_clean_headers(upstream_resp.headers),
        media_type=upstream_resp.headers.get("content-type"),
    )
