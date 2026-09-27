#!/usr/bin/env python3
"""
DJ Performance Engine - Local Development & OBS Browser Source Server
Serves the engine on http://localhost:8000 with CORS headers and proper MIME types.
"""

import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class EngineHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable Secure Context features, SharedArrayBuffer and cross-origin texture imports
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        # Ensure proper JS module and image MIME types
        if path.endswith('.js'):
            return 'text/javascript'
        if path.endswith('.mjs'):
            return 'text/javascript'
        if path.endswith('.json'):
            return 'application/json'
        if path.endswith('.png'):
            return 'image/png'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        return super().guess_type(path)

    def log_message(self, format, *args):
        # Silence routine 200 GET logs for cleaner terminal output
        if '200' not in args[1]:
            super().log_message(format, *args)

def main():
    os.chdir(DIRECTORY)
    # Enable threaded request handling for smooth concurrent asset loading
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    try:
        with http.server.ThreadingHTTPServer(("", PORT), EngineHTTPRequestHandler) as httpd:
            print("=" * 65)
            print("  DJ PERFORMANCE ENGINE - OBS STUDIO BROWSERSOURCE SERVER")
            print("=" * 65)
            print(f"  > Engine URL:            http://localhost:{PORT}")
            print(f"  > Local Directory:       {DIRECTORY}")
            print("  > OBS Browser Source Setup:")
            print(f"      - URL:    http://localhost:{PORT}")
            print("      - Width:  1920")
            print("      - Height: 1080")
            print("      - FPS:    60")
            print("=" * 65)
            print("  Server is running. Press Ctrl+C to stop.")
            print("=" * 65)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Engine Server] Stopped gracefully.")
    except Exception as e:
        print(f"\n[Engine Server Error] {e}")

if __name__ == '__main__':
    main()
