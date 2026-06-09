"""Minimal static file server for local preview (no dependencies)."""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3456
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    def log_message(self, fmt, *args):
        pass  # silence logs

if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), Handler) as srv:
        srv.serve_forever()
