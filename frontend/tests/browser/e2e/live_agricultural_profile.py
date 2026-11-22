"""Agricultural profile system E2E against the real API and PostgreSQL."""

from __future__ import annotations

from contextlib import ExitStack
import re
import sys
import uuid
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.live_resources import created_resource
from e2e.support import DEFAULT_BASE_URL, env_value, extract_auth_token, read_dialog_captcha  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    suffix = uuid.uuid4().hex[:8]
    profile_name = f"System E2E Profile {suffix}"
    updated_name = f"System E2E Profile {suffix} Updated"
    token: str | None = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        with ExitStack() as cleanup:
            cleanup.callback(browser.close)
            page = browser.new_page()
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(env_value("DEMO_USER_PASSWORD"))
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Demo Farmer", exact=True)).to_be_visible(timeout=15_000)
            token = extract_auth_token(page)

            # Create agricultural profile and verify persistence across reload
            page.goto(f"{base_url.rstrip('/')}/agricultural-profiles", wait_until="domcontentloaded")
            create_btn = page.get_by_role("button", name=re.compile(r"^Tạo hồ sơ( đầu tiên)?$")).first
            expect(create_btn).to_be_visible(timeout=15_000)
            create_btn.click()
            page.get_by_label("Tên hồ sơ *", exact=True).fill(profile_name)
            page.get_by_label("Mô tả và thông tin canh tác", exact=True).fill("Live persistence check")
            with created_resource(page, cleanup, token, "/api/agricultural-profiles"):
                page.get_by_role("button", name="Tạo hồ sơ", exact=True).click()
            expect(page.get_by_role("heading", name=profile_name, exact=True).first).to_be_visible(
                timeout=15_000
            )
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name=profile_name, exact=True).first).to_be_visible(
                timeout=15_000
            )

            # Edit agricultural profile and verify persistence across reload
            card = page.locator("article", has=page.get_by_role("heading", name=profile_name, exact=True)).first
            card.get_by_role("button", name="Xem chi tiết", exact=True).click()
            expect(page.get_by_role("heading", level=1, name=profile_name, exact=True)).to_be_visible(timeout=15_000)
            page.get_by_role("button", name="Chỉnh sửa", exact=True).click()
            page.get_by_label("Tên hồ sơ *", exact=True).fill(updated_name)
            page.get_by_label("Mô tả và thông tin canh tác", exact=True).fill("Updated live persistence check")
            page.get_by_role("button", name="Lưu thay đổi", exact=True).click()
            expect(page.get_by_role("status").filter(has_text="Đã cập nhật hồ sơ.")).to_be_visible(timeout=15_000)
            expect(page.get_by_role("heading", level=1, name=updated_name, exact=True)).to_be_visible(timeout=15_000)
            expect(page.get_by_text("Updated live persistence check", exact=True)).to_be_visible()

            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name=updated_name, exact=True).first).to_be_visible(timeout=15_000)


if __name__ == "__main__":
    run()
