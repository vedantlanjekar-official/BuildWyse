"""Connect service — project chat, meeting proposals, Meet links, email, calendar."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.repositories.supabase_client import (
    Repository,
    profiles_repo,
    projects_repo,
)
from app.services.notification_service import notification_service
from integrations.meetings.provider import get_meet_provider

meetings_repo = Repository("meetings")
project_messages_repo = Repository("project_messages")
calendar_events_repo = Repository("calendar_events")


def _safe_email(*, to: str | None, subject: str, body: str, html: str | None = None) -> None:
    if not to:
        return
    try:
        notification_service.email.send(to=to, subject=subject, body=body, html=html)
    except Exception:
        # Resend sandbox / domain limits must never block Connect flows
        pass


def _parse_dt(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _profile(user_id: str | None) -> dict | None:
    if not user_id:
        return None
    return profiles_repo.get(user_id)


def _counterpart_ids(project: dict, actor_id: str) -> tuple[str | None, str | None]:
    """Return (requires_approval_from, freelancer_profile_id)."""
    client_id = str(project.get("client_id") or "")
    freelancer_id = str(project.get("assigned_freelancer_id") or "") or None
    if str(actor_id) == client_id:
        return freelancer_id, freelancer_id
    return client_id or None, freelancer_id


class ConnectService:
    def list_messages(self, project_id: str, *, limit: int = 200) -> list[dict]:
        rows = project_messages_repo.list(filters={"project_id": project_id}, limit=limit)
        rows.sort(key=lambda r: r.get("created_at") or "")
        enriched = []
        for row in rows:
            sender = _profile(str(row.get("sender_id") or ""))
            enriched.append(
                {
                    **row,
                    "sender_name": (sender or {}).get("full_name") or (sender or {}).get("email") or "User",
                    "sender_email": (sender or {}).get("email"),
                }
            )
        return enriched

    def send_message(self, *, project: dict, sender_id: str, body: str, message_type: str = "text") -> dict:
        text = (body or "").strip()
        if not text:
            raise ValueError("Message body is required")
        row = project_messages_repo.insert(
            {
                "project_id": str(project["id"]),
                "sender_id": sender_id,
                "body": text,
                "message_type": message_type,
                "metadata": {},
            }
        )
        # Notify the other party
        client_id = str(project.get("client_id") or "")
        freelancer_id = str(project.get("assigned_freelancer_id") or "")
        recipient = freelancer_id if sender_id == client_id else client_id
        if recipient:
            recipient_profile = _profile(recipient)
            notification_service.notify(
                user_id=recipient,
                notification_type="chat",
                title="New Connect message",
                body=text[:180],
                project_id=project["id"],
                action_url=f"/projects/{project['id']}/connect",
                send_email=False,
                email=(recipient_profile or {}).get("email"),
            )
        return {
            **row,
            "sender_name": (_profile(sender_id) or {}).get("full_name") or "You",
            "sender_email": (_profile(sender_id) or {}).get("email"),
        }

    def list_meetings(self, project_id: str) -> list[dict]:
        rows = meetings_repo.list(filters={"project_id": project_id}, limit=100)
        rows.sort(key=lambda r: r.get("scheduled_at") or "", reverse=True)
        return rows

    def schedule_meeting(
        self,
        *,
        project: dict,
        actor_id: str,
        subject: str,
        scheduled_at: datetime | str,
        duration_minutes: int = 60,
        notes: str | None = None,
        meeting_type: str = "client_freelancer",
    ) -> dict:
        starts = _parse_dt(scheduled_at)
        ends = starts + timedelta(minutes=max(15, int(duration_minutes or 60)))
        client_id = str(project.get("client_id") or "")
        freelancer_id = str(project.get("assigned_freelancer_id") or "") or None
        if not freelancer_id:
            raise ValueError("Assign a freelancer to this project before scheduling a meeting")

        requires_from, _ = _counterpart_ids(project, actor_id)
        if not requires_from:
            raise ValueError("Could not determine who must approve this meeting")

        client_profile = _profile(client_id)
        freelancer_profile = _profile(freelancer_id)
        emails = [
            e
            for e in [
                (client_profile or {}).get("email"),
                (freelancer_profile or {}).get("email"),
            ]
            if e
        ]

        meet = get_meet_provider().create_meeting(
            title=subject,
            starts_at=starts,
            ends_at=ends,
            attendee_emails=emails,
        )

        row = meetings_repo.insert(
            {
                "project_id": str(project["id"]),
                "meeting_type": meeting_type if meeting_type else "client_freelancer",
                "title": subject,
                "subject": subject,
                "scheduled_at": starts.isoformat(),
                "ends_at": ends.isoformat(),
                "duration_minutes": int(duration_minutes or 60),
                "status": "pending_approval",
                "meeting_url": meet.get("meeting_url"),
                "notes": notes,
                "created_by": actor_id,
                "proposed_by": actor_id,
                "requires_approval_from": requires_from,
                "attendee_client_id": client_id,
                "attendee_freelancer_id": freelancer_id,
                "metadata": {
                    "meet_provider": meet.get("provider"),
                    "external_event_id": meet.get("external_event_id"),
                },
            }
        )

        when_label = starts.strftime("%d %b %Y, %I:%M %p %Z")
        link = meet.get("meeting_url") or ""
        proposer = _profile(actor_id) or {}
        proposer_name = proposer.get("full_name") or proposer.get("email") or "A collaborator"

        email_subject = f"Meeting proposed: {subject}"
        email_body = (
            f"{proposer_name} proposed a meeting on BuildWyse.\n\n"
            f"Project: {project.get('title')}\n"
            f"Subject: {subject}\n"
            f"When: {when_label}\n"
            f"Duration: {duration_minutes} minutes\n"
            f"Google Meet: {link}\n\n"
            f"Status: Pending approval\n"
            f"Open Connect to approve or reject: /projects/{project['id']}/connect\n"
        )
        html = f"""
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0d2a28">
          <h2 style="margin:0 0 8px">Meeting proposed</h2>
          <p><strong>{proposer_name}</strong> scheduled a meeting on <strong>BuildWyse</strong>.</p>
          <ul>
            <li><strong>Project:</strong> {project.get('title')}</li>
            <li><strong>Subject:</strong> {subject}</li>
            <li><strong>When:</strong> {when_label}</li>
            <li><strong>Duration:</strong> {duration_minutes} minutes</li>
          </ul>
          <p><a href="{link}" style="display:inline-block;background:#0d2a28;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Join Google Meet</a></p>
          <p style="color:#5a6d68">This meeting is <strong>pending approval</strong>. Please approve or reject it in Connect.</p>
        </div>
        """

        for uid, profile in ((client_id, client_profile), (freelancer_id, freelancer_profile)):
            if not uid or not profile:
                continue
            try:
                notification_service.notify(
                    user_id=uid,
                    notification_type="meeting",
                    title=email_subject,
                    body=email_body,
                    project_id=project["id"],
                    action_url=f"/projects/{project['id']}/connect",
                    send_email=False,
                    email=profile.get("email"),
                )
            except Exception:
                pass
            _safe_email(
                to=profile.get("email"),
                subject=email_subject,
                body=email_body,
                html=html,
            )

        # System chat line
        try:
            self.send_message(
                project=project,
                sender_id=actor_id,
                body=f"Proposed meeting “{subject}” for {when_label}. Meet link: {link}",
                message_type="meeting_share",
            )
        except Exception:
            pass

        return row

    def approve_meeting(self, *, meeting_id: str, actor_id: str, project: dict) -> dict:
        meeting = meetings_repo.get(meeting_id)
        if not meeting:
            raise LookupError("Meeting not found")
        if str(meeting.get("project_id")) != str(project["id"]):
            raise ValueError("Meeting does not belong to this project")
        if str(meeting.get("status")) not in {"pending_approval", "scheduled"}:
            raise ValueError(f"Meeting cannot be approved from status {meeting.get('status')}")

        required = str(meeting.get("requires_approval_from") or "")
        if required and required != str(actor_id):
            raise PermissionError("Only the assigned counterpart can approve this meeting")
        if str(meeting.get("proposed_by") or "") == str(actor_id):
            raise PermissionError("You cannot approve a meeting you proposed")

        starts = _parse_dt(meeting.get("scheduled_at"))
        ends = (
            _parse_dt(meeting["ends_at"])
            if meeting.get("ends_at")
            else starts + timedelta(minutes=int(meeting.get("duration_minutes") or 60))
        )
        subject = meeting.get("subject") or meeting.get("title") or "Meeting"
        link = meeting.get("meeting_url") or ""

        cal = calendar_events_repo.insert(
            {
                "project_id": str(project["id"]),
                "title": subject,
                "description": f"Google Meet: {link}\n{meeting.get('notes') or ''}".strip(),
                "event_type": "meeting",
                "starts_at": starts.isoformat(),
                "ends_at": ends.isoformat(),
                "all_day": False,
                "created_by": actor_id,
            }
        )

        updated = meetings_repo.update(
            meeting_id,
            {
                "status": "approved",
                "approved_by": actor_id,
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "calendar_event_id": cal.get("id"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ) or {**meeting, "status": "approved", "calendar_event_id": cal.get("id")}

        when_label = starts.strftime("%d %b %Y, %I:%M %p %Z")
        email_subject = f"Meeting confirmed: {subject}"
        email_body = (
            f"Your BuildWyse meeting is confirmed.\n\n"
            f"Project: {project.get('title')}\n"
            f"Subject: {subject}\n"
            f"When: {when_label}\n"
            f"Google Meet: {link}\n"
            f"It has been added to the project calendar.\n"
        )
        html = f"""
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0d2a28">
          <h2 style="margin:0 0 8px">Meeting confirmed</h2>
          <p>Your meeting on <strong>BuildWyse</strong> is approved and on the calendar.</p>
          <ul>
            <li><strong>Project:</strong> {project.get('title')}</li>
            <li><strong>Subject:</strong> {subject}</li>
            <li><strong>When:</strong> {when_label}</li>
          </ul>
          <p><a href="{link}" style="display:inline-block;background:#0d2a28;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Join Google Meet</a></p>
        </div>
        """
        for uid in {
            str(meeting.get("attendee_client_id") or project.get("client_id") or ""),
            str(meeting.get("attendee_freelancer_id") or project.get("assigned_freelancer_id") or ""),
        }:
            if not uid:
                continue
            profile = _profile(uid)
            if not profile:
                continue
            try:
                notification_service.notify(
                    user_id=uid,
                    notification_type="meeting",
                    title=email_subject,
                    body=email_body,
                    project_id=project["id"],
                    action_url=f"/projects/{project['id']}/connect",
                    send_email=False,
                    email=profile.get("email"),
                )
            except Exception:
                pass
            _safe_email(
                to=profile.get("email"),
                subject=email_subject,
                body=email_body,
                html=html,
            )

        return {**updated, "calendar_event": cal}

    def reject_meeting(
        self,
        *,
        meeting_id: str,
        actor_id: str,
        project: dict,
        reason: str | None = None,
    ) -> dict:
        meeting = meetings_repo.get(meeting_id)
        if not meeting:
            raise LookupError("Meeting not found")
        if str(meeting.get("project_id")) != str(project["id"]):
            raise ValueError("Meeting does not belong to this project")

        required = str(meeting.get("requires_approval_from") or "")
        if required and required != str(actor_id):
            raise PermissionError("Only the assigned counterpart can reject this meeting")

        updated = meetings_repo.update(
            meeting_id,
            {
                "status": "rejected",
                "rejection_reason": reason,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ) or {**meeting, "status": "rejected", "rejection_reason": reason}

        subject = meeting.get("subject") or meeting.get("title") or "Meeting"
        email_subject = f"Meeting declined: {subject}"
        email_body = (
            f"A proposed meeting was declined on BuildWyse.\n\n"
            f"Project: {project.get('title')}\n"
            f"Subject: {subject}\n"
            f"Reason: {reason or 'No reason provided'}\n"
        )
        for uid in {
            str(meeting.get("attendee_client_id") or project.get("client_id") or ""),
            str(meeting.get("attendee_freelancer_id") or project.get("assigned_freelancer_id") or ""),
        }:
            if not uid:
                continue
            profile = _profile(uid)
            if not profile:
                continue
            try:
                notification_service.notify(
                    user_id=uid,
                    notification_type="meeting",
                    title=email_subject,
                    body=email_body,
                    project_id=project["id"],
                    action_url=f"/projects/{project['id']}/connect",
                    send_email=False,
                    email=profile.get("email"),
                )
            except Exception:
                pass
            _safe_email(to=profile.get("email"), subject=email_subject, body=email_body)
        return updated


connect_service = ConnectService()
