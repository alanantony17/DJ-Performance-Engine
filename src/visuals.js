/**
 * DJ Performance Engine - Hydra Synth WebGL Visual Pipeline
 * "Hypnotic Vortex": Fluid 8-petal mandala symmetry with BPM-synced continuous rotation,
 * center-outward liquid ripple breathing, and infinite feedback zoom.
 */

import { CONFIG } from './config.js';

export class VisualPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.hydra = null;
    this.preloadedImages = [];
    this.currentAssetIndex = 0;

    // Timing and smooth rotation state
    this.lastTime = performance.now();
    this.rotationAngle = 0.0;

    // Shared references to state updated every frame
    this.midiValues = {
      hydraHue: CONFIG.midi.knobs.knob2.default,
      hydraFeedback: CONFIG.midi.knobs.knob3.default,
      audioSensitivity: CONFIG.midi.knobs.knob4.default,
      padSlam: false,
    };

    this.audioValues = {
      kickLevel: 0.0,
      highLevel: 0.0,
      kickTrigger: false,
      bpm: 128.0,
      beatPhase: 0.0,
    };

    this.preloadAssets();
    this.initHydra();
  }

  preloadAssets() {
    this.preloadedImages = CONFIG.assets.list.map((asset) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = asset.path;
      return img;
    });
  }

  initHydra() {
    if (typeof Hydra === 'undefined') {
      console.error('[Visuals] Hydra Synth library not loaded from CDN.');
      return;
    }

    try {
      // Initialize Hydra on the bottom canvas without microphone auto-capture
      this.hydra = new Hydra({
        canvas: this.canvas,
        detectAudio: false,
        enableStreamCapture: false,
        width: CONFIG.display.width,
        height: CONFIG.display.height,
        precision: 'highp',
      });

      console.log('[Visuals] Hydra Synth initialized successfully.');

      // Load initial asset into source s0
      const initialAsset = CONFIG.assets.list[0].path;
      s0.initImage(initialAsset);

      // Build the Hypnotic Vortex generative GLSL patch
      this.buildPatch();
    } catch (err) {
      console.error('[Visuals] Failed to initialize Hydra Synth:', err);
    }
  }

  buildPatch() {
    // 1. Organic Breathing Scale: Smooth sine wave tracking the beat + punchy kick pump
    const getScale = () => {
      const breathe = Math.sin(this.audioValues.beatPhase * Math.PI * 2) * 0.06;
      const kickPunch = this.audioValues.kickLevel * 0.22 * (this.midiValues.audioSensitivity * 0.6);
      return 1.0 + breathe + kickPunch;
    };

    // 2. Center-Outward Liquid Ripple: Concentric waves radiating on bass
    const getRippleModulation = () => {
      return this.audioValues.kickLevel * 0.12 * (this.midiValues.audioSensitivity * 0.6);
    };

    // 3. Smooth Continuous BPM-Synced Rotation Angle
    const getRotation = () => {
      return this.rotationAngle;
    };

    // 4. Color & Hue Morph
    const getHueRotation = () => {
      return this.midiValues.hydraHue;
    };

    // 5. Infinite Feedback Zoom & Tunnel Trails
    const getFeedbackDecay = () => {
      return Math.min(0.96, Math.max(0.0, this.midiValues.hydraFeedback));
    };

    // 6. Blackout clamp for Pad 4 DROP SLAM
    const getBrightness = () => {
      if (this.midiValues.padSlam) {
        return -1.0; // Clamps WebGL output to complete pitch black
      }
      return 0.0;
    };

    // HYPNOTIC VORTEX GLSL PIPELINE:
    // 1. src(s0) -> Centered circular artwork
    // 2. .scale(getScale) -> Smooth organic breathing & bass pump
    // 3. .rotate(getRotation) -> Fluid BPM-synced continuous rotation
    // 4. .kaleid(8) -> Sacred 8-petal mandala symmetry (No 4-quadrant split!)
    // 5. .modulateScale(osc(...).kaleid(8), ...) -> Liquid concentric ripples expanding from center
    // 6. .hue() & .color() -> Knob 2 color palette morph
    // 7. .blend(o0, getFeedbackDecay) -> Knob 3 infinite zoom tunnel
    // 8. .brightness(getBrightness) -> Pad 4 sample-accurate DROP SLAM
    src(s0)
      .scale(getScale)
      .rotate(getRotation)
      .kaleid(8)
      .modulateScale(osc(6, 0.08, 0).kaleid(8), getRippleModulation)
      .hue(getHueRotation)
      .color(
        () => 0.85 + 0.25 * Math.sin(this.midiValues.hydraHue * Math.PI * 2),
        () => 0.85 + 0.25 * Math.cos(this.midiValues.hydraHue * Math.PI * 2),
        () => 0.95
      )
      .blend(o0, getFeedbackDecay)
      .brightness(getBrightness)
      .out(o0);

    console.log('[Visuals] Hypnotic Vortex 8-petal generative patch mounted.');
  }

  setAsset(index) {
    if (index < 0 || index >= CONFIG.assets.list.length) return;
    this.currentAssetIndex = index;
    const asset = CONFIG.assets.list[index];

    if (typeof s0 !== 'undefined' && s0.initImage) {
      s0.initImage(asset.path);
      console.log(`[Visuals] Ingested asset texture into s0: ${asset.name} (${asset.path})`);
    }
  }

  update(midiComputed, audioState) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Keep dynamic values updated for Hydra parameter closures
    this.midiValues.hydraHue = midiComputed.hydraHue;
    this.midiValues.hydraFeedback = midiComputed.hydraFeedback;
    this.midiValues.audioSensitivity = midiComputed.audioSensitivity;
    this.midiValues.padSlam = midiComputed.padSlam;

    if (audioState) {
      this.audioValues.kickLevel = audioState.kickLevel;
      this.audioValues.highLevel = audioState.highLevel;
      this.audioValues.kickTrigger = audioState.kickTrigger;
      this.audioValues.bpm = audioState.bpm || 128.0;
      this.audioValues.beatPhase = audioState.beatPhase || 0.0;

      // Advance rotation angle smoothly locked to BPM
      // 1 full revolution every 8 beats:
      const beatsPerSec = this.audioValues.bpm / 60;
      const rotSpeed = (beatsPerSec / 8) * (2 * Math.PI); // rad/sec
      // Slight groove spin impulse on kick hits
      const kickSpin = this.audioValues.kickTrigger ? 0.025 : 0.0;
      this.rotationAngle = (this.rotationAngle + rotSpeed * dt + kickSpin) % (2 * Math.PI);
    }
  }
}
