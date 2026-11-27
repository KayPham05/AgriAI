"""Verify the live login and cold relaunch flow on a disposable Android emulator."""

import argparse
import json
import re
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from welcome_layout_smoke import AndroidWelcome


def wait_for(device, label, *, clickable=False, editable=False, dismiss_expo_intro=False):
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        try:
            nodes = list(device.tree().iter("node"))
            if dismiss_expo_intro:
                menu = next((node for node in nodes if node.get("text") == "Continue"), None)
                if menu is not None and any("developer menu" in node.get("text", "") for node in nodes):
                    tap(device, menu)
                    continue
                close = next((node for node in nodes if node.get("content-desc") == "Close"), None)
                if close is not None and any(node.get("text", "").startswith("SDK version:") for node in nodes):
                    tap(device, close)
                    continue
            for node in nodes:
                if label not in (node.get("text"), node.get("content-desc")):
                    continue
                if clickable and node.get("clickable") != "true":
                    continue
                if editable and node.get("class") != "android.widget.EditText":
                    continue
                return node
        except (RuntimeError, OSError):
            pass
        time.sleep(0.5)
    raise AssertionError(f"Expected Android control or state: {label}")


def tap(device, node):
    left, top, right, bottom = map(int, re.findall(r"\d+", node.get("bounds", "")))
    device.shell("input", "tap", str((left + right) // 2), str((top + bottom) // 2))


def open_app(device, url, path=""):
    device.shell("am", "force-stop", "host.exp.exponent")
    device.shell("am", "start", "-a", "android.intent.action.VIEW", "-d", url + path, "host.exp.exponent")


def auth_post(origin, action, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = b"" if body is None else json.dumps(body).encode()
    with urlopen(Request(f"{origin}/api/auth/{action}", data, headers), timeout=10) as response:
        return response.status if body is None else json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", required=True)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--api", default="http://127.0.0.1:15060")
    parser.add_argument("--metro", default="exp://127.0.0.1:8085")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    origin = urlsplit(args.api)
    if origin.hostname not in {"127.0.0.1", "localhost", "::1"} or origin.path not in {"", "/"}:
        parser.error("Use a disposable local API and database")
    device = AndroidWelcome(args.adb, args.serial, args.output)

    open_app(device, args.metro, "/--/home")
    welcome = wait_for(device, "Đăng nhập", clickable=True, dismiss_expo_intro=True)
    assert welcome.get("enabled") == "true"
    print("PASS Guest Home deep link returns to Welcome", flush=True)
    tap(device, welcome)
    wait_for(device, "Chào mừng bạn trở lại")

    email = f"native-session-{uuid.uuid4().hex}@example.test"
    password = f"Qa9{uuid.uuid4().hex}"
    name = "Android Session QA"
    registered = auth_post(args.api.rstrip("/"), "register", {"email": email, "password": password, "fullName": name})
    try:
        tap(device, wait_for(device, "Email", editable=True))
        device.shell("input", "text", email)
        tap(device, wait_for(device, "Mật khẩu", editable=True))
        device.shell("input", "text", password)
        device.shell("input", "keyevent", "66")
        wait_for(device, "Trang chủ")
        wait_for(device, f"Chào {name}")
        print("PASS Login opens Home for the verified User", flush=True)

        open_app(device, args.metro)
        wait_for(device, "Trang chủ")
        wait_for(device, f"Chào {name}")
        print("PASS Cold relaunch restores the User from SecureStore", flush=True)

        open_app(device, args.metro, "/--/login")
        wait_for(device, "Trang chủ")
        wait_for(device, f"Chào {name}")
        print("PASS Signed-in Login deep link returns to Home", flush=True)
    finally:
        assert auth_post(args.api.rstrip("/"), "logout", token=registered["token"]) == 204


if __name__ == "__main__":
    main()
