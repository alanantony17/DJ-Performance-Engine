# DJ Performance Engine - Scratchpad

> **Note for you:** This file is your zero-pressure playground. Write messy notes, half-thoughts, bug observations, or gig ideas here in any format. Don't worry about typos, grammar, or neatness—I will understand what you mean.

---

## 🧠 Active Architectural Challenges & Problem Solving

### 1. Stealth / Instant Asset Cueing (Eliminating On-Screen Step-Through)
- **The Core Problem:** Cycling through 40+ assets sequentially via Pad 3 forces the viewer/audience to watch dozens of unrelated pieces of art flash across the screen while the DJ searches for a specific visual. In a live projection or stream, this breaks immersion instantly.
- **Architectural Solutions to Explore:**
  1. **Companion Web Remote / Second-Screen Deck (`/remote.html` or `/controller.html`):**
     - Serve a dedicated mobile/tablet touch surface (or second monitor) on the local network (`http://localhost:8000/remote`).
     - Renders a clean visual grid of all asset thumbnails with metadata tags (e.g., *Totems*, *Cosmic*, *Liquid*, *Sacred*).
     - Tap any thumbnail to either:
       - **Instant Hot-Switch:** Immediately swaps the active texture on the main display.
       - **Cue / Arm for Next Drop:** Arms the asset silently in the background; swaps automatically on the next Pad 4 (DROP SLAM) or Beat 1 measure boundary!
     - Communicates with the main engine in real time via zero-latency `BroadcastChannel` (for multi-tab/same-machine OBS setups) or a lightweight WebSocket / Fetch endpoint in `serve.py`.
  2. **Blind Cueing / "Next Asset Arming" on the Hardware Controller:**
     - Turn Knob or Hold a modifier (e.g., Hold Pad B2 / Shift) to scroll through assets: the asset index changes *only* in the DJ's HUD or on a secondary monitor, NOT on the main canvas.
     - Tap Pad 3 to commit the cued asset on the exact beat phrase, or have it swap on the next drop.
  3. **Curated Setlist Banks / Direct Hotkeys:**
     - Keyboard number keys `0-9` (or numpad) map directly to a curated "Top 10" favorites bank for quick panic-free jumps.
     - MIDI Bank B combination keys: Bank B pads could select thematic groups (e.g., Pad B5 = Mandalas, B6 = Cosmic, B7 = Fluid, B8 = Abstract), followed by selecting 1 of 4 in that sub-bank.

---

### 2. Pure Projection / Stealth Mode (Zero Overlays, 100% Visuals)
- **The Core Problem:** Even when the diagnostic HUD is toggled off (`D`), pressing pads or changing settings still triggers floating preview cards (`#asset-preview-card`, `#style-preview-card`, `#buildup-preview-card`, `#framing-preview-card`, `#hue-preview-card`, `#drop-preview-card`), the `#drop-hint` banner, and the mouse cursor. For live stage projectors or clean OBS outputs, **zero text, toast banners, or UI artifacts must ever appear**.
- **Architectural Solutions to Explore:**
  1. **Master "Clean Projection" Toggle (`P` Key / URL Parameter `?projection=1` / `?clean=1`):**
     - Add a clean mode flag: `CONFIG.display.cleanProjectionMode`.
     - When active:
       - Adds a `.clean-projection` class to `<body>`.
       - Completely disables all preview card timeouts and forces `display: none !important;` on all overlay divs, badges, hints, and notification toasts.
       - Hides the mouse cursor globally (`cursor: none;`).
       - Auto-hides `#start-overlay` on boot if auto-engaged via MIDI.
  2. **Decoupled Dual-Window Architecture (The Touring Standard):**
     - **Window 1 (Projector / OBS Canvas):** `http://localhost:8000/?mode=projection` — Renders 100% pure WebGL canvas without a single DOM overlay or toast element attached to the viewport.
     - **Window 2 (DJ Laptop / Operator Cockpit):** `http://localhost:8000/?mode=cockpit` — Displays full real-time telemetry: live waveform FFT, BPM confidence, active asset preview, 16-pad state indicators, armed riser status, and touch/click controls.
     - Synchronized instantaneously via the browser's native `BroadcastChannel('dj_engine_sync')`.

---

