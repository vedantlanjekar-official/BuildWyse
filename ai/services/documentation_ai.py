"""Documentation generation AI service — detailed, document-type-specific OpenAI output."""

from __future__ import annotations

from ai.schemas.outputs import DocumentationBlock, DocumentationOutput, DocumentationSection
from ai.services._base import generate_structured

_DOC_TITLES = {
    "concept_logic": "Concept Logic",
    "prd": "Product Requirements Document (PRD)",
    "technology_stack": "Technology Stack",
    "frontend_design": "Frontend Design Specification",
    "hardware_spec": "Hardware Specification",
    "architecture": "System Architecture",
    "development_phases": "Development Phases Plan",
    "budget": "Budget Recommendation",
}

_SECTION_BLUEPRINTS: dict[str, list[str]] = {
    "concept_logic": [
        "Vision & Problem Statement",
        "Target Users & Personas",
        "Core Concept & Value Proposition",
        "Primary User Journeys",
        "Feature Pillars",
        "Success Metrics",
        "Constraints & Assumptions",
        "Out of Scope",
    ],
    "prd": [
        "Goals & Non-Goals",
        "Stakeholders",
        "Functional Requirements",
        "Non-Functional Requirements",
        "User Stories & Flows",
        "Data Entities & Integrations",
        "Edge Cases & Error Handling",
        "Acceptance & Release Criteria",
    ],
    "technology_stack": [
        "Stack Overview",
        "Frontend Technologies",
        "Backend & APIs",
        "Data & Storage",
        "Infrastructure & DevOps",
        "Security & Compliance Tooling",
        "Third-Party Services",
        "Trade-offs & Alternatives",
    ],
    "frontend_design": [
        "Information Architecture",
        "Screen Inventory",
        "Key UX Flows",
        "Component System",
        "Responsive & Accessibility Requirements",
        "Interaction & Content States",
        "Design QA Checklist",
    ],
    "hardware_spec": [
        "Hardware Applicability",
        "Device & Interface Requirements",
        "Bill of Materials",
        "Power, Environment & Constraints",
        "Integration Workflow",
        "Validation Checklist",
    ],
    "architecture": [
        "System Context",
        "Component Architecture",
        "Data Flow",
        "API & Service Boundaries",
        "Security Architecture",
        "Scalability & Reliability",
        "Deployment Topology",
    ],
    "development_phases": [
        "Phase Overview",
        "Detailed Phase Breakdown",
        "Dependencies & Critical Path",
        "Roles & Responsibilities",
        "Risks & Mitigations",
        "Milestone Checkpoints",
    ],
    "budget": [
        "Estimated Investment Overview",
        "Individual Freelancer Recommendation",
        "Freelancer Team Recommendation",
        "Enterprise Company Recommendation",
        "Phase Cost Breakdown",
        "Assumptions & Exclusions",
    ],
}


def _detailed_stub(document_type: str, title: str, content: str) -> DocumentationOutput:
    project_hint = (content or "this project").strip().splitlines()[0][:160]
    headings = _SECTION_BLUEPRINTS.get(document_type) or [
        "Overview",
        "Detailed Scope",
        "Workflow",
        "Delivery Checklist",
        "Risks",
        "Next Steps",
    ]
    sections: list[DocumentationSection] = []
    for idx, heading in enumerate(headings, start=1):
        sections.append(
            DocumentationSection(
                heading=heading,
                content=(
                    f"This section elaborates {heading.lower()} for {project_hint}. "
                    f"It is written as a professional BuildWyse deliverable for document type "
                    f"{document_type.replace('_', ' ')}."
                ),
                blocks=[
                    DocumentationBlock(
                        type="paragraph",
                        text=(
                            f"{heading} covers the practical decisions stakeholders must agree on "
                            f"before execution begins. Details below are derived from the project subject "
                            f"and requirements context."
                        ),
                    ),
                    DocumentationBlock(
                        type="bullets",
                        items=[
                            f"Define measurable outcomes for {heading.lower()}",
                            f"Align team responsibilities related to {heading.lower()}",
                            f"Capture dependencies that affect {heading.lower()}",
                            f"Identify risks and fallback options for {heading.lower()}",
                            f"Document acceptance signals for {heading.lower()}",
                        ],
                    ),
                    DocumentationBlock(
                        type="numbered",
                        items=[
                            f"Review current project inputs relevant to {heading.lower()}",
                            f"Draft the decision matrix / checklist for {heading.lower()}",
                            f"Validate with client and delivery lead",
                            f"Lock the approved baseline for phase {idx}",
                        ],
                    ),
                    DocumentationBlock(
                        type="table",
                        headers=["Item", "Detail", "Owner", "Status"],
                        rows=[
                            [f"{heading} baseline", "Agreed from project context", "Client + BuildWyse", "Draft"],
                            ["Dependencies", "Cross-check with adjacent documents", "Delivery lead", "Open"],
                            ["Acceptance", "Verify against success criteria", "QA / Client", "Pending"],
                        ],
                    ),
                    DocumentationBlock(
                        type="workflow",
                        items=[
                            "Gather inputs",
                            "Structure requirements",
                            "Review with stakeholders",
                            "Approve baseline",
                            "Hand off to next phase",
                        ],
                    ),
                    DocumentationBlock(
                        type="flowchart",
                        items=[
                            "Start",
                            f"Analyze {heading}",
                            "Decision: ready?",
                            "If no → refine",
                            "If yes → publish section",
                            "End",
                        ],
                    ),
                ],
            )
        )

    return DocumentationOutput(
        document_type=document_type,
        title=title,
        summary=(
            f"{title} for {project_hint}. This document provides a detailed, structured baseline "
            f"covering scope, workflows, tables, and delivery guidance for BuildWyse execution."
        ),
        sections=sections,
    )


def generate(user_content: str, document_type: str = "prd", **kwargs) -> DocumentationOutput:
    title = _DOC_TITLES.get(document_type, document_type.replace("_", " ").title())
    enriched_user = (
        f"DOCUMENT TYPE TO GENERATE: {document_type}\n"
        f"DOCUMENT TITLE: {title}\n\n"
        f"PROJECT & REQUIREMENTS CONTEXT:\n{user_content}\n\n"
        f"Generate a deeply detailed {title} for THIS project only. "
        f"Use professional structure with paragraphs, bullet points, numbered procedures, "
        f"tables, workflows, and flowcharts."
    )

    def stub_fn(content: str) -> DocumentationOutput:
        return _detailed_stub(document_type, title, content)

    return generate_structured(
        "documentation.txt",
        enriched_user,
        DocumentationOutput,
        stub_fn,
        model=kwargs.get("model"),
        temperature=0.3,
        max_tokens=10000,
        allow_stub_fallback=True,
    )
