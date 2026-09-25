"""End-to-end smoke checks for the demo multipart prediction endpoint."""

import base64
import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BACKEND_DIR = Path(__file__).resolve().parents[1]
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=="
)


def multipart(filename: str, content_type: str, content: bytes) -> bytes:
    return (
        f"--leafai-boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + content + b"\r\n--leafai-boundary--\r\n"


def post(base_url: str, filename: str, content_type: str, content: bytes) -> tuple[int, dict]:
    request = Request(
        f"{base_url}/api/predictions",
        data=multipart(filename, content_type, content),
        headers={"Content-Type": "multipart/form-data; boundary=leafai-boundary"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def main() -> None:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    base_url = f"http://127.0.0.1:{port}"
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        for _ in range(50):
            if server.poll() is not None:
                raise RuntimeError(f"Backend stopped early: {server.stderr.read().decode()}")
            try:
                with urlopen(f"{base_url}/api/health", timeout=1):
                    break
            except (URLError, TimeoutError):
                time.sleep(0.1)
        else:
            raise RuntimeError("Backend did not start in time")

        status, body = post(base_url, "leaf.png", "image/png", PNG)
        assert status == 200, (status, body)
        assert set(body) == {"crop", "disease", "confidence"}, body
        assert body == {"crop": "Tomato", "disease": "Early Blight", "confidence": 0.94}, body

        status, body = post(base_url, "leaf.txt", "text/plain", b"not an image")
        assert status == 415 and "detail" in body, (status, body)

        status, body = post(base_url, "broken.png", "image/png", b"not an image")
        assert status == 415 and "detail" in body, (status, body)

        status, body = post(base_url, "empty.png", "image/png", b"")
        assert status == 400 and "detail" in body, (status, body)

        status, body = post(base_url, "oversize.png", "image/png", PNG[:8] + b"0" * (15 * 1024 * 1024))
        assert status == 413 and "detail" in body, (status, body)
        print("Demo API smoke checks passed: success, invalid type, invalid content, empty file, oversized file")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


if __name__ == "__main__":
    main()
