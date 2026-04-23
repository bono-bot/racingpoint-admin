"""
Mock RC server for MI emitter end-to-end test.

- Returns 500 to ANY request EXCEPT POST /api/v1/mesh/audit-seed-service.
- Logs every MI POST receipt to stdout in a clearly-tagged block.

Usage:
    python scripts/mock-rc-mi-test.py [port]

Test sequence:
    1. Start this on :9999.
    2. Set admin .env.local: RC_URL=http://localhost:9999, ADMIN_GATEWAY_MI_EMIT=1, RC_SERVICE_KEY=test-key.
    3. Restart admin dev (npm run dev).
    4. curl /api/rc/healthz  -> proxy returns 500.
    5. Wait 30s for MI flush timer.
    6. Watch this stdout for "=== MI RECEIVED ===" block.
"""
import sys
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9999


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write(f"[{stamp()}] {self.address_string()} - {fmt % args}\n")
        sys.stdout.flush()

    def _read_body(self) -> bytes:
        n = int(self.headers.get("Content-Length", "0") or "0")
        return self.rfile.read(n) if n > 0 else b""

    def _hdrs(self) -> dict:
        return {k.lower(): v for k, v in self.headers.items()}

    def do_POST(self):
        body = self._read_body()
        if "/api/v1/mesh/audit-seed-service" in self.path:
            sys.stdout.write("\n========== MI RECEIVED ==========\n")
            sys.stdout.write(f"ts:     {stamp()}\n")
            sys.stdout.write(f"path:   {self.path}\n")
            sys.stdout.write(f"x-service-key: {self.headers.get('X-Service-Key', '<missing>')}\n")
            sys.stdout.write(f"content-type:  {self.headers.get('Content-Type', '<missing>')}\n")
            sys.stdout.write("body:\n")
            try:
                parsed = json.loads(body.decode("utf-8"))
                sys.stdout.write(json.dumps(parsed, indent=2) + "\n")
            except Exception:
                sys.stdout.write(body.decode("utf-8", errors="replace") + "\n")
            sys.stdout.write("=================================\n\n")
            sys.stdout.flush()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"received_by":"mock-rc"}')
            return
        # Default: 500 to trigger MI symptom on the proxy side
        self.send_response(500)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error":"induced-500-from-mock"}')

    def do_GET(self):
        # Default: 500 to trigger MI symptom on the proxy side
        self.send_response(500)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error":"induced-500-from-mock"}')

    def do_PUT(self):
        self.do_GET()

    def do_DELETE(self):
        self.do_GET()

    def do_PATCH(self):
        self.do_GET()


def main():
    print(f"[mock-rc] listening http://127.0.0.1:{PORT}", flush=True)
    print(f"[mock-rc] all paths return 500 EXCEPT POST /api/v1/mesh/audit-seed-service", flush=True)
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
