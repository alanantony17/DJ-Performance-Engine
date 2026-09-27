/**
 * DJ Performance Engine - 2D Spatial Lighting & Strobe Engine
 * High-performance canvas lighting overlay composited via mix-blend-mode: screen.
 */

import { CONFIG } from './config.js';

export class StrobeEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.width = CONFIG.display.width;
    this.height = CONFIG.display.height;

    // Timing
    this.lastTime = performance.now();
    this.lfoPhase = 0;

    // Riser FX State (Pad 1)
    this.riserActive = false;
    this.riserTime = 0;
    this.riserPhase = 0;

    // Shutter FX State (Pad 2)
    this.shutterPhase = 0;

    // Audio reactive flash boost
    this.audioBoost = 0;
  }

  resize() {
    this.width = CONFIG.display.width;
    this.height = CONFIG.display.height;
    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  render(midiState, computedMidi, audioState) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000); // Frame delta time in seconds
    this.lastTime = now;

    const ctx = this.ctx;
    if (!ctx) return;

    // 1. PAD 4: DROP SLAM (Sample-Accurate Blackout)
    // Instant total blackout: clear canvas and return immediately
    if (computedMidi.padSlam) {
      ctx.clearRect(0, 0, this.width, this.height);
      this.riserActive = false;
      this.riserTime = 0;
      return;
    }

    // Clear frame for screen blend compositing
    ctx.clearRect(0, 0, this.width, this.height);

    // 2. Audio Kick Transient Integration with High Contrast Dynamic Kick Punch
    if (audioState && audioState.kickTrigger) {
      // In quiet sections (kickPunch ~ 0.04), audioBoost stays subtle (~0.03)
      // In drops (kickPunch ~ 1.2), audioBoost slams to 1.0 for high-energy strobe blinder punch!
      const punch = audioState.kickPunch !== undefined ? audioState.kickPunch : audioState.kickLevel;
      this.audioBoost = Math.min(1.0, punch * (computedMidi.audioSensitivity * 0.7));
    } else {
      this.audioBoost *= 0.84; // Fast exponential decay for crisp transient snap
    }

    // 3. PAD 1: Accelerating Snare Riser Strobe
    let riserIntensity = 0;
    if (computedMidi.padRiser) {
      if (!this.riserActive) {
        this.riserActive = true;
        this.riserTime = 0;
        this.riserPhase = 0;
      }
      this.riserTime += dt;
      const rCfg = CONFIG.strobe.riser;
      const progress = Math.min(1.0, this.riserTime / rCfg.rampDurationSec);
      // Exponential frequency ramp: 4Hz -> 60Hz
      const currentFreq = rCfg.startFreq * Math.pow(rCfg.maxFreq / rCfg.startFreq, progress);
      this.riserPhase = (this.riserPhase + 2 * Math.PI * currentFreq * dt) % (2 * Math.PI);

      // Square wave strobe with duty cycle expanding as riser intensifies
      const dutyCycle = 0.2 + progress * 0.5; // Starts at 20%, ends at 70% light
      const isLit = (this.riserPhase / (2 * Math.PI)) < dutyCycle;
      riserIntensity = isLit ? (0.4 + progress * 0.6) : 0;
    } else {
      this.riserActive = false;
      this.riserTime = 0;
    }

    // 4. PAD 2: Horizontal Shutter Blinder FX
    let shutterActive = computedMidi.padShutter;
    if (shutterActive) {
      const sCfg = CONFIG.strobe.shutter;
      this.shutterPhase = (this.shutterPhase + 2 * Math.PI * sCfg.cycleRateHz * dt) % (2 * Math.PI);
      this.drawShutterBlinders(ctx, this.shutterPhase, sCfg.barsCount);
    }

    // 5. Knob 1 LFO Strobe Pulse
    const lfoFreq = computedMidi.strobeLfoHz; // 2Hz to 50Hz
    this.lfoPhase = (this.lfoPhase + 2 * Math.PI * lfoFreq * dt) % (2 * Math.PI);

    // Sharp concert strobe waveform (duty cycle ~18%)
    const strobeCycle = this.lfoPhase / (2 * Math.PI);
    let lfoStrobeIntensity = strobeCycle < 0.22 ? Math.cos((strobeCycle / 0.22) * (Math.PI / 2)) : 0;

    // Combine base strobe + audio transient hit + riser
    let beamStrobeAlpha = Math.max(lfoStrobeIntensity * 0.6, this.audioBoost * 0.9, riserIntensity);

    // 6. Draw 2D Spatial Lighting Beam (Joystick X Pan & Joystick Y Aperture)
    if (beamStrobeAlpha > 0.01) {
      this.drawSpatialBeam(ctx, computedMidi.panX, computedMidi.aperture, beamStrobeAlpha);
    }

    // 7. Full-screen flash wash when Riser reaches climax (>90%)
    if (riserIntensity > 0.8) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(riserIntensity - 0.8) * 3.0})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Render Spatial Strobe Cone
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} panX - 0.0 (left) to 1.0 (right)
   * @param {number} aperture - 0.03 (slit) to 1.0 (180 deg flood)
   * @param {number} alpha - Strobe intensity 0.0 - 1.0
   */
  drawSpatialBeam(ctx, panX, aperture, alpha) {
    const originX = panX * this.width;
    const originY = -30; // Slightly above ceiling for natural light projection

    // Calculate cone spread angle at bottom of screen
    // Slit: ~40px wide; Flood wash: ~3800px wide
    const baseHalfWidth = 20 + Math.pow(aperture, 1.8) * (this.width * 1.5);
    const leftBottomX = originX - baseHalfWidth;
    const rightBottomX = originX + baseHalfWidth;
    const bottomY = this.height + 50;

    ctx.save();

    // 1. Broad Atmospheric Ambient Cone
    const coneGrad = ctx.createLinearGradient(originX, originY, originX, bottomY);
    coneGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1.0, alpha * 0.95)})`);
    coneGrad.addColorStop(0.2, `rgba(220, 245, 255, ${Math.min(1.0, alpha * 0.7)})`);
    coneGrad.addColorStop(0.6, `rgba(160, 210, 255, ${Math.min(1.0, alpha * 0.35)})`);
    coneGrad.addColorStop(1, `rgba(100, 160, 255, 0.0)`);

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(leftBottomX, bottomY);
    ctx.lineTo(rightBottomX, bottomY);
    ctx.closePath();
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // 2. High-Intensity Core Laser Slit (Always razor-focused down the beam center)
    const coreWidth = 8 + aperture * 30;
    const coreGrad = ctx.createLinearGradient(originX, originY, originX, bottomY);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.8})`);
    coreGrad.addColorStop(1, `rgba(255, 255, 255, 0.0)`);

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX - coreWidth, bottomY);
    ctx.lineTo(originX + coreWidth, bottomY);
    ctx.closePath();
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 3. Ceiling Origin Flare Spot
    const flareRadius = 40 + aperture * 120;
    const flareGrad = ctx.createRadialGradient(originX, 0, 5, originX, 0, flareRadius);
    flareGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    flareGrad.addColorStop(0.3, `rgba(200, 240, 255, ${alpha * 0.6})`);
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(originX, 0, flareRadius, 0, Math.PI * 2);
    ctx.fillStyle = flareGrad;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Render Horizontal Shutter Blinders (Pad 2)
   * Mimics stadium molefay concert stage blinders
   */
  drawShutterBlinders(ctx, phase, barsCount) {
    ctx.save();
    const barHeight = this.height / barsCount;

    for (let i = 0; i < barsCount; i++) {
      // Oscillate slats with alternating phase
      const slatPhase = phase + (i * 0.5);
      const intensity = Math.pow(Math.sin(slatPhase) * 0.5 + 0.5, 3.0);

      if (intensity > 0.05) {
        const y = i * barHeight;
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.95})`);
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, y, this.width, barHeight);
      }
    }
    ctx.restore();
  }
}
