"""Explicit Android-emulator layout smoke; requires Metro and Expo Go running."""

import argparse
import json
import re
import struct
import subprocess
import time
import xml.etree.ElementTree as element_tree
from pathlib import Path


LABELS = ("Chẩn đoán ngay", "Đăng nhập", "Tra cứu")
TITLE = "Quan sát chiếc lá.\nHiểu thêm về cây."


class AndroidWelcome:
    def __init__(self, adb: str, serial: str, output: Path) -> None:
        if not serial.startswith("emulator-"):
            raise ValueError("This smoke changes emulator settings; personal devices are excluded.")
        self.command = [adb, "-s", serial]
        self.output = output
        output.mkdir(parents=True, exist_ok=True)

    def run(self, *arguments: str, timeout: int = 30) -> bytes:
        return subprocess.run(
            [*self.command, *arguments], check=True, capture_output=True, timeout=timeout
        ).stdout

    def shell(self, *arguments: str) -> str:
        return self.run("shell", *arguments).decode("utf-8").strip()

    def tree(self) -> element_tree.Element:
        remote = f"/sdcard/agri159-smoke-{time.monotonic_ns()}.xml"
        message = self.shell("uiautomator", "dump", remote)
        if "dumped to:" not in message:
            raise RuntimeError(f"Accessibility tree is not ready: {message}")
        try:
            return element_tree.fromstring(self.run("exec-out", "cat", remote))
        finally:
            self.shell("rm", remote)

    def welcome_frame_is_drawn(self) -> bool:
        # A new activity can expose its tree while the native splash still covers
        # the screen. Check a header pixel in the actual framebuffer as well.
        raw = self.run("exec-out", "screencap")
        width, height, pixel_format = struct.unpack_from("<III", raw)
        if pixel_format != 1 or width < 10 or height < 101:
            raise RuntimeError("Unsupported Android framebuffer format")
        header_size = len(raw) - width * height * 4
        if header_size not in (12, 16):
            raise RuntimeError("Unexpected Android framebuffer length")
        offset = header_size + (100 * width + 5) * 4
        return tuple(raw[offset:offset + 3]) == (15, 77, 44)

    def screenshot(self, name: str, tree: element_tree.Element) -> None:
        (self.output / f"{name}.png").write_bytes(self.run("exec-out", "screencap", "-p"))
        element_tree.ElementTree(tree).write(self.output / f"{name}.xml", encoding="utf-8")

    def wait_for_welcome(self) -> element_tree.Element:
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            try:
                root = self.tree()
                if self.welcome_frame_is_drawn() and any(node.get("text") == TITLE for node in root.iter("node")):
                    return root
            except RuntimeError:
                pass
            time.sleep(1)
        raise AssertionError("Welcome was not reached; inspect emulator/Expo Go before acceptance.")

    def check_layout(self, width: int, scale: float, url: str) -> dict:
        name = f"welcome-{width}-font-{int(scale * 100)}"
        print(f"START {name}", flush=True)
        self.shell("wm", "size", f"{width * 3}x2532")
        self.shell("wm", "density", "480")
        self.shell("settings", "put", "system", "font_scale", str(scale))
        actual_scale = float(self.shell("settings", "get", "system", "font_scale"))
        assert actual_scale == scale, (actual_scale, scale)
        self.shell("am", "force-stop", "host.exp.exponent")
        self.shell("am", "start", "-a", "android.intent.action.VIEW", "-d", url, "host.exp.exponent")
        root = self.wait_for_welcome()
        self.screenshot(f"{name}-top", root)
        checked = []
        for label in LABELS:
            for _ in range(8):
                root = self.tree()
                candidates = [
                    node for node in root.iter("node")
                    if node.get("content-desc") == label and node.get("enabled") == "false"
                ]
                if candidates:
                    bounds = [int(value) for value in re.findall(r"\d+", candidates[0].get("bounds", ""))]
                    assert len(bounds) == 4, (label, bounds)
                    left, top, right, bottom = bounds
                    minimum_height = max(48, 25 * scale + 24) * 3
                    if bottom - top >= minimum_height:
                        assert 0 <= left < right <= width * 3, (label, bounds)
                        assert 0 <= top < bottom <= 2532, (label, bounds)
                        checked.append({"label": label, "bounds_px": bounds, "enabled": False})
                        self.screenshot(f"{name}-{len(checked)}", root)
                        break
                self.shell("input", "swipe", str(width * 3 // 2), "2100", str(width * 3 // 2), "1050", "350")
            else:
                raise AssertionError(f"{name}: {label} was clipped or could not be scrolled into view")
        return {"width_dp": width, "font_scale": actual_scale, "actions": checked, "status": "passed"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", required=True)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--url", default="exp://127.0.0.1:8082")
    parser.add_argument("--output", type=Path, default=Path("dist/agri159-native"))
    args = parser.parse_args()
    device = AndroidWelcome(args.adb, args.serial, args.output)
    original_font = device.shell("settings", "get", "system", "font_scale")
    original_size = device.shell("wm", "size")
    original_density = device.shell("wm", "density")
    if "Override" in original_size or "Override" in original_density:
        raise ValueError("Use a dedicated emulator with no existing display overrides.")
    report = {"serial": args.serial, "android": device.shell("getprop", "ro.build.version.release"), "cases": []}
    try:
        for width in (320, 390):
            for scale in (1.0, 1.5, 2.0):
                report["cases"].append(device.check_layout(width, scale, args.url))
                print(f"PASS width={width} scale={scale}", flush=True)
    except Exception as error:
        report["failure"] = str(error)
        raise
    finally:
        device.shell("wm", "size", "reset")
        device.shell("wm", "density", "reset")
        if original_font == "null":
            device.shell("settings", "delete", "system", "font_scale")
        else:
            device.shell("settings", "put", "system", "font_scale", original_font)
        (args.output / "native-layout-results.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    print(f"Passed {len(report['cases'])} native layout scenarios", flush=True)


if __name__ == "__main__":
    main()
