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
      { id: 0, name: 'Mandala Solar', path: 'assets/art1.png' },
      { id: 1, name: 'Flower of Life', path: 'assets/art2.png' },
      { id: 2, name: 'Hyper-Radial Ray', path: 'assets/art3.png' },
      { id: 3, name: 'Sacred Lattice', path: 'assets/art4.png' },
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
    },

    // Fallback Keyboard Shortcuts for Headless / Offline Testing
    keyboardFallback: {
      pad1: 'Digit1',
      pad2: 'Digit2',
      pad3: 'Digit3',
      pad4: 'Digit4',
      toggleHud: 'KeyD',
      resetPan: 'KeyC',
    },
  },

  // Web Audio Transient Detection
  audio: {
    fftSize: 512,
    smoothingTimeConstant: 0.75,
    minDecibels: -85,
    maxDecibels: -10,

    // Band 0: Sub-bass & Kick (approx 20 - 120 Hz)
    kick: {
      minBin: 0,
      maxBin: 3,
      threshold: 0.45,
      decay: 0.88, // Exponential falloff per frame
    },

    // Band 1: Mid-High Claps & Hats (approx 2000 - 6000 Hz)
    clap: {
      minBin: 23,
      maxBin: 70,
      threshold: 0.35,
      decay: 0.85,
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
