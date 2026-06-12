#!/usr/bin/env python3
"""Local dev server for the site.

Same as `python3 -m http.server` but sends Cache-Control: no-store on every
response, so the browser never serves a stale page/CSS/JS during review.
Production (Vercel) sets its own cache headers — this is dev-only.

Usage: python3 serve.py [port]   (default 8080)
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    http.server.test(HandlerClass=NoCacheHandler, port=port)
