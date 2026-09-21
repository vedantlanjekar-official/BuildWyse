"""AI chat and generation endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ai.services import budget_ai, documentation_ai, requirement_ai, research_ai
from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import ai_conversations_repo, ai_messages_repo
from app.schemas.ai import (
    AIConversationCreate,
    AIConversationResponse,
    AIMessageResponse,
    RequirementChatRequest,
    RequirementChatResponse,
)
from app.services.audit_service import audit_service
from app.services.project_service import project_service

router = APIRouter()


@router.post("/conversations", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(body: AIConversationCreate, user: AuthUser = Depends(get_current_user)):
    if body.project_id:
        project_service.get_project(body.project_id, user)
    row = ai_conversations_repo.insert(
        {
            "project_id": str(body.project_id) if body.project_id else None,
            "user_id": user.id,
            "conversation_type": body.conversation_type,
            "title": body.title,
            "status": "active",
        }
    )
    return AIConversationResponse.model_validate(row)


@router.get("/conversations/project/{project_id}", response_model=list[AIConversationResponse])
async def list_project_conversations(
    project_id: UUID,
    conversation_type: str | None = Query(default=None),
    user: AuthUser = Depends(get_current_user),
):
    project_service.get_project(project_id, user)
    filters: dict[str, str] = {"project_id": str(project_id)}
    if conversation_type:
        filters["conversation_type"] = conversation_type
    rows = ai_conversations_repo.list(filters=filters, limit=100)
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return [AIConversationResponse.model_validate(r) for r in rows]


@router.get("/conversations/{conversation_id}/messages", response_model=list[AIMessageResponse])
async def list_conversation_messages(
    conversation_id: UUID,
    user: AuthUser = Depends(get_current_user),
):
    conv = ai_conversations_repo.get(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.get("project_id"):
        project_service.get_project(UUID(str(conv["project_id"])), user)
    elif str(conv.get("user_id")) != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    rows = ai_messages_repo.list(filters={"conversation_id": str(conversation_id)}, limit=500)
    rows.sort(key=lambda r: r.get("created_at") or "")
    return [AIMessageResponse.model_validate(r) for r in rows]


@router.post("/requirements/chat", response_model=RequirementChatResponse)
async def requirement_chat(body: RequirementChatRequest, user: AuthUser = Depends(get_current_user)):
    project = project_service.get_project(body.project_id, user)

    if body.conversation_id:
        conv = ai_conversations_repo.get(body.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation_id = body.conversation_id
    else:
        conv = ai_conversations_repo.insert(
            {
                "project_id": str(body.project_id),
                "user_id": user.id,
                "conversation_type": "requirement_discovery",
                "title": f"Requirements — {project.get('title', 'Project')}",
                "status": "active",
            }
        )
        conversation_id = UUID(str(conv["id"]))

    user_msg = ai_messages_repo.insert(
        {
            "conversation_id": str(conversation_id),
            "role": "user",
            "content": body.message,
            "metadata": {},
        }
    )

    structured = requirement_ai.generate(body.message)
    assistant_content = structured.summary
    if structured.open_questions:
        assistant_content += "\n\nOpen questions:\n- " + "\n- ".join(structured.open_questions)

    assistant_msg = ai_messages_repo.insert(
        {
            "conversation_id": str(conversation_id),
            "role": "assistant",
            "content": assistant_content,
            "metadata": {"structured": structured.model_dump()},
        }
    )

    audit_service.log(
        actor_id=user.id,
        action="ai.requirement_chat",
        entity_type="ai_conversation",
        entity_id=conversation_id,
        project_id=body.project_id,
    )

    return RequirementChatResponse(
        conversation_id=conversation_id,
        user_message=AIMessageResponse.model_validate(user_msg),
        assistant_message=AIMessageResponse.model_validate(assistant_msg),
        structured_output=structured.model_dump(),
    )


@router.post("/research")
async def ai_research(message: str, user: AuthUser = Depends(get_current_user)):
    return research_ai.generate(message).model_dump()


@router.post("/documentation")
async def ai_documentation(message: str, document_type: str = "prd", user: AuthUser = Depends(get_current_user)):
    return documentation_ai.generate(message, document_type=document_type).model_dump()


@router.post("/budget")
async def ai_budget(message: str, user: AuthUser = Depends(get_current_user)):
    return budget_ai.generate(message).model_dump()
