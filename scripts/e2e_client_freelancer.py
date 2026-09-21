"""E2E client + freelancer lifecycle test against live Supabase + OpenAI."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=True)

API = os.getenv("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/") + "/api/v1"
SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON = os.environ["SUPABASE_ANON_KEY"]
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

CLIENT_EMAIL = "vedantlanjekar456@gmail.com"
CLIENT_PASSWORD = "Vedant@2004"
FREELANCER_EMAIL = "valmet.intern@gmail.com"
FREELANCER_PASSWORD = "Valmet@2026"

RESULTS: list[dict] = []
DEFECTS: list[dict] = []


def log(step: str, ok: bool, detail: str = ""):
    RESULTS.append({"step": step, "ok": ok, "detail": detail[:500]})
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {step} — {detail[:200]}")


def defect(module: str, severity: str, problem: str, fix: str = ""):
    DEFECTS.append({"module": module, "severity": severity, "problem": problem, "fix": fix})
    print(f"[DEFECT:{severity}] {module}: {problem}")


def login(email: str, password: str) -> tuple[str, dict]:
    sb = create_client(SUPABASE_URL, ANON)
    res = sb.auth.sign_in_with_password({"email": email, "password": password})
    token = res.session.access_token
    user = {"id": str(res.user.id), "email": res.user.email}
    return token, user


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def call(client: httpx.Client, method: str, path: str, token: str, json_body=None, expect=None):
    r = client.request(method, f"{API}{path}", headers=headers(token), json=json_body, timeout=120.0)
    if expect and r.status_code != expect:
        raise AssertionError(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
    if r.status_code >= 400:
        raise AssertionError(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
    if r.headers.get("content-type", "").startswith("application/json"):
        return r.json() if r.content else None
    return r.content


def main() -> int:
    # Health
    with httpx.Client(timeout=30) as c:
        h = c.get(f"{API.replace('/api/v1','')}/health").json()
        log("env.health", h.get("status") == "ok" and h.get("openai_live") and h.get("supabase_configured"), json.dumps(h))

    # Auth client
    try:
        ctoken, cuser = login(CLIENT_EMAIL, CLIENT_PASSWORD)
        log("auth.client_login", True, cuser["email"])
    except Exception as e:
        log("auth.client_login", False, str(e))
        return 1

    # Auth freelancer
    try:
        ftoken, fuser = login(FREELANCER_EMAIL, FREELANCER_PASSWORD)
        log("auth.freelancer_login", True, fuser["email"])
    except Exception as e:
        log("auth.freelancer_login", False, str(e))
        return 1

    with httpx.Client(timeout=180.0) as http:
        # Role checks
        me = call(http, "GET", "/auth/me", ctoken)
        log("auth.client_role", "CLIENT" in [r.upper() if isinstance(r, str) else r for r in (me.get("roles") or [])] or me.get("account_type") == "client", str(me.get("roles")))
        fme = call(http, "GET", "/auth/me", ftoken)
        log("auth.freelancer_role", me is not None and (fme.get("account_type") == "freelancer" or "FREELANCER" in str(fme.get("roles"))), str(fme.get("roles")))

        # Security: freelancer cannot approve as client later; client admin isolation
        try:
            call(http, "GET", "/admin/overview", ctoken, expect=403)
            log("security.client_admin_blocked", True, "403")
        except AssertionError as e:
            if "403" in str(e):
                log("security.client_admin_blocked", True, "403")
            else:
                log("security.client_admin_blocked", False, str(e))
                defect("security", "P1", "Client reached admin endpoint", "enforce require_admin")

        # Create project
        project = call(
            http,
            "POST",
            "/projects",
            ctoken,
            {
                "title": "BuildWyse.in Landing Page",
                "description": (
                    "I want a professional landing page for BuildWyse.in that explains what BuildWyse is, "
                    "the problem it solves, how the platform works, AI-powered project discovery, verified freelancers, "
                    "teams and enterprises, intelligent matching, structured project execution, AI-assisted verification, "
                    "change management, after-sales services, project history and certifications."
                ),
                "industry": "Software / SaaS",
                "complexity": "medium",
                "category": "marketing_website",
            },
        )
        project_id = project["id"]
        log("project.create", project.get("state") == "PROJECT_DISCOVERY", project_id)

        # Research AI
        try:
            research = call(http, "POST", f"/ai/research?message={httpx.QueryParams({'message': project['description']})['message']}", ctoken)
            # fallback if query style fails
        except Exception:
            research = None
        if research is None:
            try:
                # Some routers expect body - try conversation research via requirement chat first after research helper
                r = http.post(
                    f"{API.replace('/api/v1','')}/api/v1/ai/research",
                    headers=headers(ctoken),
                    params={"message": "BuildWyse.in SaaS landing page for AI project execution platform"},
                    timeout=120,
                )
                research = r.json() if r.status_code < 400 else None
                log("ai.research", r.status_code < 400, str(research)[:200] if research else r.text[:200])
            except Exception as e:
                log("ai.research", False, str(e))
                defect("AI Research", "P1", str(e), "fix research endpoint")
        else:
            log("ai.research", True, str(research)[:200])

        # Transition + requirement chat
        states = [
            "REQUIREMENT_DISCUSSION",
            "DOCUMENTATION_PREPARATION",
            "DOCUMENTATION_REVIEW",
            "BUDGET_PLANNING",
            "DEVELOPMENT_PREFERENCE",
            "FREELANCER_MATCHING",
        ]
        # Stay in discovery first for chat
        conv = None
        messages = [
            "Our goal is conversions for clients and freelancers signing up. Brand should feel trustworthy and enterprise-grade.",
            "Primary users are verified clients needing software built and verified freelancers/teams/enterprises.",
            "Pages needed: Home, How it works, Features, For freelancers, Pricing teaser, Trust/certification, Contact/signup CTAs.",
            "Design: clean SaaS, strong typography, teal/slate, accessible, mobile-first. No purple gradients.",
            "Actually wait — we do want purple gradients as primary brand.",  # contradiction test
            "Correction: ignore purple — stick with teal/slate enterprise look, no purple.",
            "Tech: React + TypeScript + Tailwind, Vite or Next.js, hosted on Vercel, analytics, SEO, forms to waitlist.",
        ]
        conversation_id = None
        for msg in messages:
            body = {"project_id": project_id, "message": msg}
            if conversation_id:
                body["conversation_id"] = conversation_id
            resp = call(http, "POST", "/ai/requirements/chat", ctoken, body)
            conversation_id = resp["conversation_id"]
            structured = resp.get("structured_output") or {}
        log("ai.requirements_chat", conversation_id is not None, f"conversation={conversation_id}")

        # Create structured requirements (confirmed vs assumptions)
        reqs = [
            ("Landing page purpose", "business", "confirmed", "Explain BuildWyse value and convert signups"),
            ("Primary stack", "technical", "confirmed", "React TypeScript Tailwind; Vercel hosting"),
            ("Color system", "design", "confirmed", "Teal/slate enterprise; explicitly no purple"),
            ("Lead capture form", "functional", "pending", "Fields TBD after marketing review"),
            ("SEO assumptions", "non_functional", "assumption", "AI assumes English-first SEO unless multilingual requested"),
        ]
        created_req_ids = []
        for title, rtype, status, content in reqs:
            row = call(
                http,
                "POST",
                f"/requirements/project/{project_id}",
                ctoken,
                {"title": title, "requirement_type": rtype if rtype != "non_functional" else "non_functional", "content": content, "priority": "high"},
            )
            # update status
            updated = call(http, "PATCH", f"/requirements/{row['id']}", ctoken, {"status": status})
            created_req_ids.append(updated["id"])
        # Approve confirmed ones
        for rid, (_, _, status, _) in zip(created_req_ids, reqs):
            if status == "confirmed":
                call(http, "PATCH", f"/requirements/{rid}", ctoken, {"status": "approved"})
        log("requirements.approve", True, f"count={len(created_req_ids)}")

        # Advance states
        for st in states:
            try:
                call(http, "POST", f"/projects/{project_id}/transition", ctoken, {"target_state": st, "reason": "E2E QA"})
                log(f"state.{st}", True, st)
            except Exception as e:
                log(f"state.{st}", False, str(e))
                defect("state_machine", "P1", f"Cannot transition to {st}: {e}", "fix transition path")
                break

        # Documents + PDF
        docs = call(http, "POST", "/documents/generate", ctoken, {"project_id": project_id, "document_type": "all", "context": project["description"]})
        doc_list = docs.get("documents") if isinstance(docs, dict) else docs
        if isinstance(docs, dict) and "documents" not in docs and "document" in docs:
            doc_list = [docs["document"]]
        # list
        listed = call(http, "GET", f"/documents/project/{project_id}", ctoken)
        log("documents.generate_list", isinstance(listed, list) and len(listed) >= 7, f"count={len(listed) if isinstance(listed, list) else listed}")

        pdf_ok = 0
        pdf_fail = 0
        for d in listed if isinstance(listed, list) else []:
            did = d.get("id") or d.get("document_id")
            if not did:
                continue
            r = http.get(f"{API}/documents/{did}/pdf", headers=headers(ctoken), timeout=60)
            if r.status_code == 200 and r.content.startswith(b"%PDF"):
                pdf_ok += 1
            else:
                pdf_fail += 1
                defect("PDF", "P1", f"Document {did} PDF failed status={r.status_code}", "fix PDF generation/storage")
        log("documents.pdf", pdf_ok >= 7 and pdf_fail == 0, f"ok={pdf_ok} fail={pdf_fail}")

        # regenerate one
        if listed:
            did = listed[0].get("id")
            regen = call(http, "POST", f"/documents/{did}/regenerate", ctoken)
            log("documents.regenerate", True, str(regen)[:120])
            r = http.get(f"{API}/documents/{did}/pdf", headers=headers(ctoken), timeout=60)
            log("documents.pdf_after_regen", r.status_code == 200 and r.content.startswith(b"%PDF"), f"bytes={len(r.content)}")

        # Budget
        budget = call(http, "POST", "/budgets/estimate", ctoken, {"project_id": project_id, "client_budget": 150000})
        log("budget.estimate", budget is not None, str(budget)[:200])

        # Development preference
        try:
            call(http, "POST", "/budgets/preference", ctoken, {"project_id": project_id, "development_model": "individual", "notes": "E2E individual freelancer"})
            log("dev_preference.individual", True, "individual")
        except Exception as e:
            updated_proj = call(http, "PATCH", f"/projects/{project_id}", ctoken, {"development_model": "individual", "estimated_budget": 150000})
            log("dev_preference.individual", updated_proj.get("development_model") == "individual", str(e)[:120])

        # Matching
        match = call(http, "POST", "/matching/run", ctoken, {"project_id": project_id, "include_embedding": False, "limit": 10})
        candidates = match.get("candidates") or []
        log("matching.top_candidates", len(candidates) >= 1, f"count={len(candidates)}")
        # Prefer valmet freelancer if present else first
        freelancers = create_client(SUPABASE_URL, SERVICE).table("freelancer_profiles").select("id,user_id").eq("user_id", fuser["id"]).execute()
        preferred = freelancers.data[0]["id"] if freelancers.data else (candidates[0]["freelancer_id"] if candidates else None)
        # Ensure preferred appears or select first
        select_id = preferred
        if candidates:
            ids = [str(c["freelancer_id"]) for c in candidates]
            if preferred and str(preferred) not in ids:
                select_id = candidates[0]["freelancer_id"]
                defect("matching", "P2", "Preferred E2E freelancer not in top candidates (not hardcoded; ranking data-dependent)", "seed more matching DNA")
            elif preferred:
                select_id = preferred
            else:
                select_id = candidates[0]["freelancer_id"]

        sel = call(http, "POST", f"/matching/projects/{project_id}/select", ctoken, {"freelancer_id": select_id, "selection_reason": "Strong React/Tailwind corporate landing fit"})
        log("matching.select", True, str(select_id))

        for st in ["TECHNICAL_REVIEW", "CLIENT_FREELANCER_DISCUSSION", "AGREEMENT", "EXECUTION"]:
            try:
                call(http, "POST", f"/projects/{project_id}/transition", ctoken, {"target_state": st, "reason": "E2E"})
                log(f"state.{st}", True, st)
            except Exception as e:
                # if already advanced by select
                log(f"state.{st}", False, str(e))

        # Freelancer proposal / technical review
        proposal = call(
            http,
            "POST",
            "/proposals",
            ftoken,
            {
                "project_id": project_id,
                "proposed_solution": "Vite/React TypeScript landing with modular sections and CMS-ready content blocks.",
                "technical_perspective": "Component-driven UI, Tailwind design tokens, analytics, SEO meta, accessible forms.",
                "project_understanding": "BuildWyse marketing site to convert clients and freelancers with clear lifecycle storytelling.",
            },
        )
        log("freelancer.proposal", proposal is not None, str(proposal)[:160])

        # Phase + milestone + submission
        phase = call(
            http,
            "POST",
            f"/phases/project/{project_id}",
            ctoken,
            {"phase_number": 1, "name": "Homepage & Core Sections", "description": "Ship landing hero, how it works, features", "objectives": ["Hero", "Features", "CTA"]},
        )
        phase_id = phase["id"]
        log("execution.phase", True, phase_id)

        # Calendar
        cal = call(http, "GET", f"/calendar/project/{project_id}", ctoken)
        log("calendar.client", cal is not None, str(type(cal)))

        # Freelancer submission
        sub = call(http, "POST", f"/submissions/phase/{phase_id}", ftoken, {"submission_notes": "Initial homepage draft at https://github.com/demo/buildwyse-landing deployed to https://buildwyse-demo.vercel.app"})
        sub_id = sub["id"]
        log("execution.submission", True, sub_id)

        # Evidence
        ev = call(
            http,
            "POST",
            f"/evidence/submission/{sub_id}",
            ftoken,
            {"evidence_type": "git", "title": "GitHub repo", "url": "https://github.com/demo/buildwyse-landing", "description": "Landing page source"},
        )
        log("execution.evidence", True, str(ev)[:120])

        # AI verification
        ver = call(http, "POST", f"/verification/submission/{sub_id}", ctoken)
        log("ai.verification", ver is not None, str(ver)[:160])

        # Client rejects
        try:
            rej = call(
                http,
                "POST",
                "/submissions/reject",
                ctoken,
                {"submission_id": sub_id, "rejection_reason": "CTA hierarchy unclear; add stronger primary signup CTA and mobile spacing fixes.", "entity_type": "submission"},
            )
            log("execution.reject", True, str(rej)[:120])
        except Exception as e:
            # fallback direct status update via approve path missing - record defect and use patch workaround via service role only if endpoint missing
            log("execution.reject", False, str(e))
            defect("Approval/Rejection", "P1", f"Reject endpoint failed: {e}", "implement POST /submissions/reject")
            # emergency: update via service role for continuity then continue? Policy says no fake success - fix endpoint instead
            raise

        # Freelancer resubmit
        sub2 = call(http, "POST", f"/submissions/phase/{phase_id}", ftoken, {"submission_notes": "Revised CTA hierarchy and mobile spacing. Same repo + deployment."})
        log("execution.resubmit", True, sub2["id"])

        # Client approve - must be client
        try:
            # Freelancer self-approve must fail
            try:
                call(http, "POST", "/submissions/approve", ftoken, {"entity_type": "submission", "entity_id": sub2["id"], "approval_notes": "self"}, expect=403)
                log("security.freelancer_cannot_approve", True, "403")
            except AssertionError as e:
                if "403" in str(e) or "401" in str(e):
                    log("security.freelancer_cannot_approve", True, str(e)[:80])
                else:
                    log("security.freelancer_cannot_approve", False, str(e))
                    defect("security", "P0", "Freelancer could approve own submission", "client-only approval guard")

            appr = call(http, "POST", "/submissions/approve", ctoken, {"entity_type": "submission", "entity_id": sub2["id"], "approval_notes": "Looks good — approved"})
            # also approve phase
            call(http, "POST", "/submissions/approve", ctoken, {"entity_type": "phase", "entity_id": phase_id, "approval_notes": "Phase 1 approved"})
            log("execution.approve", True, str(appr)[:120])
        except Exception as e:
            log("execution.approve", False, str(e))
            defect("Approval", "P1", str(e), "fix approve endpoint")
            raise

        # Payment sandbox
        order = call(http, "POST", "/payments/orders", ctoken, {"project_id": project_id, "order_type": "milestone", "amount": 50000, "currency": "INR"})
        pay = http.post(
            f"{API}/payments/approve",
            headers={**headers(ctoken), "Idempotency-Key": f"e2e-pay-{int(time.time())}"},
            json={"payment_order_id": order["id"], "recipient_id": fuser["id"]},
            timeout=60,
        )
        log("payment.simulated", pay.status_code < 400, pay.text[:200])

        # Health
        health = call(http, "GET", f"/health/project/{project_id}", ctoken)
        log("project.health", health is not None, str(health)[:160])

        # CRMS
        cr = call(
            http,
            "POST",
            f"/change-requests/project/{project_id}",
            ctoken,
            {
                "title": "Interactive How BuildWyse Works section",
                "description": "Add dedicated How BuildWyse Works interactive workflow section with animated project lifecycle visualization and additional CTA functionality.",
            },
        )
        log("crms.create", cr is not None, str(cr)[:160])

        # ASSM classify large vs small
        small = call(http, "POST", "/services/classify?scope_expansion_percent=10&estimated_effort_hours=20", ctoken)
        large = call(http, "POST", "/services/classify?scope_expansion_percent=80&estimated_effort_hours=400", ctoken)
        log("assm.classify_small", True, str(small)[:120])
        log("assm.classify_large", True, str(large)[:120])

        # Complete + certificates — after CRMS, return via EXECUTION then verification/complete
        for st in ["EXECUTION", "PHASE_VERIFICATION", "COMPLETED"]:
            try:
                call(http, "POST", f"/projects/{project_id}/transition", ctoken, {"target_state": st, "reason": "E2E complete after CR"})
                log(f"state.{st}", True, st)
            except Exception as e:
                # already in target or alternate path
                detail = str(e)
                ok = "not allowed" not in detail.lower() or st == "EXECUTION"
                # If already COMPLETED/PHASE_VERIFICATION, treat soft
                if "not allowed" in detail.lower():
                    # try continue
                    log(f"state.{st}", False, detail)
                    defect("state_machine", "P2", f"Transition to {st} blocked after CR: {detail}", "allow CHANGE_REQUEST→PHASE_VERIFICATION or return via EXECUTION")
                else:
                    log(f"state.{st}", False, detail)

        svc = call(
            http,
            "POST",
            f"/services/project/{project_id}",
            ctoken,
            {
                "title": "Performance SEO multilingual conversion",
                "description": "Improve landing-page performance, enhance SEO, add multilingual capability, and improve conversion tracking.",
                "estimated_effort_hours": 60,
                "modules_affected": ["frontend", "analytics", "i18n"],
            },
        )
        log("assm.create", svc is not None, str(svc)[:160])

        try:
            call(http, "POST", f"/projects/{project_id}/transition", ctoken, {"target_state": "CERTIFIED", "reason": "E2E"})
        except Exception as e:
            log("state.CERTIFIED", False, str(e))

        certs = call(http, "POST", f"/certificates/project/{project_id}", ctoken, {"certificate_type": "project_completion"})
        # also freelancer cert
        try:
            call(http, "POST", f"/certificates/project/{project_id}", ctoken, {"certificate_type": "project_completion", "issued_to": fuser["id"]})
        except Exception as e:
            defect("Certification", "P2", f"Freelancer cert issue: {e}", "support dual certificates")
        log("certificates.issue", certs is not None, str(certs)[:200])

        # Persistence: re-list docs/pdfs
        listed2 = call(http, "GET", f"/documents/project/{project_id}", ctoken)
        persist_pdf = 0
        for d in listed2 if isinstance(listed2, list) else []:
            did = d.get("id")
            r = http.get(f"{API}/documents/{did}/pdf", headers=headers(ctoken), timeout=60)
            if r.status_code == 200 and r.content.startswith(b"%PDF"):
                persist_pdf += 1
        log("documents.pdf_persist", persist_pdf >= 7, f"ok={persist_pdf}")

        # Cross isolation: freelancer cannot list unrelated admin
        try:
            call(http, "GET", "/admin/users", ftoken, expect=403)
            log("security.freelancer_admin_blocked", True, "403")
        except AssertionError as e:
            log("security.freelancer_admin_blocked", "403" in str(e), str(e)[:120])

    # Write report artifacts
    out = ROOT / "docs" / "qa" / "_e2e_raw_results.json"
    out.write_text(json.dumps({"results": RESULTS, "defects": DEFECTS}, indent=2), encoding="utf-8")
    failed = [r for r in RESULTS if not r["ok"]]
    print(f"\nSUMMARY passed={len(RESULTS)-len(failed)} failed={len(failed)} defects={len(DEFECTS)}")
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
