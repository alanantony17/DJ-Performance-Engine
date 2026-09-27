/**
 * DJ Performance Engine - Hydra Synth WebGL Visual Pipeline
 * Multi-Mode Visual Engine with On-The-Fly Style Cycling (Pad 5 / Key 5 / V):
 *  - Style 0: "Pure Spin & Breathe" (Single centered asset turning on its axis & pulsing to BPM)
 *  - Style 1: "Hypnotic Vortex" (8-petal sacred mandala symmetry with liquid ripples)
 *  - Style 2: "Flower of Life" (6-petal hexagonal sacred geometry)
 *  - Style 3: "Psychedelic Warp" (Deep liquid feedback warping & infinite tunnel)
 */

import { CONFIG } from './config.js';

export class VisualPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.hydra = null;
    this.preloadedImages = [];
    this.currentAssetIndex = 0;
    this.currentStyleIndex = 0; // Starts with Pure Spin & Breathe

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
      const initialAsset = CONFIG.assets.list[this.currentAssetIndex].path;
      s0.initImage(initialAsset);

      // Build the multi-style generative GLSL patch
      this.buildPatch();
    } catch (err) {
      console.error('[Visuals] Failed to initialize Hydra Synth:', err);
    }
  }

  buildPatch() {
    if (typeof src === 'undefined' || typeof s0 === 'undefined') return;

    const style = CONFIG.visualStyles[this.currentStyleIndex] || CONFIG.visualStyles[0];

    // Common dynamic uniform closures:
    const getRotation = () => this.rotationAngle;
    const getHueRotation = () => this.midiValues.hydraHue;
    const getFeedbackDecay = () => Math.min(0.96, Math.max(0.0, this.midiValues.hydraFeedback));
    const getBrightness = () => (this.midiValues.padSlam ? -1.0 : 0.0);
    const getColorR = () => 0.85 + 0.25 * Math.sin(this.midiValues.hydraHue * Math.PI * 2);
    const getColorG = () => 0.85 + 0.25 * Math.cos(this.midiValues.hydraHue * Math.PI * 2);
    const getColorB = () => 0.95;

    // Aspect ratio multiplier for 16:9 canvas (1080 / 1920 = 0.5625)
    const getAspectX = () => (window.innerHeight && window.innerWidth ? window.innerHeight / window.innerWidth : 9 / 16);

    // STYLE 0: "Pure Spin & Breathe"
    // Exactly ONE copy of the asset, spinning cleanly on its central axis,
    // with 1:1 true circular aspect ratio on 16:9 screen, masked cleanly to remove tiling/repeats.
    if (style.mode === 'pure') {
      const getPureScale = () => {
        const breathe = Math.sin(this.audioValues.beatPhase * Math.PI * 2) * 0.04;
        const kickPunch = this.audioValues.kickLevel * 0.16 * (this.midiValues.audioSensitivity * 0.6);
        return 0.94 * (1.0 + breathe + kickPunch);
      };

      src(s0)
        .rotate(getRotation)
        .scale(getPureScale, getAspectX, 1)
        .mask(shape(99, 0.49, 0.005).scale(getPureScale, getAspectX, 1))
        .hue(getHueRotation)
        .color(getColorR, getColorG, getColorB)
        .blend(o0, getFeedbackDecay)
        .brightness(getBrightness)
        .out(o0);

      console.log('[Visuals] Mounted Style: Pure Spin & Breathe (single centered wheel on axis).');
      return;
    }

    // Dynamic Scale for Geometric Mandala modes:
    const getMandalaScale = () => {
      const breathe = Math.sin(this.audioValues.beatPhase * Math.PI * 2) * 0.06;
      const kickPunch = this.audioValues.kickLevel * 0.20 * (this.midiValues.audioSensitivity * 0.6);
      return 1.0 + breathe + kickPunch;
    };

    // STYLE 1: "Hypnotic Vortex" (8-petal sacred mandala symmetry with liquid ripples)
    if (style.mode === 'vortex') {
      const getRipple = () => this.audioValues.kickLevel * 0.12 * (this.midiValues.audioSensitivity * 0.6);

      src(s0)
        .scale(getMandalaScale)
        .rotate(getRotation)
        .kaleid(8)
        .modulateScale(osc(6, 0.08, 0).kaleid(8), getRipple)
        .hue(getHueRotation)
        .color(getColorR, getColorG, getColorB)
        .blend(o0, getFeedbackDecay)
        .brightness(getBrightness)
        .out(o0);

      console.log('[Visuals] Mounted Style: Hypnotic Vortex (8-petal mandala).');
      return;
    }

    // STYLE 2: "Flower of Life" (6-petal hexagonal sacred geometry)
    if (style.mode === 'flower') {
      const getRipple = () => this.audioValues.kickLevel * 0.10 * (this.midiValues.audioSensitivity * 0.6);

      src(s0)
        .scale(getMandalaScale)
        .rotate(getRotation)
        .kaleid(6)
        .modulateScale(osc(6, 0.08, 0).kaleid(6), getRipple)
        .hue(getHueRotation)
        .color(getColorR, getColorG, getColorB)
        .blend(o0, getFeedbackDecay)
        .brightness(getBrightness)
        .out(o0);

      console.log('[Visuals] Mounted Style: Flower of Life (6-petal geometry).');
      return;
    }

    // STYLE 3: "Psychedelic Warp" (Liquid feedback warp tunnel)
    if (style.mode === 'warp') {
      const getWarp = () => this.audioValues.kickLevel * 0.28 * (this.midiValues.audioSensitivity * 0.7);

      src(s0)
        .scale(getMandalaScale)
        .rotate(getRotation)
        .modulateScale(osc(4, 0.08, 1).rotate(getRotation), getWarp)
        .kaleid(4)
        .hue(getHueRotation)
        .color(getColorR, getColorG, getColorB)
        .blend(o0, getFeedbackDecay)
        .brightness(getBrightness)
        .out(o0);

      console.log('[Visuals] Mounted Style: Psychedelic Warp.');
      return;
    }
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

  cycleStyle() {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % CONFIG.visualStyles.length;
    this.buildPatch();
    const activeStyle = CONFIG.visualStyles[this.currentStyleIndex];
    console.log(`[Visuals] Switched visual style to: ${activeStyle.name} (${activeStyle.desc})`);
    window.dispatchEvent(new CustomEvent('engine:styleChanged', {
      detail: { index: this.currentStyleIndex, style: activeStyle }
    }));
    return activeStyle;
  }

  setStyle(index) {
    if (index >= 0 && index < CONFIG.visualStyles.length) {
      this.currentStyleIndex = index;
      this.buildPatch();
      const activeStyle = CONFIG.visualStyles[this.currentStyleIndex];
      window.dispatchEvent(new CustomEvent('engine:styleChanged', {
        detail: { index: this.currentStyleIndex, style: activeStyle }
      }));
    }
  }

  update(midiComputed, audioState) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

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
