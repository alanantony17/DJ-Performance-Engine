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
      kickCadenceLock: 0.0,// 1.0 when 4/4 kicks are locked in cadence, 0.0 when kicks cut out
      consecutiveKicks: 0, // Number of consecutive on-tempo 4/4 kicks detected
      kickIntervalMs: 468.75, // Dynamic inter-beat interval (ms)
      highLevel: 0.0,      // Continuous high frequency envelope
      highTrigger: false,
      bpm: 128.0,          // Dynamic detected BPM
      beatPhase: 0.0,      // 0.0 to 1.0 phase within beat
      dropIntensity: 0.0,  // 0.0 (quiet/breakdown) to 1.0 (peak drop slam)
      dropMode: 'auto',    // 'auto' | 'forced' | 'chill'
      isDrop: false,       // true when dropIntensity >= 0.50
      energyLevel: 0.0,    // Full-spectrum average energy
      fft: new Float32Array(CONFIG.audio.fftSize / 2), // Normalized [0, 1] FFT bins
      rawFft: new Uint8Array(CONFIG.audio.fftSize / 2), // Raw 0-255 bytes
    };

    // Manual drop override: null (auto) | true (forced drop) | false (forced chill)
    this.manualDropOverride = null;

    // Rolling thresholds for transient detection & BPM estimation
    this.kickHistory = [];
    this.highHistory = [];
    this.bassEnergyHistory = [];
    this.overallEnergyHistory = [];
    this.recentKickTimes = [];
    this.historyLength = 30; // ~0.5s window at 60fps for transient thresholding
    this.longHistoryLength = CONFIG.audio.dynamics?.longWindowFrames || 360; // ~6.0s window for drop baseline
    this.lastKickTime = 0;
    this.prevKickEnergy = 0.0;
    this.beatIntervals = [];
    this.consecutiveOnTempoKicks = 0;
    this.cadenceConfidence = 0.0;
    this.lastKickInterval = 468.75;
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

  toggleDropOverride(forceValue = null) {
    if (forceValue !== null) {
      this.manualDropOverride = forceValue;
    } else {
      if (this.manualDropOverride === null) {
        this.manualDropOverride = true; // Auto -> Force Drop
      } else if (this.manualDropOverride === true) {
        this.manualDropOverride = false; // Force Drop -> Force Chill
      } else {
        this.manualDropOverride = null; // Force Chill -> Auto
      }
    }

    let modeText = 'Auto Detection';
    if (this.manualDropOverride === true) modeText = 'Forced Drop';
    if (this.manualDropOverride === false) modeText = 'Forced Chill';

    this.state.dropMode = this.manualDropOverride === null ? 'auto' : (this.manualDropOverride ? 'forced' : 'chill');

    console.log(`[Audio] Drop Mode changed: ${modeText}`);
    window.dispatchEvent(new CustomEvent('engine:dropModeChanged', {
      detail: {
        mode: this.state.dropMode,
        isForced: this.manualDropOverride !== null,
        isDrop: this.manualDropOverride === true,
        text: modeText
      }
    }));
    return { mode: this.state.dropMode, text: modeText };
  }

  // Called once per animation frame (rAF)
  // Called once per animation frame (rAF)
  update(sensitivityMultiplier = 1.0, dropThresholdSetting = 0.50) {
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

    // Normalize FFT array to 0.0 - 1.0 and calculate active frequency bin density
    const binCount = this.state.rawFft.length;
    let totalSpectrumEnergy = 0;
    let activeBins = 0;
    for (let i = 0; i < binCount; i++) {
      const norm = this.state.rawFft[i] / 255;
      this.state.fft[i] = norm * sensitivityMultiplier;
      totalSpectrumEnergy += norm;
      if (norm > 0.045) activeBins++;
    }
    const overallSpectrumAvg = totalSpectrumEnergy / binCount;
    this.state.energyLevel = overallSpectrumAvg;

    // 1. Kick Band Analysis (Sub-bass & Bass, bins 0 to 4)
    const kickCfg = CONFIG.audio.kick;
    const cadenceCfg = CONFIG.audio?.cadence || {
      minIntervalMs: 320,
      maxIntervalMs: 650,
      defaultBpm: 128.0,
      jitterTolerance: 0.25,
    };
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

    // Discrete transient onset trigger impulse (edge-triggered with cooldown)
    const now = performance.now();
    const timeSinceLastKick = now - this.lastKickTime;
    const kickOnset = kickEnergy - this.prevKickEnergy;
    this.prevKickEnergy = kickEnergy;

    const cooldown = kickCfg.cooldownMs || 200;

    // Adaptive kick onset: works across all volume levels (quiet tab audio or loud master)
    const minThreshold = Math.max(0.06, kickAvg * 1.08);
    const minOnset = Math.max(0.006, kickAvg * 0.04);
    const isKickOnset = (kickEnergy > minThreshold && kickOnset > minOnset && timeSinceLastKick > cooldown);

    if (isKickOnset) {
      this.state.kickTrigger = true;
      const intervalMs = timeSinceLastKick;
      this.lastKickTime = now;
      this.recentKickTimes.push(now);

      // Sync beat phase right on kick strike for razor-sharp visual pulse
      this.state.beatPhase = 0.0;

      // House & Techno 4/4 Kick Cadence Tracking:
      // Dance quarter-note tempo window: 320ms (187 BPM) to 650ms (92 BPM)
      if (intervalMs >= cadenceCfg.minIntervalMs && intervalMs <= cadenceCfg.maxIntervalMs) {
        const refInterval = (this.lastKickInterval > 0) ? this.lastKickInterval : (60000 / cadenceCfg.defaultBpm);
        const jitter = Math.abs(intervalMs - refInterval) / refInterval;

        // In quantized electronic dance music, jitter between 4/4 kicks is tight
        if (jitter <= cadenceCfg.jitterTolerance || this.cadenceConfidence < 0.25) {
          this.consecutiveOnTempoKicks++;
          this.cadenceConfidence = Math.min(1.0, this.cadenceConfidence + 0.35);
          this.lastKickInterval = refInterval * 0.70 + intervalMs * 0.30;
          this.state.kickIntervalMs = this.lastKickInterval;
          const detectedBpm = 60000 / this.lastKickInterval;
          this.state.bpm = this.state.bpm * 0.82 + detectedBpm * 0.18;
        } else {
          // Off-beat syncopation / stutter: step down slightly
          this.consecutiveOnTempoKicks = Math.max(1, this.consecutiveOnTempoKicks - 1);
          this.cadenceConfidence = Math.max(0.20, this.cadenceConfidence - 0.15);
          this.lastKickInterval = intervalMs;
        }
      } else if (intervalMs < cadenceCfg.minIntervalMs) {
        // Fast syncopation (1/8th or 1/16th tap): keep confidence
      } else {
        // First kick after long gap: start cadence
        this.consecutiveOnTempoKicks = 1;
        this.cadenceConfidence = 0.30;
        this.lastKickInterval = (60000 / cadenceCfg.defaultBpm);
      }
    } else {
      this.state.kickTrigger = false;
    }

    // Purge kick timestamps older than 2500ms
    this.recentKickTimes = this.recentKickTimes.filter(t => (now - t) < 2500);

    // Cadence decay: hold strong across beat gap, fade out smoothly if kicks absent > 900ms
    const timeSinceKick = now - this.lastKickTime;
    if (timeSinceKick > 900) {
      this.cadenceConfidence *= 0.96;
      this.consecutiveOnTempoKicks = 0;
    } else {
      this.cadenceConfidence *= 0.997; // Retains ~90% confidence across normal 468ms beat gaps
    }
    this.state.kickCadenceLock = this.cadenceConfidence;
    this.state.consecutiveKicks = this.consecutiveOnTempoKicks;

    // Long-term history (~6.0s) for spectral rise baseline
    const compositeEnergy = rawKickEnergy * 0.65 + overallSpectrumAvg * 0.35;
    this.overallEnergyHistory.push(compositeEnergy);
    if (this.overallEnergyHistory.length > this.longHistoryLength) {
      this.overallEnergyHistory.shift();
    }
    let minFloor = 1.0;
    let maxCeil = 0.0;
    for (let i = 0; i < this.overallEnergyHistory.length; i++) {
      const val = this.overallEnergyHistory[i];
      if (val < minFloor) minFloor = val;
      if (val > maxCeil) maxCeil = val;
    }
    const effFloor = Math.max(0.04, minFloor);
    const dynRange = Math.max(0.08, maxCeil - effFloor);
    const relativeRise = Math.max(0.0, Math.min(1.0, (compositeEnergy - effFloor) / dynRange));

    // Dynamic Drop Intensity with Knob 5 Threshold:
    const threshNorm = (typeof dropThresholdSetting === 'number')
      ? Math.max(0.05, Math.min(0.95, dropThresholdSetting))
      : 0.50;

    let targetDrop = 0.0;
    if (this.manualDropOverride === true) {
      targetDrop = 1.0;
      this.state.kickCadenceLock = 1.0;
    } else if (this.manualDropOverride === false) {
      targetDrop = 0.0;
      this.state.kickCadenceLock = 0.0;
    } else {
      // Automatic Multi-Factor Drop Synthesis:
      // Combines 4/4 Kick Cadence (55%), Bass Power (25%), and Spectral Rise (20%)
      const kickPower = Math.min(1.0, rawKickEnergy / 0.28);
      const rawScore = (this.cadenceConfidence * 0.55) + (kickPower * 0.25) + (relativeRise * 0.20);

      // Knob 5 threshold scaling:
      // At knob = 0.50 (sweet spot): threshScale = 1.0
      // Lower knob (0.20): threshScale = 0.76 (eager)
      // Higher knob (0.80): threshScale = 1.24 (strict)
      const threshScale = 0.60 + (threshNorm * 0.80);
      targetDrop = Math.max(0.0, Math.min(1.0, (rawScore - (0.12 * threshScale)) / (0.62 * threshScale)));

      // Anti-Intro Protection:
      // If cadence confidence is very low (< 0.20, like intro pads/drones with no kicks),
      // cap targetDrop to max 0.18 so it CANNOT falsely trigger drop mode (> 0.50),
      // while still keeping the HUD drop meter lightly responsive (~5-18%).
      if (this.cadenceConfidence < 0.20) {
        targetDrop = Math.min(0.18, targetDrop * 0.28);
      }
    }

    // Smooth Leaky Integrator for Drop Intensity:
    // Fast attack (~80ms, 4 frames) on drop hits, smooth musical decay (~1.2s)
    if (targetDrop > this.state.dropIntensity) {
      this.state.dropIntensity = this.state.dropIntensity * 0.78 + targetDrop * 0.22;
    } else {
      this.state.dropIntensity = this.state.dropIntensity * 0.975 + targetDrop * 0.025;
      if (this.state.dropIntensity < 0.005) this.state.dropIntensity = 0.0;
    }
    this.state.isDrop = this.state.dropIntensity >= 0.50;

    // Continuous envelope follower: tracks instantaneous kickEnergy smoothly
    if (kickEnergy > this.state.kickLevel) {
      this.state.kickLevel = Math.min(1.0, kickEnergy);
    } else {
      this.state.kickLevel *= kickCfg.decay;
    }

    // HIGH CONTRAST DYNAMIC RANGE EXPANSION (kickPunch):
    // 1. Power curve gamma (2.4): squashes quiet background bass, massively boosts peaks
    const gamma = CONFIG.audio.dynamics?.powerGamma || 2.4;
    const normKick = Math.min(1.0, this.state.kickLevel);
    const contrastCurve = Math.pow(normKick, gamma);

    // 2. Drop multiplier: drops get up to +100% additional punch
    const dropMultiplier = 1.0 + (this.state.dropIntensity * 1.0);
    this.state.kickPunch = Math.min(1.6, contrastCurve * dropMultiplier * (sensitivityMultiplier * 0.75));

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
