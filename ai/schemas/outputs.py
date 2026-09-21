"""Structured AI output schemas."""

from pydantic import BaseModel, Field


class RequirementOutput(BaseModel):
    summary: str
    functional_requirements: list[str] = Field(default_factory=list)
    non_functional_requirements: list[str] = Field(default_factory=list)
    suggested_technologies: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=0.8)


class ResearchOutput(BaseModel):
    market_context: str
    comparable_solutions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class DocumentationBlock(BaseModel):
    type: str = "paragraph"
    text: str = ""
    items: list[str] = Field(default_factory=list)
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)


class DocumentationSection(BaseModel):
    heading: str
    content: str = ""
    blocks: list[DocumentationBlock] = Field(default_factory=list)


class DocumentationOutput(BaseModel):
    document_type: str
    title: str
    summary: str = ""
    sections: list[DocumentationSection] = Field(default_factory=list)


class BudgetOutput(BaseModel):
    estimated_min: float
    estimated_max: float
    currency: str = "INR"
    breakdown: list[dict[str, float | str]] = Field(default_factory=list)
    rationale: str
    individual_min: float | None = None
    individual_max: float | None = None
    individual_summary: str = ""
    team_min: float | None = None
    team_max: float | None = None
    team_summary: str = ""
    enterprise_min: float | None = None
    enterprise_max: float | None = None
    enterprise_summary: str = ""


class MatchingExplanationOutput(BaseModel):
    freelancer_id: str
    overall_fit: str
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    recommendation: str


class VerificationOutput(BaseModel):
    overall_result: str
    compliance_score: float = Field(ge=0, le=100)
    findings: list[str] = Field(default_factory=list)
    passed_criteria: list[str] = Field(default_factory=list)
    failed_criteria: list[str] = Field(default_factory=list)


class HealthOutput(BaseModel):
    overall_status: str
    health_score: float = Field(ge=0, le=100)
    risks: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class ChangeManagementOutput(BaseModel):
    impact_summary: str
    scope_changes: list[str] = Field(default_factory=list)
    estimated_cost_delta: float = 0
    estimated_timeline_delta_days: int = 0
    recommendation: str


class AfterSalesOutput(BaseModel):
    classification: str
    reason: str
    suggested_actions: list[str] = Field(default_factory=list)