### 3. Song-Dynamic & Melodic-Driven Risers (Beyond Fixed Math Clocks)
- **The Core Problem:** Pre-programmed mathematical risers (ramping strictly based on elapsed beats/time) feel uniform and repetitive across diverse tracks. Songs often have their own organic melodic build-ups (e.g., an ascending synth lead, an opening low-pass filter sweep, a vocal chant getting tighter, or a Shepard tone) that naturally drive crowd tension. The visual riser should listen to and ride those specific sonic cues in real time.
- **Architectural Solutions to Explore:**
  1. **Melodic Lead & Harmonic Energy Tracking:**
     - **Spectral Centroid / Filter Sweep Tracker:** Detects when a track's high-cut filter is opening up by measuring the center of spectral mass across the FFT. As the synth gets brighter, the visual radial streak and optical high-pass wireframe bloom expand in direct proportion to the filter frequency.
     - **Mid-High Lead Band (250Hz - 4kHz) Envelope Follower:** Isolates the lead synth/melody energy (ignoring kick/sub during breakdowns where drums drop out). Rhythmic synth stabs or arpeggios cause the strobe duty cycle and chromatic dispersion to pulse in lockstep with the actual notes played.
     - **Spectral Flux / Transient Density:** Measures the rate of harmonic change. If the producer doubles the melody's note rate or introduces microtonal pitch bends, the visual displacement ripples accelerate to match the musical phrasing rather than a generic linear timer.
  2. **Hybrid "Autopilot + Sonic Ride" Riser Sequencer:**
     - Instead of the riser progress being strictly `progress = elapsed / totalDuration`:
       - `Tension = (ClockProgress * 0.40) + (SpectralCentroid * 0.35) + (MelodyEnergy * 0.25)`
     - This guarantees the riser still reaches its target within 4 or 8 bars, but the *contour* of the build dynamically twists, breathes, surges, and holds with the musical narrative of that specific track.
  3. **Archetype-Specific Melodic Behaviors:**
     - **Hyperdrive Warp:** Radial zoom streak velocity and optical wireframe density modulate directly with high-frequency melodic peaks.
     - **Prism Overdrive:** RGB chromatic separation distance widens when high-register synth notes hit; scanline glitches sync to melodic transients.
     - **Thermal Supernova:** Solar corona boil rate and incandescent plasma temperature ignite whenever the full-spectrum RMS energy swells.
     - **Singularity Void:** Inverts energy—detects when the track strips away instruments leading up to the drop, sucking all color and particles inward as the audio gets quieter and more intimate, culminating in the pre-drop vacuum pocket.

---

## 🎯 Ready to Build (Curated)
<!-- Tasks ready to be turned into code -->
- [ ] **Song-Dynamic Riser Analysis:** Feed Spectral Centroid (filter cutoff sweep) and Mid-High Lead Synth FFT energy into `BuildupSequencer` so riser tension curves ride the song's actual melodic build.
- [ ] **Dual-Window Architecture:** Decoupled OBS Projector Window (`?mode=projection`) and Operator Cockpit (`?mode=cockpit`) synchronized via `BroadcastChannel`.

---

