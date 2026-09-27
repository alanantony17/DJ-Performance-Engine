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

  // Asset Pipeline
  assets: {
    list: [
      { id: 0, name: 'Wheel', path: 'assets/wheel.png' },
      { id: 1, name: 'Beauty', path: 'assets/beauty.png' },
      { id: 2, name: 'Diya', path: 'assets/diya.png' },
      { id: 3, name: 'Jalebi', path: 'assets/Jalebi.png' },
      { id: 4, name: 'Taj Mahal', path: 'assets/taj%20mahal.png' },
      { id: 5, name: 'Truck Art', path: 'assets/truck%20art.png' },
    ],
    previewDurationMs: 2500, // On-screen preview display duration when asset is switched
  },

  // AKAI MPK Mini 3 Hardware Mappings
  midi: {
    // Joystick Controls
    joystick: {
      // Horizontal Pan: default listens to Pitch Bend (0xE0) or fallback CC 16
      panPitchBend: true,
      panCC: 16,
      panDefault: 0.5, // Center (0.0 = Left, 1.0 = Right)

      // Vertical Iris/Aperture: CC 1 (Modulation Wheel)
      apertureCC: 1,
      apertureMin: 0.03, // Razor-thin laser slit
      apertureMax: 1.0,  // Full 180-degree room wash
      apertureDefault: 0.35,
    },

    // Rotary Knobs (CC 70 - 73 on MPK Mini 3 Prog 1)
    knobs: {
      knob1: { cc: 70, name: 'Strobe LFO Rate', min: 2.0, max: 50.0, default: 8.0 },   // 2Hz - 50Hz
      knob2: { cc: 71, name: 'Hydra Color/Hue', min: 0.0, max: 1.0, default: 0.0 },     // 0.0 - 1.0
      knob3: { cc: 72, name: 'Feedback Decay', min: 0.0, max: 0.98, default: 0.5 },     // 0.0 - 0.98
      knob4: { cc: 73, name: 'Audio Sensitivity', min: 0.2, max: 3.5, default: 1.5 },   // Multiplier
    },

    // Performance Pads (Prog 1 Note On / Off or CC mode fallback)
    pads: {
      // Pad 1: Accelerating Snare Riser Strobe
      pad1: {
        notes: [36, 48], // C1 or C2
        cc: 20,
        name: 'Snare Riser Strobe',
        type: 'riser',
      },
      // Pad 2: Horizontal Shutter Blinder
      pad2: {
        notes: [37, 49], // C#1 or C#2
        cc: 21,
        name: 'Horizontal Shutter Blinder',
        type: 'shutter',
      },
      // Pad 3: Cycle Artwork Asset
      pad3: {
        notes: [38, 50], // D1 or D2
        cc: 22,
        name: 'Cycle Artwork Asset',
        type: 'asset_cycle',
      },
      // Pad 4: DROP SLAM (Sample-accurate Blackout)
      pad4: {
        notes: [39, 51], // D#1 or D#2
        cc: 23,
        name: 'DROP SLAM Blackout',
        type: 'drop_slam',
      },
      // Pad 5: Cycle Visual Style
      pad5: {
        notes: [40, 52], // E1 or E2
        cc: 24,
        name: 'Cycle Visual Style',
        type: 'style_cycle',
      },
    },

    // Fallback Keyboard Shortcuts for Headless / Offline Testing
    keyboardFallback: {
      pad1: 'Digit1',
      pad2: 'Digit2',
      pad3: 'Digit3',
      pad4: 'Digit4',
      pad5: 'Digit5',
      cycleStyleKey: 'KeyV',
      toggleHud: 'KeyD',
      resetPan: 'KeyC',
    },
  },

  // Visual Styles Matrix (Toggled via Pad 5 / Key 5 / V)
  visualStyles: [
    { id: 0, name: 'Raw Asset (As-Is)', desc: '100% untouched raw artwork, zero transformations', mode: 'raw' },
    { id: 1, name: 'Pure Axis Spin', desc: 'Full artwork turning cleanly on its central axis to BPM', mode: 'pure' },
    { id: 2, name: 'Hypnotic Vortex', desc: '8-petal sacred mandala symmetry with liquid ripples', mode: 'vortex' },
    { id: 3, name: 'Flower of Life', desc: '6-petal hexagonal sacred geometry', mode: 'flower' },
    { id: 4, name: 'Psychedelic Warp', desc: 'Deep liquid feedback warping & infinite tunnel', mode: 'warp' },
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

    // Dynamic Contrast & High-Energy Section / Drop Tuning
    dynamics: {
      powerGamma: 2.4,          // Non-linear power expansion: squashes soft verse bass, boosts drop peaks
      dropBoostMultiplier: 1.6, // Drop section amplifier
      longWindowFrames: 180,    // ~3-second rolling window for background energy baseline
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
