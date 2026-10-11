#!/usr/bin/env python3
"""
DJ Performance Engine - Local Development & OBS Browser Source Server
Serves the engine on http://localhost:8000 with CORS headers, proper MIME types,
and dynamic Asset Discovery API (/api/assets).
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse

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

    def do_HEAD(self):
        if self.path.startswith('/api/assets'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        # Dynamic Asset Auto-Discovery API: scans assets/ folder on disk in real-time
        if self.path.startswith('/api/assets'):
            try:
                assets_dir = os.path.join(DIRECTORY, 'assets')
                valid_exts = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}
                files = sorted([f for f in os.listdir(assets_dir) if os.path.splitext(f)[1].lower() in valid_exts and f != 'manifest.json'])

                def clean_name(fn):
                    base = os.path.splitext(fn)[0]
                    friendly = {
                        'mandala': 'Tiger Mandala',
                        'Jalebi': 'Jalebi',
                        'amul': 'Amul Girl',
                        'truck art': 'Truck Art',
                        'diya 2': 'Diya 2',
                        'rangoli 1': 'Rangoli 1',
                        'rangoli 2': 'Rangoli 2',
                        'rangoli 3': 'Rangoli 3',
                        'red eye': 'Red Eye',
                        'paper': 'Paper Art',
                        'fractal network': 'Fractal Network',
                        'virus crystals': 'Virus Crystals',
                        'blackhole': 'Blackhole',
                        'skyline': 'Skyline',
                        'comics': 'Comics',
                        'slime': 'Slime',
                        'peacock': 'Peacock',
                        'lady': 'Lady',
                        'taj mahal': 'Taj Mahal',
                        'wheel': 'Dharma Wheel',
                    }
                    for k, v in friendly.items():
                        if k.lower() == base.lower():
                            return v
                    return ' '.join(w.capitalize() for w in base.split(' '))

                def get_framing(fn):
                    base = os.path.splitext(fn)[0].lower()
                    totems = {'wheel', 'beauty', 'diya', 'diya 2', 'jalebi', 'tubes', 'paper', 'truck art', 'mandala', 'rangoli 1', 'rangoli 2', 'rangoli 3', 'spacey', 'supernova', 'amul', 'peacock', 'lady', 'red eye', 'blackhole'}
                    return 'totem' if base in totems else 'world'

                asset_list = []
                for idx, fn in enumerate(files):
                    quoted = urllib.parse.quote(fn)
                    asset_list.append({
                        'id': idx,
                        'name': clean_name(fn),
                        'filename': fn,
                        'path': f'assets/{quoted}',
                        'framing': get_framing(fn)
                    })

                # Also keep assets/manifest.json up-to-date as a static fallback
                manifest_path = os.path.join(assets_dir, 'manifest.json')
                try:
                    with open(manifest_path, 'w', encoding='utf-8') as mf:
                        json.dump(asset_list, mf, indent=2)
                except Exception:
                    pass

                payload = json.dumps({'count': len(asset_list), 'assets': asset_list}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                err_payload = json.dumps({'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(err_payload)
                return

        return super().do_GET()

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
            print(f"  > Asset Discovery API:   http://localhost:{PORT}/api/assets")
            print(f"  > Local Directory:       {DIRECTORY}")
            print("  > OBS Browser Source Setup:")
            print(f"      - URL:    http://localhost:{PORT}")
            print("      - Width:  1920")
            print("      - Height: 1080")
            print("      - FPS:    60")
            print("=" * 65)
            print("  Server is running with Dynamic Asset Auto-Discovery.")
            print("  Drop any PNG/JPG into the 'assets/' folder - it detects automatically!")
            print("=" * 65)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Engine Server] Stopped gracefully.")
    except Exception as e:
        print(f"\n[Engine Server Error] {e}")

if __name__ == '__main__':
    main()
