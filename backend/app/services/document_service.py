"""Project document generation, PDF export, and Supabase persistence."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Any
from uuid import UUID

from ai.services import budget_ai, documentation_ai
from app.repositories.supabase_client import (
    ai_conversations_repo,
    ai_messages_repo,
    document_versions_repo,
    get_supabase,
    is_memory_mode,
    project_documents_repo,
    requirements_repo,
    Repository,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

PACKAGE_DOC_TYPES: tuple[str, ...] = (
    "concept_logic",
    "prd",
    "technology_stack",
    "frontend_design",
    "hardware_spec",
    "architecture",
    "development_phases",
    "budget",
)

DOC_TYPE_LABELS: dict[str, str] = {
    "concept_logic": "Concept Logic",
    "prd": "PRD",
    "technology_stack": "Technology Stack",
    "frontend_design": "Frontend Design",
    "hardware_spec": "Hardware Spec",
    "architecture": "Architecture",
    "development_phases": "Development Phases",
    "budget": "Budget Recommendation",
}

WEBSITE_KEYWORDS: tuple[str, ...] = (
    "website",
    "landing page",
    "landing-page",
    "web app",
    "webapp",
    "corporate site",
    "marketing site",
    "corporate website",
)

WEBSITE_CATEGORIES: frozenset[str] = frozenset(
    {"website", "web", "landing_page", "landing page", "corporate_website"}
)

DOCUMENTS_BUCKET = "documents"
IDEMPOTENCY_WINDOW = timedelta(seconds=5)

# In-memory PDF bytes when Supabase storage is unavailable
_memory_pdfs: dict[str, bytes] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _is_website_project(project: dict[str, Any]) -> bool:
    category = (project.get("category") or "").strip().lower()
    if category in WEBSITE_CATEGORIES:
        return True

    text = " ".join(
        [
            project.get("title") or "",
            project.get("description") or project.get("summary") or "",
            project.get("category") or "",
            project.get("industry") or "",
        ]
    ).lower()
    return any(keyword in text for keyword in WEBSITE_KEYWORDS)


def _project_has_hardware_requirements(project_id: str) -> bool:
    reqs = requirements_repo.list(filters={"project_id": project_id}, limit=200)
    return any((r.get("requirement_type") or "").lower() == "hardware" for r in reqs)


def is_hardware_applicable(project: dict[str, Any]) -> bool:
    if _is_website_project(project):
        return False
    if _project_has_hardware_requirements(project["id"] if isinstance(project.get("id"), str) else str(project["id"])):
        return True
    return not _is_website_project(project)


def _build_context(project: dict[str, Any], extra_context: str = "") -> str:
    parts = [
        project.get("title") or "",
        project.get("description") or project.get("summary") or "",
        f"Category: {project.get('category') or 'unspecified'}",
        f"Industry: {project.get('industry') or 'unspecified'}",
        f"Complexity: {project.get('complexity') or 'unspecified'}",
        extra_context,
    ]
    return "\n".join(p for p in parts if p.strip())


def _requirements_chat_context(project_id: str) -> str:
    """Pull latest requirement discovery chat + structured AI output for budget/docs."""
    conversations = ai_conversations_repo.list(filters={"project_id": project_id}, limit=50)
    discovery = [
        c
        for c in conversations
        if str(c.get("conversation_type") or "") in {"requirement_discovery", "requirements", ""}
    ]
    discovery.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    if not discovery:
        conversations.sort(key=lambda r: r.get("created_at") or "", reverse=True)
        discovery = conversations[:1]
    if not discovery:
        reqs = requirements_repo.list(filters={"project_id": project_id}, limit=50)
        if not reqs:
            return ""
        lines = ["Saved requirements:"]
        for req in reqs[:20]:
            title = req.get("title") or "Requirement"
            desc = req.get("description") or ""
            lines.append(f"- {title}: {desc}")
        return "\n".join(lines)

    conv = discovery[0]
    messages = ai_messages_repo.list(filters={"conversation_id": str(conv["id"])}, limit=200)
    messages.sort(key=lambda m: m.get("created_at") or "")
    lines = ["Requirements AI conversation:"]
    for msg in messages[-40:]:
        role = str(msg.get("role") or "user")
        content = str(msg.get("content") or "").strip()
        if content:
            lines.append(f"{role.upper()}: {content}")
        metadata = msg.get("metadata") or {}
        structured = metadata.get("structured") if isinstance(metadata, dict) else None
        if isinstance(structured, dict) and structured:
            summary = structured.get("summary")
            frs = structured.get("functional_requirements") or []
            nfrs = structured.get("non_functional_requirements") or []
            tech = structured.get("suggested_technologies") or []
            if summary:
                lines.append(f"STRUCTURED SUMMARY: {summary}")
            if frs:
                lines.append("FUNCTIONAL: " + "; ".join(str(x) for x in frs[:12]))
            if nfrs:
                lines.append("NON-FUNCTIONAL: " + "; ".join(str(x) for x in nfrs[:8]))
            if tech:
                lines.append("TECH: " + ", ".join(str(x) for x in tech[:10]))
    return "\n".join(lines)


def _inr(amount: float | int | None) -> str:
    if amount is None:
        return "—"
    return f"INR {float(amount):,.0f}"


def _budget_to_documentation(estimate: Any) -> dict[str, Any]:
    data = estimate.model_dump() if hasattr(estimate, "model_dump") else dict(estimate)
    currency = data.get("currency") or "INR"
    overall_min = data.get("estimated_min")
    overall_max = data.get("estimated_max")
    models = (
        (
            "Individual Freelancer",
            data.get("individual_min") or overall_min,
            data.get("individual_max") or overall_max,
            data.get("individual_summary")
            or "Single verified specialist for focused product delivery.",
        ),
        (
            "Freelancer Team",
            data.get("team_min") or (float(overall_min or 0) * 1.2 if overall_min else None),
            data.get("team_max") or (float(overall_max or 0) * 1.35 if overall_max else None),
            data.get("team_summary")
            or "Coordinated specialists with parallel design and engineering workstreams.",
        ),
        (
            "Enterprise Company",
            data.get("enterprise_min") or (float(overall_min or 0) * 1.6 if overall_min else None),
            data.get("enterprise_max") or (float(overall_max or 0) * 1.8 if overall_max else None),
            data.get("enterprise_summary")
            or "Managed organizational delivery for scale, compliance, and multi-stakeholder programs.",
        ),
    )
    sections: list[dict[str, str]] = [
        {
            "heading": "Estimated Budget to Build the Product",
            "content": (
                f"Based on the requirements conversation and project scope, the recommended overall "
                f"investment range is {_inr(overall_min)} – {_inr(overall_max)} ({currency}). "
                f"{data.get('rationale') or ''}"
            ).strip(),
            "blocks": [
                {
                    "type": "callout",
                    "text": f"Overall recommended range: {_inr(overall_min)} – {_inr(overall_max)} ({currency})",
                },
                {
                    "type": "bullets",
                    "items": [
                        "Estimates are advisory and depend on finalized scope",
                        "Figures cover product build delivery, not perpetual marketing spend",
                        "Exact milestone billing follows approved phase plans",
                    ],
                },
            ],
        }
    ]
    for label, lo, hi, summary in models:
        sections.append(
            {
                "heading": f"Recommendation — {label}",
                "content": (
                    f"Estimated range: {_inr(lo)} – {_inr(hi)} ({currency}).\n\n{summary}"
                ).strip(),
                "blocks": [
                    {
                        "type": "table",
                        "headers": ["Model", "Min", "Max", "Currency"],
                        "rows": [[label, _inr(lo), _inr(hi), currency]],
                    },
                    {"type": "paragraph", "text": summary},
                    {
                        "type": "numbered",
                        "items": [
                            "Confirm scope fit for this delivery model",
                            "Validate timeline expectations with stakeholders",
                            "Select model in Budget settings when ready",
                        ],
                    },
                ],
            }
        )
    breakdown = data.get("breakdown") or []
    if breakdown:
        lines = []
        for item in breakdown:
            if isinstance(item, dict):
                phase = item.get("phase") or item.get("name") or "Phase"
                amount = item.get("amount")
                lines.append(f"- {phase}: {_inr(amount) if isinstance(amount, (int, float)) else amount}")
        if lines:
            sections.append({"heading": "Phase Breakdown", "content": "\n".join(lines)})
    return {
        "document_type": "budget",
        "title": "Budget Recommendation",
        "sections": sections,
        "summary": (
            f"Overall estimate {_inr(overall_min)} – {_inr(overall_max)} with three delivery-model "
            f"recommendations: Individual, Team, and Enterprise."
        ),
        "budget_estimate": data,
    }


def persist_budget_estimate_rows(
    project_id: str,
    estimate: Any,
    *,
    client_budget: float | None = None,
) -> list[dict[str, Any]]:
    """Insert the three recommendation rows used by Budget page + Documents."""
    budgets_repo = Repository("project_budgets")
    data = estimate.model_dump() if hasattr(estimate, "model_dump") else dict(estimate)
    for budget_type in ("individual", "team", "enterprise"):
        existing = budgets_repo.list(filters={"project_id": project_id, "budget_type": budget_type}, limit=20)
        for row in existing:
            try:
                budgets_repo.delete(row["id"], strict=False)
            except Exception:
                pass

    rows: list[dict[str, Any]] = []
    for budget_type in ("individual", "team", "enterprise"):
        amount = data.get(f"{budget_type}_max") or data.get("estimated_max") or client_budget or 0
        min_amount = data.get(f"{budget_type}_min") or data.get("estimated_min")
        summary = data.get(f"{budget_type}_summary") or data.get("rationale") or ""
        rows.append(
            budgets_repo.insert(
                {
                    "project_id": project_id,
                    "budget_type": budget_type,
                    "amount": str(amount),
                    "min_amount": str(min_amount) if min_amount is not None else None,
                    "max_amount": str(amount),
                    "currency": data.get("currency") or "INR",
                    "rationale": summary,
                    "ai_analysis": data,
                    "status": "proposed",
                }
            )
        )
    if client_budget is not None:
        rows.append(
            budgets_repo.insert(
                {
                    "project_id": project_id,
                    "budget_type": "client_estimate",
                    "amount": str(client_budget),
                    "currency": "INR",
                    "rationale": "Client-provided estimate",
                    "ai_analysis": {},
                    "status": "proposed",
                }
            )
        )
    return rows


def _sections_to_markdown(sections: list[Any], summary: str) -> str:
    lines = [summary, ""]
    for section in sections:
        if hasattr(section, "model_dump"):
            section = section.model_dump()
        heading = section.get("heading", "Section") if isinstance(section, dict) else "Section"
        content = section.get("content", "") if isinstance(section, dict) else ""
        lines.extend([f"## {heading}", "", content, ""])
        blocks = section.get("blocks") or [] if isinstance(section, dict) else []
        for block in blocks:
            if hasattr(block, "model_dump"):
                block = block.model_dump()
            if not isinstance(block, dict):
                continue
            btype = str(block.get("type") or "paragraph")
            if btype in {"paragraph", "callout"} and block.get("text"):
                lines.append(str(block["text"]))
                lines.append("")
            elif btype in {"bullets", "numbered", "workflow", "flowchart"}:
                for i, item in enumerate(block.get("items") or [], start=1):
                    prefix = f"{i}." if btype == "numbered" else "-"
                    if btype in {"workflow", "flowchart"}:
                        prefix = "→" if i > 1 else "•"
                    lines.append(f"{prefix} {item}")
                lines.append("")
            elif btype == "table":
                headers = block.get("headers") or []
                if headers:
                    lines.append("| " + " | ".join(str(h) for h in headers) + " |")
                    lines.append("| " + " | ".join("---" for _ in headers) + " |")
                for row in block.get("rows") or []:
                    lines.append("| " + " | ".join(str(c) for c in row) + " |")
                lines.append("")
    return "\n".join(lines).strip()


def _hardware_not_applicable_output(project: dict[str, Any]) -> dict[str, Any]:
    project_name = project.get("title") or "Project"
    return {
        "document_type": "hardware_spec",
        "title": DOC_TYPE_LABELS["hardware_spec"],
        "sections": [
            {
                "heading": "Hardware Applicability",
                "content": (
                    f"This project ({project_name}) is classified as a software-only deliverable "
                    "(website / landing page / web application). Physical hardware components "
                    "are NOT APPLICABLE to this project scope."
                ),
                "blocks": [
                    {
                        "type": "callout",
                        "text": "Decision: Hardware specification is not required for this engagement.",
                    },
                    {
                        "type": "bullets",
                        "items": [
                            "No embedded devices or custom PCB work",
                            "No IoT/sensor endpoints in scope",
                            "No physical kiosk or appliance manufacturing",
                            "Delivery remains fully software-based",
                        ],
                    },
                    {
                        "type": "table",
                        "headers": ["Area", "Applicability", "Notes"],
                        "rows": [
                            ["Electronics / PCB", "Not applicable", "Software-only product"],
                            ["IoT / Sensors", "Not applicable", "No field hardware"],
                            ["Hosting / Cloud", "Applicable", "Covered in Technology Stack & Architecture"],
                        ],
                    },
                ],
            },
            {
                "heading": "Rationale",
                "content": (
                    "No embedded devices, IoT endpoints, custom PCB designs, or physical "
                    "hardware integration are required. All deliverables are software-based."
                ),
                "blocks": [
                    {
                        "type": "numbered",
                        "items": [
                            "Classify project category and industry signals",
                            "Confirm absence of hardware requirements in discovery chat",
                            "Document software infrastructure ownership in Architecture",
                            "Close hardware track as not applicable",
                        ],
                    }
                ],
            },
            {
                "heading": "Infrastructure Note",
                "content": (
                    "Hosting and cloud infrastructure requirements are covered in the "
                    "Technology Stack and Architecture documents."
                ),
                "blocks": [
                    {
                        "type": "workflow",
                        "items": [
                            "Define hosting needs",
                            "Select cloud services",
                            "Configure environments",
                            "Apply security baseline",
                            "Monitor production",
                        ],
                    }
                ],
            },
        ],
        "summary": "Hardware specification is not applicable for this software-only project.",
    }


def _pdf_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle(
            "CoverBrand",
            parent=styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#0d2a28"),
            fontName="Helvetica-Bold",
            spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0d2a28"),
            alignment=TA_LEFT,
            spaceAfter=10,
            fontName="Helvetica-Bold",
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#3d4f4a"),
        ),
        "section": ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            spaceBefore=16,
            spaceAfter=8,
            textColor=colors.HexColor("#0d2a28"),
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            spaceAfter=6,
            textColor=colors.HexColor("#1f2d2a"),
            alignment=TA_LEFT,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=styles["Normal"],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0d2a28"),
            backColor=colors.HexColor("#eef8f6"),
            borderPadding=6,
            spaceAfter=8,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1f2d2a"),
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        ),
        "flow_step": ParagraphStyle(
            "FlowStep",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0d2a28"),
        ),
        "label": ParagraphStyle(
            "Label",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#6b7c78"),
            fontName="Helvetica-Bold",
            spaceBefore=2,
            spaceAfter=4,
        ),
    }


def _header_footer(canvas, doc) -> None:  # noqa: ANN001
    canvas.saveState()
    width, height = letter
    # Header
    canvas.setFillColor(colors.HexColor("#0d2a28"))
    canvas.rect(0, height - 36, width, 36, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(0.75 * inch, height - 22, "BuildWyse")
    canvas.setFont("Helvetica", 8)
    title = getattr(doc, "bw_document_title", "Project Document")
    canvas.drawRightString(width - 0.75 * inch, height - 22, str(title)[:70])
    # Footer
    canvas.setFillColor(colors.HexColor("#e8eeec"))
    canvas.rect(0, 0, width, 42, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#0d2a28"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(0.75 * inch, 18, "BuildWyse.in")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#5a6d68"))
    canvas.drawCentredString(width / 2, 18, "Professional project documentation")
    page_label = f"Page {doc.page}"
    canvas.drawRightString(width - 0.75 * inch, 18, page_label)
    canvas.restoreState()


def _normalize_sections(sections: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for section in sections or []:
        if hasattr(section, "model_dump"):
            section = section.model_dump()
        if not isinstance(section, dict):
            continue
        blocks = []
        for block in section.get("blocks") or []:
            if hasattr(block, "model_dump"):
                block = block.model_dump()
            if isinstance(block, dict):
                blocks.append(block)
        # If AI only returned narrative content, synthesize useful blocks
        content = str(section.get("content") or "").strip()
        if content and not blocks:
            blocks = _blocks_from_content(content)
        normalized.append(
            {
                "heading": str(section.get("heading") or "Section"),
                "content": content,
                "blocks": blocks,
            }
        )
    return normalized


def _blocks_from_content(content: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    bullet_items: list[str] = []
    numbered_items: list[str] = []
    paragraphs: list[str] = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(("- ", "* ", "• ")):
            bullet_items.append(line[2:].strip())
        elif len(line) > 2 and line[0].isdigit() and line[1] in {".", ")"}:
            numbered_items.append(line[2:].strip())
        else:
            paragraphs.append(line)
    for para in paragraphs:
        blocks.append({"type": "paragraph", "text": para})
    if bullet_items:
        blocks.append({"type": "bullets", "items": bullet_items})
    if numbered_items:
        blocks.append({"type": "numbered", "items": numbered_items})
    if not blocks:
        blocks.append({"type": "paragraph", "text": content})
    return blocks


def _render_block(block: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    btype = str(block.get("type") or "paragraph").lower()
    flowables: list[Any] = []

    if btype in {"paragraph", "callout"}:
        text = str(block.get("text") or "").strip()
        if text:
            style = styles["callout"] if btype == "callout" else styles["body"]
            flowables.append(Paragraph(_escape(text).replace("\n", "<br/>"), style))
        return flowables

    if btype in {"bullets", "numbered"}:
        items = [str(i).strip() for i in (block.get("items") or []) if str(i).strip()]
        if not items:
            return flowables
        list_items = [
            ListItem(Paragraph(_escape(item), styles["body"]), leftIndent=12, bulletColor=colors.HexColor("#0d2a28"))
            for item in items
        ]
        flowables.append(
            ListFlowable(
                list_items,
                bulletType="1" if btype == "numbered" else "bullet",
                start="1",
                leftIndent=18,
                bulletFontName="Helvetica",
                bulletFontSize=9,
                spaceBefore=2,
                spaceAfter=8,
            )
        )
        return flowables

    if btype in {"workflow", "flowchart"}:
        items = [str(i).strip() for i in (block.get("items") or []) if str(i).strip()]
        if not items:
            return flowables
        styles_label = "Workflow" if btype == "workflow" else "Flowchart"
        flowables.append(Paragraph(styles_label.upper(), styles["label"]))
        for idx, item in enumerate(items):
            box = Table(
                [[Paragraph(_escape(item), styles["flow_step"])]],
                colWidths=[5.8 * inch],
            )
            box.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef8f6")),
                        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#1a5c55")),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ]
                )
            )
            flowables.append(box)
            if idx < len(items) - 1:
                flowables.append(Paragraph("↓", styles["flow_step"]))
        flowables.append(Spacer(1, 0.08 * inch))
        return flowables

    if btype == "table":
        headers = [str(h) for h in (block.get("headers") or [])]
        rows = block.get("rows") or []
        if not headers and not rows:
            return flowables
        data: list[list[Any]] = []
        if headers:
            data.append([Paragraph(_escape(h), styles["table_header"]) for h in headers])
        for row in rows:
            cells = list(row) if isinstance(row, (list, tuple)) else [row]
            if headers and len(cells) < len(headers):
                cells = list(cells) + [""] * (len(headers) - len(cells))
            data.append([Paragraph(_escape(str(c)), styles["table_cell"]) for c in cells])
        col_count = max(len(r) for r in data) if data else 1
        usable = 6.5 * inch
        col_widths = [usable / col_count] * col_count
        table = Table(data, colWidths=col_widths, repeatRows=1 if headers else 0)
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d2a28")) if headers else ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef8f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white if headers else colors.HexColor("#0d2a28")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9d7d3")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7faf9")]),
        ]
        table.setStyle(TableStyle(style_cmds))
        flowables.append(table)
        flowables.append(Spacer(1, 0.1 * inch))
        return flowables

    # Fallback
    text = str(block.get("text") or " ".join(str(i) for i in (block.get("items") or []))).strip()
    if text:
        flowables.append(Paragraph(_escape(text), styles["body"]))
    return flowables


def build_pdf_bytes(
    *,
    project_name: str,
    document_title: str,
    document_type: str,
    version: int,
    generated_at: datetime,
    sections: list[Any],
    summary: str,
    project: dict[str, Any] | None = None,
) -> bytes:
    buffer = BytesIO()
    project = project or {}
    styles = _pdf_styles()
    normalized = _normalize_sections(sections)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.75 * inch,
        title=document_title,
        author="BuildWyse",
    )
    doc.bw_document_title = document_title  # type: ignore[attr-defined]

    story: list[Any] = []
    story.append(Paragraph("BUILDWYSE PROJECT DOCUMENTATION", styles["cover_brand"]))
    story.append(Paragraph(_escape(document_title), styles["cover_title"]))
    story.append(
        HRFlowable(width="100%", thickness=1.2, color=colors.HexColor("#0d2a28"), spaceAfter=10, spaceBefore=2)
    )

    # Project details block
    details = [
        ["Project", project_name],
        ["Document", DOC_TYPE_LABELS.get(document_type, document_type)],
        ["Version", f"v{version}"],
        ["Generated", generated_at.strftime("%d %b %Y, %H:%M UTC")],
        ["Category", str(project.get("category") or "—").replace("_", " ").title()],
        ["Industry", str(project.get("industry") or "—")],
        ["Complexity", str(project.get("complexity") or "—").title()],
        ["State", str(project.get("state") or "—").replace("_", " ").title()],
    ]
    if project.get("id"):
        details.append(["Project ID", str(project.get("id"))])
    if project.get("description"):
        details.append(["Description", str(project.get("description"))[:500]])

    detail_table = Table(
        [
            [
                Paragraph(f"<b>{_escape(label)}</b>", styles["table_cell"]),
                Paragraph(_escape(value), styles["table_cell"]),
            ]
            for label, value in details
        ],
        colWidths=[1.6 * inch, 5.0 * inch],
    )
    detail_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef8f6")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#c9d7d3")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dce6e3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(Paragraph("PROJECT DETAILS", styles["label"]))
    story.append(detail_table)
    story.append(Spacer(1, 0.18 * inch))

    if summary:
        story.append(Paragraph("Executive Summary", styles["section"]))
        story.append(Paragraph(_escape(summary).replace("\n", "<br/>"), styles["body"]))

    story.append(
        HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#c9d7d3"), spaceBefore=8, spaceAfter=4)
    )
    story.append(Paragraph("MAIN CONTENT", styles["label"]))

    for section in normalized:
        section_flowables: list[Any] = [Paragraph(_escape(section["heading"]), styles["section"])]
        if section.get("content") and not section.get("blocks"):
            for paragraph in str(section["content"]).split("\n\n"):
                paragraph = paragraph.strip()
                if paragraph:
                    section_flowables.append(
                        Paragraph(_escape(paragraph).replace("\n", "<br/>"), styles["body"])
                    )
        elif section.get("content"):
            # Keep a short intro paragraph if blocks also exist
            intro = str(section["content"]).strip()
            if intro and len(intro) < 1200:
                section_flowables.append(Paragraph(_escape(intro).replace("\n", "<br/>"), styles["body"]))
        for block in section.get("blocks") or []:
            section_flowables.extend(_render_block(block, styles))
        story.append(KeepTogether(section_flowables))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buffer.getvalue()


def _escape(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _pdf_storage_path(project_id: str, document_id: str, version: int) -> str:
    return f"{project_id}/{document_id}/v{version}.pdf"


def ensure_documents_bucket() -> None:
    client = get_supabase()
    if client is None:
        return
    try:
        buckets = client.storage.list_buckets()
        names = {b.name for b in buckets}
        if DOCUMENTS_BUCKET not in names:
            client.storage.create_bucket(
                DOCUMENTS_BUCKET,
                options={"public": False, "file_size_limit": 52428800},
            )
            logger.info("Created storage bucket %s", DOCUMENTS_BUCKET)
    except Exception as exc:
        logger.warning("Could not ensure documents bucket (%s)", exc)


def _upload_pdf(storage_path: str, pdf_bytes: bytes) -> str:
    client = get_supabase()
    if client is None:
        _memory_pdfs[storage_path] = pdf_bytes
        return storage_path
    ensure_documents_bucket()
    client.storage.from_(DOCUMENTS_BUCKET).upload(
        storage_path,
        pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return storage_path


def _download_pdf(storage_path: str) -> bytes | None:
    if storage_path in _memory_pdfs:
        return _memory_pdfs[storage_path]
    client = get_supabase()
    if client is None:
        return None
    try:
        return client.storage.from_(DOCUMENTS_BUCKET).download(storage_path)
    except Exception as exc:
        logger.warning("PDF download failed for %s (%s)", storage_path, exc)
        return None


def _get_signed_pdf_url(storage_path: str, expires_in: int = 3600) -> str | None:
    client = get_supabase()
    if client is None:
        return None
    try:
        result = client.storage.from_(DOCUMENTS_BUCKET).create_signed_url(storage_path, expires_in)
        if isinstance(result, dict):
            return result.get("signedURL") or result.get("signedUrl")
        return str(result) if result else None
    except Exception as exc:
        logger.warning("Signed URL failed for %s (%s)", storage_path, exc)
        return None


def _list_versions(document_id: str) -> list[dict[str, Any]]:
    rows = document_versions_repo.list(filters={"document_id": document_id}, limit=100)
    return sorted(rows, key=lambda r: r.get("version_number", 0), reverse=True)


def _get_latest_version(document_id: str) -> dict[str, Any] | None:
    versions = _list_versions(document_id)
    return versions[0] if versions else None


def _persisted_document_type(document_type: str) -> str:
    """Map logical types to DB-safe values when CHECK constraints are not yet migrated."""
    if document_type == "budget":
        return "other"
    return document_type


def _is_budget_document(doc: dict[str, Any]) -> bool:
    if str(doc.get("document_type") or "") == "budget":
        return True
    title = str(doc.get("title") or "").strip().lower()
    return str(doc.get("document_type") or "") == "other" and title in {
        "budget recommendation",
        "budget",
        "project budget recommendation",
    }


def _find_document(project_id: str, document_type: str) -> dict[str, Any] | None:
    if document_type == "budget":
        rows = project_documents_repo.list(filters={"project_id": project_id}, limit=50)
        for row in rows:
            if _is_budget_document(row):
                return row
        return None
    rows = project_documents_repo.list(
        filters={"project_id": project_id, "document_type": document_type},
        limit=1,
    )
    return rows[0] if rows else None


def _is_recent_version(version: dict[str, Any]) -> bool:
    created = _parse_ts(version.get("created_at"))
    if not created:
        return False
    return _now() - created < IDEMPOTENCY_WINDOW


def _generate_content(
    project: dict[str, Any],
    document_type: str,
    context: str,
) -> dict[str, Any]:
    if document_type == "hardware_spec" and not is_hardware_applicable(project):
        return _hardware_not_applicable_output(project)

    chat_context = _requirements_chat_context(str(project["id"]))
    user_content = context or _build_context(project, chat_context)

    if document_type == "budget":
        estimate = budget_ai.generate(user_content)
        client_budget = None
        raw_budget = project.get("estimated_budget")
        if raw_budget not in (None, ""):
            try:
                client_budget = float(raw_budget)
            except (TypeError, ValueError):
                client_budget = None
        persist_budget_estimate_rows(str(project["id"]), estimate, client_budget=client_budget)
        return _budget_to_documentation(estimate)

    generated = documentation_ai.generate(user_content, document_type=document_type)
    data = generated.model_dump()
    data["title"] = DOC_TYPE_LABELS.get(document_type, document_type)
    return data


def _enrich_document(doc: dict[str, Any]) -> dict[str, Any]:
    latest = _get_latest_version(str(doc["id"]))
    enriched = {**doc}
    if _is_budget_document(doc):
        enriched["document_type"] = "budget"
        enriched["title"] = DOC_TYPE_LABELS["budget"]
    else:
        enriched["title"] = DOC_TYPE_LABELS.get(str(doc.get("document_type") or ""), doc.get("title") or "Document")
    if latest:
        enriched["current_version"] = latest.get("version_number", doc.get("current_version", 1))
        enriched["latest_version_id"] = latest.get("id")
        enriched["pdf_available"] = bool(latest.get("file_url"))
        enriched["pdf_url"] = latest.get("file_url")
        enriched["version_created_at"] = latest.get("created_at")
    else:
        enriched["pdf_available"] = False
        enriched["pdf_url"] = None
    return enriched


class DocumentService:
    def list_documents(self, project_id: UUID) -> list[dict[str, Any]]:
        rows = project_documents_repo.list(filters={"project_id": str(project_id)}, limit=50)
        return [_enrich_document(r) for r in rows]

    def get_document(self, document_id: UUID) -> dict[str, Any] | None:
        doc = project_documents_repo.get(document_id)
        if not doc:
            return None
        enriched = _enrich_document(doc)
        enriched["versions"] = _list_versions(str(document_id))
        return enriched

    def generate(
        self,
        project: dict[str, Any],
        document_type: str,
        *,
        context: str = "",
        created_by: str | None = None,
        force_new_version: bool = False,
    ) -> dict[str, Any]:
        project_id = str(project["id"])
        if document_type == "all":
            results = []
            for doc_type in PACKAGE_DOC_TYPES:
                results.append(
                    self.generate(
                        project,
                        doc_type,
                        context=context,
                        created_by=created_by,
                        force_new_version=force_new_version,
                    )
                )
            return {"documents": results, "count": len(results)}

        if document_type not in PACKAGE_DOC_TYPES:
            raise ValueError(f"Unsupported document_type: {document_type}")

        existing = _find_document(project_id, document_type)
        if existing and not force_new_version:
            latest = _get_latest_version(str(existing["id"]))
            if latest and _is_recent_version(latest):
                return {"document": _enrich_document(existing), "version": latest, "idempotent": True}

        content_data = _generate_content(project, document_type, context)
        markdown = _sections_to_markdown(content_data.get("sections", []), content_data.get("summary", ""))
        generated_at = _now()

        if existing:
            document = existing
            next_version = int(document.get("current_version") or 1) + 1
            stable_title = DOC_TYPE_LABELS.get(document_type, document_type)
            project_documents_repo.update(
                document["id"],
                {
                    "title": stable_title,
                    "current_version": next_version,
                    "updated_at": generated_at.isoformat(),
                },
            )
            document = project_documents_repo.get(document["id"]) or document
        else:
            next_version = 1
            stable_title = DOC_TYPE_LABELS.get(document_type, document_type)
            document = project_documents_repo.insert(
                {
                    "project_id": project_id,
                    "document_type": _persisted_document_type(document_type),
                    "title": stable_title,
                    "status": "draft",
                    "visibility": "partial",
                    "current_version": next_version,
                }
            )

        pdf_bytes = build_pdf_bytes(
            project_name=project.get("title") or "Project",
            document_title=DOC_TYPE_LABELS.get(document_type, document_type),
            document_type=document_type,
            version=next_version,
            generated_at=generated_at,
            sections=content_data.get("sections", []),
            summary=content_data.get("summary", ""),
            project=project,
        )

        storage_path = _pdf_storage_path(project_id, str(document["id"]), next_version)
        file_url = _upload_pdf(storage_path, pdf_bytes)

        version = document_versions_repo.insert(
            {
                "document_id": str(document["id"]),
                "version_number": next_version,
                "content": markdown,
                "content_json": {**content_data, "pdf_path": storage_path},
                "file_url": file_url,
                "generated_by": "ai",
                "created_by": created_by,
                "created_at": generated_at.isoformat(),
            }
        )

        return {
            "document": _enrich_document(document),
            "version": version,
            "generated": content_data,
            "idempotent": False,
        }

    def regenerate(
        self,
        document_id: UUID,
        project: dict[str, Any],
        *,
        context: str = "",
        created_by: str | None = None,
    ) -> dict[str, Any]:
        doc = project_documents_repo.get(document_id)
        if not doc:
            raise LookupError("Document not found")

        latest = _get_latest_version(str(document_id))
        if latest and _is_recent_version(latest):
            return {"document": _enrich_document(doc), "version": latest, "idempotent": True}

        return self.generate(
            project,
            "budget" if _is_budget_document(doc) else doc["document_type"],
            context=context,
            created_by=created_by,
            force_new_version=True,
        )

    def get_pdf_bytes(
        self,
        document_id: UUID,
        *,
        version_number: int | None = None,
    ) -> tuple[bytes, str] | None:
        doc = project_documents_repo.get(document_id)
        if not doc:
            return None
        versions = _list_versions(str(document_id))
        if not versions:
            return None
        if version_number is not None:
            selected = next((v for v in versions if int(v.get("version_number") or 0) == version_number), None)
        else:
            selected = versions[0]
        if not selected or not selected.get("file_url"):
            return None
        pdf_bytes = _download_pdf(selected["file_url"])
        if not pdf_bytes:
            return None
        label = DOC_TYPE_LABELS.get(str(doc.get("document_type") or ""), str(doc.get("document_type") or "document"))
        filename = f"{label.replace(' ', '_')}_v{selected.get('version_number', 1)}.pdf"
        return pdf_bytes, filename

    def get_pdf_signed_url(self, document_id: UUID, *, version_number: int | None = None) -> str | None:
        doc = project_documents_repo.get(document_id)
        if not doc:
            return None
        versions = _list_versions(str(document_id))
        if not versions:
            return None
        if version_number is not None:
            selected = next((v for v in versions if int(v.get("version_number") or 0) == version_number), None)
        else:
            selected = versions[0]
        if not selected or not selected.get("file_url"):
            return None
        if is_memory_mode():
            return None
        return _get_signed_pdf_url(selected["file_url"])


document_service = DocumentService()
