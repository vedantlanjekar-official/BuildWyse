"""GitHub integration client."""

from __future__ import annotations

import httpx


class GitHubClient:
    def __init__(self, token: str | None = None) -> None:
        self.token = token
        self.base_url = "https://api.github.com"

    def _headers(self) -> dict:
        headers = {"Accept": "application/vnd.github+json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def get_repo(self, owner: str, repo: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.base_url}/repos/{owner}/{repo}", headers=self._headers())
            resp.raise_for_status()
            return resp.json()

    async def list_commits(self, owner: str, repo: str, *, per_page: int = 10) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/commits",
                headers=self._headers(),
                params={"per_page": per_page},
            )
            resp.raise_for_status()
            return resp.json()
