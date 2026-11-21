"""System E2E smoke checks that use the running Docker services without API interception."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, png_bytes  # noqa: E402


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    root_url = base_url.rstrip("/")
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

            # E2E-CAT-01..04: Public catalogs list, search, and detail navigation
            for route in ("/plants", "/diseases", "/medicines", "/knowledge"):
                response = page.goto(f"{root_url}{route}", wait_until="networkidle")
                assert response is not None and response.ok, f"{route} did not load"
                expect(page.get_by_label("Tìm kiếm danh mục", exact=True)).to_be_visible()
                detail_links = page.get_by_role("link", name="Xem chi tiết", exact=True)
                if detail_links.count() > 0:
                    detail_links.first.click()
                    expect(page).to_have_url(re.compile(rf"{re.escape(route)}/[^/]+$"))
                    expect(page.get_by_role("heading", level=1).first).to_be_visible()

            # E2E-SYS-04: /about route, desktop & mobile navigation (E2E-SYS-01), and reload
            about_resp = page.goto(f"{root_url}/about", wait_until="networkidle")
            assert about_resp is not None and about_resp.status == 200
            expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()
            expect(page.get_by_role("navigation", name="Điều hướng chính", exact=True)).to_be_visible()
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()

            # E2E-SYS-01: Mobile navigation drawer at 375px on application route
            page.set_viewport_size({"width": 375, "height": 900})
            assert page.locator("body").evaluate("element => element.scrollWidth <= window.innerWidth")
            page.get_by_role("button", name="Mở menu", exact=True).click()
            mobile_nav = page.get_by_role("navigation", name="Điều hướng trên điện thoại", exact=True)
            expect(mobile_nav).to_be_visible()
            mobile_nav.get_by_role("link", name="Cây trồng", exact=True).click()
            expect(page).to_have_url(re.compile(r"/plants$"))
            page.set_viewport_size({"width": 1280, "height": 900})

            # E2E-HOME-01..04: Guest landing page (/), sections, responsive viewports, reduced motion, and CTA navigation
            page.goto(f"{root_url}/", wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Nhìn kỹ chiếc lá. Hiểu thêm về cây.", exact=True)).to_be_visible()
            expect(page.get_by_role("region", name="Dải ảnh cây trồng", exact=True)).to_be_visible()
            expect(page.get_by_role("region", name="Bản đồ cây trồng Việt Nam", exact=True)).to_be_visible()
            expect(page.get_by_role("list", name="Ba bước sử dụng AgriAI", exact=True).get_by_role("listitem")).to_have_count(3)

            for width in (1280, 768, 375):
                page.set_viewport_size({"width": width, "height": 900})
                assert page.locator("body").evaluate("element => element.scrollWidth <= window.innerWidth")

            page.set_viewport_size({"width": 1280, "height": 900})
            page.emulate_media(reduced_motion="reduce")
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_role("heading", name="Nhìn kỹ chiếc lá. Hiểu thêm về cây.", exact=True)).to_be_visible()
            page.get_by_role("banner").get_by_role("link", name="Tra cứu", exact=True).click()
            expect(page).to_have_url(re.compile(r"/plants$"))

            # E2E-SYS-02: 404 route, noindex, and recovery link
            missing = page.goto(f"{root_url}/live-route-does-not-exist", wait_until="domcontentloaded")
            assert missing is not None and missing.status == 404
            assert page.locator('meta[name="robots"]').get_attribute("content") == "noindex"
            expect(page.get_by_role("heading", level=1, name="Không tìm thấy trang", exact=True)).to_be_visible()
            expect(page.get_by_role("link", name="Về trang chủ", exact=True)).to_be_visible()

            # E2E-DIAG-01 & E2E-DIAG-07: Guest diagnosis and client file validation
            page.goto(f"{root_url}/diagnose", wait_until="networkidle")
            page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
                {
                    "name": "system-e2e-leaf.png",
                    "mimeType": "image/png",
                    "buffer": png_bytes(224, 224),
                }
            )
            page.get_by_role("button", name="Phân tích ngay", exact=True).click()
            result = page.get_by_role("region", name="Kết quả phân tích")
            expect(result).to_be_visible(timeout=60_000)
            expect(result.get_by_text("Độ tin cậy", exact=True)).to_be_visible()
            expect(page.get_by_role("button", name="Lưu kết quả vào tài khoản", exact=True)).to_be_visible()

            assert any(status == 200 and "/api/plants" in url for status, url in api_responses)
            prediction_posts_before = sum(1 for status, url in api_responses if status in (200, 201) and "/api/predictions" in url)
            assert prediction_posts_before >= 1

            invalid = page.get_by_label("Chọn ảnh lá cây", exact=True)
            invalid.set_input_files({"name": "invalid.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4"})
            expect(page.get_by_role("alert").first).to_be_visible()
            invalid.set_input_files({"name": "tiny.png", "mimeType": "image/png", "buffer": png_bytes(223, 224)})
            expect(page.get_by_role("alert").first).to_be_visible()
            prediction_posts_after = sum(1 for status, url in api_responses if status in (200, 201) and "/api/predictions" in url)
            assert prediction_posts_after == prediction_posts_before

            # E2E-AUTH-06: Guest visiting protected route redirects away
            page.goto(f"{root_url}/history", wait_until="domcontentloaded")
            expect(page).not_to_have_url(re.compile(r"/history"), timeout=10_000)
        finally:
            browser.close()


if __name__ == "__main__":
    run()
