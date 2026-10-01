"""Health-only AI stand-in for CI; no prediction or model loading."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from os import environ


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path != "/health":
            self.send_error(404)
            return

        body = b'{"status":"Healthy"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    HTTPServer((environ.get("AI_HEALTH_HOST", "127.0.0.1"), 8000), HealthHandler).serve_forever()
