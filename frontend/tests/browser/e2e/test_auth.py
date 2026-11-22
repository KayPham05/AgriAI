"""Browser UI tests for authentication and route guards (mocked API)."""

from __future__ import annotations

import json
import re
from playwright.sync_api import expect

from .support import ApiStub, BrowserTestCase, inject_session, make_user


def case_meta(case_id: str, priority: str):
    def decorator(fn):
        fn.case_id = case_id
        fn.priority = priority
        return fn

    return decorator


class AuthBrowserTests(BrowserTestCase):
    @case_meta("E2E-AUTH-01", "P0")
    def test_register_account_submits_payload_and_enters_home(self) -> None:
        """E2E-AUTH-01 [UI/browser test]: register via LoginModal -> enters /home."""
        user = make_user(full_name="Nguyễn Văn Đăng Ký", email="newuser@example.test")
        stub = ApiStub(user=None)

        def handle_register(route, rec):
            body = rec.json_body or {}
            stub.user = {**user, "fullName": body.get("fullName", user["fullName"]), "email": body.get("email", user["email"])}
            route.fulfill(status=201, json={"token": "reg-jwt-token", "user": stub.user})

        stub.on("POST", "/api/auth/register", handle_register)

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/", wait_until="networkidle")

        page.get_by_role("banner").get_by_role("button", name="Tạo tài khoản", exact=True).click()
        dialog = page.get_by_role("dialog")
        expect(dialog.get_by_role("heading", name="Tạo tài khoản AgriAI", exact=True)).to_be_visible()

        dialog.get_by_label("Họ và tên", exact=True).fill("Nguyễn Văn Đăng Ký")
        dialog.get_by_label("Email", exact=True).fill("NewUser@Example.test")
        dialog.get_by_label("Mật khẩu", exact=True).fill("secret123")
        dialog.get_by_role("checkbox").check()
        dialog.get_by_role("button", name="Tạo tài khoản", exact=True).click()

        expect(page).to_have_url(re.compile(r"/home$"), timeout=12000)
        expect(page.get_by_role("link", name=re.compile(r"Mở hồ sơ của"))).to_be_visible()

        reg_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/auth/register"]
        self.assertEqual(len(reg_reqs), 1)
        self.assertEqual(
            reg_reqs[0].json_body,
            {"email": "newuser@example.test", "password": "secret123", "fullName": "Nguyễn Văn Đăng Ký"},
        )
        stored = json.loads(page.evaluate("localStorage.getItem('leafai_auth_session')"))
        self.assertEqual(stored["token"], "reg-jwt-token")
        self.assertEqual(stored["user"]["email"], "newuser@example.test")

    @case_meta("E2E-AUTH-02", "P0")
    def test_login_with_valid_credentials_and_captcha_enters_home(self) -> None:
        """E2E-AUTH-02 [UI/browser test]: valid login + visible CAPTCHA -> enters /home."""
        user = make_user()
        stub = ApiStub(user=None)

        def handle_login(route, rec):
            stub.user = user
            route.fulfill(status=200, json={"token": "login-jwt-token", "user": user})

        stub.on("POST", "/api/auth/login", handle_login)

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/", wait_until="networkidle")

        page.get_by_role("banner").get_by_role("button", name="Đăng nhập", exact=True).click()
        dialog = page.get_by_role("dialog")
        expect(dialog.get_by_role("heading", name="Chào mừng bạn trở lại", exact=True)).to_be_visible()

        captcha_text = dialog.locator('fieldset[aria-label^="Mã CAPTCHA:"] strong').inner_text().strip()
        dialog.get_by_label("Email", exact=True).fill(user["email"])
        dialog.get_by_label("Mật khẩu", exact=True).fill("Pass123!")
        dialog.get_by_label("Mã xác nhận", exact=True).fill(captcha_text)
        dialog.get_by_role("button", name="Đăng nhập", exact=True).click()

        expect(page).to_have_url(re.compile(r"/home$"), timeout=12000)
        expect(page.get_by_role("link", name=f"Mở hồ sơ của {user['fullName']}")).to_be_visible()

        login_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/auth/login"]
        self.assertEqual(len(login_reqs), 1)
        self.assertEqual(login_reqs[0].json_body, {"email": user["email"], "password": "Pass123!"})

    @case_meta("E2E-AUTH-03", "P0")
    def test_logout_revokes_session_clears_storage_and_returns_intro(self) -> None:
        """E2E-AUTH-03 [UI/browser test]: logout revokes token, clears storage, redirects to /."""
        user = make_user()
        stub = ApiStub(user=user)
        context, page, _ = self.new_context()
        inject_session(context, user, token="active-session-jwt")
        stub.mount(page)

        page.goto(f"{self.base_url}/home", wait_until="networkidle")
        page.get_by_role("link", name=f"Mở hồ sơ của {user['fullName']}").click()
        expect(page).to_have_url(re.compile(r"/profile$"))
        expect(page.get_by_role("heading", name="Hồ sơ của bạn", exact=True)).to_be_visible()

        page.get_by_role("button", name="Đăng xuất", exact=True).click()
        expect(page).to_have_url(re.compile(r"/$"))
        expect(page.get_by_role("heading", name=re.compile(r"Nhìn kỹ chiếc lá"))).to_be_visible(timeout=10000)

        self.assertIsNone(page.evaluate("localStorage.getItem('leafai_auth_session')"))
        self.assertIsNone(page.evaluate("sessionStorage.getItem('leafai_auth_session')"))
        logout_reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/auth/logout"]
        self.assertEqual(len(logout_reqs), 1)
        self.assertEqual(logout_reqs[0].headers.get("authorization"), "Bearer active-session-jwt")

    @case_meta("E2E-AUTH-04", "P1")
    def test_login_rejects_wrong_captcha_and_invalid_credentials(self) -> None:
        """E2E-AUTH-04 [UI/browser test]: wrong CAPTCHA blocks submit; 401 keeps email and shows error."""
        stub = ApiStub(user=None)
        stub.on(
            "POST",
            "/api/auth/login",
            lambda route, _rec: route.fulfill(status=401, json={"message": "Invalid email or password."}),
        )

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/", wait_until="networkidle")

        page.get_by_role("banner").get_by_role("button", name="Đăng nhập", exact=True).click()
        dialog = page.get_by_role("dialog")

        dialog.get_by_label("Email", exact=True).fill("wrong@example.test")
        dialog.get_by_label("Mật khẩu", exact=True).fill("wrongpass")
        dialog.get_by_label("Mã xác nhận", exact=True).fill("00000")
        dialog.get_by_role("button", name="Đăng nhập", exact=True).click()

        expect(dialog.get_by_role("alert").filter(has_text="Mã CAPTCHA chưa chính xác.")).to_be_visible()
        self.assertEqual([r for r in stub.requests if r.path == "/api/auth/login"], [])

        captcha_before = dialog.locator('fieldset[aria-label^="Mã CAPTCHA:"] strong').inner_text().strip()
        dialog.get_by_label("Mã xác nhận", exact=True).fill(captcha_before)
        dialog.get_by_role("button", name="Đăng nhập", exact=True).click()

        expect(
            dialog.get_by_role("alert").filter(has_text="Email hoặc mật khẩu không chính xác.")
        ).to_be_visible()
        expect(dialog.get_by_label("Email", exact=True)).to_have_value("wrong@example.test")
        expect(dialog.get_by_label("Mã xác nhận", exact=True)).to_have_value("")
        self.assertEqual(len([r for r in stub.requests if r.path == "/api/auth/login"]), 1)

    @case_meta("E2E-AUTH-05", "P1")
    def test_forgot_password_requests_recovery_code(self) -> None:
        """E2E-AUTH-05 [UI/browser test]: forgot password sends POST /api/auth/forgot-password and advances to code step."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/", wait_until="networkidle")

        page.get_by_role("banner").get_by_role("button", name="Đăng nhập", exact=True).click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_role("button", name="Quên mật khẩu?", exact=True).click()
        dialog.get_by_label("Email", exact=True).fill("recover@example.test")
        dialog.get_by_role("button", name="Gửi mã", exact=True).click()

        expect(dialog.get_by_label("Mã trong email", exact=True)).to_be_visible()
        reqs = [r for r in stub.requests if r.method == "POST" and r.path == "/api/auth/forgot-password"]
        self.assertEqual(len(reqs), 1)
        self.assertEqual(reqs[0].json_body, {"email": "recover@example.test"})

    @case_meta("E2E-AUTH-06", "P2")
    def test_guest_is_redirected_from_protected_routes(self) -> None:
        """E2E-AUTH-06 [UI/browser test]: guest visiting /history, /profile, /agricultural-profiles redirects to /."""
        stub = ApiStub(user=None)
        _, page, _ = self.new_context()
        stub.mount(page)

        for route in ("/history", "/profile", "/agricultural-profiles"):
            page.goto(f"{self.base_url}{route}", wait_until="networkidle")
            expect(page).to_have_url(re.compile(r"/$"))
            expect(page.get_by_role("heading", name=re.compile(r"Nhìn kỹ chiếc lá"))).to_be_visible()
            expect(page.get_by_role("banner").get_by_role("button", name="Đăng nhập", exact=True)).to_be_visible()

    @case_meta("E2E-AUTH-07", "P1")
    def test_password_recovery_completes_reset_and_logs_in(self) -> None:
        """E2E-AUTH-07 [UI/browser test]: verifies reset code, sets new password, and logs in."""
        user = make_user(email="recover@example.test", full_name="Khôi Phục Mật Khẩu")
        stub = ApiStub(user=None)

        def handle_login(route, _rec):
            stub.user = user
            route.fulfill(status=200, json={"token": "reset-jwt", "user": user})

        stub.on("POST", "/api/auth/login", handle_login)

        _, page, _ = self.new_context()
        stub.mount(page)
        page.goto(f"{self.base_url}/", wait_until="networkidle")

        page.get_by_role("banner").get_by_role("button", name="Đăng nhập", exact=True).click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_role("button", name="Quên mật khẩu?", exact=True).click()
        dialog.get_by_label("Email", exact=True).fill("recover@example.test")
        dialog.get_by_role("button", name="Gửi mã", exact=True).click()
        dialog.get_by_label("Mã trong email", exact=True).fill("12345678")
        dialog.get_by_role("button", name="Tiếp theo", exact=True).click()
        dialog.get_by_label("Mật khẩu mới", exact=True).fill("NewPass!234")
        dialog.get_by_label("Xác nhận mật khẩu mới", exact=True).fill("NewPass!234")
        dialog.get_by_role("button", name="Đổi mật khẩu", exact=True).click()

        expect(dialog.get_by_text("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.", exact=True)).to_be_visible()
        self.assertTrue(any(r.path == "/api/auth/reset-password" and r.method == "POST" for r in stub.requests))

        dialog.get_by_role("button", name="Quay lại đăng nhập", exact=True).click()
        captcha_text = dialog.locator('fieldset[aria-label^="Mã CAPTCHA:"] strong').inner_text().strip()
        dialog.get_by_label("Email", exact=True).fill("recover@example.test")
        dialog.get_by_label("Mật khẩu", exact=True).fill("NewPass!234")
        dialog.get_by_label("Mã xác nhận", exact=True).fill(captcha_text)
        dialog.get_by_role("button", name="Đăng nhập", exact=True).click()

        expect(page).to_have_url(re.compile(r"/home$"), timeout=12000)
        expect(page.get_by_role("link", name=f"Mở hồ sơ của {user['fullName']}")).to_be_visible()
        self.assertTrue(any(r.path == "/api/auth/login" and r.method == "POST" for r in stub.requests))

