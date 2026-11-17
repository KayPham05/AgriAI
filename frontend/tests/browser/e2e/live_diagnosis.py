"""Authenticated diagnosis system E2E against the real API, AI and storage setup."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, env_value, png_bytes, read_dialog_captcha  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    password = env_value("DEMO_USER_PASSWORD")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            api_responses: list[tuple[int, str]] = []
            page.on(
                "response",
                lambda response: api_responses.append((response.status, response.url))
                if "/api/" in response.url
                else None,
            )

            # E2E-AUTH-02: Login with valid credentials & CAPTCHA
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(password)
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Demo Farmer", exact=True)).to_be_visible(timeout=15_000)

            # E2E-DIAG-02, E2E-DIAG-03, E2E-DIAG-05: Authenticated diagnosis & result detail verification
            page.goto(f"{base_url.rstrip('/')}/diagnose", wait_until="domcontentloaded")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
                {
                    "name": "authenticated-system-e2e.png",
                    "mimeType": "image/png",
                    "buffer": png_bytes(224, 224),
                }
            )
            page.get_by_role("button", name="Phân tích ngay", exact=True).click()
            result = page.get_by_role("region", name="Kết quả phân tích")
            expect(result).to_be_visible(timeout=60_000)
            expect(result.get_by_text("Độ tin cậy", exact=True)).to_be_visible()
            expect(result.get_by_text(re.compile(r"^\d+\.\d+%$")).first).to_be_visible()
            expect(result.get_by_role("list", name="Dự đoán Top-3").get_by_role("listitem")).to_have_count(3)

            skip_btn = page.get_by_role("button", name="Bỏ qua", exact=True)
            if skip_btn.count() > 0:
                skip_btn.click()

            # E2E-HIST-01, E2E-HIST-02, E2E-HIST-03: History list, snapshot detail modal, and delete with confirmation
            page.goto(f"{base_url.rstrip('/')}/history", wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Mẫu đã lưu", exact=True)).to_be_visible(timeout=15_000)
            expect(page.locator("article").first).to_be_visible(timeout=15_000)
            page.locator("article").first.get_by_role("button", name="Xem chi tiết", exact=True).click()
            dialog = page.get_by_role("dialog")
            expect(dialog).to_be_visible(timeout=15_000)
            expect(dialog.get_by_role("heading", name="Chi tiết kết quả phân loại", exact=True)).to_be_visible()
            dialog.get_by_role("button", name="Đóng", exact=True).click()
            articles = page.locator("article")
            article_count = articles.count()
            articles.first.get_by_role("button", name=re.compile("Xóa kết quả")).click()
            page.get_by_role("alertdialog").get_by_role("button", name="Xác nhận xóa", exact=True).click()
            expect(articles).to_have_count(article_count - 1, timeout=15_000)
            assert any(status in (200, 201) and "/api/predictions" in url for status, url in api_responses)
        finally:
            browser.close()


if __name__ == "__main__":
    run()
