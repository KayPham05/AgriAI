"""Authenticated system E2E smoke checks against the real API and PostgreSQL."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, png_bytes, read_dialog_captcha  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    email = f"e2e_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}@example.test"
    password = "E2ePass!234567"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")

            # wrong CAPTCHA and wrong password (401 from backend)
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill("WrongPassword!000")
            page.get_by_label("Mã xác nhận", exact=True).fill("00000")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_role("alert").filter(has_text="Mã CAPTCHA chưa chính xác.")).to_be_visible(timeout=10_000)

            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_role("alert").filter(has_text="Email hoặc mật khẩu không chính xác.")).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="Đóng", exact=True).click()

            # register new account
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_role("tab", name="Đăng ký", exact=True).click()
            page.get_by_label("Họ và tên", exact=True).fill("System E2E User")
            page.get_by_label("Email", exact=True).fill(email)
            page.get_by_label("Mật khẩu", exact=True).fill(password)
            page.get_by_role("checkbox").check()
            page.get_by_role("button", name="Tạo tài khoản", exact=True).click()
            expect(page.get_by_text("System E2E User", exact=True)).to_be_visible(timeout=15_000)

            # update full name and verify persistence across reload
            page.goto(f"{base_url.rstrip('/')}/profile", wait_until="domcontentloaded")
            expect(page.get_by_label("Họ và tên", exact=True)).to_be_visible(timeout=15_000)
            full_name = page.get_by_label("Họ và tên", exact=True)
            full_name.fill("System E2E User Updated")
            page.get_by_role("button", name="Lưu thay đổi", exact=True).click()
            expect(page.get_by_text("Đã cập nhật hồ sơ tài khoản.", exact=True)).to_be_visible(
                timeout=15_000
            )
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_label("Họ và tên", exact=True)).to_have_value("System E2E User Updated")

            # upload avatar via modal
            page.get_by_label("Chọn ảnh đại diện", exact=True).set_input_files(
                {"name": "avatar.png", "mimeType": "image/png", "buffer": png_bytes(96, 96)}
            )
            expect(page.get_by_role("dialog", name="Lưu ảnh đại diện mới?")).to_be_visible(timeout=15_000)
            page.get_by_role("button", name="Lưu ảnh", exact=True).click()
            expect(page.get_by_role("status").filter(has_text="Đã lưu ảnh đại diện vào tài khoản.")).to_be_visible(
                timeout=15_000
            )

            # empty history state for newly registered account
            page.goto(f"{base_url.rstrip('/')}/history", wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Chưa có mẫu nào được lưu", exact=True)).to_be_visible(
                timeout=15_000
            )

            # logout revokes session and clears storage
            page.goto(f"{base_url.rstrip('/')}/profile", wait_until="domcontentloaded")
            expect(page.get_by_role("button", name="Đăng xuất", exact=True)).to_be_visible(timeout=15_000)
            page.get_by_role("button", name="Đăng xuất", exact=True).click()
            expect(page.get_by_role("button", name="Đăng nhập", exact=True)).to_be_visible(timeout=15_000)
            assert page.evaluate("localStorage.getItem('leafai_auth_session')") is None
        finally:
            browser.close()


if __name__ == "__main__":
    run()
