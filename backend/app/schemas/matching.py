"""Matching schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class MatchScoreBreakdown(BaseModel):
    skills_score: float
    experience_score: float
    verification_score: float
    embedding_score: float | None = None
    overall_score: float


class FreelancerMatchCandidate(BaseModel):
    freelancer_id: UUID
    user_id: UUID
    headline: str | None = None
    rank: int
    scores: MatchScoreBreakdown
    explanation: str


class MatchingRunRequest(BaseModel):
    project_id: UUID
    include_embedding: bool = True
    limit: int = Field(default=10, ge=1, le=10)


class MatchingRunResponse(BaseModel):
    matching_run_id: UUID
    project_id: UUID
    candidates: list[FreelancerMatchCandidate]
    algorithm_version: str
    completed_at: datetime


class CandidateSelectRequest(BaseModel):
    freelancer_id: UUID
    selection_reason: str | None = None
