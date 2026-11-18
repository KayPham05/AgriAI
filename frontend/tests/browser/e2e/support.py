"""Shared Playwright fixtures, synthetic data, and stateful API doubles for AgriAI browser tests."""

from __future__ import annotations

import json
import os
import shutil
import struct
import subprocess
import time
import unittest
import zlib
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, urlparse
from urllib.request import urlopen

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[4]
FRONTEND_DIR = ROOT / "frontend"
DEFAULT_BASE_URL = os.environ.get("E2E_BASE_URL") or os.environ.get("BASE_URL") or "http://localhost:3000"
AUTH_STORAGE_KEY = "leafai_auth_session"

CREATED_AT = "2026-10-21T00:00:00Z"


def png_bytes(width: int = 224, height: int = 224) -> bytes:
    """Create a minimal valid RGBA PNG byte buffer in memory."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack("!I", len(data)) + kind + data + struct.pack("!I", zlib.crc32(kind + data))

    row = b"\x00" + b"\x2e\x7d\x32\xff" * width
    raw = row * height
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack("!2I5B", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def make_user(
    user_id: str = "user-01",
    full_name: str = "Nông dân Minh",
    email: str = "minh@example.test",
    role: str = "User",
) -> dict[str, Any]:
    return {
        "id": user_id,
        "fullName": full_name,
        "email": email,
        "role": role,
        "createdAt": CREATED_AT,
        "avatarUrl": None,
        "isActive": True,
        "updatedAt": CREATED_AT,
        "emailVerifiedAt": CREATED_AT,
    }


def make_plant(
    plant_id: str = "11111111-1111-4111-8111-111111111101",
    name: str = "Tomato",
    vietnamese_name: str = "Cà chua",
    scientific_name: str = "Solanum lycopersicum",
    category: str = "Rau quả",
    description: str | None = "Cây trồng phổ biến, nhạy cảm với bệnh cháy lá.",
) -> dict[str, Any]:
    return {
        "id": plant_id,
        "name": name,
        "vietnameseName": vietnamese_name,
        "scientificName": scientific_name,
        "category": category,
        "description": description,
        "imageUrl": None,
        "isActive": True,
        "createdAt": CREATED_AT,
        "updatedAt": CREATED_AT,
    }


def make_disease(
    disease_id: str = "22222222-2222-4222-8222-222222222201",
    name: str = "Early Blight",
    vietnamese_name: str = "Bệnh cháy lá sớm",
    symptoms: str | None = "Đốm nâu có vòng đồng tâm trên lá già.",
    treatment: str | None = "Loại bỏ lá bệnh và phun thuốc theo khuyến cáo.",
    prevention: str | None = "Luân canh cây trồng và giữ tán lá thông thoáng.",
    condition_type: str = "Disease",
) -> dict[str, Any]:
    return {
        "id": disease_id,
        "name": name,
        "vietnameseName": vietnamese_name,
        "description": "Bệnh do nấm Alternaria solani gây ra.",
        "symptoms": symptoms,
        "treatment": treatment,
        "prevention": prevention,
        "conditionType": condition_type,
        "imageUrl": None,
        "isActive": True,
        "createdAt": CREATED_AT,
        "updatedAt": CREATED_AT,
    }


def make_pair(plant: dict[str, Any], disease: dict[str, Any], class_name: str = "Tomato___Early_blight", class_index: int = 1) -> dict[str, Any]:
    return {
        "id": f"pair-{plant['id']}-{disease['id']}",
        "plantId": plant["id"],
        "diseaseId": disease["id"],
        "plantName": plant.get("vietnameseName") or plant["name"],
        "diseaseName": disease.get("vietnameseName") or disease["name"],
        "className": class_name,
        "classIndex": class_index,
        "isActive": True,
        "conditionType": disease.get("conditionType", "Disease"),
        "plantIsActive": True,
        "diseaseIsActive": True,
    }


def make_prediction_dto(
    prediction_id: str = "pred-01",
    confidence: float = 0.94,
    plant: dict[str, Any] | None = None,
    disease: dict[str, Any] | None = None,
    guest_token: str | None = None,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    plant_obj = plant or make_plant()
    disease_obj = disease or make_disease()
    link = {
        "id": "pair-01",
        "plantId": plant_obj["id"],
        "diseaseId": disease_obj["id"],
        "className": "Tomato___Early_blight" if disease_obj.get("conditionType") != "Healthy" else "Tomato___Healthy",
        "classIndex": 1,
        "isActive": True,
        "plant": plant_obj,
        "disease": disease_obj,
    }
    if details is None:
        details = [
            {"classIndex": 1, "className": link["className"], "confidence": confidence, "plantDisease": link},
            {"classIndex": 2, "className": "Tomato___Healthy", "confidence": round(max(0.0, 1.0 - confidence - 0.02), 3), "plantDisease": None},
            {"classIndex": 3, "className": "Tomato___Leaf_spot", "confidence": 0.02, "plantDisease": None},
        ]
    dto: dict[str, Any] = {
        "id": prediction_id,
        "imagePath": "/images/agriai-leaf-mark.png",
        "imagePublicId": None,
        "predictedPlantDisease": link,
        "confidence": confidence,
        "predictionDetails": details,
        "createdAt": CREATED_AT,
    }
    if guest_token is not None:
        dto["guestToken"] = guest_token
        dto["guestExpiresAt"] = "2026-10-21T01:00:00Z"
    return dto


def make_history_item(
    prediction_id: str = "hist-01",
    plant_name: str = "Tomato",
    plant_vi: str = "Cà chua",
    disease_name: str = "Early Blight",
    disease_vi: str = "Bệnh cháy lá sớm",
    confidence: float = 0.93,
    created_at: str = CREATED_AT,
) -> dict[str, Any]:
    return {
        "id": prediction_id,
        "imagePath": "/images/agriai-leaf-mark.png",
        "plantName": plant_name,
        "plantVietnameseName": plant_vi,
        "diseaseName": disease_name,
        "diseaseVietnameseName": disease_vi,
        "confidence": confidence,
        "createdAt": created_at,
    }


def make_agricultural_profile(
    profile_id: str = "agri-01",
    user_id: str = "user-01",
    name: str = "Vườn cà chua Đồng Tháp",
    description: str | None = "Diện tích 1.2 ha, tưới nhỏ giọt.",
    prediction_count: int = 0,
) -> dict[str, Any]:
    return {
        "id": profile_id,
        "userId": user_id,
        "name": name,
        "description": description,
        "createdAt": CREATED_AT,
        "updatedAt": CREATED_AT,
        "predictionCount": prediction_count,
    }


@dataclass
class RecordedRequest:
    method: str
    path: str
    query: dict[str, list[str]]
    headers: dict[str, str]
    json_body: Any = None


@dataclass
class ApiStub:
    """Stateful API stub for browser UI tests (NOT real backend/DB persistence)."""

    user: dict[str, Any] | None = None
    plants: list[dict[str, Any]] = field(default_factory=lambda: [make_plant()])
    diseases: list[dict[str, Any]] = field(default_factory=lambda: [make_disease()])
    medicines: list[dict[str, Any]] = field(default_factory=list)
    knowledge_documents: list[dict[str, Any]] = field(default_factory=list)
    pairs: list[dict[str, Any]] = field(default_factory=list)
    history: list[dict[str, Any]] = field(default_factory=list)
    prediction_details: dict[str, dict[str, Any]] = field(default_factory=dict)
    agricultural_profiles: list[dict[str, Any]] = field(default_factory=list)
    profile_predictions: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    admin_users: list[dict[str, Any]] = field(default_factory=list)
    admin_images: list[dict[str, Any]] = field(default_factory=list)
    admin_sessions: list[dict[str, Any]] = field(default_factory=list)
    requests: list[RecordedRequest] = field(default_factory=list)
    custom_handlers: dict[tuple[str, str], Callable[[Route, RecordedRequest], None]] = field(default_factory=dict)
    two_factor_enabled: bool = False
    next_prediction_seq: int = 1
    next_profile_seq: int = 1

    def __post_init__(self) -> None:
        if not self.pairs and self.plants and self.diseases:
            self.pairs = [make_pair(self.plants[0], self.diseases[0])]

    def on(self, method: str, path: str, handler: Callable[[Route, RecordedRequest], None]) -> None:
        self.custom_handlers[(method.upper(), path)] = handler

    def mount(self, page: Page) -> None:
        page.route("**/api/**", self._handle)

    def _record(self, route: Route) -> RecordedRequest:
        parsed = urlparse(route.request.url)
        body = None
        if route.request.post_data:
            try:
                body = route.request.post_data_json
            except Exception:
                body = route.request.post_data
        rec = RecordedRequest(
            method=route.request.method.upper(),
            path=parsed.path,
            query=parse_qs(parsed.query),
            headers={k.lower(): v for k, v in route.request.headers.items()},
            json_body=body,
        )
        self.requests.append(rec)
        return rec

    def _handle(self, route: Route) -> None:
        rec = self._record(route)
        handler = self.custom_handlers.get((rec.method, rec.path))
        if handler is not None:
            handler(route, rec)
            return

        path = rec.path
        method = rec.method

        # Auth & profile
        if path == "/api/auth/me" and method == "GET":
            if self.user is None:
                route.fulfill(status=401, json={"message": "Unauthorized"})
            else:
                route.fulfill(status=200, json=self.user)
            return
        if path == "/api/auth/logout" and method == "POST":
            route.fulfill(status=204, body="")
            return
        if path == "/api/auth/forgot-password" and method == "POST":
            route.fulfill(status=200, json={"ok": True})
            return
        if path == "/api/auth/reset-password/verify" and method == "POST":
            route.fulfill(status=200, json={"ok": True})
            return
        if path == "/api/auth/reset-password" and method == "POST":
            route.fulfill(status=200, json={"ok": True})
            return
        if path == "/api/auth/two-factor" and method == "GET":
            route.fulfill(status=200, json={"enabled": self.two_factor_enabled})
            return
        if path == "/api/auth/two-factor/setup" and method == "POST":
            route.fulfill(status=200, json={"challengeId": "2fa-challenge-1"})
            return
        if path == "/api/auth/two-factor/setup/verify" and method == "POST":
            enabled_param = (rec.query.get("enabled") or ["true"])[0].lower() == "true"
            self.two_factor_enabled = enabled_param
            route.fulfill(status=200, json={"enabled": self.two_factor_enabled})
            return
        if path == "/api/users/profile" and method == "GET":
            route.fulfill(status=200 if self.user else 401, json=self.user or {"message": "Unauthorized"})
            return
        if path == "/api/users/profile" and method == "PUT":
            if self.user is None:
                route.fulfill(status=401, json={"message": "Unauthorized"})
                return
            full_name = str((rec.json_body or {}).get("fullName", "")).strip()
            self.user = {**self.user, "fullName": full_name, "updatedAt": CREATED_AT}
            route.fulfill(status=200, json=self.user)
            return
        if path == "/api/users/avatar" and method == "POST":
            if self.user is None:
                route.fulfill(status=401, json={"message": "Unauthorized"})
                return
            self.user = {**self.user, "avatarUrl": "/images/agriai-leaf-mark.png", "updatedAt": CREATED_AT}
            route.fulfill(status=200, json=self.user)
            return
        if path == "/api/users/change-password/code" and method == "POST":
            route.fulfill(status=200, json={"challengeId": "pw-change-1"})
            return
        if path == "/api/users/change-password" and method == "POST":
            route.fulfill(status=204, body="")
            return
        if path == "/api/users/notifications" and method == "GET":
            route.fulfill(status=200, json={"items": [], "pageNumber": 1, "pageSize": 20, "totalCount": 0, "totalPages": 0, "hasNextPage": False, "hasPreviousPage": False})
            return

        # Catalog
        if path == "/api/plants" and method == "GET":
            route.fulfill(status=200, json=self.plants)
            return
        if path == "/api/plants" and method == "POST":
            body = rec.json_body if isinstance(rec.json_body, dict) else {}
            created_plant = make_plant(
                plant_id=f"11111111-1111-4111-8111-{len(self.plants) + 10:012d}",
                name=str(body.get("name") or "Plant E2E"),
                vietnamese_name=str(body.get("vietnameseName") or "Cây E2E"),
                scientific_name=str(body.get("scientificName") or "E2E plantus"),
                description=str(body.get("description") or "Mô tả cây E2E"),
            )
            self.plants.insert(0, created_plant)
            route.fulfill(status=201, json=created_plant)
            return
        if path.startswith("/api/plants/") and method == "GET":
            pid = path.rsplit("/", 1)[-1]
            found = next((item for item in self.plants if item["id"] == pid), None)
            route.fulfill(status=200 if found else 404, json=found or {"message": "Not found"})
            return
        if path == "/api/diseases" and method == "GET":
            route.fulfill(status=200, json=self.diseases)
            return
        if path.startswith("/api/diseases/") and method == "GET":
            did = path.rsplit("/", 1)[-1]
            found = next((item for item in self.diseases if item["id"] == did), None)
            route.fulfill(status=200 if found else 404, json=found or {"message": "Not found"})
            return
        if path in ("/api/plant-diseases", "/api/admin/plant-diseases") and method == "GET":
            route.fulfill(status=200, json=self._paged(self.pairs, rec.query, default_size=100))
            return
        if path.startswith("/api/admin/catalog/plants/") and method == "DELETE":
            pid = path.rsplit("/", 1)[-1]
            self.plants = [item for item in self.plants if item["id"] != pid]
            route.fulfill(status=204, body="")
            return
        if path == "/api/medicines" and method == "GET":
            items = self._filter_catalog(self.medicines, rec.query)
            route.fulfill(status=200, json=self._paged(items, rec.query))
            return
        if path.startswith("/api/medicines/") and method == "GET":
            mid = path.rsplit("/", 1)[-1]
            found = next((item for item in self.medicines if item["id"] == mid), None)
            route.fulfill(status=200 if found else 404, json=found or {"message": "Not found"})
            return
        if path == "/api/knowledge-documents" and method == "GET":
            items = self._filter_catalog(self.knowledge_documents, rec.query)
            route.fulfill(status=200, json=self._paged(items, rec.query))
            return
        if path.startswith("/api/knowledge-documents/") and method == "GET":
            kid = path.rsplit("/", 1)[-1]
            found = next((item for item in self.knowledge_documents if item["id"] == kid), None)
            route.fulfill(status=200 if found else 404, json=found or {"message": "Not found"})
            return

        # Predictions & history
        if path == "/api/predictions" and method == "GET":
            profile_id = (rec.query.get("agriculturalProfileId") or [""])[0]
            items = self.profile_predictions.get(profile_id, []) if profile_id else self.history
            route.fulfill(status=200, json=self._paged(items, rec.query, default_size=100))
            return
        if path == "/api/predictions" and method == "POST":
            is_auth = "authorization" in rec.headers
            pred_id = f"pred-{self.next_prediction_seq:02d}"
            self.next_prediction_seq += 1
            dto = make_prediction_dto(
                prediction_id=pred_id,
                confidence=0.94,
                plant=self.plants[0] if self.plants else make_plant(),
                disease=self.diseases[0] if self.diseases else make_disease(),
                guest_token=None if is_auth else f"guest-tok-{pred_id}",
            )
            self.prediction_details[pred_id] = dto
            if is_auth:
                self.history.insert(0, make_history_item(prediction_id=pred_id, confidence=0.94))
            route.fulfill(status=201 if is_auth else 200, json=dto)
            return
        if path.startswith("/api/predictions/") and "/agricultural-profile/" in path and method == "DELETE":
            parts = path.split("/")
            pred_id, prof_id = parts[3], parts[5]
            self.profile_predictions[prof_id] = [
                item for item in self.profile_predictions.get(prof_id, []) if item["id"] != pred_id
            ]
            for prof in self.agricultural_profiles:
                if prof["id"] == prof_id:
                    prof["predictionCount"] = max(0, prof["predictionCount"] - 1)
            route.fulfill(status=204, body="")
            return
        if path.startswith("/api/predictions/") and path.endswith("/agricultural-profile") and method == "PUT":
            pred_id = path.split("/")[3]
            prof_id = str((rec.json_body or {}).get("agriculturalProfileId", ""))
            hist = next((item for item in self.history if item["id"] == pred_id), make_history_item(prediction_id=pred_id))
            self.profile_predictions.setdefault(prof_id, []).insert(0, hist)
            for prof in self.agricultural_profiles:
                if prof["id"] == prof_id:
                    prof["predictionCount"] += 1
            route.fulfill(status=204, body="")
            return
        if path.startswith("/api/predictions/") and method == "GET":
            pred_id = path.rsplit("/", 1)[-1]
            detail = self.prediction_details.get(pred_id)
            if detail is None:
                route.fulfill(status=404, json={"message": "Không tìm thấy bản ghi."})
            else:
                route.fulfill(status=200, json=detail)
            return
        if path.startswith("/api/predictions/") and method == "DELETE":
            pred_id = path.rsplit("/", 1)[-1]
            self.history = [item for item in self.history if item["id"] != pred_id]
            self.prediction_details.pop(pred_id, None)
            route.fulfill(status=204, body="")
            return

        # Agricultural profiles
        if path == "/api/agricultural-profiles" and method == "GET":
            route.fulfill(status=200, json=self.agricultural_profiles)
            return
        if path == "/api/agricultural-profiles" and method == "POST":
            prof_id = f"agri-{self.next_profile_seq:02d}"
            self.next_profile_seq += 1
            body = rec.json_body or {}
            created = make_agricultural_profile(
                profile_id=prof_id,
                user_id=(self.user or {}).get("id", "user-01"),
                name=body.get("name", "Hồ sơ mới"),
                description=body.get("description"),
                prediction_count=0,
            )
            self.agricultural_profiles.insert(0, created)
            route.fulfill(status=201, json=created)
            return
        if path.startswith("/api/agricultural-profiles/") and method == "PUT":
            prof_id = path.rsplit("/", 1)[-1]
            body = rec.json_body or {}
            for idx, prof in enumerate(self.agricultural_profiles):
                if prof["id"] == prof_id:
                    updated = {
                        **prof,
                        "name": body.get("name", prof["name"]),
                        "description": body.get("description"),
                        "updatedAt": CREATED_AT,
                    }
                    self.agricultural_profiles[idx] = updated
                    route.fulfill(status=200, json=updated)
                    return
            route.fulfill(status=404, json={"message": "Not found"})
            return
        if path.startswith("/api/agricultural-profiles/") and method == "DELETE":
            prof_id = path.rsplit("/", 1)[-1]
            self.agricultural_profiles = [p for p in self.agricultural_profiles if p["id"] != prof_id]
            self.profile_predictions.pop(prof_id, None)
            route.fulfill(status=204, body="")
            return

        # Admin endpoints
        if path == "/api/admin/users" and method == "GET":
            items = self._filter_admin(self.admin_users, rec.query)
            route.fulfill(status=200, json=self._paged(items, rec.query, default_size=10))
            return
        if path.startswith("/api/admin/users/") and path.endswith("/status") and method == "PUT":
            uid = path.split("/")[4]
            body = rec.json_body or {}
            for user in self.admin_users:
                if user["id"] == uid:
                    user["isActive"] = bool(body.get("isActive", True))
                    user["lockReason"] = body.get("reason")
            route.fulfill(status=200, json={"ok": True})
            return
        if path.startswith("/api/admin/users/") and (path.endswith("/logout-all") or path.endswith("/warnings")) and method == "POST":
            uid = path.split("/")[4]
            if path.endswith("/logout-all"):
                for sess in self.admin_sessions:
                    if sess["userId"] == uid and sess["status"] == "Active":
                        sess["status"] = "Ended"
                        sess["endedAt"] = CREATED_AT
            route.fulfill(status=200, json={"ok": True})
            return
        if path == "/api/admin/images" and method == "GET":
            items = self._filter_admin(self.admin_images, rec.query)
            route.fulfill(status=200, json=self._paged(items, rec.query, default_size=10))
            return
        if path.startswith("/api/admin/images/") and path.endswith("/content") and method == "GET":
            route.fulfill(status=200, content_type="image/png", body=png_bytes(64, 64))
            return
        if path.startswith("/api/admin/images/") and path.endswith("/warnings") and method == "POST":
            route.fulfill(status=200, json={"ok": True})
            return
        if path.startswith("/api/admin/images/") and method == "DELETE":
            iid = path.split("/")[4]
            for image in self.admin_images:
                if image["id"] == iid:
                    image["status"] = "Deleted"
                    image["imageUrl"] = None
            route.fulfill(status=204, body="")
            return
        if path == "/api/admin/sessions" and method == "GET":
            items = self._filter_admin(self.admin_sessions, rec.query)
            route.fulfill(status=200, json=self._paged(items, rec.query, default_size=10))
            return

        route.fulfill(status=200, json=[])

    @staticmethod
    def _filter_catalog(items: list[dict[str, Any]], query: dict[str, list[str]]) -> list[dict[str, Any]]:
        search = (query.get("search") or [""])[0].strip().lower()
        plant_id = (query.get("plantId") or [""])[0]
        disease_id = (query.get("diseaseId") or [""])[0]
        out = []
        for item in items:
            haystack = " ".join(
                str(item.get(k) or "")
                for k in ("productName", "activeIngredient", "title", "content", "name", "vietnameseName")
            ).lower()
            if search and search not in haystack:
                continue
            if plant_id and item.get("plantId") != plant_id and plant_id not in item.get("plantIds", []):
                continue
            if disease_id and item.get("diseaseId") != disease_id and disease_id not in item.get("diseaseIds", []):
                continue
            out.append(item)
        return out

    @staticmethod
    def _filter_admin(items: list[dict[str, Any]], query: dict[str, list[str]]) -> list[dict[str, Any]]:
        search = (query.get("search") or [""])[0].strip().lower()
        if not search:
            return items
        return [
            item
            for item in items
            if search in f"{item.get('fullName', '')} {item.get('userName', '')} {item.get('email', '')} {item.get('userEmail', '')}".lower()
        ]

    @staticmethod
    def _paged(items: list[dict[str, Any]], query: dict[str, list[str]], default_size: int = 20) -> dict[str, Any]:
        page_number = max(1, int((query.get("pageNumber") or ["1"])[0]))
        page_size = max(1, int((query.get("pageSize") or [str(default_size)])[0]))
        total_count = len(items)
        total_pages = max(0, (total_count + page_size - 1) // page_size)
        start = (page_number - 1) * page_size
        return {
            "items": items[start : start + page_size],
            "pageNumber": page_number,
            "pageSize": page_size,
            "totalCount": total_count,
            "totalPages": total_pages,
            "hasNextPage": page_number * page_size < total_count,
            "hasPreviousPage": page_number > 1,
        }


def inject_session(context: BrowserContext, user: dict[str, Any], token: str = "fixture-jwt-token") -> None:
    payload = json.dumps({"token": token, "user": user})
    context.add_init_script(f"localStorage.setItem({json.dumps(AUTH_STORAGE_KEY)}, {json.dumps(payload)});")


def read_dialog_captcha(page: Page) -> str:
    """Read the 5-character CAPTCHA code rendered inside the active LoginModal."""
    return page.get_by_role("dialog").locator('fieldset[aria-label^="Mã CAPTCHA:"] strong').inner_text().strip()


def env_value(key: str) -> str:
    """Read a required configuration key from environment or repo root .env."""
    if os.environ.get(key):
        return os.environ[key]
    env_file = ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                if k.strip() == key and v:
                    return v
    raise RuntimeError(f"{key} is required for live system E2E")


def extract_auth_token(page: Page) -> str | None:
    """Extract the active JWT token from browser storage if present."""
    raw = page.evaluate(
        f"localStorage.getItem({json.dumps(AUTH_STORAGE_KEY)}) || sessionStorage.getItem({json.dumps(AUTH_STORAGE_KEY)})"
    )
    if not raw:
        return None
    try:
        return json.loads(raw).get("token")
    except Exception:
        return None


def is_server_up(base_url: str) -> bool:
    try:
        with urlopen(f"{base_url.rstrip('/')}/diagnose", timeout=3) as response:
            return 200 <= response.status < 500
    except Exception:
        return False


@contextmanager
def ensure_next_server(base_url: str = DEFAULT_BASE_URL, auto_start: bool = False):
    """Ensure frontend server is reachable; optionally manage Next.js standalone/start server."""
    if is_server_up(base_url):
        yield base_url
        return
    if not auto_start:
        raise RuntimeError(
            f"Frontend server is not reachable at {base_url}. Start it or pass --with-server."
        )
    parsed = urlparse(base_url)
    port = str(parsed.port or 3000)
    host = parsed.hostname or "localhost"
    standalone_dir = FRONTEND_DIR / ".next" / "standalone"
    standalone_server = standalone_dir / "server.js"
    env = os.environ.copy()
    if standalone_server.is_file():
        static_src = FRONTEND_DIR / ".next" / "static"
        static_dst = standalone_dir / ".next" / "static"
        if static_src.is_dir():
            shutil.copytree(static_src, static_dst, dirs_exist_ok=True)
        public_src = FRONTEND_DIR / "public"
        public_dst = standalone_dir / "public"
        if public_src.is_dir():
            shutil.copytree(public_src, public_dst, dirs_exist_ok=True)
        env["HOSTNAME"] = host
        env["PORT"] = port
        cmd = ["node", str(standalone_server)]
        cwd = standalone_dir
    else:
        next_bin = FRONTEND_DIR / "node_modules" / "next" / "dist" / "bin" / "next"
        cmd = ["node", str(next_bin), "start", "--hostname", host, "--port", port]
        cwd = FRONTEND_DIR
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        deadline = time.monotonic() + 30.0
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                output = proc.stdout.read().decode("utf-8", errors="replace") if proc.stdout else ""
                raise RuntimeError(f"Next.js server exited prematurely ({proc.returncode}): {output}")
            if is_server_up(base_url):
                break
            time.sleep(0.5)
        else:
            raise RuntimeError(f"Timed out waiting for Next.js server at {base_url}")
        yield base_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


class BrowserTestCase(unittest.TestCase):
    """Base TestCase providing an isolated BrowserContext per test method."""

    _playwright = None
    _browser: Browser | None = None
    base_url: str = DEFAULT_BASE_URL

    @classmethod
    def setUpClass(cls) -> None:
        cls._playwright = sync_playwright().start()
        cls._browser = cls._playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls) -> None:
        if cls._browser is not None:
            cls._browser.close()
            cls._browser = None
        if cls._playwright is not None:
            cls._playwright.stop()
            cls._playwright = None

    def new_context(
        self,
        *,
        viewport: dict[str, int] | None = None,
        reduced_motion: str = "reduce",
        fixed_utc: datetime | None = None,
    ) -> tuple[BrowserContext, Page, list[str]]:
        assert self._browser is not None
        context = self._browser.new_context(
            viewport=viewport or {"width": 1280, "height": 900},
            reduced_motion=reduced_motion,
        )
        self.addCleanup(context.close)
        page = context.new_page()
        if fixed_utc is not None:
            page.clock.install(time=fixed_utc.astimezone(timezone.utc))
        errors: list[str] = []
        page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
        self.addCleanup(lambda: self.assertEqual(errors, [], f"Uncaught page errors: {errors}"))
        return context, page, errors
