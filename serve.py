#!/usr/bin/env python3
"""
DJ Performance Engine - Local Development & OBS Browser Source Server
Serves the engine on http://localhost:8000 with CORS headers, proper MIME types,
dynamic Asset Discovery API (/api/assets), and Mobile Cue Deck synchronization.
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
import time
import socket

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Global engine state shared in real-time with remote controller
ENGINE_STATE = {
    'activeAssetId': 0,
    'cuedAssetId': None,
    'lastUpdate': time.time(),
    'actionSource': 'boot'
}

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def scan_asset_list():
    assets_dir = os.path.join(DIRECTORY, 'assets')
    valid_exts = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}
    files = sorted([f for f in os.listdir(assets_dir) if os.path.splitext(f)[1].lower() in valid_exts and f != 'manifest.json'])

    totems = {
        'wheel', 'beauty', 'diya', 'diya 2', 'jalebi', 'tubes', 'paper', 'truck art', 
        'mandala', 'rangoli 1', 'rangoli 2', 'rangoli 3', 'spacey', 'supernova', 'amul', 
        'peacock', 'lady', 'red eye', 'blackhole',
        # Newly added & user adjusted:
        'cds', 'beyblade', 'blue rangoli', 'camlin', 
        'candy rangoli', 'choli ke peeche', 'cosmic oval', 'dabba', 'fire', 
        'genda phool', 'kites', 'rainbow rangoli', 'ribbon whistle', 'turban', 
        'vintage reel', 'x ray rangoli',
        # Switched to totem per user request:
        'aasa kooda', 'beach and water', 'god in you', 'stickers', 'water'
    }

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
        # New additions
        'cds': 'CDs',
        'aasa kooda': 'Aasa Kooda',
        'beyblade': 'Beyblade',
        'blue night': 'Blue Night',
        'blue oilspill': 'Blue Oilspill',
        'blue optic': 'Blue Optic',
        'blue rangoli': 'Blue Rangoli',
        'candy rangoli': 'Candy Rangoli',
        'rainbow rangoli': 'Rainbow Rangoli',
        'x ray rangoli': 'X-Ray Rangoli',
        'genda phool': 'Genda Phool',
        'choli ke peeche': 'Choli Ke Peeche',
        'cosmic oval': 'Cosmic Oval',
        'god in you': 'God In You',
        'diwali street art': 'Diwali Street Art',
        'physics fire': 'Physics Fire',
        'ribbon whistle': 'Ribbon Whistle',
        'vintage reel': 'Vintage Reel',
        'beach and water': 'Beach & Water',
    }

    def clean_name(fn):
        base = os.path.splitext(fn)[0]
        for k, v in friendly.items():
            if k.lower() == base.lower():
                return v
        return ' '.join(w.capitalize() for w in base.split(' '))

    def get_framing(fn):
        base = os.path.splitext(fn)[0].lower()
        return 'totem' if base in totems else 'world'

    asset_list = []
    # 1. Main Performance Asset Library (Abstract Totems & Worlds)
    for idx, fn in enumerate(files):
        quoted = urllib.parse.quote(fn)
        asset_list.append({
            'id': idx,
            'name': clean_name(fn),
            'filename': fn,
            'path': f'assets/{quoted}',
            'framing': get_framing(fn),
            'collection': 'main'
        })

    # 2. Curated Story Deck: Kabir's Universe (Chronological Narrative Sequence)
    kabir_dir = os.path.join(assets_dir, "Kabir's universe")
    kabir_order = [
        ('kabir - early morning.jpg', 'Early Morning', 1),
        ('kabir - balcony.jpg', 'Balcony', 2),
        ('kabir - kitchen.jpg', 'Kitchen', 3),
        ('kabir - pooja.jpg', 'Pooja', 4),
        ('kabir - shopping.jpg', 'Shopping', 5),
        ('aisha - getting ready.jpg', 'Aisha - Getting Ready', 6),
        ('kabir - rangoli making.jpg', 'Rangoli Making', 7),
        ('kabir - outdoors.jpg', 'Outdoors', 8),
        ('kabir - with the case.jpg', 'With The Case', 9),
        ('kabir - technician.jpg', 'Technician', 10),
        ('kabir - light setup.jpg', 'Light Setup', 11),
        ('kabir - performing.jpg', 'Performing', 12),
        ('kabir - clocking out.jpg', 'Clocking Out', 13),
        ('kabir - playing cards.jpg', 'Playing Cards', 14),
        ('kabir - morning after.jpg', 'Morning After', 15),
        ('Kabir - poster.jpg', 'Kabir - The Poster', 16),
    ]

    if os.path.exists(kabir_dir):
        for fn, title, ch in kabir_order:
            fp = os.path.join(kabir_dir, fn)
            if os.path.exists(fp):
                quoted = urllib.parse.quote(f"Kabir's universe/{fn}")
                next_id = len(asset_list)
                asset_list.append({
                    'id': next_id,
                    'name': f"Kabir: {title}",
                    'filename': f"Kabir's universe/{fn}",
                    'path': f"assets/{quoted}",
                    'framing': 'world',
                    'collection': 'kabir',
                    'chapter': ch,
                    'scene': title
                })

    # Also keep assets/manifest.json up-to-date as a static fallback
    manifest_path = os.path.join(assets_dir, 'manifest.json')
    try:
        with open(manifest_path, 'w', encoding='utf-8') as mf:
            json.dump(asset_list, mf, indent=2)
    except Exception:
        pass

    return asset_list

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

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        if self.path.startswith('/api/assets') or self.path.startswith('/api/state'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        # Shorthand redirect: /remote or /remote/ -> /remote.html
        clean_path = self.path.split('?')[0].rstrip('/')
        if clean_path == '/remote':
            self.send_response(302)
            self.send_header('Location', '/remote.html')
            self.end_headers()
            return

        # Engine Telemetry & Active/Cued Asset State API
        if self.path.startswith('/api/state'):
            assets = scan_asset_list()
            ENGINE_STATE['assetCount'] = len(assets)
            ENGINE_STATE['serverIp'] = get_local_ip()
            payload = json.dumps(ENGINE_STATE).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # Dynamic Asset Auto-Discovery API: scans assets/ folder on disk in real-time
        if self.path.startswith('/api/assets'):
            try:
                asset_list = scan_asset_list()
                main_count = len([a for a in asset_list if a.get('collection') == 'main'])
                payload = json.dumps({'count': len(asset_list), 'mainCount': main_count, 'assets': asset_list}).encode('utf-8')
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

    def do_POST(self):
        # Remote Cueing & Hot-Switch API
        if self.path.startswith('/api/action'):
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body) if body else {}

                action = data.get('action')
                target_id = data.get('id')
                source = data.get('source', 'remote')

                if action == 'select_asset' and target_id is not None:
                    ENGINE_STATE['activeAssetId'] = target_id
                    ENGINE_STATE['cuedAssetId'] = None
                    ENGINE_STATE['lastUpdate'] = time.time()
                    ENGINE_STATE['actionSource'] = source
                elif action == 'cue_asset' and target_id is not None:
                    ENGINE_STATE['cuedAssetId'] = target_id
                    ENGINE_STATE['lastUpdate'] = time.time()
                    ENGINE_STATE['actionSource'] = source
                elif action == 'commit_cued':
                    if ENGINE_STATE['cuedAssetId'] is not None:
                        ENGINE_STATE['activeAssetId'] = ENGINE_STATE['cuedAssetId']
                        ENGINE_STATE['cuedAssetId'] = None
                        ENGINE_STATE['lastUpdate'] = time.time()
                        ENGINE_STATE['actionSource'] = source
                elif action == 'clear_cue':
                    ENGINE_STATE['cuedAssetId'] = None
                    ENGINE_STATE['lastUpdate'] = time.time()
                    ENGINE_STATE['actionSource'] = source

                response_data = {
                    'ok': True,
                    'state': ENGINE_STATE
                }
                payload = json.dumps(response_data).encode('utf-8')
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

        self.send_response(404)
        self.end_headers()

    def guess_type(self, path):
        # Enforce proper MIME types for ES module scripts and audio/json files
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
    local_ip = get_local_ip()
    try:
        with http.server.ThreadingHTTPServer(("", PORT), EngineHTTPRequestHandler) as httpd:
            print("=" * 68)
            print("   DJ PERFORMANCE ENGINE - OBS STUDIO BROWSERSOURCE SERVER")
            print("=" * 68)
            print(f"  > Engine URL (OBS/Local):  http://localhost:{PORT}")
            print(f"  > Mobile Companion Deck:   http://{local_ip}:{PORT}/remote.html")
            print(f"  > Asset Discovery API:     http://localhost:{PORT}/api/assets")
            print(f"  > Engine State API:        http://localhost:{PORT}/api/state")
            print(f"  > Local Directory:         {DIRECTORY}")
            print("=" * 68)
            print("  Server is running with Dynamic Asset Discovery & Remote Cueing.")
            print("  Connect phone/tablet on same Wi-Fi to use the Companion Deck!")
            print("=" * 68)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Engine Server] Stopped gracefully.")
    except Exception as e:
        print(f"\n[Engine Server Error] {e}")

if __name__ == '__main__':
    main()
