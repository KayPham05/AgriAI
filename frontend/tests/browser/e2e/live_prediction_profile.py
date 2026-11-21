"""System E2E for linking a real prediction to a real agricultural profile."""

from __future__ import annotations

import json
import re
import sys
import urllib.request
import uuid
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, env_value, extract_auth_token, png_bytes, read_dialog_captcha  # noqa: E402


def _cleanup_link_resources(token: str | None, profile_name: str, prediction_ids: list[str]) -> None:
    if not token:
        return
    for pred_id in prediction_ids:
        try:
            del_pred = urllib.request.Request(
                f"http://localhost:5080/api/predictions/{pred_id}",
                method="DELETE",
                headers={"Authorization": f"Bearer {token}"},
            )
            with urllib.request.urlopen(del_pred, timeout=10):
                pass
        except Exception:
            pass
    try:
        req = urllib.request.Request(
            "http://localhost:5080/api/agricultural-profiles",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            profiles = json.load(resp)
        for item in profiles:
            if item.get("name") == profile_name or str(item.get("name", "")).startswith("System E2E Link Profile"):
                del_req = urllib.request.Request(
                    f"http://localhost:5080/api/agricultural-profiles/{item['id']}",
                    method="DELETE",
                    headers={"Authorization": f"Bearer {token}"},
                )
                with urllib.request.urlopen(del_req, timeout=10):
                    pass
    except Exception:
        pass


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    profile_name = f"System E2E Link Profile {uuid.uuid4().hex[:8]}"
    token: str | None = None
    created_prediction_ids: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()

            def on_response(response) -> None:
                if response.request.method == "POST" and response.url.endswith("/api/predictions") and response.status in (200, 201):
                    try:
                        pid = response.json().get("id")
                        if pid:
                            created_prediction_ids.append(str(pid))
                    except Exception:
                        pass

            page.on("response", on_response)
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(env_value("DEMO_USER_PASSWORD"))
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Demo Farmer", exact=True)).to_be_visible(timeout=15_000)
            token = extract_auth_token(page)

            page.goto(f"{base_url.rstrip('/')}/agricultural-profiles", wait_until="domcontentloaded")
            create_button = page.get_by_role("button", name=re.compile(r"^Tạo hồ sơ( đầu tiên)?$")).first
            expect(create_button).to_be_visible(timeout=15_000)
            create_button.click()
            page.get_by_label("Tên hồ sơ *", exact=True).fill(profile_name)
            page.get_by_label("Mô tả và thông tin canh tác", exact=True).fill("Prediction link check")
            page.get_by_role("button", name="Tạo hồ sơ", exact=True).click()
            expect(page.get_by_role("heading", name=profile_name, exact=True)).to_be_visible(timeout=15_000)

            page.goto(f"{base_url.rstrip('/')}/diagnose", wait_until="domcontentloaded")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
                {"name": "profile-link.png", "mimeType": "image/png", "buffer": png_bytes(224, 224)}
            )
            page.get_by_role("button", name="Phân tích ngay", exact=True).click()
            result = page.get_by_role("region", name="Kết quả phân tích")
            expect(result).to_be_visible(timeout=60_000)
            dialog = page.get_by_role("dialog")
            try:
                dialog.wait_for(state="visible", timeout=15_000)
            except PlaywrightTimeoutError:
                page.get_by_role("button", name="Lưu vào hồ sơ nông nghiệp", exact=True).click()
                dialog = page.get_by_role("dialog")
            expect(dialog.get_by_text("Chọn hồ sơ để lưu", exact=True)).to_be_visible(timeout=15_000)
            dialog.get_by_role("combobox").click()
            page.get_by_role("option", name=profile_name, exact=True).last.click()
            dialog.get_by_role("button", name="Lưu vào hồ sơ", exact=True).click()
            expect(page.get_by_text("Đã lưu kết quả vào hồ sơ", exact=False)).to_be_visible(timeout=15_000)
        finally:
            _cleanup_link_resources(token, profile_name, created_prediction_ids)
            browser.close()


if __name__ == "__main__":
    run()
