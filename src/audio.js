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
    this.monitorGain = null;
    this.isInitialized = false;

    this.currentSourceName = 'Default Microphone';
    this.currentSourceType = 'device'; // 'device' | 'tab' | 'demo' | 'file'

    // Transient, Follower & BPM State
    this.state = {
      active: false,
      sourceName: this.currentSourceName,
      sourceType: this.currentSourceType,
      kickLevel: 0.0,      // Continuous smoothed kick envelope (0.0 - 1.0)
      kickPunch: 0.0,      // Dynamic expanded kick punch (non-linear power curve + drop boost)
      kickTrigger: false,   // Discrete beat strike impulse (edge-triggered onset)
      highLevel: 0.0,      // Continuous high frequency envelope
      highTrigger: false,
      bpm: 128.0,          // Dynamic detected BPM
      beatPhase: 0.0,      // 0.0 to 1.0 phase within beat
      dropIntensity: 0.0,  // 0.0 (quiet/breakdown) to 1.0 (peak drop slam)
      energyLevel: 0.0,    // Full-spectrum average energy
      fft: new Float32Array(CONFIG.audio.fftSize / 2), // Normalized [0, 1] FFT bins
      rawFft: new Uint8Array(CONFIG.audio.fftSize / 2), // Raw 0-255 bytes
    };

    // Rolling thresholds for transient detection & BPM estimation
    this.kickHistory = [];
    this.highHistory = [];
    this.bassEnergyHistory = [];
    this.overallEnergyHistory = [];
    this.historyLength = 30; // ~0.5s window at 60fps for transient thresholding
    this.longHistoryLength = CONFIG.audio.dynamics?.longWindowFrames || 180; // ~3.0s window for drop baseline
    this.lastKickTime = 0;
    this.prevKickEnergy = 0.0;
    this.beatIntervals = [];
    this.lastUpdateTime = performance.now();
  }

  async ensureContext() {
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

      // Create permanent monitor gain node connected to destination
      // CRITICAL FOR CHROMIUM: A path to audioCtx.destination MUST exist for
      // Web Audio's render quantum pull clock to pump audio from MediaStream sources!
      this.monitorGain = this.audioCtx.createGain();
      this.monitorGain.gain.value = 0.0; // Default muted to prevent mic howling
      this.analyser.connect(this.monitorGain);
      this.monitorGain.connect(this.audioCtx.destination);

      this.isInitialized = true;
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
      console.log('[Audio] AudioContext state resumed to:', this.audioCtx.state);
    }
  }

  disconnectCurrentSource() {
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(t => {
          t.stop();
        });
      } catch (e) {}
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
    await this.ensureContext();
    if (!this.source && this.currentSourceType === 'device') {
      await this.useDevice('default');
    }
  }

  async resume() {
    await this.ensureContext();
    if (!this.state.active) {
      await this.start();
    }
  }

  /**
   * Capture Audio from a Browser Tab (YouTube, Spotify, etc.) via Screen/Tab Sharing
   */
  async captureTabAudio() {
    await this.ensureContext();
    this.disconnectCurrentSource();

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          systemAudio: 'include',
        },
        systemAudio: 'include',
      });

      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        // User didn't check "Share tab audio"
        displayStream.getTracks().forEach(t => t.stop());
        throw new Error('No audio track detected! When the sharing dialog appears, select "Chrome Tab" and check the "Share tab audio" box at the bottom-left.');
      }

      const audioTrack = audioTracks[0];
      audioTrack.enabled = true;

      // DO NOT call track.stop() on video tracks!
      // In Chromium, stopping the video track can tear down or mute the capture session.
      // Instead, just disable it so it consumes zero rendering/decoding overhead.
      displayStream.getVideoTracks().forEach(t => {
        t.enabled = false;
      });

      this.stream = displayStream;

      // Pass the displayStream directly to createMediaStreamSource
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // Keep monitorGain at 0.0 (SILENT):
      // The user already hears the YouTube Music tab directly in Chrome.
      // Keeping it connected to destination with gain = 0.0 satisfies Chromium's
      // render quantum pull clock without outputting duplicate sound or causing an echo!
      if (this.monitorGain) {
        this.monitorGain.gain.value = 0.0;
      }

      // Revert if user clicks "Stop sharing" on Chrome banner
      audioTrack.onended = () => {
        console.log('[Audio] Tab audio sharing ended by user. Reverting to default input.');
        this.useDevice('default');
      };

      this.currentSourceName = 'Tab / YouTube Audio';
      this.currentSourceType = 'tab';
      this.state.sourceName = this.currentSourceName;
      this.state.sourceType = this.currentSourceType;
      this.state.active = true;

      console.log('[Audio] Successfully connected Tab Audio stream to Web Audio graph with speaker monitoring.');
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
    await this.ensureContext();
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

      // Mute monitor gain for microphone to prevent room howling / acoustic feedback
      // (The graph is still connected to destination via monitorGain, so the pull clock runs!)
      if (this.monitorGain) {
        this.monitorGain.gain.value = 0.0;
      }

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
  async playDemoBeat() {
    await this.ensureContext();
    this.disconnectCurrentSource();

    this.currentSourceName = 'Demo Beat (128 BPM Techno Kick)';
    this.currentSourceType = 'demo';
    this.state.sourceName = this.currentSourceName;
    this.state.sourceType = this.currentSourceType;
    this.state.active = true;

    if (this.monitorGain) {
      this.monitorGain.gain.value = 1.0;
    }

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
    await this.ensureContext();
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

      if (this.monitorGain) {
        this.monitorGain.gain.value = 1.0;
      }

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

  setMonitorVolume(val) {
    if (this.monitorGain) {
      this.monitorGain.gain.value = Math.max(0, Math.min(1, val));
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
      this.state.kickPunch *= 0.85;
      this.state.highLevel *= 0.9;
      this.state.dropIntensity *= 0.95;
      this.state.kickTrigger = false;
      this.state.highTrigger = false;
      return this.state;
    }

    this.analyser.getByteFrequencyData(this.state.rawFft);

    // Normalize FFT array to 0.0 - 1.0
    const binCount = this.state.rawFft.length;
    let totalSpectrumEnergy = 0;
    for (let i = 0; i < binCount; i++) {
      const norm = this.state.rawFft[i] / 255;
      this.state.fft[i] = norm * sensitivityMultiplier;
      totalSpectrumEnergy += norm;
    }
    const overallSpectrumAvg = totalSpectrumEnergy / binCount;
    this.state.energyLevel = overallSpectrumAvg;

    // 1. Kick Band Analysis (Sub-bass & Bass, bins 0 to 4)
    const kickCfg = CONFIG.audio.kick;
    let rawKickEnergy = 0;
    const kickBinCount = (kickCfg.maxBin - kickCfg.minBin + 1);
    for (let i = kickCfg.minBin; i <= kickCfg.maxBin; i++) {
      rawKickEnergy += (this.state.rawFft[i] / 255);
    }
    rawKickEnergy = rawKickEnergy / kickBinCount;
    const kickEnergy = Math.min(1.5, rawKickEnergy * sensitivityMultiplier);

    // Short-term kick history (~0.5s) for transient onset thresholding
    this.kickHistory.push(kickEnergy);
    if (this.kickHistory.length > this.historyLength) {
      this.kickHistory.shift();
    }
    const kickAvg = this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length;
    const dynamicKickThreshold = Math.max(kickCfg.threshold, kickAvg * 1.25);

    // Long-term history (~3.0s) for Drop & High Energy Section Detection
    this.bassEnergyHistory.push(rawKickEnergy);
    if (this.bassEnergyHistory.length > this.longHistoryLength) {
      this.bassEnergyHistory.shift();
    }
    this.overallEnergyHistory.push(overallSpectrumAvg);
    if (this.overallEnergyHistory.length > this.longHistoryLength) {
      this.overallEnergyHistory.shift();
    }

    // Dynamic Drop & High Energy Section Detection:
    // In drops: sub-bass is heavy (rawKickEnergy > 0.35) AND full spectrum is dense (overallSpectrumAvg > 0.15)
    // In breakdowns: low bass or sparse spectrum reduces energyScore
    const energyScore = (rawKickEnergy * 0.65 + overallSpectrumAvg * 0.35);
    if (energyScore > 0.22) {
      const targetDrop = Math.min(1.0, (energyScore - 0.20) / 0.45);
      this.state.dropIntensity = this.state.dropIntensity * 0.94 + targetDrop * 0.06;
    } else {
      this.state.dropIntensity *= 0.95;
    }

    // Continuous envelope follower: tracks instantaneous kickEnergy smoothly
    if (kickEnergy > this.state.kickLevel) {
      this.state.kickLevel = Math.min(1.0, kickEnergy);
    } else {
      this.state.kickLevel *= kickCfg.decay;
    }

    // Discrete transient onset trigger impulse (edge-triggered with cooldown)
    const now = performance.now();
    const timeSinceLastKick = now - this.lastKickTime;
    const kickOnset = kickEnergy - this.prevKickEnergy;
    this.prevKickEnergy = kickEnergy;

    const cooldown = kickCfg.cooldownMs || 220;
    if (kickEnergy > dynamicKickThreshold && kickEnergy > 0.12 && kickOnset > 0.02 && timeSinceLastKick > cooldown) {
      this.state.kickTrigger = true;
      this.lastKickTime = now;

      // Track dynamic BPM intervals on clean onset strikes
      if (this.lastKickTime > 0) {
        const intervalMs = timeSinceLastKick;
        if (intervalMs >= 320 && intervalMs <= 750) {
          this.beatIntervals.push(intervalMs);
          if (this.beatIntervals.length > 6) this.beatIntervals.shift();

          const sorted = [...this.beatIntervals].sort((a, b) => a - b);
          const medianInterval = sorted[Math.floor(sorted.length / 2)];
          const detectedBpm = 60000 / medianInterval;
          this.state.bpm = this.state.bpm * 0.8 + detectedBpm * 0.2;
        }
      }
    } else {
      this.state.kickTrigger = false;
    }

    // HIGH CONTRAST DYNAMIC RANGE EXPANSION (kickPunch):
    // 1. Power curve gamma (2.4): squashes quiet background bass, massively boosts peaks
    const gamma = CONFIG.audio.dynamics?.powerGamma || 2.4;
    const normKick = Math.min(1.0, this.state.kickLevel);
    const contrastCurve = Math.pow(normKick, gamma);

    // 2. Drop multiplier: drops get up to +60% additional punch
    const dropMultiplier = 1.0 + (this.state.dropIntensity * 0.6);
    this.state.kickPunch = Math.min(1.5, contrastCurve * dropMultiplier * (sensitivityMultiplier * 0.7));

    // 2. High Band Analysis (Claps & Hats, bins 18 to 65)
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
    const dynamicHighThreshold = Math.max(clapCfg.threshold, highAvg * 1.3);

    // Continuous high envelope follower
    if (highEnergy > this.state.highLevel) {
      this.state.highLevel = Math.min(1.0, highEnergy);
    } else {
      this.state.highLevel *= clapCfg.decay;
    }

    if (highEnergy > dynamicHighThreshold && highEnergy > 0.08) {
      this.state.highTrigger = true;
    } else {
      this.state.highTrigger = false;
    }

    // 3. Dynamic BPM Phase Accumulator
    const dt = Math.min(0.1, (now - this.lastUpdateTime) / 1000);
    this.lastUpdateTime = now;

    // Advance continuous beat phase (0.0 to 1.0 ramp per beat)
    const bps = this.state.bpm / 60;
    this.state.beatPhase = (this.state.beatPhase + bps * dt) % 1.0;

    return this.state;
  }
}
