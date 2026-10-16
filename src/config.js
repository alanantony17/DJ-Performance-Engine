/**
 * DJ Performance Engine - Central Configuration
 * Single source of truth for MIDI assignments, audio thresholds, display, and assets.
 */

export const CONFIG = {
  // Display Target
  display: {
    width: 1920,
    height: 1080,
    targetFps: 60,
  },

  // Asset Pipeline (All 29 assets registered with clean URL encoding & framing category)
  assets: {
    list: [
      { id: 0, name: 'Wheel', path: 'assets/wheel.png', framing: 'totem' },
      { id: 1, name: 'Beauty', path: 'assets/beauty.png', framing: 'totem' },
      { id: 2, name: 'Diya', path: 'assets/diya.png', framing: 'totem' },
      { id: 3, name: 'Diya 2', path: 'assets/diya%202.png', framing: 'totem' },
      { id: 4, name: 'Jalebi', path: 'assets/Jalebi.png', framing: 'totem' },
      { id: 5, name: 'Taj Mahal', path: 'assets/taj%20mahal.png', framing: 'world' },
      { id: 6, name: 'Truck Art', path: 'assets/truck%20art.png', framing: 'totem' },
      { id: 7, name: 'Tiger Mandala', path: 'assets/mandala.jpg', framing: 'totem' },
      { id: 8, name: 'Rangoli 1', path: 'assets/rangoli%201.png', framing: 'totem' },
      { id: 9, name: 'Rangoli 2', path: 'assets/rangoli%202.png', framing: 'totem' },
      { id: 10, name: 'Rangoli 3', path: 'assets/rangoli%203.png', framing: 'totem' },
      { id: 11, name: 'Spacey', path: 'assets/spacey.png', framing: 'totem' },
      { id: 12, name: 'Supernova', path: 'assets/supernova.png', framing: 'totem' },
      { id: 13, name: 'Tubes', path: 'assets/tubes.png', framing: 'totem' },
      { id: 14, name: 'Solar Art 1', path: 'assets/art1.png', framing: 'world' },
      { id: 15, name: 'Solar Art 2', path: 'assets/art2.png', framing: 'world' },
      { id: 16, name: 'Solar Art 3', path: 'assets/art3.png', framing: 'world' },
      { id: 17, name: 'Solar Art 4', path: 'assets/art4.png', framing: 'world' },
      { id: 18, name: 'Amul Girl', path: 'assets/amul.png', framing: 'totem' },
      { id: 19, name: 'Peacock', path: 'assets/peacock.png', framing: 'totem' },
      { id: 20, name: 'Lady', path: 'assets/lady.png', framing: 'totem' },
      { id: 21, name: 'Red Eye', path: 'assets/red%20eye.png', framing: 'totem' },
      { id: 22, name: 'Blackhole', path: 'assets/blackhole.png', framing: 'totem' },
      { id: 23, name: 'Paper Art', path: 'assets/paper.png', framing: 'totem' },
      { id: 24, name: 'Fractal Network', path: 'assets/fractal%20network.png', framing: 'world' },
      { id: 25, name: 'Virus Crystals', path: 'assets/virus%20crystals.png', framing: 'world' },
      { id: 26, name: 'Skyline', path: 'assets/skyline.png', framing: 'world' },
      { id: 27, name: 'Comics', path: 'assets/comics.png', framing: 'world' },
      { id: 28, name: 'Slime', path: 'assets/slime.png', framing: 'world' },
    ],
    previewDurationMs: 2200,
  },

  // AKAI MPK Mini 3 Hardware Mappings
  midi: {
    // Joystick Controls
    joystick: {
      panPitchBend: true,
      panCC: 16,
      panDefault: 0.5,

      apertureCC: 1,
      apertureMin: 0.03,
      apertureMax: 1.0,
      apertureDefault: 0.5,
    },

    // Rotary Knobs (CC 70 - 74 on MPK Mini 3 Prog 1)
    knobs: {
      knob1: { cc: 70, name: 'Rotation Speed', min: 2.0, max: 50.0, default: 8.0 },
      knob2: { cc: 71, name: 'Palette Hue', min: 0.0, max: 1.0, default: 0.0 },
      knob3: { cc: 72, name: 'Wave Spread / Slicer Spacing', min: 1.8, max: 3.6, default: 2.5 },
      knob4: { cc: 73, name: 'Wave Depth / Sensitivity', min: 0.2, max: 3.5, default: 1.5 },
      knob5: { cc: 74, name: 'Drop Cadence Threshold', min: 0.05, max: 0.95, default: 0.50 },
    },

    // Dual-Bank 16-Pad Performance Matrix (AKAI MPK Mini 3 Prog 1)
    pads: {
      // BANK A: Live Action Hits
      pad1: { notes: [36], cc: 20, name: '4-Bar Buildup', type: 'buildup_4_toggle' },
      pad2: { notes: [37], cc: 21, name: '8-Bar Buildup', type: 'buildup_8_toggle' },
      pad3: { notes: [38], cc: 22, name: 'Cycle Artwork', type: 'asset_cycle' },
      pad4: { notes: [39], cc: 23, name: 'DROP SLAM Blackout', type: 'drop_slam' },
      pad5: { notes: [40], cc: 24, name: 'Cycle 3D Motion Preset', type: 'style_cycle' },
      pad6: { notes: [41], cc: 25, name: 'Toggle Auto-Hue Flow', type: 'hue_flow_toggle' },
      pad7: { notes: [42], cc: 26, name: 'Temporal Beat Repeat', type: 'beat_repeat_toggle' },
      pad8: { notes: [43], cc: 27, name: 'Negative X-Ray Flash', type: 'negative_toggle' },

      // BANK B: Arming & Configuration Matrix
      padB1: { notes: [44], cc: 28, name: 'Cycle Repeat Rate', type: 'repeat_rate_cycle' },
      padB2: { notes: [45], cc: 29, name: 'Cycle Framing Mode', type: 'framing_mode_cycle' },
      padB3: { notes: [46], cc: 30, name: 'Toggle Drop Mode', type: 'drop_toggle' },
      padB4: { notes: [47], cc: 31, name: 'DROP SLAM Blackout (Panic)', type: 'drop_slam' },
      padB5: { notes: [48], cc: 32, name: 'Arm Hyperdrive Warp', type: 'arm_riser_0' },
      padB6: { notes: [49], cc: 33, name: 'Arm Singularity Void', type: 'arm_riser_1' },
      padB7: { notes: [50], cc: 34, name: 'Arm Prism Overdrive', type: 'arm_riser_2' },
      padB8: { notes: [51], cc: 35, name: 'Arm Thermal Supernova', type: 'arm_riser_3' },
    },

    // Fallback Keyboard Shortcuts for Headless / Offline Testing
    keyboardFallback: {
      pad1: 'Digit1',
      pad2: 'Digit2',
      pad3: 'Digit3',
      pad4: 'Digit4',
      pad5: 'Digit5',
      pad6: 'Digit6',
      pad7: 'Digit7',
      pad8: 'Digit8',
      cycleStyleKey: 'KeyV',
      toggleDropKey: 'KeyB',
      toggleHud: 'KeyD',
      toggleSlicerKey: 'KeyP',
      toggleNegativeKey: 'KeyN',
      toggleFramingKey: 'KeyM',
      resetPan: 'KeyC',
      knob5Up: 'KeyT',
      knob5Down: 'KeyG',
      bpmDown: 'BracketLeft',
      bpmUp: 'BracketRight',
      tapTempo: 'Backslash',
    },
  },

  // One-Shot Buildup Sequencer Parameters & 4 World-Class Concert Riser Archetypes
  buildup: {
    defaultBpm: 128.0,
    startFreqHz: 4.0,
    maxFreqHz: 60.0,
    blinderStartProgress: 0.75, // Whiteout blinder begins ramping in the final 25% of build
    autoPreDropSilenceBeats: 0.0, // Handled 100% manually via Pad 4 DROP SLAM master cutoff
    archetypes: [
      { id: 0, name: 'Hyperdrive Warp', desc: 'Relativistic radial zoom streak, optical wireframe bloom, stadium xenon wash', color: '#38bdf8', mode: 'hyperdrive' },
      { id: 1, name: 'Singularity Void', desc: 'Monochrome drain, event horizon pinch, absolute obsidian pre-drop silence', color: '#a855f7', mode: 'singularity' },
      { id: 2, name: 'Prism Overdrive', desc: 'Subdivision RGB tear, retinal phosphor inversion, high-voltage CRT flash', color: '#ec4899', mode: 'prism' },
      { id: 3, name: 'Thermal Supernova', desc: 'Molten magma to radioactive plasma, boiling fluid over-exposure blinder', color: '#f97316', mode: 'supernova' },
    ],
  },

  // 3D Motion Presets Matrix (Toggled via Pad 5 / Key 5 / V)
  visualStyles: [
    { id: 0, name: 'Beat-Synced Liquid Ripple', desc: 'Kick waves out, snare ripples in, melody undulates in tempo', mode: 'ripple' },
    { id: 1, name: 'Kinetic Kick Shockwave', desc: 'Seismic wave rings bursting from center on kicks', mode: 'shockwave' },
    { id: 2, name: 'Melody Harmonic Waves', desc: 'Fluid standing ripples dancing to vocals and melody', mode: 'melody' },
    { id: 3, name: 'Snare & Kick Interlock', desc: 'Opposing drum waves colliding across the mandala', mode: 'interlock' },
  ],

  // Web Audio Transient Detection & Dynamics
  audio: {
    fftSize: 512,
    smoothingTimeConstant: 0.70,
    minDecibels: -90,
    maxDecibels: -25,

    // Band 0: Sub-bass & Kick (approx 35 - 300 Hz, bins 0 to 4)
    kick: {
      minBin: 0,
      maxBin: 4,
      threshold: 0.16,
      decay: 0.88, // Exponential falloff per frame
      cooldownMs: 220, // Transient onset cooldown to ensure crisp single-hit impulses
    },

    // Band 1: Mid-High Claps & Hats (approx 1700 - 6000 Hz, bins 18 to 65)
    clap: {
      minBin: 18,
      maxBin: 65,
      threshold: 0.15,
      decay: 0.88,
    },

    // 4-on-the-Floor Kick Cadence Tracker (House & Techno)
    cadence: {
      minIntervalMs: 340,   // ~176 BPM max tempo bound
      maxIntervalMs: 640,   // ~94 BPM min tempo bound
      defaultBpm: 128.0,
      jitterTolerance: 0.20, // Max inter-beat jitter for quantized 4/4 dance kicks
      cutoutMultiplier: 1.45,// Multiplier of beat interval before declaring kick cutout
    },

    // Dynamic Contrast & High-Energy Section / Drop Tuning
    dynamics: {
      powerGamma: 2.4,          // Non-linear power expansion: squashes soft verse bass, boosts drop peaks
      dropBoostMultiplier: 1.6, // Drop section amplifier
      longWindowFrames: 360,    // ~6-second rolling window for background energy baseline
      drop: {
        verseScaleMultiplier: 0.018, // Max +1.8% scale pump in verse/breakdown (barely noticeable)
        dropScaleMultiplier: 0.28,   // Up to +28% scale pump on kick hits during drop
        verseWaveMultiplier: 0.26,   // Calm, glassy 3D wave depth in verse
        dropWaveMultiplier: 1.95,    // Towering 3D wave canyons in drop
        camKickImpulse: 0.85,        // Dynamic camera Z recoil forward on drop kicks
        surgeVerse: 0.04,            // Gentle rotation kick surge in verse
        surgeDrop: 0.45,             // High-octane angular surge in drop
      },
    },
  },

  // Strobe & Lighting Engine Dynamics
  strobe: {
    riser: {
      startFreq: 4.0,   // Hz
      maxFreq: 60.0,    // Hz
      rampDurationSec: 3.5, // Time to reach max strobe fury
    },
    shutter: {
      barsCount: 12,
      cycleRateHz: 16.0,
    },
  },
};

