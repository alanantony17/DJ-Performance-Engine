/**
 * DJ Performance Engine - Hydra Synth WebGL Visual Pipeline
 * Ingests geometric mandala assets and modulates them via audio transients & AKAI MIDI knobs.
 */

import { CONFIG } from './config.js';

export class VisualPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.hydra = null;
    this.preloadedImages = [];
    this.currentAssetIndex = 0;

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

      // Build the generative GLSL patch
      this.buildPatch();
    } catch (err) {
      console.error('[Visuals] Failed to initialize Hydra Synth:', err);
    }
  }

  buildPatch() {
    // Reactive parameters evaluated dynamically by Hydra's render loop
    const getKaleidSymmetry = () => {
      const base = 4;
      const kickImpact = Math.floor(this.audioValues.kickLevel * 8);
      return Math.max(2, base + kickImpact);
    };

    const getBassModulation = () => {
      return this.audioValues.kickLevel * (this.midiValues.audioSensitivity * 0.22);
    };

    const getHueRotation = () => {
      return this.midiValues.hydraHue;
    };

    const getFeedbackDecay = () => {
      // Clamp decay so feedback doesn't permanently blow out
      return Math.min(0.96, Math.max(0.0, this.midiValues.hydraFeedback));
    };

    const getBrightness = () => {
      // Pad 4 DROP SLAM: -1.0 brightness forces pure black WebGL output
      if (this.midiValues.padSlam) {
        return -1.0;
      }
      return 0.0;
    };

    // Hydra GLSL Patch: Asset -> Kaleidoscope -> Bass Modulate -> Hue/Color Morph -> Feedback Loops -> Blackout clamp
    src(s0)
      .kaleid(getKaleidSymmetry)
      .modulate(o0, getBassModulation)
      .hue(getHueRotation)
      .color(
        () => 0.85 + 0.25 * Math.sin(this.midiValues.hydraHue * Math.PI * 2),
        () => 0.85 + 0.25 * Math.cos(this.midiValues.hydraHue * Math.PI * 2),
        () => 0.95
      )
      .blend(o0, getFeedbackDecay)
      .brightness(getBrightness)
      .out(o0);

    console.log('[Visuals] Hydra generative GLSL patch mounted.');
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
    // Keep dynamic values updated for Hydra parameter closures
    this.midiValues.hydraHue = midiComputed.hydraHue;
    this.midiValues.hydraFeedback = midiComputed.hydraFeedback;
    this.midiValues.audioSensitivity = midiComputed.audioSensitivity;
    this.midiValues.padSlam = midiComputed.padSlam;

    if (audioState) {
      this.audioValues.kickLevel = audioState.kickLevel;
      this.audioValues.highLevel = audioState.highLevel;
      this.audioValues.kickTrigger = audioState.kickTrigger;
    }
  }
}