## ✅ Done
<!-- Completed features -->
- [x] **Kabir's Universe Dedicated Story Deck (`/remote.html`):** Ingested all 16 story chapters in chronological narrative sequence into a dedicated mobile story deck without diluting or disrupting the 69 main abstract assets. Pad 3 hardware cycling stays strictly locked to the main abstract library (0..68), while the phone remote features a dedicated [📖 KABIR'S UNIVERSE (16)] tab with chapter badges (CH 01..16) allowing the DJ to kick story beats live via TAKE or cue them for Pad 4 DROP SLAM on demand.
- [x] **Dynamic Optical Grating / Comb Shutter Engine (Pad 7 / Master Lens Shutter):** Replaces legacy temporal beat repeat with a master lens shutter rendering thick, razor-sharp black occlusion bars cutting through the entire projector light beam (artwork + stardust motes + fluid corona + laser rays). Features **true BPM tempo-synchronized motion** (grating speed accumulates with track BPM rather than rushing arbitrary seconds), **dual Tap-to-Lock & Hold-to-Punch interaction** on Pad 7 / Key `U` (quick tap locks on permanently, press-and-hold acts as a momentary performance punch releasing on finger lift), **permanent screen lock fix** (Linear Interlocking Comb Fingers mesh and stay locked on screen without vanishing), 4 curated progressive mechanics (Linear: Interlocking Comb Fingers; Radial: Clockwork Radar Spoke Spawn; Moiré: Two-Stage Layer Emergence; Sonic: Claustrophobic Choke & 2-Beat Diaphragm), analytic `fwidth()` anti-aliasing, and sample-accurate kill on Pad 4 (DROP SLAM).
- [x] **Asset Profiling & Dynamic Mobile Sync:** Re-classified 7 assets (Aasa Kooda, Aerogel, Beach & Water, Blue Night, God In You, Stickers, Water), added auto-detected Wi-Fi IP display (`/remote`) to HUD, `/remote` HTTP 302 redirect to `/remote.html`, and dynamic asset discovery polling so any newly added assets appear on the mobile companion deck within 450ms without restarting or refreshing.
- [x] **Master Clean Projection Mode (Key P / ?clean=1 / ?projection=1):** Universal stealth toggle that instantly suppresses 100% of DOM overlays, HUD telemetry, preview cards, toast banners, drop hints, audio pills, and hides the mouse cursor globally (cursor: none !important) for pristine stage projector and OBS outputs.
- [x] **ILDA Laser Vectorizer & Spatial Strobe Engine (Blaize 3 Laser Approach B):** Transforms organic artwork into razor-sharp incandescent xenon vector laser contours with saturated wavelength envelopes (532nm green, 488nm cyan, 638nm ruby red via Knob 2 or Riser Archetype), dissolving 96% of solid fills into pitch black. Emits dynamic rotating aerial prism blades (8-24 razor-thin laser sheets) and concentric warp tunnel cones modulated by the strobe pulse and Joystick pan/tilt. Features ruthless black floor clamping (< 0.040 crushed to #000000) eliminating projector gray box leakage, manual toggle key [X] / HUD button, and sample-accurate Pad 4 DROP SLAM blackout instant kill.
- [x] **Mobile / Tablet Asset Companion Deck (`/remote.html`):** Standalone booth-optimized touch deck with dual-deck cueing (LIVE green vs CUED amber), instant TAKE button, category filters (Totems, Cosmic, Fluid, 16:9), live search, screen WakeLock, PWA standalone meta tags, and automatic execution on Pad 4 DROP SLAM.
- [x] **Square Asset Immersion & Dual Framing Engine:** World-Field Mode (16:9 screen fill with aspect-corrected UV rotation & seamless mirrored wrap) + Radial Portal Mode (soft circular sacred totem mask for square assets) with live toggle key [M], dynamic asset classification, and 100% manual hardware controller retention.
- [x] **Hotcue Pad 7 (Temporal Beat-Repeat):** Quantized frame stutter & freeze (1/4, 1/8, 1/16, 1/32) replacing static slicer.
- [x] **Top Layer Master Optical Processor:** Screen-space Radial Zoom Blur (hyperdrive streak), Optical High-Pass Wireframe Extraction (stripping low-frequency solid fills to mirror an audio HPF), Retinal Phosphor Ghosting (negative complementary after-image on strobe off-cycle), and sample-accurate Pad 4 DROP SLAM Master Blackout Gate.
- [x] **Quantized Musical Subdivision Riser Engine:** Exact musical stepping (1/4 -> 1/8 -> 1/16 -> 1/32 -> 60Hz audio-rate flutter) locked to BPM, with distinct 4-Bar kinetic sprint and 8-Bar 3-Act theatrical narrative curves.
- [x] **100% Manual Climax Holding:** Climax arrival holds maximum tension indefinitely until the DJ hits Pad 4 (DROP SLAM) on Beat 1—no premature auto-cuts.
- [x] **4 World-Class Concert Riser Archetypes:** Hyperdrive Warp (Eric Prydz style radial laser streak & xenon wash), Singularity Void (Afterlife style event horizon collapse & obsidian silence), Prism Overdrive (Bicep Chroma style RGB channel tear & retinal inversion), and Thermal Supernova (Justice style molten to solar incandescence).
- [x] Invert kept on Bank A (Pad 8), Drop mode moved to Bank B (Pad B3)
- [x] HUD updated to render all 16 buttons with live telemetry and armed badges
- [x] Pad 4 (DROP SLAM) cancels any active slicer mask immediately
- [x] Riser / Buildup timing updated to 4-Bar (Pad 1 / Key 1) and 8-Bar (Pad 2 / Key 2) replacing old 16-bar length
- [x] Dual-Canvas Architecture (Three.js WebGL displacement + 2D strobe overlay)
- [x] AKAI MPK Mini 3 core mapping matrix established
- [x] Drag-and-drop texture loading with automatic memory disposal
