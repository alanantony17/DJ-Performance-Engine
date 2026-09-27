/**
 * DJ Performance Engine - Web Audio API Transient Follower
 * Direct audio analysis from tab capture, input devices, audio files, or demo beats with kick & high transient detection.
 */

import { CONFIG } from './config.js';

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.fileSource = null;
    this.demoInterval = null;
    this.isInitialized = false;

    this.currentSourceName = 'Default Microphone';
    this.currentSourceType = 'device'; // 'device' | 'tab' | 'demo' | 'file'

    // Transient & Follower State
    this.state = {
      active: false,
      sourceName: this.currentSourceName,
      sourceType: this.currentSourceType,
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

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = CONFIG.audio.fftSize;
      this.analyser.smoothingTimeConstant = CONFIG.audio.smoothingTimeConstant;
      this.analyser.minDecibels = CONFIG.audio.minDecibels;
      this.analyser.maxDecibels = CONFIG.audio.maxDecibels;

      this.state.fft = new Float32Array(this.analyser.frequencyBinCount);
      this.state.rawFft = new Uint8Array(this.analyser.frequencyBinCount);
      this.isInitialized = true;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  disconnectCurrentSource() {
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.stream) {
      try { this.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      this.stream = null;
    }
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
    if (this.fileSource) {
      try {
        this.fileSource.stop();
        this.fileSource.disconnect();
      } catch (e) {}
      this.fileSource = null;
    }
  }

  async start() {
    this.ensureContext();
    if (!this.source && this.currentSourceType === 'device') {
      await this.useDevice('default');
    }
  }

  async resume() {
    this.ensureContext();
    if (!this.state.active) {
      await this.start();
    }
  }

  /**
   * Capture Audio from a Browser Tab (YouTube, Spotify, etc.) via Screen/Tab Sharing
   */
  async captureTabAudio() {
    this.ensureContext();
    this.disconnectCurrentSource();

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioTrack = displayStream.getAudioTracks()[0];
      if (!audioTrack) {
        // Stop any video tracks that were captured
        displayStream.getVideoTracks().forEach(track => track.stop());
        throw new Error('No audio track detected. Make sure to check "Share tab audio" in the browser prompt!');
      }

      // Stop video tracks immediately so they don't consume GPU/bandwidth
      displayStream.getVideoTracks().forEach(track => track.stop());

      this.stream = new MediaStream([audioTrack]);
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // When tab sharing ends, revert gracefully
      audioTrack.onended = () => {
        console.log('[Audio] Tab audio sharing ended by user. Reverting to default input.');
        this.useDevice('default');
      };

      this.currentSourceName = 'Tab / YouTube Audio';
      this.currentSourceType = 'tab';
      this.state.sourceName = this.currentSourceName;
      this.state.sourceType = this.currentSourceType;
      this.state.active = true;

      console.log('[Audio] Successfully connected Tab Audio stream.');
      window.dispatchEvent(new CustomEvent('engine:audioSourceChanged', { detail: { name: this.currentSourceName, type: 'tab' } }));
      return { success: true, name: this.currentSourceName };
    } catch (err) {
      console.warn('[Audio] Failed to capture tab audio:', err);
      await this.useDevice('default');
      return { success: false, error: err.message };
    }
  }

  /**
   * Connect to a specific hardware or virtual audio input (e.g. Mic, VB-Cable, Stereo Mix)
   */
  async useDevice(deviceId = 'default') {
    this.ensureContext();
    this.disconnectCurrentSource();

    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
        },
        video: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // Identify human-readable device name
      let label = 'Default Microphone / Virtual Cable';
      const devices = await this.getAvailableDevices();
      const match = devices.find(d => d.deviceId === deviceId);
      if (match && match.label) {
        label = match.label;
      }

      this.currentSourceName = label;
      this.currentSourceType = 'device';
      this.state.sourceName = this.currentSourceName;
      this.state.sourceType = this.currentSourceType;
      this.state.active = true;

      console.log(`[Audio] Connected input device: ${this.currentSourceName}`);
      window.dispatchEvent(new CustomEvent('engine:audioSourceChanged', { detail: { name: this.currentSourceName, type: 'device' } }));
      return { success: true, name: this.currentSourceName };
    } catch (err) {
      console.warn('[Audio] Failed to access audio device:', err);
      this.state.active = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Play an internal 128 BPM electronic kick drum beat for instant visual testing
   */
  playDemoBeat() {
    this.ensureContext();
    this.disconnectCurrentSource();

    this.currentSourceName = 'Demo Beat (128 BPM Techno Kick)';
    this.currentSourceType = 'demo';
    this.state.sourceName = this.currentSourceName;
    this.state.sourceType = this.currentSourceType;
    this.state.active = true;

    const intervalMs = (60 / 128) * 1000; // ~468ms
    const playKick = () => {
      if (!this.audioCtx || this.currentSourceType !== 'demo') return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const now = this.audioCtx.currentTime;
      // Kick pitch envelope: 160Hz -> 45Hz
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      // Punchy attack and decay
      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.analyser);
      gain.connect(this.audioCtx.destination); // Play to speakers so user hears the rhythm

      osc.start(now);
      osc.stop(now + 0.3);
    };

    playKick();
    this.demoInterval = setInterval(playKick, intervalMs);

    console.log('[Audio] Demo Beat Loop active at 128 BPM.');
    window.dispatchEvent(new CustomEvent('engine:audioSourceChanged', { detail: { name: this.currentSourceName, type: 'demo' } }));
    return { success: true, name: this.currentSourceName };
  }

  /**
   * Load and loop an MP3 / WAV audio file from the user's computer
   */
  async loadAudioFile(file) {
    this.ensureContext();
    this.disconnectCurrentSource();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      const bufferSource = this.audioCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.loop = true;

      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.9;

      bufferSource.connect(gain);
      gain.connect(this.analyser);
      gain.connect(this.audioCtx.destination); // Output to speakers

      bufferSource.start(0);
      this.fileSource = bufferSource;

      this.currentSourceName = `File: ${file.name}`;
      this.currentSourceType = 'file';
      this.state.sourceName = this.currentSourceName;
      this.state.sourceType = this.currentSourceType;
      this.state.active = true;

      console.log(`[Audio] Loaded and playing audio file: ${file.name}`);
      window.dispatchEvent(new CustomEvent('engine:audioSourceChanged', { detail: { name: this.currentSourceName, type: 'file' } }));
      return { success: true, name: this.currentSourceName };
    } catch (err) {
      console.error('[Audio] Failed to load audio file:', err);
      return { success: false, error: err.message };
    }
  }

  async getAvailableDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone / Input (${d.deviceId.slice(0, 6)}...)`,
        }));
    } catch (e) {
      console.warn('[Audio] Could not enumerate devices:', e);
      return [];
    }
  }

  // Called once per animation frame (rAF)
  update(sensitivityMultiplier = 1.0) {
    if (!this.analyser || !this.isInitialized) {
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

    this.kickHistory.push(kickEnergy);
    if (this.kickHistory.length > this.historyLength) {
      this.kickHistory.shift();
    }
    const kickAvg = this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length;
    const kickThreshold = Math.max(kickCfg.threshold, kickAvg * 1.35);

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
