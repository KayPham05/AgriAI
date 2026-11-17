"""System E2E for password recovery and email 2FA through Mailpit."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
import uuid
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

E2E_DIR = Path(__file__).resolve().parent
BROWSER_DIR = E2E_DIR.parent
if str(BROWSER_DIR) not in sys.path:
    sys.path.insert(0, str(BROWSER_DIR))

from e2e.support import DEFAULT_BASE_URL, read_dialog_captcha  # noqa: E402


def _mail_code(recipient: str, subject_part: str) -> str:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        with urllib.request.urlopen("http://localhost:8025/api/v1/messages?limit=50", timeout=5) as response:
            messages = json.load(response).get("messages", [])
        for message in messages:
            if recipient not in json.dumps(message) or subject_part not in str(message.get("Subject", "")):
                continue
            with urllib.request.urlopen(f"http://localhost:8025/api/v1/message/{message['ID']}", timeout=5) as response:
                detail = json.load(response)
            body = f"{detail.get('Text', '')} {detail.get('HTML', '')}"
            match = re.search(r"\b(\d{8})\b", body)
            if match:
                return match.group(1)
        time.sleep(0.5)
    raise AssertionError(f"No Mailpit code for {recipient} / {subject_part}")


def _register(email: str, password: str) -> None:
    payload = json.dumps({"fullName": "Email System E2E", "email": email, "password": password}).encode()
    request = urllib.request.Request(
        "http://localhost:5080/api/auth/register",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=10):
        pass


def run(base_url: str = DEFAULT_BASE_URL) -> None:
    email = f"email_e2e_{uuid.uuid4().hex[:12]}@example.test"
    old_password = "E2ePass!234567"
    new_password = "E2eReset!987654"
    _register(email, old_password)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()

            # E2E-AUTH-05 & E2E-AUTH-07: Forgot password OTP via Mailpit, reset password, and login
            page.goto(f"{base_url.rstrip('/')}/", wait_until="networkidle")
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            page.get_by_role("button", name="Quên mật khẩu?", exact=True).click()
            page.get_by_label("Email", exact=True).fill(email)
            page.get_by_role("button", name="Gửi mã", exact=True).click()
            code = _mail_code(email, "Mã đặt lại mật khẩu")
            page.get_by_label("Mã trong email", exact=True).fill(code)
            page.get_by_role("button", name="Tiếp theo", exact=True).click()
            page.get_by_label("Mật khẩu mới", exact=True).fill(new_password)
            page.get_by_label("Xác nhận mật khẩu mới", exact=True).fill(new_password)
            page.get_by_role("button", name="Đổi mật khẩu", exact=True).click()
            expect(
                page.get_by_text("Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.", exact=True)
            ).to_be_visible(timeout=15_000)
            page.get_by_role("button", name="Quay lại đăng nhập", exact=True).click()
            page.get_by_label("Email", exact=True).fill(email)
            page.get_by_label("Mật khẩu", exact=True).fill(new_password)
            page.get_by_label("Mã xác nhận", exact=True).fill(read_dialog_captcha(page))
            page.get_by_role("button", name="Đăng nhập", exact=True).click()
            expect(page.get_by_text("Email System E2E", exact=True)).to_be_visible(timeout=15_000)

            # E2E-PROF-04: Enable Email 2FA via Mailpit and verify state persists across reload
            page.goto(f"{base_url.rstrip('/')}/profile", wait_until="domcontentloaded")
            factor = page.get_by_label("Xác thực hai lớp qua email", exact=True)
            expect(factor).to_be_enabled(timeout=15_000)
            factor.click()
            code = _mail_code(email, "Mã bật xác thực hai lớp AgriAI")
            expect(page.get_by_label("Mã xác minh", exact=True)).to_be_visible(timeout=15_000)
            page.get_by_label("Mã xác minh", exact=True).fill(code)
            page.get_by_role("button", name="Xác minh mã", exact=True).click()
            expect(factor).to_be_checked(timeout=15_000)
            page.reload(wait_until="domcontentloaded")
            expect(page.get_by_label("Xác thực hai lớp qua email", exact=True)).to_be_checked(timeout=15_000)

            # E2E-PROF-03: Change password from profile settings via Mailpit and verify session termination
            page.get_by_role("button", name="Đổi mật khẩu", exact=True).click()
            page.get_by_label("Mật khẩu hiện tại", exact=True).fill(new_password)
            page.get_by_label("Mật khẩu mới", exact=True).fill("E2eChanged!246810")
            page.get_by_label("Xác nhận mật khẩu mới", exact=True).fill("E2eChanged!246810")
            page.get_by_role("button", name="Gửi mã xác nhận", exact=True).click()
            code = _mail_code(email, "Mã đổi mật khẩu AgriAI")
            page.get_by_label("Mã xác nhận email", exact=True).fill(code)
            page.get_by_role("button", name="Cập nhật mật khẩu", exact=True).click()
            expect(page.get_by_text("Tạm biệt, Email System E2E", exact=True)).to_be_visible(timeout=15_000)
        finally:
            browser.close()


if __name__ == "__main__":
    run()
