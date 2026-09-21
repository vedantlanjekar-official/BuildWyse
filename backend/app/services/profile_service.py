"""Profile KYC, OTP verification, and media uploads."""

from __future__ import annotations

import base64
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.config import get_settings
from app.repositories.supabase_client import get_supabase, is_memory_mode, profiles_repo
from integrations.email.factory import get_email_provider

logger = logging.getLogger(__name__)

IDENTITY_BUCKET = "identity"
OTP_TTL_SECONDS = 600
AADHAAR_RE = re.compile(r"^\d{12}$")
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
PASSPORT_RE = re.compile(r"^[A-Z0-9]{6,9}$")
DL_RE = re.compile(r"^[A-Z0-9-]{8,20}$")
VOTER_RE = re.compile(r"^[A-Z0-9 /]{6,20}$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
CARD_EXPIRY_RE = re.compile(r"^(0[1-9]|1[0-2])\/\d{2}$")

GOV_ID_LABELS = {
    "aadhaar": "Aadhaar Card",
    "pan": "PAN Card",
    "passport": "Passport",
    "driving_license": "Driving License",
    "voter_id": "Voter ID",
}

_memory_otp: dict[str, dict] = {}
_memory_files: dict[str, bytes] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_id_number(value: str) -> str:
    return re.sub(r"\s+", "", (value or "")).upper()


def normalize_aadhaar(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def mask_sensitive(value: str | None, *, keep: int = 4) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", "", value)
    if len(cleaned) <= keep:
        return cleaned
    return f"{'•' * max(4, len(cleaned) - keep)}{cleaned[-keep:]}"


def mask_aadhaar(value: str | None) -> str | None:
    if not value:
        return None
    digits = normalize_aadhaar(value)
    if len(digits) < 4:
        return digits
    return f"XXXX-XXXX-{digits[-4:]}"


def validate_government_id(id_type: str, id_number: str) -> str:
    if id_type == "aadhaar":
        digits = normalize_aadhaar(id_number)
        if not AADHAAR_RE.match(digits):
            raise ValueError("Aadhaar number must be 12 digits")
        return digits
    cleaned = normalize_id_number(id_number)
    if id_type == "pan":
        if not PAN_RE.match(cleaned):
            raise ValueError("PAN must look like ABCDE1234F")
        return cleaned
    if id_type == "passport":
        if not PASSPORT_RE.match(cleaned):
            raise ValueError("Enter a valid passport number")
        return cleaned
    if id_type == "driving_license":
        if not DL_RE.match(cleaned):
            raise ValueError("Enter a valid driving license number")
        return cleaned
    if id_type == "voter_id":
        if not VOTER_RE.match(cleaned):
            raise ValueError("Enter a valid voter ID number")
        return cleaned
    raise ValueError("Unsupported government ID type")


def compute_fully_verified(profile: dict) -> bool:
    address_ok = bool(
        profile.get("address_line1")
        and profile.get("city")
        and profile.get("state")
        and profile.get("pincode")
    ) or bool(profile.get("address"))
    gov_number = profile.get("government_id_number") or profile.get("aadhaar_number")
    return bool(
        profile.get("full_name")
        and profile.get("avatar_url")
        and profile.get("email")
        and profile.get("email_verified")
        and profile.get("phone")
        and profile.get("phone_verified")
        and profile.get("country")
        and address_ok
        and profile.get("government_id_verified")
        and profile.get("government_id_type")
        and gov_number
        and profile.get("government_id_url")
    )


def refresh_verification_status(user_id: str, profile: dict | None = None) -> dict:
    row = profile or profiles_repo.get(user_id) or {}
    fully = compute_fully_verified(row)
    status = "verified" if fully else ("pending" if any(
        [
            row.get("email_verified"),
            row.get("phone_verified"),
            row.get("government_id_verified"),
        ]
    ) else "unverified")
    if row.get("verification_status") != status:
        updated = profiles_repo.update(user_id, {"verification_status": status})
        if updated:
            row = updated
        else:
            row = {**row, "verification_status": status}
    return row


def serialize_profile(profile: dict, roles: list) -> dict:
    row = dict(profile)
    gov_number = row.get("government_id_number") or row.get("aadhaar_number")
    gov_type = row.get("government_id_type") or ("aadhaar" if row.get("aadhaar_number") else None)
    if gov_type == "aadhaar":
        row["government_id_number"] = mask_aadhaar(gov_number)
        row["aadhaar_number"] = mask_aadhaar(gov_number)
    else:
        row["government_id_number"] = mask_sensitive(gov_number)
        row["aadhaar_number"] = mask_aadhaar(row.get("aadhaar_number"))
    row["government_id_type"] = gov_type
    row["account_number"] = mask_sensitive(row.get("account_number"))
    row["card_number"] = mask_sensitive(row.get("card_number"))
    row["is_fully_verified"] = compute_fully_verified(profile)
    row["roles"] = roles
    for key in ("email_verified", "phone_verified", "government_id_verified"):
        row[key] = bool(row.get(key))
    return row


def ensure_identity_bucket() -> None:
    client = get_supabase()
    if client is None:
        return
    try:
        buckets = client.storage.list_buckets()
        names = {b.name for b in buckets}
        if IDENTITY_BUCKET not in names:
            client.storage.create_bucket(IDENTITY_BUCKET, options={"public": False})
            logger.info("Created storage bucket %s", IDENTITY_BUCKET)
    except Exception as exc:
        logger.warning("Could not ensure identity bucket (%s)", exc)


def _decode_data_url(data_base64: str) -> bytes:
    raw = data_base64.strip()
    if "," in raw and raw.startswith("data:"):
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw)


def upload_identity_file(*, user_id: str, filename: str, content_type: str, data_base64: str) -> str:
    payload = _decode_data_url(data_base64)
    if len(payload) > 8 * 1024 * 1024:
        raise ValueError("File must be under 8MB")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp", "pdf"}:
        ext = "jpg"
    path = f"{user_id}/{uuid4().hex}.{ext}"

    if is_memory_mode() or get_supabase() is None:
        _memory_files[path] = payload
        return f"memory://{IDENTITY_BUCKET}/{path}"

    ensure_identity_bucket()
    client = get_supabase()
    assert client is not None
    client.storage.from_(IDENTITY_BUCKET).upload(
        path,
        payload,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    try:
        signed = client.storage.from_(IDENTITY_BUCKET).create_signed_url(path, 60 * 60 * 24 * 7)
        if isinstance(signed, dict):
            return signed.get("signedURL") or signed.get("signedUrl") or path
        return getattr(signed, "signed_url", None) or path
    except Exception:
        return path


def _otp_key(user_id: str, channel: str) -> str:
    return f"{user_id}:{channel}"


def send_otp(*, user_id: str, channel: str, destination: str) -> dict:
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires = _now() + timedelta(seconds=OTP_TTL_SECONDS)
    challenge = {
        "id": str(uuid4()),
        "user_id": user_id,
        "channel": channel,
        "destination": destination,
        "code": code,
        "expires_at": expires.isoformat(),
        "verified_at": None,
        "created_at": _now().isoformat(),
    }

    client = get_supabase()
    if client is not None and not is_memory_mode():
        try:
            client.table("otp_challenges").insert(challenge).execute()
        except Exception as exc:
            logger.warning("otp_challenges insert failed (%s) — memory fallback", exc)
            _memory_otp[_otp_key(user_id, channel)] = challenge
    else:
        _memory_otp[_otp_key(user_id, channel)] = challenge

    settings = get_settings()
    debug_code = code if settings.debug else None

    if channel == "email":
        try:
            provider = get_email_provider(
                mode=settings.email_mode,
                api_key=settings.email_api_key,
                from_address=settings.email_from,
            )
            provider.send(
                to=destination,
                subject="Your BuildWyse verification code",
                body=f"Your BuildWyse email verification code is {code}. It expires in 10 minutes.",
                html=f"<p>Your BuildWyse email verification code is <strong>{code}</strong>.</p><p>It expires in 10 minutes.</p>",
            )
        except Exception as exc:
            logger.warning("OTP email send failed (%s)", exc)
            debug_code = code
    else:
        logger.info("[OTP:phone] to=%s code=%s", destination, code)
        debug_code = code  # phone SMS not wired; surface code in debug/dev

    return {
        "status": "sent",
        "channel": channel,
        "destination": destination,
        "expires_in_seconds": OTP_TTL_SECONDS,
        "debug_code": debug_code,
    }


def verify_otp(*, user_id: str, channel: str, code: str) -> bool:
    expected = None
    challenge_id = None
    client = get_supabase()
    if client is not None and not is_memory_mode():
        try:
            result = (
                client.table("otp_challenges")
                .select("*")
                .eq("user_id", user_id)
                .eq("channel", channel)
                .is_("verified_at", "null")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = result.data or []
            if rows:
                expected = rows[0].get("code")
                challenge_id = rows[0].get("id")
                expires_at = rows[0].get("expires_at")
                if expires_at and datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")) < _now():
                    return False
        except Exception as exc:
            logger.warning("otp lookup failed (%s)", exc)

    if expected is None:
        mem = _memory_otp.get(_otp_key(user_id, channel))
        if not mem:
            return False
        expires_at = datetime.fromisoformat(str(mem["expires_at"]).replace("Z", "+00:00"))
        if expires_at < _now():
            return False
        expected = mem["code"]
        challenge_id = mem.get("id")

    if str(code).strip() != str(expected):
        return False

    if client is not None and challenge_id and not is_memory_mode():
        try:
            client.table("otp_challenges").update({"verified_at": _now().isoformat()}).eq("id", challenge_id).execute()
        except Exception:
            pass
    _memory_otp.pop(_otp_key(user_id, channel), None)

    patch = {"email_verified": True} if channel == "email" else {"phone_verified": True}
    profiles_repo.update(user_id, patch)
    refresh_verification_status(user_id)
    return True


def submit_government_id(
    *,
    user_id: str,
    id_type: str,
    id_number: str,
    filename: str,
    content_type: str,
    data_base64: str,
) -> dict:
    validated = validate_government_id(id_type, id_number)
    url = upload_identity_file(
        user_id=user_id,
        filename=filename,
        content_type=content_type,
        data_base64=data_base64,
    )

    patch = {
        "government_id_type": id_type,
        "government_id_number": validated,
        "government_id_url": url,
        "government_id_verified": True,
    }
    if id_type == "aadhaar":
        patch["aadhaar_number"] = validated

    updated = profiles_repo.update(user_id, patch)
    return refresh_verification_status(user_id, updated)


def sanitize_bank_card_payload(payload: dict) -> dict:
    out = dict(payload)
    if "ifsc_code" in out and out["ifsc_code"]:
        code = str(out["ifsc_code"]).strip().upper()
        if not IFSC_RE.match(code):
            raise ValueError("IFSC must look like HDFC0001234")
        out["ifsc_code"] = code
    if "account_number" in out and out["account_number"]:
        digits = re.sub(r"\D", "", str(out["account_number"]))
        if len(digits) < 8 or len(digits) > 18:
            raise ValueError("Account number must be 8–18 digits")
        out["account_number"] = digits
    if "card_number" in out and out["card_number"]:
        digits = re.sub(r"\D", "", str(out["card_number"]))
        if len(digits) < 12 or len(digits) > 19:
            raise ValueError("Card number must be 12–19 digits")
        out["card_number"] = digits
    if "card_expiry" in out and out["card_expiry"]:
        expiry = str(out["card_expiry"]).strip()
        if not CARD_EXPIRY_RE.match(expiry):
            raise ValueError("Card expiry must be MM/YY")
        out["card_expiry"] = expiry
    # Never persist CVC
    out.pop("card_cvc", None)
    out.pop("cvc", None)
    return out