/**
 * Dynamic Asset Discovery Engine:
 * Fetches the live list of all image assets from the backend server (/api/assets)
 * or static manifest fallback (assets/manifest.json).
 * Automatically updates CONFIG.assets.list so newly added files are picked up dynamically!
 */
export async function autoDiscoverAssets() {
  try {
    const res = await fetch('/api/assets?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.assets) && data.assets.length > 0) {
        CONFIG.assets.list = data.assets;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('engine:assetsDiscovered', { detail: { assets: data.assets } }));
        }
        console.log(`[AutoDiscover] Discovered ${data.assets.length} performance assets dynamically.`);
        return data.assets;
      }
    }
  } catch (err) {
    try {
      const mRes = await fetch('assets/manifest.json?t=' + Date.now());
      if (mRes.ok) {
        const mList = await mRes.json();
        if (Array.isArray(mList) && mList.length > 0) {
          CONFIG.assets.list = mList;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('engine:assetsDiscovered', { detail: { assets: mList } }));
          }
          console.log(`[AutoDiscover] Loaded ${mList.length} assets from manifest fallback.`);
          return mList;
        }
      }
    } catch (e2) {
      console.warn('[AutoDiscover] Using bundled asset list.');
    }
  }
  return CONFIG.assets.list;
}

// Auto-run on startup if running in browser
if (typeof window !== 'undefined') {
  autoDiscoverAssets();
}

