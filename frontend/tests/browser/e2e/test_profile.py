"""Browser UI tests for user profile and agricultural profiles (mocked API)."""

from __future__ import annotations

import re
from playwright.sync_api import expect

from .support import (
    ApiStub,
    BrowserTestCase,
    inject_session,
    make_agricultural_profile,
    make_user,
    png_bytes,
)


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


class ProfileBrowserTests(BrowserTestCase):
    @case_meta("E2E-PROF-01", "P0")
    def test_update_user_full_name_and_reload_from_api_stub(self) -> None:
        """E2E-PROF-01 [UI/browser test]: /profile updates fullName via PUT /api/users/profile and reloads."""
        user = make_user(full_name="Nguyễn Văn A")
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="prof-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/profile", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Hồ sơ của bạn", exact=True)).to_be_visible()

        name_input = page.get_by_label("Họ và tên", exact=True)
        expect(name_input).to_have_value("Nguyễn Văn A")
        name_input.fill("Trần Minh Khôi")
        page.get_by_role("button", name="Lưu thay đổi", exact=True).click()

        expect(page.get_by_role("status").filter(has_text="Đã cập nhật hồ sơ tài khoản.")).to_be_visible()
        expect(page.get_by_role("heading", name="Trần Minh Khôi", exact=True)).to_be_visible()

        put_reqs = [r for r in stub.requests if r.method == "PUT" and r.path == "/api/users/profile"]
        self.assertEqual(len(put_reqs), 1)
        self.assertEqual(put_reqs[0].json_body, {"fullName": "Trần Minh Khôi"})

        page.reload(wait_until="networkidle")
        expect(page.get_by_label("Họ và tên", exact=True)).to_have_value("Trần Minh Khôi")

    @case_meta("E2E-PROF-02", "P1")
    def test_upload_avatar_via_editor_modal(self) -> None:
        """E2E-PROF-02 [UI/browser test]: uploads avatar via Avatar Editor modal and POST /api/users/avatar."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="avatar-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/profile", wait_until="networkidle")
        page.get_by_label("Chọn ảnh đại diện", exact=True).set_input_files(
            {"name": "avatar.png", "mimeType": "image/png", "buffer": png_bytes(96, 96)}
        )
        expect(page.get_by_role("dialog", name="Lưu ảnh đại diện mới?")).to_be_visible()
        page.get_by_role("button", name="Lưu ảnh", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="Đã lưu ảnh đại diện vào tài khoản.")).to_be_visible()
        self.assertTrue(any(r.path == "/api/users/avatar" and r.method == "POST" for r in stub.requests))

    @case_meta("E2E-PROF-03", "P1")
    def test_change_password_from_profile_security_settings(self) -> None:
        """E2E-PROF-03 [UI/browser test]: requests password change code and submits POST /api/users/change-password."""
        user = make_user(full_name="Người Dùng Bảo Mật")
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="pw-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/profile", wait_until="networkidle")
        page.get_by_role("button", name="Đổi mật khẩu", exact=True).click()
        page.get_by_label("Mật khẩu hiện tại", exact=True).fill("OldPass!123")
        page.get_by_label("Mật khẩu mới", exact=True).fill("NewPass!456")
        page.get_by_label("Xác nhận mật khẩu mới", exact=True).fill("NewPass!456")
        page.get_by_role("button", name="Gửi mã xác nhận", exact=True).click()
        page.get_by_label("Mã xác nhận email", exact=True).fill("12345678")
        page.get_by_role("button", name="Cập nhật mật khẩu", exact=True).click()

        self.assertTrue(any(r.path == "/api/users/change-password" and r.method == "POST" for r in stub.requests))

    @case_meta("E2E-PROF-04", "P2")
    def test_enable_email_two_factor_in_profile(self) -> None:
        """E2E-PROF-04 [UI/browser test]: enables Email 2FA switch and verifies setup code."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="2fa-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/profile", wait_until="networkidle")
        factor = page.get_by_label("Xác thực hai lớp qua email", exact=True)
        factor.click()
        expect(page.get_by_label("Mã xác minh", exact=True)).to_be_visible()
        page.get_by_label("Mã xác minh", exact=True).fill("12345678")
        page.get_by_role("button", name="Xác minh mã", exact=True).click()
        expect(factor).to_be_checked()
        self.assertTrue(any(r.path == "/api/auth/two-factor/setup/verify" and r.method == "POST" for r in stub.requests))

    @case_meta("E2E-PROF-AGRI-01", "P0")
    def test_create_agricultural_profile_submits_and_opens_detail(self) -> None:
        """E2E-PROF-AGRI-01 [UI/browser test]: creates agricultural profile via POST /api/agricultural-profiles."""
        user = make_user()
        stub = ApiStub(user=user, agricultural_profiles=[])
        context, page, _ = self.new_context()
        inject_session(context, user, token="agri-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/agricultural-profiles", wait_until="networkidle")
        expect(page.get_by_role("heading", name="Chưa có hồ sơ", exact=True)).to_be_visible()

        page.get_by_role("button", name="Tạo hồ sơ đầu tiên", exact=True).click()
        page.get_by_label("Tên hồ sơ *", exact=True).fill("Vườn sầu riêng Cái Bè")
        page.get_by_label("Mô tả và thông tin canh tác", exact=True).fill("2.5 ha, đất phù sa.")
        page.get_by_role("button", name="Tạo hồ sơ", exact=True).click()

        expect(page.get_by_role("status").filter(has_text="Đã tạo hồ sơ.")).to_be_visible()
        expect(page.get_by_role("heading", name="Vườn sầu riêng Cái Bè", exact=True)).to_be_visible()
        expect(page.get_by_text("2.5 ha, đất phù sa.", exact=True)).to_be_visible()

        post_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/agricultural-profiles"]
        self.assertEqual(len(post_reqs), 1)
        self.assertEqual(
            post_reqs[0].json_body,
            {"name": "Vườn sầu riêng Cái Bè", "description": "2.5 ha, đất phù sa."},
        )

    @case_meta("E2E-PROF-AGRI-02", "P1")
    def test_edit_agricultural_profile_updates_ui_via_put(self) -> None:
        """E2E-PROF-AGRI-02 [UI/browser test]: edits agricultural profile via PUT /api/agricultural-profiles/{id}."""
        user = make_user()
        profile = make_agricultural_profile(profile_id="agri-edit-1", name="Vườn cũ", description="Ghi chú cũ")
        stub = ApiStub(user=user, agricultural_profiles=[profile])
        context, page, _ = self.new_context()
        inject_session(context, user, token="agri-edit-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/agricultural-profiles", wait_until="networkidle")
        page.get_by_role("button", name="Xem chi tiết", exact=True).first.click()
        expect(page.get_by_role("heading", name="Vườn cũ", exact=True)).to_be_visible()

        page.get_by_role("button", name="Chỉnh sửa", exact=True).click()
        page.get_by_label("Tên hồ sơ *", exact=True).fill("Vườn mới nâng cấp")
        page.get_by_label("Mô tả và thông tin canh tác", exact=True).fill("Đã lắp hệ thống tưới tự động.")
        page.get_by_role("button", name="Lưu thay đổi", exact=True).click()

        expect(page.get_by_role("status").filter(has_text="Đã cập nhật hồ sơ.")).to_be_visible()
        expect(page.get_by_role("heading", name="Vườn mới nâng cấp", exact=True)).to_be_visible()
        expect(page.get_by_text("Đã lắp hệ thống tưới tự động.", exact=True)).to_be_visible()

        put_reqs = [r for r in stub.requests if r.method == "PUT" and r.path == "/api/agricultural-profiles/agri-edit-1"]
        self.assertEqual(len(put_reqs), 1)
        self.assertEqual(
            put_reqs[0].json_body,
            {"name": "Vườn mới nâng cấp", "description": "Đã lắp hệ thống tưới tự động."},
        )

    @case_meta("E2E-PROF-AGRI-03", "P1")
    def test_link_diagnosis_prediction_to_agricultural_profile(self) -> None:
        """E2E-PROF-AGRI-03 [UI/browser test]: links diagnosis prediction to agricultural profile via PUT."""
        user = make_user()
        profile = make_agricultural_profile(profile_id="agri-link-1", name="Vườn cà chua Liên Kết")
        stub = ApiStub(user=user, agricultural_profiles=[profile])
        context, page, _ = self.new_context()
        inject_session(context, user, token="agri-link-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/diagnose", wait_until="networkidle")
        page.get_by_label("Chọn ảnh lá cây", exact=True).set_input_files(
            {"name": "link-leaf.png", "mimeType": "image/png", "buffer": png_bytes(224, 224)}
        )
        page.get_by_role("button", name="Phân tích ngay", exact=True).click()
        dialog = page.get_by_role("dialog")
        expect(dialog.get_by_text("Chọn hồ sơ để lưu", exact=True)).to_be_visible()
        dialog.get_by_role("combobox").click()
        page.get_by_role("option", name="Vườn cà chua Liên Kết", exact=True).click()
        dialog.get_by_role("button", name="Lưu vào hồ sơ", exact=True).click()

        expect(page.get_by_text("Đã lưu kết quả vào hồ sơ", exact=False)).to_be_visible()
        self.assertTrue(
            any(
                r.method == "PUT" and r.path.endswith("/agricultural-profile")
                for r in stub.requests
            )
        )

