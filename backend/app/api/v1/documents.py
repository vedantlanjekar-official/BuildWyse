"""Project document endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.schemas.documents import (
    DocumentDetailResponse,
    DocumentGenerateAllResponse,
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    DocumentResponse,
    DocumentVersionResponse,
)
from app.services.document_service import document_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()


def _handle_project_errors(fn):
    try:
        return fn()
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")


def _to_document(row: dict) -> DocumentResponse:
    return DocumentResponse.model_validate(row)


def _to_version(row: dict | None) -> DocumentVersionResponse | None:
    if not row:
        return None
    return DocumentVersionResponse.model_validate(row)


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_document(body: DocumentGenerateRequest, user: AuthUser = Depends(get_current_user)):
    project = _handle_project_errors(lambda: project_service.get_project(body.project_id, user))

    try:
        result = document_service.generate(
            project,
            body.document_type,
            context=body.context,
            created_by=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if "documents" in result:
        return DocumentGenerateAllResponse(
            documents=[
                DocumentGenerateResponse(
                    document=_to_document(item["document"]),
                    version=_to_version(item.get("version")),
                    idempotent=item.get("idempotent", False),
                )
                for item in result["documents"]
            ],
            count=result["count"],
        )

    return DocumentGenerateResponse(
        document=_to_document(result["document"]),
        version=_to_version(result.get("version")),
        idempotent=result.get("idempotent", False),
    )


@router.get("/project/{project_id}", response_model=list[DocumentResponse])
async def list_documents(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    _handle_project_errors(lambda: project_service.get_project(project_id, user))
    rows = document_service.list_documents(project_id)
    return [_to_document(r) for r in rows]


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(document_id: UUID, user: AuthUser = Depends(get_current_user)):
    doc = document_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _handle_project_errors(lambda: project_service.get_project(UUID(str(doc["project_id"])), user))
    return DocumentDetailResponse.model_validate(doc)


@router.get("/{document_id}/pdf")
async def download_document_pdf(
    document_id: UUID,
    user: AuthUser = Depends(get_current_user),
    signed: bool = Query(default=False, description="Return signed URL JSON instead of PDF bytes"),
    version: int | None = Query(default=None, description="Specific version number to download"),
):
    doc = document_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _handle_project_errors(lambda: project_service.get_project(UUID(str(doc["project_id"])), user))

    if signed:
        url = document_service.get_pdf_signed_url(document_id, version_number=version)
        if not url:
            raise HTTPException(status_code=404, detail="PDF not available")
        return {"signed_url": url}

    pdf_result = document_service.get_pdf_bytes(document_id, version_number=version)
    if not pdf_result:
        raise HTTPException(status_code=404, detail="PDF not available")
    pdf_bytes, filename = pdf_result
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/{document_id}/regenerate", status_code=status.HTTP_201_CREATED)
async def regenerate_document(document_id: UUID, user: AuthUser = Depends(get_current_user)):
    doc = document_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    project = _handle_project_errors(
        lambda: project_service.get_project(UUID(str(doc["project_id"])), user)
    )

    try:
        result = document_service.regenerate(document_id, project, created_by=user.id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentGenerateResponse(
        document=_to_document(result["document"]),
        version=_to_version(result.get("version")),
        idempotent=result.get("idempotent", False),
    )
