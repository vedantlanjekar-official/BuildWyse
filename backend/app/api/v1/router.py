"""Aggregate all v1 API routers."""

from fastapi import APIRouter

from app.api.v1 import (
    admin,
    ai,
    auth,
    budgets,
    calendar,
    certificates,
    change_requests,
    clients,
    connect,
    contact,
    documents,
    evidence,
    freelancers,
    health,
    matching,
    milestones,
    notifications,
    organizations,
    payments,
    phases,
    projects,
    proposals,
    requirements,
    services,
    submissions,
    tasks,
    users,
    verification,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(contact.router, prefix="/contact", tags=["contact"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(freelancers.router, prefix="/freelancers", tags=["freelancers"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(requirements.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(matching.router, prefix="/matching", tags=["matching"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["proposals"])
api_router.include_router(phases.router, prefix="/phases", tags=["phases"])
api_router.include_router(milestones.router, prefix="/milestones", tags=["milestones"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
api_router.include_router(verification.router, prefix="/verification", tags=["verification"])
api_router.include_router(health.router, prefix="/health", tags=["project-health"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(connect.router, prefix="/connect", tags=["connect"])
api_router.include_router(change_requests.router, prefix="/change-requests", tags=["change-requests"])
api_router.include_router(services.router, prefix="/services", tags=["after-sales"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(certificates.router, prefix="/certificates", tags=["certificates"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
