/**
 * DJ Performance Engine - Web Audio API Transient Follower
 * Direct audio analysis from microphone or VB-Audio Virtual Cable with kick & high transient detection.
 */

import { CONFIG } from './config.js';

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.isInitialized = false;

    // Transient & Follower State
    this.state = {
      active: false,
      kickLevel: 0.0,      // Continuous smoothed kick envelope (0.0 - 1.0)
      kickTrigger: false,   // Discrete beat strike impulse
      highLevel: 0.0,      // Continuous high frequency envelope
      highTrigger: false,
      fft: new Float32Array(CONFIG.audio.fftSize / 2), // Normalized [0, 1] FFT bins
      rawFft: new Uint8Array(CONFIG.audio.fftSize / 2), // Raw 0-255 bytes
    };

    // Rolling thresholds for transient detection
    this.kickHistory = [];
    this.highHistory = [];
    this.historyLength = 30; // ~0.5s window at 60fps
  }

  async start() {
    if (this.isInitialized && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Acquire default audio input (Microphone or VB-Audio Virtual Cable)
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = CONFIG.audio.fftSize;
      this.analyser.smoothingTimeConstant = CONFIG.audio.smoothingTimeConstant;
      this.analyser.minDecibels = CONFIG.audio.minDecibels;
      this.analyser.maxDecibels = CONFIG.audio.maxDecibels;

      this.source.connect(this.analyser);

      this.state.fft = new Float32Array(this.analyser.frequencyBinCount);
      this.state.rawFft = new Uint8Array(this.analyser.frequencyBinCount);

      this.isInitialized = true;
      this.state.active = true;
      console.log('[Audio] Web Audio Analyser initialized successfully.');
    } catch (err) {
      console.warn('[Audio] Failed to access audio stream (mic/VB-cable):', err);
      this.state.active = false;
    }
  }

  async resume() {
    if (!this.audioCtx) {
      await this.start();
    } else if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
      console.log('[Audio] AudioContext resumed from gesture/MIDI.');
    }
  }

  // Called once per animation frame (rAF)
  update(sensitivityMultiplier = 1.0) {
    if (!this.analyser || !this.isInitialized) {
      // Gentle decay if no audio stream
      this.state.kickLevel *= 0.9;
      this.state.highLevel *= 0.9;
      this.state.kickTrigger = false;
      this.state.highTrigger = false;
      return this.state;
    }

    this.analyser.getByteFrequencyData(this.state.rawFft);

    // Normalize FFT array to 0.0 - 1.0
    const binCount = this.state.rawFft.length;
    for (let i = 0; i < binCount; i++) {
      this.state.fft[i] = (this.state.rawFft[i] / 255) * sensitivityMultiplier;
    }

    // 1. Kick Band Analysis (Sub-bass, bins 0 to 3)
    const kickCfg = CONFIG.audio.kick;
    let kickEnergy = 0;
    const kickBinCount = (kickCfg.maxBin - kickCfg.minBin + 1);
    for (let i = kickCfg.minBin; i <= kickCfg.maxBin; i++) {
      kickEnergy += this.state.fft[i];
    }
    kickEnergy = (kickEnergy / kickBinCount);

    // Compute dynamic moving average
    this.kickHistory.push(kickEnergy);
    if (this.kickHistory.length > this.historyLength) {
      this.kickHistory.shift();
    }
    const kickAvg = this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length;
    const kickThreshold = Math.max(kickCfg.threshold, kickAvg * 1.35);

    // Transient Trigger detection
    if (kickEnergy > kickThreshold && kickEnergy > this.state.kickLevel) {
      this.state.kickTrigger = true;
      this.state.kickLevel = Math.min(1.0, kickEnergy * 1.3);
    } else {
      this.state.kickTrigger = false;
      this.state.kickLevel *= kickCfg.decay;
    }

    // 2. High Band Analysis (Claps & Hats, bins 23 to 70)
    const clapCfg = CONFIG.audio.clap;
    let highEnergy = 0;
    const highBinCount = (clapCfg.maxBin - clapCfg.minBin + 1);
    for (let i = clapCfg.minBin; i <= clapCfg.maxBin; i++) {
      highEnergy += this.state.fft[i];
    }
    highEnergy = (highEnergy / highBinCount);

    this.highHistory.push(highEnergy);
    if (this.highHistory.length > this.historyLength) {
      this.highHistory.shift();
    }
    const highAvg = this.highHistory.reduce((a, b) => a + b, 0) / this.highHistory.length;
    const highThreshold = Math.max(clapCfg.threshold, highAvg * 1.4);

    if (highEnergy > highThreshold && highEnergy > this.state.highLevel) {
      this.state.highTrigger = true;
      this.state.highLevel = Math.min(1.0, highEnergy * 1.4);
    } else {
      this.state.highTrigger = false;
      this.state.highLevel *= clapCfg.decay;
    }

    return this.state;
  }
}
