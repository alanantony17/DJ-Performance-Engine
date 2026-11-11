#!/usr/bin/env python3
"""
DJ Performance Engine - Local Development & OBS Browser Source Server
Serves the engine on http://localhost:8000 with CORS headers, proper MIME types,
dynamic Asset Discovery API (/api/assets), Multi-Crate Party Architecture,
and Mobile Cue Deck synchronization.
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
import time
import socket
import threading
import queue

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Global engine state shared in real-time with remote controller
ENGINE_STATE = {
    'activeAssetId': 0,
    'cuedAssetId': None,
    'activeCrate': 'halloween',
    'lastUpdate': time.time(),
    'actionSource': 'boot',
    'health': None,
    'pendingCommand': None,
    'liveControls': {
        'audioSensitivity': 1.5,
        'blackout': False,
        'buildupState': 'idle',
        'buildupBars': 4,
        'buildupProgress': 0.0,
        'cleanProjection': False,
        'bpmPulse': False,
        'bpm': 128.0,
        'waveSpread': 2.5,
        'presetIndex': 0,
        'presetName': 'Beat-Synced Liquid Ripple',
    },
}
_COMMAND_SEQ = 0

# Real-Time SSE Broadcaster & Asset Cache for Sub-10ms Wi-Fi Response
SSE_CLIENTS = []
SSE_LOCK = threading.Lock()

_ASSET_CACHE = {
    'assets': None,
    'crates': None,
    'last_scan': 0,
    'last_manifest_sig': None,
}
_IP_CACHE = {'ip': None, 'ts': 0}

def broadcast_sse(event_data):
    with SSE_LOCK:
        for q in list(SSE_CLIENTS):
            try:
                q.put_nowait(event_data)
            except Exception:
                pass

def get_local_ip():
    now = time.time()
    if _IP_CACHE['ip'] and (now - _IP_CACHE['ts'] < 30.0):
        return _IP_CACHE['ip']
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        _IP_CACHE['ip'] = ip
        _IP_CACHE['ts'] = now
        return ip
    except Exception:
        return _IP_CACHE['ip'] or "127.0.0.1"

def generate_qr_svg(text, border=2):
    """Pure-Python ISO/IEC 18004 QR Code SVG generator (Byte mode, ECC Level L, Versions 1..5)."""
    data = text.encode('utf-8')
    versions = [
        (1, 19, 7, 21, []),
        (2, 34, 10, 25, [6, 18]),
        (3, 55, 15, 29, [6, 22]),
        (4, 80, 20, 33, [6, 26]),
        (5, 108, 26, 37, [6, 30]),
    ]
    ver, data_cw, ec_cw, size, align = versions[-1]
    for v in versions:
        if len(data) + 2 <= v[1]:
            ver, data_cw, ec_cw, size, align = v
            break

    bits = [0, 1, 0, 0]
    for i in range(7, -1, -1):
        bits.append((len(data) >> i) & 1)
    for b in data:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    for _ in range(min(4, data_cw * 8 - len(bits))):
        bits.append(0)
    while len(bits) % 8 != 0:
        bits.append(0)
    pad = [0xEC, 0x11]
    p_idx = 0
    while len(bits) < data_cw * 8:
        b = pad[p_idx % 2]
        p_idx += 1
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)

    codewords = [int(''.join(map(str, bits[i:i+8])), 2) for i in range(0, len(bits), 8)]

    exp = [0] * 512
    log = [0] * 256
    x = 1
    for i in range(255):
        exp[i] = x
        log[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        exp[i] = exp[i - 255]

    def gf_mul(a, b):
        return 0 if (a == 0 or b == 0) else exp[log[a] + log[b]]

    gen = [1]
    for i in range(ec_cw):
        nxt = [0] * (len(gen) + 1)
        for j, g in enumerate(gen):
            nxt[j] ^= g
            nxt[j + 1] ^= gf_mul(g, exp[i])
        gen = nxt

    msg = list(codewords) + [0] * ec_cw
    for i in range(len(codewords)):
        coef = msg[i]
        if coef != 0:
            for j in range(1, len(gen)):
                msg[i + j] ^= gf_mul(gen[j], coef)
    all_cw = codewords + msg[len(codewords):]
    all_bits = []
    for cw in all_cw:
        for i in range(7, -1, -1):
            all_bits.append((cw >> i) & 1)

    grid = [[0] * size for _ in range(size)]
    is_func = [[False] * size for _ in range(size)]

    def set_func(r, c, val):
        if 0 <= r < size and 0 <= c < size:
            grid[r][c] = 1 if val else 0
            is_func[r][c] = True

    def place_finder(tr, tc):
        for r in range(-1, 8):
            for c in range(-1, 8):
                if 0 <= tr + r < size and 0 <= tc + c < size:
                    in_outer = (0 <= r <= 6 and (c in (0, 6) or r in (0, 6)))
                    in_inner = (2 <= r <= 4 and 2 <= c <= 4)
                    set_func(tr + r, tc + c, in_outer or in_inner)

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    for i in range(8, size - 8):
        set_func(6, i, i % 2 == 0)
        set_func(i, 6, i % 2 == 0)

    for ar in align:
        for ac in align:
            if (ar < 9 and ac < 9) or (ar < 9 and ac > size - 10) or (ar > size - 10 and ac < 9):
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    val = (abs(dr) == 2 or abs(dc) == 2 or (dr == 0 and dc == 0))
                    set_func(ar + dr, ac + dc, val)

    for i in range(9):
        if not is_func[8][i]: set_func(8, i, False)
        if not is_func[i][8]: set_func(i, 8, False)
    for i in range(8):
        if not is_func[8][size - 1 - i]: set_func(8, size - 1 - i, False)
        if not is_func[size - 1 - i][8]: set_func(size - 1 - i, 8, False)
    set_func(size - 8, 8, True)

    bit_idx = 0
    up = True
    col = size - 1
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for dc in (0, -1):
                c = col + dc
                if not is_func[r][c]:
                    b = all_bits[bit_idx] if bit_idx < len(all_bits) else 0
                    bit_idx += 1
                    if (r + c) % 2 == 0:
                        b ^= 1
                    grid[r][c] = b
        up = not up
        col -= 2

    # Format info for ECC Level L (01) + Mask 0 (000) -> 0x77C4
    fmt = 0x77C4
    fmt_bits = [(fmt >> i) & 1 for i in range(15)]
    tl_coords = [(8,0),(8,1),(8,2),(8,3),(8,4),(8,5),(8,7),(8,8),(7,8),(5,8),(4,8),(3,8),(2,8),(1,8),(0,8)]
    for i, (r, c) in enumerate(tl_coords):
        grid[r][c] = fmt_bits[14 - i]
    for i in range(7):
        grid[size - 1 - i][8] = fmt_bits[14 - i]
    for i in range(8):
        grid[8][size - 8 + i] = fmt_bits[7 - i]

    total = size + border * 2
    rects = []
    for r in range(size):
        for c in range(size):
            if grid[r][c]:
                rects.append(f'<rect x="{c + border}" y="{r + border}" width="1" height="1"/>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" shape-rendering="crispEdges">'
        f'<rect width="{total}" height="{total}" rx="1.5" fill="#ffffff"/>'
        f'<g fill="#000000">{"".join(rects)}</g></svg>'
    )

# Curated Totem / Radial Portal allocations (circular/centered subjects)
halloween_totems = {
    'cute ghostss', 'black catss', 'frankenstein', 'ghost in sheets',
    'mask', 'purple eyes', 'skull box', 'vampire logo', 'witches cauldron', 'yellow bats',
    'airlock', 'nightcity', 'nukes', 'pumpkin shadow', 'submarine',
    'djjaib', 'djjaiB', 'djjai b', 'djkallum', 'djoat', 'zene.wav',
    'squid game ominous',
    'pickle rick',
    'ahp logo'
}

# User framing overrides for Halloween crate
halloween_overrides = {
    'airlock': 'totem',
    'nightcity': 'totem',
    'nukes': 'totem',
    'pumpkin shadow': 'totem',
    'submarine': 'totem',
    'button mummys': 'world',
    'kitchen knife': 'world',
    'djjaib': 'totem',
    'djjaiB': 'totem',
    'djjai b': 'totem',
    'djkallum': 'totem',
    'djoat': 'totem',
    'zene.wav': 'totem',
    'squid game ominous': 'totem',
    'pickle rick': 'totem',
    'ahp logo': 'totem'
}

standard_totems = {
    'wheel', 'beauty', 'diya', 'diya 2', 'jalebi', 'tubes', 'paper', 'truck art', 
    'mandala', 'rangoli 1', 'rangoli 2', 'rangoli 3', 'spacey', 'supernova', 'amul', 
    'peacock', 'lady', 'red eye', 'blackhole',
    'cds', 'beyblade', 'blue rangoli', 'camlin', 
    'candy rangoli', 'choli ke peeche', 'cosmic oval', 'dabba', 'fire', 
    'genda phool', 'kites', 'rainbow rangoli', 'ribbon whistle', 'turban', 
    'vintage reel', 'x ray rangoli',
    'aasa kooda', 'beach and water', 'god in you', 'stickers', 'water',
    # Switched to totem per user request:
    'airlock', 'nightcity', 'nukes', 'pumpkin shadow', 'submarine',
    'djjaib', 'djjaiB', 'djjai b', 'djkallum', 'djoat', 'zene.wav',
    'pickle rick',
    'ahp logo'
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
    # Halloween friendly titles
    'cute ghostss': 'Cute Ghosts',
    'black catss': 'Black Cats',
    'button mummys': 'Button Mummies',
    'frankenstein': 'Frankenstein',
    'ghost in sheets': 'Ghost In Sheets',
    'kitchen knife': 'Kitchen Knife',
    'mask': 'Horror Mask',
    'purple eyes': 'Purple Eyes',
    'skull box': 'Skull Box',
    'vampire logo': 'Vampire Logo',
    'witches cauldron': 'Witches Cauldron',
    'yellow bats': 'Yellow Bats',
    'textile pumpkins': 'Textile Pumpkins',
    'airlock': 'Airlock',
    'blood mirror': 'Blood Mirror',
    'nightcity': 'Night City',
    'nukes': 'Apocalypse Nukes',
    'paper bats': 'Paper Bats',
    'pumpkin shadow': 'Pumpkin Shadow',
    'spooky arcade': 'Spooky Arcade',
    'spooky candy': 'Spooky Candy',
    'squid gamess': 'Squid Game',
    'squid games cute': 'Squid Games Cute',
    'squid game ominous': 'Squid Game Ominous',
    'submarine': 'Deep Submarine',
    'pickle rick': 'Pickle Rick',
    'ahp logo': 'AHP Logo',
    # Artist / DJ Lineup Assets
    'djjaib': 'DJ Jai B',
    'djjaiB': 'DJ Jai B',
    'djjai b': 'DJ Jai B',
    'djkallum': 'DJ Kallum',
    'djoat': 'DJ Oat',
    'zene.wav': 'DJ Zene',
}

def clean_name(fn):
    base = os.path.splitext(fn)[0]
    for k, v in friendly.items():
        if k.lower() == base.lower():
            return v
    return ' '.join(w.capitalize() for w in base.split(' '))

def scan_asset_list(force=False):
    now = time.time()
    if not force and _ASSET_CACHE['assets'] is not None and (now - _ASSET_CACHE['last_scan'] < 10.0):
        return _ASSET_CACHE['assets'], _ASSET_CACHE['crates']
    assets_dir = os.path.join(DIRECTORY, 'assets')
    valid_exts = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}

    # 4 Structured Event Performance Crates:
    # 1. Halloween: upcoming party crate (23 assets)
    # 2. Diwali: festive heritage crate (29 assets)
    # 3. Master Vault: comprehensive original collection (64 assets)
    # 4. Kabir's Universe: curated story deck (17 assets)
    crates_def = [
        {'id': 'halloween', 'name': 'Halloween', 'icon': '🎃', 'folder': 'Halloween', 'is_halloween': True, 'is_kabir': False},
        {'id': 'diwali', 'name': 'Diwali', 'icon': '🪔', 'folder': 'Diwali', 'is_halloween': False, 'is_kabir': False},
        {'id': 'master', 'name': 'Master Vault', 'icon': '📁', 'folder': 'Master', 'is_halloween': False, 'is_kabir': False},
        {'id': 'kabir', 'name': "Kabir's Universe", 'icon': '📖', 'folder': "Kabir's universe", 'is_halloween': False, 'is_kabir': True},
    ]

    kabir_scenes = {
        'kabir - early morning.jpg': ('Early Morning', 1),
        'kabir - balcony.jpg': ('Balcony', 2),
        'kabir - kitchen.jpg': ('Kitchen', 3),
        'kabir - pooja.jpg': ('Pooja', 4),
        'kabir - shopping.jpg': ('Shopping', 5),
        'aisha - getting ready.jpg': ('Aisha - Getting Ready', 6),
        'kabir - rangoli making.jpg': ('Rangoli Making', 7),
        'kabir - outdoors.jpg': ('Outdoors', 8),
        'kabir - with the case.jpg': ('With The Case', 9),
        'kabir - technician.jpg': ('Technician', 10),
        'kabir - light setup.jpg': ('Light Setup', 11),
        'kabir - performing.jpg': ('Performing', 12),
        'kabir - clocking out.jpg': ('Clocking Out', 13),
        'kabir - playing cards.jpg': ('Playing Cards', 14),
        'kabir - morning after.jpg': ('Morning After', 15),
        'Kabir - poster.jpg': ('Kabir - The Poster', 16),
    }

    asset_list = []
    crates_meta = []

    for c in crates_def:
        folder_full = os.path.join(assets_dir, c['folder'])
        if not os.path.exists(folder_full):
            crates_meta.append({
                'id': c['id'],
                'name': c['name'],
                'icon': c['icon'],
                'count': 0
            })
            continue

        files = sorted([f for f in os.listdir(folder_full) if os.path.splitext(f)[1].lower() in valid_exts and f != 'manifest.json'], key=lambda s: s.lower())
        crate_count = 0

        # For Halloween, pair Squid Game Ominous immediately followed by Squid Games Cute
        if c['is_halloween']:
            squid_ominous = None
            squid_cute = None
            for f in files:
                f_lower = f.lower()
                if 'squid' in f_lower and 'ominous' in f_lower:
                    squid_ominous = f
                elif 'squid' in f_lower and ('cute' in f_lower or 'gamess' in f_lower):
                    squid_cute = f
            if squid_ominous and squid_cute:
                files = [f for f in files if f != squid_ominous and f != squid_cute]
                insert_idx = len(files)
                for idx, f in enumerate(files):
                    if f.lower() > squid_ominous.lower():
                        insert_idx = idx
                        break
                files.insert(insert_idx, squid_ominous)
                files.insert(insert_idx + 1, squid_cute)

        if c['is_kabir']:
            seen_files = set()
            for fn, (title, ch) in kabir_scenes.items():
                match_fn = None
                for f in files:
                    if f.lower() == fn.lower():
                        match_fn = f
                        break
                if match_fn:
                    seen_files.add(match_fn)
                    next_id = len(asset_list)
                    quoted_rel = urllib.parse.quote(f"{c['folder']}/{match_fn}")
                    asset_list.append({
                        'id': next_id,
                        'name': f"Kabir: {title}",
                        'filename': f"{c['folder']}/{match_fn}",
                        'path': f"assets/{quoted_rel}",
                        'framing': 'world',
                        'crate': c['id'],
                        'crateName': c['name'],
                        'crateIcon': c['icon'],
                        'collection': 'kabir',
                        'chapter': ch,
                        'scene': title
                    })
                    crate_count += 1
            for f in files:
                if f not in seen_files:
                    next_id = len(asset_list)
                    quoted_rel = urllib.parse.quote(f"{c['folder']}/{f}")
                    asset_list.append({
                        'id': next_id,
                        'name': clean_name(f),
                        'filename': f"{c['folder']}/{f}",
                        'path': f"assets/{quoted_rel}",
                        'framing': 'world',
                        'crate': c['id'],
                        'crateName': c['name'],
                        'crateIcon': c['icon'],
                        'collection': 'kabir',
                        'chapter': crate_count + 1,
                        'scene': clean_name(f)
                    })
                    crate_count += 1
        else:
            for f in files:
                base_lower = os.path.splitext(f)[0].lower()
                if c['is_halloween'] and base_lower in halloween_overrides:
                    framing = halloween_overrides[base_lower]
                elif base_lower in halloween_totems or base_lower in standard_totems:
                    framing = 'totem'
                else:
                    framing = 'world'
                next_id = len(asset_list)
                quoted_rel = urllib.parse.quote(f"{c['folder']}/{f}")
                asset_list.append({
                    'id': next_id,
                    'name': clean_name(f),
                    'filename': f"{c['folder']}/{f}",
                    'path': f"assets/{quoted_rel}",
                    'framing': framing,
                    'crate': c['id'],
                    'crateName': c['name'],
                    'crateIcon': c['icon'],
                    'collection': 'main'
                })
                crate_count += 1

        crates_meta.append({
            'id': c['id'],
            'name': c['name'],
            'icon': c['icon'],
            'count': crate_count
        })

    _ASSET_CACHE['assets'] = asset_list
    _ASSET_CACHE['crates'] = crates_meta
    _ASSET_CACHE['last_scan'] = now

    # Only rewrite static manifest fallback when the asset list actually changes
    sig = (len(asset_list), asset_list[0]['path'] if asset_list else '', asset_list[-1]['path'] if asset_list else '')
    if _ASSET_CACHE.get('last_manifest_sig') != sig:
        _ASSET_CACHE['last_manifest_sig'] = sig
        manifest_path = os.path.join(assets_dir, 'manifest.json')
        try:
            with open(manifest_path, 'w', encoding='utf-8') as mf:
                json.dump(asset_list, mf, indent=2, ensure_ascii=False)
        except Exception:
            pass

    return asset_list, crates_meta

class EngineHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable Secure Context features, SharedArrayBuffer and cross-origin texture imports
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

        # High-Performance Asset Caching:
        # Cache 2MB+ image assets aggressively so phone & laptop never saturate Wi-Fi re-downloading them
        clean_p = self.path.split('?')[0]
        if clean_p.startswith('/assets/') and not clean_p.endswith('.json'):
            self.send_header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
        else:
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

        # 100% Offline QR Code SVG Endpoint (/api/qr.svg)
        if clean_path == '/api/qr.svg':
            parsed_q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            custom_url = parsed_q.get('url', [None])[0]
            target_url = custom_url or f"http://{get_local_ip()}:{PORT}/remote"
            svg_bytes = generate_qr_svg(target_url, border=2).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml; charset=utf-8')
            self.send_header('Content-Length', str(len(svg_bytes)))
            self.end_headers()
            self.wfile.write(svg_bytes)
            return

        # Real-Time Push Stream: Server-Sent Events (SSE) for Instant Wi-Fi Sync (<15ms)
        if self.path.startswith('/api/events'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            q = queue.Queue(maxsize=32)
            with SSE_LOCK:
                SSE_CLIENTS.append(q)

            try:
                # Immediate initial state push on connection
                init_msg = json.dumps({'action': 'sync', 'state': ENGINE_STATE, 'source': 'init'}, ensure_ascii=False)
                self.wfile.write(f"data: {init_msg}\n\n".encode('utf-8'))
                self.wfile.flush()

                while True:
                    try:
                        msg_data = q.get(timeout=15.0)
                        payload = json.dumps(msg_data, ensure_ascii=False)
                        self.wfile.write(f"data: {payload}\n\n".encode('utf-8'))
                        self.wfile.flush()
                    except queue.Empty:
                        # Keep-alive heartbeat ping
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, Exception):
                pass
            finally:
                with SSE_LOCK:
                    if q in SSE_CLIENTS:
                        SSE_CLIENTS.remove(q)
            return

        # Engine Telemetry & Active/Cued Asset State API
        if self.path.startswith('/api/state'):
            assets, crates_meta = scan_asset_list()
            ENGINE_STATE['assetCount'] = len(assets)
            ENGINE_STATE['serverIp'] = get_local_ip()
            ENGINE_STATE['crates'] = crates_meta
            ENGINE_STATE['serverTime'] = time.time()
            payload = json.dumps(ENGINE_STATE, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # Dynamic Asset Auto-Discovery API: scans crates on disk in real-time
        if self.path.startswith('/api/assets'):
            try:
                asset_list, crates_meta = scan_asset_list()
                active_crate = ENGINE_STATE.get('activeCrate', 'halloween')
                crate_assets = [a for a in asset_list if a.get('crate') == active_crate]
                resp = {
                    'count': len(asset_list),
                    'activeCrate': active_crate,
                    'crates': crates_meta,
                    'crateCount': len(crate_assets),
                    'mainCount': len(crate_assets),
                    'assets': asset_list
                }
                payload = json.dumps(resp, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                self.wfile.flush()
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
        t_entry = time.perf_counter()
        # Remote Cueing & Hot-Switch API
        if self.path.startswith('/api/action'):
            try:
                t_before_read = time.perf_counter()
                length = int(self.headers.get('Content-Length', 0))
                t_before_rfile = time.perf_counter()
                body = self.rfile.read(length).decode('utf-8')
                t_after_rfile = time.perf_counter()
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
                elif action == 'select_crate':
                    crate_id = data.get('crateId') or data.get('crate')
                    if crate_id:
                        ENGINE_STATE['activeCrate'] = crate_id
                        assets, _ = scan_asset_list()
                        crate_assets = [a for a in assets if a.get('crate') == crate_id]
                        if target_id is not None:
                            ENGINE_STATE['activeAssetId'] = target_id
                        elif crate_assets and not any(a['id'] == ENGINE_STATE['activeAssetId'] for a in crate_assets):
                            ENGINE_STATE['activeAssetId'] = crate_assets[0]['id']
                        ENGINE_STATE['cuedAssetId'] = None
                        ENGINE_STATE['lastUpdate'] = time.time()
                        ENGINE_STATE['actionSource'] = source
                elif action == 'heartbeat':
                    health = data.get('health')
                    if isinstance(health, dict):
                        health['serverReceivedAt'] = time.time()
                        ENGINE_STATE['health'] = health
                    live_ctrl = data.get('liveControls')
                    if isinstance(live_ctrl, dict):
                        ENGINE_STATE['liveControls'].update(live_ctrl)
                elif action == 'control':
                    global _COMMAND_SEQ
                    _COMMAND_SEQ += 1
                    cmd = data.get('cmd')
                    val = data.get('value')
                    lc = ENGINE_STATE['liveControls']
                    if cmd == 'set_sensitivity' and val is not None:
                        try:
                            lc['audioSensitivity'] = round(max(0.2, min(3.5, float(val))), 2)
                        except Exception:
                            pass
                    elif cmd == 'set_spread' and val is not None:
                        try:
                            lc['waveSpread'] = round(max(1.8, min(3.6, float(val))), 2)
                        except Exception:
                            pass
                    elif cmd == 'cycle_preset':
                        presets = [
                            'Beat-Synced Liquid Ripple',
                            'Kinetic Kick Shockwave',
                            'Melody Harmonic Waves',
                            'Snare & Kick Interlock'
                        ]
                        cur_idx = int(lc.get('presetIndex', 0))
                        next_idx = (cur_idx + 1) % len(presets)
                        lc['presetIndex'] = next_idx
                        lc['presetName'] = presets[next_idx]
                    elif cmd == 'set_preset' and val is not None:
                        presets = [
                            'Beat-Synced Liquid Ripple',
                            'Kinetic Kick Shockwave',
                            'Melody Harmonic Waves',
                            'Snare & Kick Interlock'
                        ]
                        try:
                            idx = int(val) % len(presets)
                            lc['presetIndex'] = idx
                            lc['presetName'] = presets[idx]
                        except Exception:
                            pass
                    elif cmd == 'blackout_toggle':
                        lc['blackout'] = bool(val) if val is not None else (not lc.get('blackout', False))
                    elif cmd == 'drop_slam':
                        lc['blackout'] = False
                        lc['buildupState'] = 'idle'
                        lc['buildupProgress'] = 0.0
                        if ENGINE_STATE['cuedAssetId'] is not None:
                            ENGINE_STATE['activeAssetId'] = ENGINE_STATE['cuedAssetId']
                            ENGINE_STATE['cuedAssetId'] = None
                    elif cmd == 'clean_projection_toggle':
                        lc['cleanProjection'] = bool(val) if val is not None else (not lc.get('cleanProjection', False))
                    elif cmd == 'bpm_pulse_toggle':
                        lc['bpmPulse'] = bool(val) if val is not None else (not lc.get('bpmPulse', False))
                    elif cmd == 'set_bpm' and val is not None:
                        try:
                            lc['bpm'] = round(max(60.0, min(200.0, float(val))), 1)
                        except Exception:
                            pass
                    elif cmd == 'nudge_bpm' and val is not None:
                        try:
                            cur_bpm = float(lc.get('bpm', 128.0))
                            lc['bpm'] = round(max(60.0, min(200.0, cur_bpm + float(val))), 1)
                        except Exception:
                            pass
                    elif cmd == 'tap_tempo':
                        if val is not None:
                            try:
                                lc['bpm'] = round(max(60.0, min(200.0, float(val))), 1)
                            except Exception:
                                pass
                    if isinstance(data.get('liveControls'), dict):
                        lc.update(data['liveControls'])
                    ENGINE_STATE['pendingCommand'] = {
                        'seq': _COMMAND_SEQ,
                        'action': 'control',
                        'cmd': cmd,
                        'value': val,
                        'time': time.time(),
                        'source': source,
                    }
                    ENGINE_STATE['lastUpdate'] = time.time()
                    ENGINE_STATE['actionSource'] = source
                elif action in ('reload_engine', 'rebuild_webgl', 'soft_reset'):
                    _COMMAND_SEQ += 1
                    if action == 'soft_reset':
                        ENGINE_STATE['liveControls']['blackout'] = False
                        ENGINE_STATE['liveControls']['buildupState'] = 'idle'
                        ENGINE_STATE['liveControls']['buildupProgress'] = 0.0
                    ENGINE_STATE['pendingCommand'] = {
                        'seq': _COMMAND_SEQ,
                        'action': action,
                        'time': time.time(),
                        'source': source,
                    }
                    ENGINE_STATE['lastUpdate'] = time.time()
                    ENGINE_STATE['actionSource'] = source

                # Broadcast immediately via SSE to all connected phones & laptops (< 5ms)
                # (Skip echoing routine engine telemetry heartbeats over SSE to avoid network/JSON churn)
                ENGINE_STATE['serverTime'] = time.time()
                if action != 'heartbeat':
                    broadcast_sse({
                        'action': action,
                        'cmd': data.get('cmd'),
                        'value': data.get('value'),
                        'id': target_id,
                        'crate': data.get('crateId') or data.get('crate'),
                        'source': source,
                        'state': ENGINE_STATE,
                        'time': time.time()
                    })

                response_data = {
                    'ok': True,
                    'state': ENGINE_STATE
                }
                payload = json.dumps(response_data, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                self.wfile.flush()
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
            print("  Server is running with Dynamic Multi-Crate Architecture & Remote Cueing.")
            print("  Connect phone/tablet on same Wi-Fi to use the Companion Deck!")
            print("=" * 68)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Engine Server] Stopped gracefully.")
    except Exception as e:
        print(f"\n[Engine Server Error] {e}")

if __name__ == '__main__':
    main()
