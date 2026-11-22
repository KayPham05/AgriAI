"""System E2E smoke checks that use the running Docker services without API interception."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from uuid import uuid4
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, png_bytes  # noqa: E402


def run_catalog(route: str, base_url: str = DEFAULT_BASE_URL) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            response = page.goto(f"{base_url.rstrip('/')}/{route}", wait_until="networkidle")
            assert response is not None and response.ok, f"Cannot open {route}"
            card = page.get_by_role("listitem").filter(has=page.get_by_role("link", name="Xem chi tiết")).first
            heading = card.get_by_role("heading")
            expect(heading).to_be_visible()
            title = heading.inner_text()
            search = page.get_by_label("Tìm kiếm danh mục", exact=True)
            submit = page.get_by_role("button", name="Tìm kiếm", exact=True)
            search.fill(f"missing-{uuid4().hex}")
            submit.click()
            expect(page.get_by_text("Chưa có nội dung phù hợp được công khai.", exact=True)).to_be_visible()
            search.fill(title)
            submit.click()
            page.wait_for_url(lambda url: parse_qs(urlsplit(url).query).get("search") == [title])
            match = page.get_by_role("listitem").filter(has=page.get_by_role("heading", name=title, exact=True)).first
            link = match.get_by_role("link", name="Xem chi tiết")
            href = link.get_attribute("href")
            assert href and href.startswith(f"/{route}/"), href
            link.click()
            expect(page).to_have_url(re.compile(re.escape(href) + "$"))
            expect(page.get_by_role("heading", level=1, name=title, exact=True)).to_be_visible()
        finally:
            browser.close()


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    root_url = base_url.rstrip("/")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            prediction_requests: list[str] = []
            page.on(
                "request",
                lambda request: prediction_requests.append(request.url)
                if request.method == "POST" and urlsplit(request.url).path == "/api/predictions"
                else None,
            )

            # /about route, desktop & mobile navigation (E2E-SYS-01), and reload
            about_resp = page.goto(f"{root_url}/about", wait_until="networkidle")
            assert about_resp is not None and about_resp.status == 200
            expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()
            expect(page.get_by_role("navigation", name="Điều hướng chính", exact=True)).to_be_visible()
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()

            # Mobile navigation drawer at 375px on application route
            page.set_viewport_size({"width": 375, "height": 900})
            assert page.locator("body").evaluate("element => element.scrollWidth <= window.innerWidth")
            page.get_by_role("button", name="Mở menu", exact=True).click()
            mobile_nav = page.get_by_role("navigation", name="Điều hướng trên điện thoại", exact=True)
            expect(mobile_nav).to_be_visible()
            mobile_nav.get_by_role("link", name="Cây trồng", exact=True).click()
            expect(page).to_have_url(re.compile(r"/plants$"))
            page.set_viewport_size({"width": 1280, "height": 900})

            # Guest landing page (/), sections, responsive viewports, reduced motion, and CTA navigation
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

            # 404 route, noindex, and recovery link
            missing = page.goto(f"{root_url}/live-route-does-not-exist", wait_until="domcontentloaded")
            assert missing is not None and missing.status == 404
            assert page.locator('meta[name="robots"]').get_attribute("content") == "noindex"
            expect(page.get_by_role("heading", level=1, name="Không tìm thấy trang", exact=True)).to_be_visible()
            expect(page.get_by_role("link", name="Về trang chủ", exact=True)).to_be_visible()

            # Guest diagnosis and client file validation
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

            assert len(prediction_requests) == 1
            invalid = page.get_by_label("Chọn ảnh lá cây", exact=True)
            invalid.set_input_files({"name": "invalid.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4"})
            expect(page.get_by_text("Định dạng không hỗ trợ", exact=True)).to_be_visible()
            invalid.set_input_files({"name": "tiny.png", "mimeType": "image/png", "buffer": png_bytes(223, 224)})
            expect(page.get_by_text("Ảnh lỗi hoặc độ phân giải quá thấp", exact=True)).to_be_visible()
            assert len(prediction_requests) == 1, "Client validation sent an invalid upload to the API"

            # Guest visiting protected route redirects away
            page.goto(f"{root_url}/history", wait_until="domcontentloaded")
            expect(page).not_to_have_url(re.compile(r"/history"), timeout=10_000)
        finally:
            browser.close()


if __name__ == "__main__":
    run()
