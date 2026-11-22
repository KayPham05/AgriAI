"""Live API contract checks for database health and guest predictions."""

from __future__ import annotations

import json
import mimetypes
import uuid
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import registry_state
from registry_state import CaseResult


def check_health(url: str) -> bool:
    result = CaseResult(
        "API-HEALTH-01", "Blocked", "Auto", command=f"GET {url}",
        run_at=datetime.now(timezone.utc).isoformat(), run_id=uuid.uuid4().hex,
        evidence_kind="api_contract", selector="GET /api/health",
    )
    try:
        with urlopen(url, timeout=10) as response:
            received = response.status
            payload = json.loads(response.read())
        checks = payload.get("checks") if isinstance(payload, dict) else None
        healthy = (
            received == 200
            and isinstance(checks, dict)
            and payload.get("status") == "Healthy"
            and checks.get("database") == "Healthy"
        )
        result = replace(
            result, status="Passed" if healthy else "Failed", evidence="live HTTP response",
            actual=f"HTTP {received}: " + ("Healthy database" if healthy else "expected Healthy database response"),
        )
    except HTTPError as error:
        error.close()
        result = replace(result, status="Failed", actual=f"HTTP {error.code}", evidence="live HTTP response")
    except (json.JSONDecodeError, UnicodeError):
        result = replace(result, status="Failed", actual=f"HTTP {received}: invalid JSON", evidence="live HTTP response")
    except (URLError, OSError, ValueError) as error:
        result = replace(result, blocker=registry_state.redact_sensitive(str(error)))
    registry_state.emit_result(result)
    return result.status == "Passed"


def _nonempty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _has_timezone_expiry(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return datetime.fromisoformat(value).tzinfo is not None
    except ValueError:
        return False


def _guest_contract_issues(payload: object) -> list[str]:
    if not isinstance(payload, dict):
        return ["JSON object"]
    predicted = payload.get("predictedPlantDisease")
    confidence = payload.get("confidence")
    checks = {
        "predictedPlantDisease.className": isinstance(predicted, dict) and _nonempty_text(predicted.get("className")),
        "confidence": type(confidence) in {int, float} and 0 <= confidence <= 1,
        "predictionDetails": isinstance(payload.get("predictionDetails"), list),
        "guestToken": _nonempty_text(payload.get("guestToken")),
        "guestExpiresAt": _has_timezone_expiry(payload.get("guestExpiresAt")),
    }
    return [field for field, valid in checks.items() if not valid]


def check_guest_prediction(url: str, image_path: str) -> bool:
    image = Path(image_path)
    result = CaseResult(
        "API-PRED-GUEST-01", "Blocked", "Auto", command=f"POST {url} -F File=@{image.name}",
        run_at=datetime.now(timezone.utc).isoformat(), run_id=uuid.uuid4().hex,
        evidence_kind="api_contract", selector="POST /api/predictions without Authorization",
    )
    try:
        image_bytes = image.read_bytes()
    except OSError as error:
        result = replace(result, blocker=f"Cannot read guest image fixture: {registry_state.redact_sensitive(str(error))}")
        registry_state.emit_result(result)
        return False
    if not image_bytes:
        result = replace(result, blocker="Guest image fixture is empty")
        registry_state.emit_result(result)
        return False

    boundary = f"----AgriVision{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(image.name)[0] or "application/octet-stream"
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="File"; filename="{image.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()
    evidence = "live multipart HTTP response; guest token value omitted"
    try:
        request = Request(
            url, data=body, method="POST", headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        with urlopen(request, timeout=120) as response:
            received = response.status
            payload = json.loads(response.read())
        issues = _guest_contract_issues(payload)
        valid = received == 200 and not issues
        actual = f"HTTP {received}: " + (
            f"invalid or absent {', '.join(issues)}" if issues else "guest prediction response fields present"
        )
        result = replace(result, status="Passed" if valid else "Failed", actual=actual, evidence=evidence)
    except HTTPError as error:
        error.close()
        result = replace(result, status="Failed", actual=f"HTTP {error.code}", evidence=evidence)
    except (json.JSONDecodeError, UnicodeError):
        result = replace(result, status="Failed", actual=f"HTTP {received}: invalid JSON", evidence=evidence)
    except (URLError, OSError, ValueError) as error:
        result = replace(result, blocker=registry_state.redact_sensitive(str(error)))
    registry_state.emit_result(result)
    return result.status == "Passed"
