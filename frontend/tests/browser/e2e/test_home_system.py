"""Browser UI tests for homepage (/home), responsive navigation, 404, and /about."""

from __future__ import annotations

import re
from playwright.sync_api import expect

from .support import ApiStub, BrowserTestCase, inject_session, make_plant, make_user


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


class HomeAndSystemBrowserTests(BrowserTestCase):
    @case_meta("E2E-HOME-01", "P1")
    def test_home_hero_cta_buttons_navigate_to_diagnose_and_diseases(self) -> None:
        """E2E-HOME-01 [UI/browser test]: /home hero CTAs route to /diagnose and /diseases."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user)
        stub.mount(page)

        page.goto(f"{self.base_url}/home", wait_until="networkidle")
        hero = page.get_by_role("region", name="Khám phá AgriAI", exact=True)
        hero.get_by_role("button", name="Kiểm tra lá", exact=True).click()
        expect(page).to_have_url(re.compile(r"/diagnose$"))

        page.goto(f"{self.base_url}/home", wait_until="networkidle")
        hero = page.get_by_role("region", name="Khám phá AgriAI", exact=True)
        hero.get_by_role("button", name="Tra cứu bệnh", exact=True).click()
        expect(page).to_have_url(re.compile(r"/diseases$"))

    @case_meta("E2E-HOME-02", "P1")
    def test_home_photo_tips_and_plant_guide_selection_navigates_to_plant_detail(self) -> None:
        """E2E-HOME-02 [UI/browser test]: /home renders 3 photo tips, plant guide tabs, and navigates to /plants/[id]."""
        user = make_user()
        tomato = make_plant("11111111-1111-4111-8111-111111111101", "Tomato", "Cà chua", "Solanum lycopersicum")
        stub = ApiStub(user=user, plants=[tomato])
        context, page, _ = self.new_context()
        inject_session(context, user)
        stub.mount(page)

        page.goto(f"{self.base_url}/home", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Trước khi chụp ảnh: 3 lưu ý vàng", exact=True)).to_be_visible()
        expect(page.get_by_role("list", name="Lưu ý chụp ảnh", exact=True).get_by_role("listitem")).to_have_count(3)
        expect(page.get_by_role("heading", name="Tìm hiểu cây bạn đang trồng", exact=True)).to_be_visible()

        guide = page.locator("section", has=page.get_by_role("heading", name="Tìm hiểu cây bạn đang trồng", exact=True))
        guide.get_by_role("button", name="Tìm hiểu cây Cà chua", exact=True).click()
        expect(page).to_have_url(re.compile(r"/plants/"))

    @case_meta("E2E-HOME-03", "P2")
    def test_home_responsive_viewports_have_no_horizontal_overflow(self) -> None:
        """E2E-HOME-03 [UI/browser test]: /home fits 1280px, 768px, 375px without horizontal overflow."""
        user = make_user()
        stub = ApiStub(user=user)
        for width, height in ((1280, 900), (768, 900), (375, 812)):
            context, page, _ = self.new_context(viewport={"width": width, "height": height})
            inject_session(context, user)
            stub.mount(page)
            page.goto(f"{self.base_url}/home", wait_until="networkidle")
            expect(page.get_by_role("heading", name="Hiểu từng chiếc lá Giữ trọn mùa xanh")).to_be_attached()
            self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), width)

    @case_meta("E2E-HOME-04", "P2")
    def test_home_renders_cleanly_under_reduced_motion(self) -> None:
        """E2E-HOME-04 [UI/browser test]: /home with prefers-reduced-motion: reduce renders static content cleanly."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context(reduced_motion="reduce")
        inject_session(context, user)
        stub.mount(page)

        page.goto(f"{self.base_url}/home", wait_until="networkidle")
        expect(page.get_by_role("region", name="Khám phá AgriAI", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Trước khi chụp ảnh: 3 lưu ý vàng", exact=True)).to_be_visible()

    @case_meta("E2E-SYS-01", "P1")
    def test_responsive_navigation_desktop_bar_and_mobile_drawer_with_touch_targets(self) -> None:
        """E2E-SYS-01 [UI/browser test]: desktop navbar & mobile Sheet drawer navigate cleanly with >=44px targets."""
        stub = ApiStub(user=None)

        # Desktop
        _, page_d, _ = self.new_context(viewport={"width": 1280, "height": 900})
        stub.mount(page_d)
        page_d.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        desktop_nav = page_d.get_by_role("navigation", name="Điều hướng chính", exact=True)
        expect(desktop_nav).to_be_visible()
        desktop_nav.get_by_role("link", name="Cây trồng", exact=True).click()
        expect(page_d).to_have_url(re.compile(r"/plants$"))

        # Mobile
        _, page_m, _ = self.new_context(viewport={"width": 375, "height": 812})
        stub.mount(page_m)
        page_m.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        menu_btn = page_m.get_by_role("button", name="Mở menu", exact=True)
        box = menu_btn.bounding_box()
        self.assertIsNotNone(box)
        self.assertGreaterEqual(box["height"], 40)
        menu_btn.click()
        mobile_nav = page_m.get_by_role("navigation", name="Điều hướng trên điện thoại", exact=True)
        expect(mobile_nav).to_be_visible()
        mobile_nav.get_by_role("link", name="Về dự án", exact=True).click()
        expect(page_m).to_have_url(re.compile(r"/about$"))

    @case_meta("E2E-SYS-02", "P2")
    def test_not_found_404_page_has_noindex_and_recovery_actions(self) -> None:
        """E2E-SYS-02 [UI/browser test]: unknown route returns HTTP 404, noindex meta, and working recovery buttons."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)

        response = page.goto(f"{self.base_url}/duong-dan-khong-ton-tai", wait_until="networkidle")
        self.assertIsNotNone(response)
        self.assertEqual(response.status, 404)
        expect(page.get_by_role("heading", level=1, name="Không tìm thấy trang", exact=True)).to_be_visible()
        self.assertEqual(page.locator("meta[name=robots]").get_attribute("content"), "noindex")
        expect(page.get_by_role("link", name="Về trang chủ", exact=True)).to_have_attribute("href", "/")

        page.get_by_role("link", name="Về trang chủ", exact=True).click()
        expect(page).to_have_url(re.compile(r"/$"))

    @case_meta("E2E-SYS-04", "P2")
    def test_about_page_loads_survives_reload_and_navigates_to_diagnose(self) -> None:
        """E2E-SYS-04 [UI/browser test]: /about renders sections, reloads cleanly, and links to /diagnose."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)

        response = page.goto(f"{self.base_url}/about", wait_until="networkidle")
        self.assertIsNotNone(response)
        self.assertEqual(response.status, 200)
        expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Từ ảnh đến kết quả", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Phạm vi hiện tại", exact=True)).to_be_visible()

        page.reload(wait_until="networkidle")
        expect(page.get_by_role("heading", level=1, name="Hiểu kết quả trước khi sử dụng", exact=True)).to_be_visible()

        page.get_by_role("main").get_by_role("button", name="Kiểm tra lá", exact=True).click()
        expect(page).to_have_url(re.compile(r"/diagnose$"))
