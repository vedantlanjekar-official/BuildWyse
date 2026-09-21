"""Document service tests (memory mode)."""

from uuid import UUID

import pytest

from app.services.document_service import (
    PACKAGE_DOC_TYPES,
    build_pdf_bytes,
    document_service,
    is_hardware_applicable,
)
from app.services.project_service import project_service
from app.core.security import AuthUser, Role


@pytest.fixture
def demo_project():
    user = AuthUser(id="11111111-1111-4111-8111-111111111101", email="client@example.com", roles=[Role.CLIENT])
    projects = project_service.list_projects(user, limit=1)
    assert projects
    return projects[0]


def test_build_pdf_has_magic_bytes():
    pdf = build_pdf_bytes(
        project_name="Test Project",
        document_title="PRD — Draft",
        document_type="prd",
        version=1,
        generated_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        sections=[{"heading": "Overview", "content": "Test content."}],
        summary="Summary text.",
    )
    assert pdf[:4] == b"%PDF"


def test_website_project_hardware_not_applicable(demo_project):
    assert is_hardware_applicable(demo_project) is False


def test_generate_all_documents_memory_mode(demo_project):
    result = document_service.generate(demo_project, "all")
    assert result["count"] == len(PACKAGE_DOC_TYPES)
    project_id = UUID(str(demo_project["id"]))
    listed = document_service.list_documents(project_id)
    assert len(listed) == len(PACKAGE_DOC_TYPES)


def test_hardware_spec_not_applicable_content(demo_project):
    result = document_service.generate(demo_project, "hardware_spec", force_new_version=True)
    content = result["generated"]
    assert "NOT APPLICABLE" in content["sections"][0]["content"].upper()


def test_get_pdf_bytes_after_generate(demo_project):
    result = document_service.generate(demo_project, "prd", force_new_version=True)
    doc_id = UUID(str(result["document"]["id"]))
    pdf_result = document_service.get_pdf_bytes(doc_id)
    assert pdf_result is not None
    pdf_bytes, filename = pdf_result
    assert pdf_bytes[:4] == b"%PDF"
    assert filename.endswith(".pdf")
