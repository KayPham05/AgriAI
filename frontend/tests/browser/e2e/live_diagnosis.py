"""Authenticated diagnosis system E2E against the real API, AI and storage setup."""

from __future__ import annotations

from contextlib import ExitStack
import re
from urllib.parse import urlsplit
from uuid import UUID
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.live_resources import created_resource
from e2e.support import FRONTEND_DIR, DEFAULT_BASE_URL, env_value, extract_auth_token, png_bytes, read_dialog_captcha  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    password = env_value("DEMO_USER_PASSWORD")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        with ExitStack() as cleanup:
            cleanup.callback(browser.close)
            page = browser.new_page()
            api_responses: list[tuple[int, str]] = []
            page.on(
                "response",
                lambda response: api_responses.append((response.status, response.url))
                if "/api/" in response.url
                else None,
            )

            # Login with valid credentials & CAPTCHA
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill("user@agrivision.ai")
            page.get_by_label("Mật khẩu", exact=True).fill(password)
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Demo Farmer", exact=True)).to_be_visible(timeout=15_000)

            # Authenticated diagnosis & result detail verification
            page.goto(f"{base_url.rstrip('/')}/diagnose", wait_until="domcontentloaded")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
                {
                    "name": "authenticated-system-e2e.png",
                    "mimeType": "image/png",
                    "buffer": png_bytes(224, 224),
                }
            )
            with created_resource(page, cleanup, extract_auth_token(page), "/api/predictions") as created:
                page.get_by_role("button", name="Phân tích ngay", exact=True).click()
            prediction_id = UUID(created.value.json()["id"])
            result = page.get_by_role("region", name="Kết quả phân tích")
            expect(result).to_be_visible(timeout=60_000)
            expect(result.get_by_text("Độ tin cậy", exact=True)).to_be_visible()
            expect(result.get_by_text(re.compile(r"^\d+\.\d+%$")).first).to_be_visible()
            expect(result.get_by_role("list", name="Dự đoán Top-3").get_by_role("listitem")).to_have_count(3)

            skip_btn = page.get_by_role("button", name="Bỏ qua", exact=True)
            if skip_btn.count() > 0:
                skip_btn.click()

            # History list, snapshot detail modal, and delete with confirmation
            page.goto(f"{base_url.rstrip('/')}/history", wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Mẫu đã lưu", exact=True)).to_be_visible(timeout=15_000)
            article = page.locator(f'article[data-prediction-id="{prediction_id}"]')
            expect(article).to_be_visible(timeout=15_000)
            article.get_by_role("button", name="Xem chi tiết", exact=True).click()
            dialog = page.get_by_role("dialog")
            expect(dialog).to_be_visible(timeout=15_000)
            expect(dialog.get_by_role("heading", name="Chi tiết kết quả phân loại", exact=True)).to_be_visible()
            dialog.get_by_role("button", name="Đóng", exact=True).click()
            article.get_by_role("button", name=re.compile("Xóa kết quả")).click()
            page.get_by_role("alertdialog").get_by_role("button", name="Xác nhận xóa", exact=True).click()
            expect(article).to_have_count(0, timeout=15_000)
            assert any(status in (200, 201) and "/api/predictions" in url for status, url in api_responses)


def run_healthy(base_url: str = DEFAULT_BASE_URL) -> None:
    fixture = FRONTEND_DIR / "src/assets/Bệnh lá/Ớt/ớt khỏe mạnh.jpg"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(f"{base_url.rstrip('/')}/diagnose", wait_until="domcontentloaded")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(fixture)
            with page.expect_response(
                lambda r: r.request.method == "POST" and urlsplit(r.url).path == "/api/predictions",
                timeout=60_000,
            ) as event:
                page.get_by_role("button", name="Phân tích ngay", exact=True).click()
            response = event.value
            assert response.ok, f"Healthy fixture prediction returned HTTP {response.status}"
            result = response.json()
            disease = result["predictedPlantDisease"]["disease"]
            assert disease["conditionType"] == "Healthy", f"Expected Healthy, got {disease['conditionType']}"
            assert result["recommendedMedicines"] == [], "Healthy prediction recommended medicines"
            assert result["medication"] is None, "Healthy prediction included a medication"
            panel = page.get_by_role("region", name="Kết quả phân tích")
            expect(panel.get_by_role("heading", name="Độ tin cậy chẩn đoán thấp", exact=True)).to_be_visible()
            expect(panel.get_by_role("heading", name="Khuyến nghị xử lý", exact=True)).to_have_count(0)
            panel.get_by_role("button", name="Xem tạm bảng đối chiếu Top-3", exact=True).click()
            expect(panel.get_by_role("list", name="Dự đoán Top-3").get_by_role("listitem").first).to_contain_text("Khỏe mạnh")
        finally:
            browser.close()


if __name__ == "__main__":
    run()
