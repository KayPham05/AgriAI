"""Admin system E2E smoke checks against the real API and database."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, env_value, read_dialog_captcha  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    root_url = base_url.rstrip("/")
    admin_password = env_value("DEMO_ADMIN_PASSWORD")
    user_password = env_value("DEMO_USER_PASSWORD")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            api_responses: list[tuple[int, str]] = []
            page.on(
                "response",
                lambda response: api_responses.append((response.status, response.url))
                if "/api/" in response.url
                else None,
            )

            # Guest is blocked from /admin
            page.goto(f"{root_url}/admin", wait_until="domcontentloaded")
            expect(page.get_by_role("status").filter(has_text="Đăng nhập bằng tài khoản Admin để tiếp tục.")).to_be_visible(
                timeout=15_000
            )
            expect(page.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_have_count(0)

            # Normal User is blocked from /admin
            page.goto(f"{root_url}/", wait_until="domcontentloaded")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(user_password)
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Demo Farmer", exact=True)).to_be_visible(timeout=15_000)

            page.goto(f"{root_url}/admin", wait_until="domcontentloaded")
            expect(page.get_by_role("status").filter(has_text="Tài khoản này không có quyền Admin.")).to_be_visible(
                timeout=15_000
            )
            expect(page.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_have_count(0)

            # Admin login succeeds and opens Overview
            page.evaluate("localStorage.clear(); sessionStorage.clear();")
            page.goto(f"{root_url}/", wait_until="domcontentloaded")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("admin@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(admin_password)
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("System Admin", exact=True)).to_be_visible(timeout=15_000)

            page.goto(f"{root_url}/admin", wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_be_visible(
                timeout=15_000
            )

            # Overview charts and AdminCalendar date filters
            expect(page.get_by_role("note").filter(has_text="Trang Tổng quan hiện dùng dữ liệu minh họa.")).to_be_visible()
            summary = page.locator("summary").filter(has_text="Lịch tháng")
            if not summary.evaluate("el => el.parentElement.open"):
                summary.click()
            page.get_by_role("button", name="Chọn năm", exact=True).click()
            page.get_by_role("button", name="Năm 2025", exact=True).click()
            expect(page.get_by_role("status", name="Bộ lọc thời gian", exact=True)).to_contain_text("2025")
            page.get_by_role("button", name="Bỏ lọc thời gian", exact=True).click()
            expect(page.get_by_role("status", name="Bộ lọc thời gian", exact=True)).to_contain_text("Toàn bộ")

            # Responsive mobile sheet & desktop sidebar navigation across views
            page.set_viewport_size({"width": 375, "height": 900})
            assert page.locator("body").evaluate("element => element.scrollWidth <= window.innerWidth")
            page.get_by_role("button", name="Mở menu quản trị", exact=True).click()
            page.get_by_role("dialog").get_by_role("button", name="Người dùng", exact=True).click()
            expect(page.get_by_role("heading", level=1, name="Người dùng", exact=True)).to_be_visible(timeout=15_000)

            page.set_viewport_size({"width": 1280, "height": 900})
            nav = page.get_by_role("navigation", name="Điều hướng quản trị", exact=True)
            for nav_label, expected_heading in (
                ("Ảnh đã tải lên", "Ảnh đã tải lên"),
                ("Cây trồng", "Quản lý cây trồng"),
                ("Người dùng", "Người dùng"),
            ):
                nav.get_by_role("button", name=nav_label, exact=True).click()
                expect(page.get_by_role("heading", level=1, name=expected_heading, exact=True)).to_be_visible(
                    timeout=15_000
                )

            # Users list search & real backend verification
            users_region = page.get_by_role("region", name="Danh sách người dùng", exact=True)
            expect(users_region).to_be_visible(timeout=15_000)
            users_region.get_by_label("Tìm theo tên hoặc email người dùng", exact=True).fill("user@agrivision.ai")
            users_region.get_by_role("button", name="Tìm kiếm", exact=True).click()
            expect(users_region.get_by_role("heading", name="Demo Farmer", exact=True)).to_be_visible(timeout=15_000)
            assert any(status == 200 and "/api/admin/users" in url for status, url in api_responses)

            # Sessions list search & status badges
            nav.get_by_role("button", name="Phiên đăng nhập", exact=True).click()
            expect(page.get_by_role("heading", level=1, name="Phiên đăng nhập", exact=True)).to_be_visible(timeout=15_000)
            sessions_region = page.get_by_role("region", name="Danh sách phiên đăng nhập", exact=True)
            expect(sessions_region).to_be_visible(timeout=15_000)
            sessions_region.get_by_label("Tìm theo tên hoặc email người dùng", exact=True).fill("admin@agrivision.ai")
            sessions_region.get_by_role("button", name="Tìm kiếm", exact=True).click()
            expect(sessions_region.get_by_role("heading", name="System Admin", exact=True).first).to_be_visible(
                timeout=15_000
            )
            assert any(status == 200 and "/api/admin/sessions" in url for status, url in api_responses)
        finally:
            browser.close()


if __name__ == "__main__":
    run()
