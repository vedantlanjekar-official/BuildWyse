"""Certificate endpoints."""

from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import certificates_repo
from app.schemas.certificates import CertificateIssueRequest, CertificateResponse, CertificateVerifyResponse
from app.services.certificate_service import certificate_service
from app.services.project_service import project_service

router = APIRouter()


@router.get("/project/{project_id}", response_model=list[CertificateResponse])
async def list_project_certificates(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = certificates_repo.list(filters={"project_id": str(project_id)}, limit=10)
    return [CertificateResponse.model_validate(r) for r in rows]


@router.get("/{certificate_id}/pdf")
async def download_certificate_pdf(certificate_id: UUID, user: AuthUser = Depends(get_current_user)):
    cert = certificates_repo.get(certificate_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    project_service.get_project(UUID(str(cert["project_id"])), user)

    meta = cert.get("metadata") or {}
    project_title = meta.get("project_title") or "BuildWyse Project"
    issued_at = cert.get("issued_at") or ""

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(306, 720, "BuildWyse Certificate")
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(306, 680, f"Certificate No: {cert.get('certificate_number', '')}")
    pdf.drawCentredString(306, 650, f"Project: {project_title}")
    pdf.drawCentredString(306, 620, f"Issued To: {cert.get('issued_to', '')}")
    pdf.drawCentredString(306, 590, f"Issued At: {issued_at}")
    pdf.save()

    filename = f"certificate-{cert.get('certificate_number', certificate_id)}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/project/{project_id}", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
async def issue_certificate(
    project_id: UUID,
    body: CertificateIssueRequest,
    user: AuthUser = Depends(get_current_user),
):
    project_service.get_project(project_id, user)
    cert = certificate_service.issue_certificate(
        project_id,
        user.id,
        certificate_type=body.certificate_type,
        issued_to=str(body.issued_to) if body.issued_to else None,
    )
    return CertificateResponse.model_validate(cert)


@router.get("/verify/{certificate_number}", response_model=CertificateVerifyResponse)
async def verify_certificate(certificate_number: str):
    result = certificate_service.verify_certificate(certificate_number)
    return CertificateVerifyResponse(**result)
