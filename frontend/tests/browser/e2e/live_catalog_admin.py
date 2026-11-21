"""Admin catalog text CRUD system E2E against the real API and PostgreSQL."""

from __future__ import annotations

import json
import sys
import urllib.request
import uuid
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, env_value, extract_auth_token, read_dialog_captcha  # noqa: E402


def _cleanup_plants(token: str | None, target_name: str) -> None:
    if not token:
        return
    try:
        req = urllib.request.Request(
            "http://localhost:5080/api/plants?includeInactive=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            plants = json.load(resp)
        for item in plants:
            if item.get("name") == target_name or str(item.get("name", "")).startswith("System E2E Plant"):
                del_req = urllib.request.Request(
                    f"http://localhost:5080/api/admin/catalog/plants/{item['id']}",
                    method="DELETE",
                    headers={"Authorization": f"Bearer {token}"},
                )
                with urllib.request.urlopen(del_req, timeout=10):
                    pass
    except Exception:
        pass


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    suffix = uuid.uuid4().hex[:8]
    plant_name = f"System E2E Plant {suffix}"
    vi_name = f"Cây E2E {suffix}"
    token: str | None = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("admin@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(env_value("DEMO_ADMIN_PASSWORD"))
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("System Admin", exact=True)).to_be_visible(timeout=15_000)
            token = extract_auth_token(page)

            # E2E-ADM-07: Create plant in Admin Catalog, reload, verify from real DB, then delete permanently
            page.goto(f"{base_url.rstrip('/')}/admin", wait_until="domcontentloaded")
            page.get_by_role("button", name="Cây trồng", exact=True).click()
            page.get_by_role("button", name="Thêm mới", exact=True).click()
            page.get_by_label("Tên danh mục", exact=True).fill(plant_name)
            page.get_by_label("Tên tiếng Việt", exact=True).fill(vi_name)
            page.get_by_label("Mô tả", exact=True).fill("Created by live system E2E")
            page.get_by_label("Tên khoa học", exact=True).fill(f"E2E plantus {suffix}")
            page.get_by_role("button", name="Lưu nội dung", exact=True).click()
            expect(page.get_by_role("heading", name=vi_name, exact=True)).to_be_visible(timeout=15_000)

            page.reload(wait_until="domcontentloaded")
            page.get_by_role("button", name="Cây trồng", exact=True).click()
            page.get_by_role("searchbox", name="Tìm trong danh mục", exact=True).fill(plant_name)
            page.get_by_role("button", name="Tìm kiếm", exact=True).click()
            page.get_by_role("button", name=f"Mở {vi_name}", exact=True).first.click()
            expect(page.get_by_label("Tên danh mục", exact=True)).to_have_value(plant_name, timeout=15_000)

            page.get_by_role("button", name="Xóa vĩnh viễn", exact=True).click()
            page.get_by_role("alertdialog").get_by_role("button", name="Xác nhận", exact=True).click()
            expect(
                page.get_by_role("status").filter(has_text="Đã xóa vĩnh viễn. Lịch sử chẩn đoán được giữ lại.")
            ).to_be_visible(timeout=15_000)
        finally:
            _cleanup_plants(token, plant_name)
            browser.close()


if __name__ == "__main__":
    run()
