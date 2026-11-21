"""Browser UI tests for Admin CRM portal (access control, overview mock, users, images, sessions)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from playwright.sync_api import expect

from .support import ApiStub, BrowserTestCase, CREATED_AT, inject_session, make_user


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


def make_admin_user_row(index: int, is_active: bool = True) -> dict:
    return {
        "id": f"adm-u-{index}",
        "fullName": "Nguyễn Văn An" if index == 1 else "Trần Thị Bình" if index == 2 else f"Người dùng {index}",
        "email": "an@example.test" if index == 1 else f"user{index}@example.test",
        "role": "User",
        "createdAt": CREATED_AT,
        "isActive": is_active,
        "lockReason": "Vi phạm nội quy" if not is_active else None,
        "lockedAt": CREATED_AT if not is_active else None,
        "predictionCount": index,
    }


def make_admin_image_row(index: int, status: str = "Available") -> dict:
    return {
        "id": f"adm-img-{index}",
        "predictionId": f"pred-{index}",
        "userId": f"adm-u-{index}",
        "userName": "Nguyễn Văn An" if index == 1 else f"Người dùng {index}",
        "userEmail": "an@example.test" if index == 1 else f"user{index}@example.test",
        "imageUrl": "/images/agriai-leaf-mark.png" if status == "Available" else None,
        "uploadedAt": CREATED_AT,
        "expiresAt": "2026-11-20T00:00:00Z",
        "status": status,
    }


def make_admin_session_row(index: int, status: str = "Active") -> dict:
    return {
        "id": f"adm-sess-{index}",
        "userId": f"adm-u-{index}",
        "userName": "Nguyễn Văn An" if index == 1 else f"Người dùng {index}",
        "userEmail": "an@example.test" if index == 1 else f"user{index}@example.test",
        "createdAt": CREATED_AT,
        "expiresAt": "2026-10-22T00:00:00Z",
        "endedAt": CREATED_AT if status == "Ended" else None,
        "status": status,
    }


class AdminBrowserTests(BrowserTestCase):
    @case_meta("E2E-ADM-01", "P0")
    def test_admin_portal_blocks_guest_and_normal_user_and_allows_admin(self) -> None:
        """E2E-ADM-01 [UI/browser test]: /admin blocks guest & User role; grants Admin overview."""
        # Guest
        stub_guest = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub_guest.mount(page)
        page.goto(f"{self.base_url}/admin", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Quản trị AgriAI", exact=True)).to_be_visible()
        expect(page.get_by_role("status").filter(has_text="Đăng nhập bằng tài khoản Admin để tiếp tục.")).to_be_visible()
        expect(page.get_by_role("link", name="Về ứng dụng để đăng nhập", exact=True)).to_have_attribute("href", "/home")

        # Normal user
        normal = make_user(role="User")
        stub_user = ApiStub(user=normal)
        ctx_u, page_u, _ = self.new_context()
        inject_session(ctx_u, normal, token="user-jwt")
        stub_user.mount(page_u)
        page_u.goto(f"{self.base_url}/admin", wait_until="networkidle")
        expect(page_u.get_by_role("status").filter(has_text="Tài khoản này không có quyền Admin.")).to_be_visible()
        expect(page_u.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_have_count(0)

        # Admin
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        stub_admin = ApiStub(user=admin)
        ctx_a, page_a, _ = self.new_context()
        inject_session(ctx_a, admin, token="admin-jwt")
        stub_admin.mount(page_a)
        page_a.goto(f"{self.base_url}/admin", wait_until="networkidle")
        expect(page_a.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_be_visible()

    @case_meta("E2E-ADM-02", "P0")
    def test_admin_overview_charts_and_calendar_date_filters_using_mock_provider(self) -> None:
        """E2E-ADM-02 [UI/browser test]: Overview metrics, charts, day/month/year AdminCalendar filters and reset (client-side AdminMockProvider)."""
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        stub = ApiStub(user=admin)
        context, page, _ = self.new_context(fixed_utc=datetime(2026, 10, 21, 5, 0, tzinfo=timezone.utc))
        inject_session(context, admin, token="admin-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/admin", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Tổng quan vận hành", exact=True)).to_be_visible()
        expect(page.get_by_role("note").filter(has_text="Trang Tổng quan hiện dùng dữ liệu minh họa.")).to_be_visible()

        summary = page.locator("summary").filter(has_text="Lịch tháng")
        if not summary.evaluate("el => el.parentElement.open"):
            summary.click()

        page.get_by_role("button", name="Ngày 20/10/2026", exact=True).click()
        expect(page.get_by_role("status", name="Bộ lọc thời gian", exact=True)).to_contain_text("20/10/2026")
        for chart in page.locator(".admin-chart-bars").all():
            expect(chart.locator("li")).to_have_count(1)

        page.get_by_role("button", name="Chọn tháng", exact=True).click()
        page.get_by_role("button", name="Tháng 10/2026", exact=True).click()
        expect(page.get_by_role("status", name="Bộ lọc thời gian", exact=True)).to_contain_text("10/2026")
        for chart in page.locator(".admin-chart-bars").all():
            expect(chart.locator("li")).to_have_count(31)

        page.get_by_role("button", name="Chọn năm", exact=True).click()
        page.get_by_role("button", name="Năm 2025", exact=True).click()
        expect(
            page.get_by_role("region", name="Ảnh gần đây", exact=True).get_by_text(
                "Không có ảnh trong thời gian đã chọn.", exact=True
            )
        ).to_be_attached()

        page.get_by_role("button", name="Bỏ lọc thời gian", exact=True).click()
        expect(page.get_by_role("status", name="Bộ lọc thời gian", exact=True)).to_contain_text("Toàn bộ")
        for chart in page.locator(".admin-chart-bars").all():
            expect(chart.locator("li")).to_have_count(7)

    @case_meta("E2E-ADM-03", "P1")
    def test_admin_responsive_rail_and_mobile_navigation_across_views(self) -> None:
        """E2E-ADM-03 [UI/browser test]: desktop rail toggle & mobile/tablet sheet navigate views without overflow."""
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        stub = ApiStub(
            user=admin,
            admin_users=[make_admin_user_row(1)],
            admin_images=[make_admin_image_row(1)],
            admin_sessions=[make_admin_session_row(1)],
        )

        # Desktop rail toggle & view switches
        ctx, page, _ = self.new_context(viewport={"width": 1280, "height": 900})
        inject_session(ctx, admin, token="admin-jwt")
        stub.mount(page)
        page.goto(f"{self.base_url}/admin", wait_until="networkidle")

        toggle = page.get_by_role("button", name=re.compile(r"thanh điều hướng"))
        before_label = toggle.get_attribute("aria-label")
        toggle.click()
        self.assertNotEqual(toggle.get_attribute("aria-label"), before_label)

        for nav_label, expected_heading in (
            ("Người dùng", "Người dùng"),
            ("Ảnh đã tải lên", "Ảnh đã tải lên"),
            ("Phiên đăng nhập", "Phiên đăng nhập"),
            ("Cây trồng", "Quản lý cây trồng"),
            ("Tổng quan", "Tổng quan vận hành"),
        ):
            page.get_by_role("navigation", name="Điều hướng quản trị", exact=True).get_by_role("button", name=nav_label, exact=True).click()
            expect(page.get_by_role("heading", level=1, name=expected_heading, exact=True)).to_be_visible()
            self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 1280)

        # Mobile / tablet drawer navigation
        for width in (768, 375):
            ctx_m, page_m, _ = self.new_context(viewport={"width": width, "height": 812})
            inject_session(ctx_m, admin, token="admin-jwt")
            stub.mount(page_m)
            page_m.goto(f"{self.base_url}/admin", wait_until="networkidle")
            page_m.get_by_role("button", name="Mở menu quản trị", exact=True).click()
            sheet = page_m.get_by_role("dialog")
            sheet.get_by_role("button", name="Người dùng", exact=True).click()
            expect(page_m.get_by_role("heading", level=1, name="Người dùng", exact=True)).to_be_visible()
            self.assertLessEqual(page_m.evaluate("document.documentElement.scrollWidth"), width)

    @case_meta("E2E-ADM-04", "P1")
    def test_admin_users_search_pagination_and_moderation_actions(self) -> None:
        """E2E-ADM-04 [UI/browser test]: Users view searches, paginates, locks/restores, warns, and forces logout-all."""
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        users = [make_admin_user_row(i) for i in range(1, 13)]
        stub = ApiStub(user=admin, admin_users=users)
        context, page, _ = self.new_context()
        inject_session(context, admin, token="admin-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/admin", wait_until="networkidle")
        page.get_by_role("navigation", name="Điều hướng quản trị", exact=True).get_by_role("button", name="Người dùng", exact=True).click()

        listing = page.get_by_role("region", name="Danh sách người dùng", exact=True)
        expect(listing.get_by_text("Trang 1 / 2", exact=True)).to_be_visible()
        listing.get_by_role("button", name="Trang sau", exact=True).click()
        expect(listing.get_by_text("Trang 2 / 2", exact=True)).to_be_visible()

        search = listing.get_by_label("Tìm theo tên hoặc email người dùng", exact=True)
        search.fill("an@example.test")
        listing.get_by_role("button", name="Tìm kiếm", exact=True).click()
        expect(listing.get_by_role("heading", name="Nguyễn Văn An", exact=True)).to_be_visible()
        expect(listing.get_by_text("Trang 1 / 1", exact=True)).to_be_visible()

        # Lock user
        listing.get_by_role("button", name="Khóa tài khoản", exact=True).click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_label("Lý do", exact=True).fill("Spam ảnh không hợp lệ")
        dialog.get_by_role("button", name="Xác nhận khóa", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="Đã cập nhật tài khoản trên hệ thống.")).to_be_visible()
        expect(listing.get_by_text("Đã khóa", exact=True)).to_be_visible()

        # Restore user
        listing.get_by_role("button", name="Khôi phục tài khoản", exact=True).click()
        page.get_by_role("dialog").get_by_role("button", name="Xác nhận khôi phục", exact=True).click()
        expect(listing.get_by_text("Hoạt động", exact=True)).to_be_visible()

        # Warn user
        listing.get_by_role("button", name="Gửi cảnh báo", exact=True).click()
        warn_dialog = page.get_by_role("dialog")
        warn_dialog.get_by_label("Nội dung cảnh báo", exact=True).fill("Vui lòng tải lên đúng ảnh lá cây.")
        warn_dialog.get_by_role("button", name="Gửi cảnh báo", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="Đã cập nhật tài khoản trên hệ thống.")).to_be_visible()

        # Force logout all
        listing.get_by_role("button", name="Cưỡng chế đăng xuất", exact=True).click()
        page.get_by_role("dialog").get_by_role("button", name="Xác nhận đăng xuất", exact=True).click()

        # Admin session itself remains active
        expect(page.get_by_role("heading", level=1, name="Người dùng", exact=True)).to_be_visible()
        self.assertTrue(any(r.path == "/api/admin/users/adm-u-1/status" and r.method == "PUT" for r in stub.requests))
        self.assertTrue(any(r.path == "/api/admin/users/adm-u-1/warnings" and r.method == "POST" for r in stub.requests))
        self.assertTrue(any(r.path == "/api/admin/users/adm-u-1/logout-all" and r.method == "POST" for r in stub.requests))

    @case_meta("E2E-ADM-06", "P1")
    def test_admin_sessions_search_and_status_badges(self) -> None:
        """E2E-ADM-06 [UI/browser test]: Sessions view searches and renders Active/Expired/Ended statuses (read-only list in UI)."""
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        sessions = [
            make_admin_session_row(1, "Active"),
            make_admin_session_row(2, "Expired"),
            make_admin_session_row(3, "Ended"),
        ]
        stub = ApiStub(user=admin, admin_sessions=sessions)
        context, page, _ = self.new_context()
        inject_session(context, admin, token="admin-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/admin", wait_until="networkidle")
        page.get_by_role("navigation", name="Điều hướng quản trị", exact=True).get_by_role("button", name="Phiên đăng nhập", exact=True).click()

        listing = page.get_by_role("region", name="Danh sách phiên đăng nhập", exact=True)
        expect(listing.get_by_role("listitem")).to_have_count(3)
        expect(listing.get_by_text("Còn hiệu lực", exact=True)).to_be_visible()
        expect(listing.get_by_text("Hết hạn", exact=True)).to_be_visible()
        expect(listing.get_by_text("Đã đăng xuất", exact=True)).to_be_visible()

        listing.get_by_label("Tìm theo tên hoặc email người dùng", exact=True).fill("an@example.test")
        listing.get_by_role("button", name="Tìm kiếm", exact=True).click()
        expect(listing.get_by_role("listitem")).to_have_count(1)
        expect(listing.get_by_role("heading", name="Nguyễn Văn An", exact=True)).to_be_visible()

    @case_meta("E2E-ADM-07", "P1")
    def test_admin_catalog_plant_crud_and_publication(self) -> None:
        """E2E-ADM-07 [UI/browser test]: Admin creates plant record in Catalog and reloads from API."""
        admin = make_user(user_id="admin-1", full_name="System Admin", email="admin@example.test", role="Admin")
        stub = ApiStub(user=admin)
        context, page, _ = self.new_context()
        inject_session(context, admin, token="admin-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/admin", wait_until="networkidle")
        page.get_by_role("navigation", name="Điều hướng quản trị", exact=True).get_by_role("button", name="Cây trồng", exact=True).click()
        page.get_by_role("button", name="Thêm mới", exact=True).click()
        page.get_by_label("Tên danh mục", exact=True).fill("Durian E2E")
        page.get_by_label("Tên tiếng Việt", exact=True).fill("Sầu riêng E2E")
        page.get_by_label("Mô tả", exact=True).fill("Giống sầu riêng thử nghiệm E2E")
        page.get_by_label("Tên khoa học", exact=True).fill("Durio zibethinus")
        page.get_by_role("button", name="Lưu nội dung", exact=True).click()

        expect(page.get_by_role("heading", name="Sầu riêng E2E", exact=True)).to_be_visible()
        self.assertTrue(any(r.path == "/api/plants" and r.method == "POST" for r in stub.requests))

        page.reload(wait_until="networkidle")
        page.get_by_role("navigation", name="Điều hướng quản trị", exact=True).get_by_role("button", name="Cây trồng", exact=True).click()
        page.get_by_role("searchbox", name="Tìm trong danh mục", exact=True).fill("Durian E2E")
        page.get_by_role("button", name="Tìm kiếm", exact=True).click()
        page.get_by_role("button", name="Mở Sầu riêng E2E", exact=True).first.click()
        expect(page.get_by_label("Tên danh mục", exact=True)).to_have_value("Durian E2E")

