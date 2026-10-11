/**
 * DJ Performance Engine - Multi-Band Harmonic BPM Detector & Beat Clock
 * 
 * Features:
 *  - Dual-band zero-latency transient filtering (140Hz lowpass kick + 2.2kHz bandpass snare)
 *  - High-precision audio clock timestamping via audioCtx.currentTime
 *  - Inter-Onset Interval (IOI) Pairwise Harmonic Clustering with sub-BPM parabolic interpolation
 *  - Temporal confidence gating & electronic music integer snap bias
 *  - Coast Mode & Tempo Lock: Holds rock-solid BPM during breakdowns and kick-less risers
 *  - Continuous 4/4 Beat Phase Clock (0.0 to 1.0) and downbeat tracker
 *  - DJ Tap Tempo, manual nudge (+/-), and force-lock support
 */

import { CONFIG } from './config.js';

export class BpmDetector {
  constructor(options = {}) {
    this.audioCtx = null;
    this.kickFilter = null;
    this.kickAnalyser = null;
    this.snareFilter = null;
    this.snareAnalyser = null;
    this.isInitialized = false;

    // Tempo bounds (default 85 to 175 BPM covering House, Techno, DnB, Dubstep, Amapiano)
    this.minBpm = options.minBpm || 85.0;
    this.maxBpm = options.maxBpm || 175.0;
    this.defaultBpm = options.defaultBpm || (CONFIG.buildup?.defaultBpm || 128.0);

    // Live Detection State
    this.bpm = this.defaultBpm;
    this.stableBpm = this.defaultBpm;
    this.rawBpm = this.defaultBpm;
    this.confidence = 0.0;     // 0.0 to 1.0
    this.isLocked = false;      // Locked at stable tempo
    this.isCoasting = false;    // Holding locked tempo across kick-less breakdowns
    this.isManual = false;      // Manually overridden / force-locked by DJ

    // Multi-band transient monitoring
    this.kickEnergy = 0.0;
    this.prevKickEnergy = 0.0;
    this.snareEnergy = 0.0;
    this.prevSnareEnergy = 0.0;

    // Adaptive thresholding registers
    this.kickEnergyHistory = [];
    this.snareEnergyHistory = [];
    this.historyLength = 36; // ~0.6s at 60fps

    // Edge-triggered onset timestamps & energies
    this.lastKickTime = 0.0;
    this.lastSnareTime = 0.0;
    this.kickOnsetCooldown = 0.18; // 180ms cooldown (~333 BPM max burst)
    this.snareOnsetCooldown = 0.16;

    // Rolling onset event buffer: [{ time, energy, band }]
    this.onsets = [];
    this.maxOnsets = 28;
    this.maxOnsetAgeSec = 6.0;

    // Continuous 4/4 Beat Phase Clock
    this.beatPhase = 0.0;       // 0.0 to 1.0 within the current beat
    this.beatIndex = 0;         // 0, 1, 2, 3 in 4/4 measure
    this.lastClockTime = 0.0;
    this.lastBeatTime = 0.0;

    // FFT byte buffers
    this.kickFft = new Uint8Array(128);
    this.snareFft = new Uint8Array(128);

    // Pre-computed candidate BPM bins (0.5 BPM resolution from minBpm to maxBpm)
    this.candidateList = [];
    for (let b = this.minBpm; b <= this.maxBpm; b += 0.5) {
      this.candidateList.push(b);
    }

    // Tap tempo history
    this.tapTimes = [];

    // Periodic detection throttle
    this.lastAnalysisTime = 0.0;
    this.analysisIntervalSec = 0.08; // Run clustering analysis ~12 times/sec
  }

  /**
   * Initialize dual-band zero-latency audio nodes and connect to main analyser
   */
  init(audioCtx, sourceNode = null) {
    if (!audioCtx) return;
    this.audioCtx = audioCtx;

    try {
      // 1. Kick Band: Lowpass 140Hz (isolates fundamental kick punch from synths/vocals)
      this.kickFilter = this.audioCtx.createBiquadFilter();
      this.kickFilter.type = 'lowpass';
      this.kickFilter.frequency.value = 140;
      this.kickFilter.Q.value = 1.0;

      this.kickAnalyser = this.audioCtx.createAnalyser();
      this.kickAnalyser.fftSize = 256;
      this.kickAnalyser.smoothingTimeConstant = 0.0; // ZERO smoothing for razor-sharp attacks!

      this.kickFilter.connect(this.kickAnalyser);

      // 2. Snare / Clap Band: Bandpass 2200Hz (tracks backbeat on beats 2 & 4 and snare risers)
      this.snareFilter = this.audioCtx.createBiquadFilter();
      this.snareFilter.type = 'bandpass';
      this.snareFilter.frequency.value = 2200;
      this.snareFilter.Q.value = 1.2;

      this.snareAnalyser = this.audioCtx.createAnalyser();
      this.snareAnalyser.fftSize = 256;
      this.snareAnalyser.smoothingTimeConstant = 0.0;

      this.snareFilter.connect(this.snareAnalyser);

      this.isInitialized = true;
      console.log('[BpmDetector] Dual-Band Zero-Lag Transient Engine online (140Hz lowpass + 2.2kHz bandpass).');

      if (sourceNode) {
        this.connectSource(sourceNode);
      }
    } catch (err) {
      console.warn('[BpmDetector] Initialization warning:', err);
    }
  }

  connectSource(sourceNode) {
    if (!sourceNode || !this.isInitialized) return;
    try {
      sourceNode.connect(this.kickFilter);
      sourceNode.connect(this.snareFilter);
      console.log('[BpmDetector] Successfully connected audio source to dual-band filter bank.');
    } catch (err) {
      console.warn('[BpmDetector] Source connection warning:', err);
    }
  }

  disconnectSource(sourceNode) {
    if (!sourceNode) return;
    try {
      sourceNode.disconnect(this.kickFilter);
      sourceNode.disconnect(this.snareFilter);
    } catch (e) {}
  }

  /**
   * Main per-frame analysis method (called inside AudioEngine.update)
   */
  update(sensitivityMultiplier = 1.0) {
    const audioTime = this.audioCtx ? this.audioCtx.currentTime : (performance.now() / 1000);
    const dt = Math.max(0.001, Math.min(0.1, audioTime - (this.lastClockTime || audioTime)));
    this.lastClockTime = audioTime;

    let isKickOnset = false;
    let isSnareOnset = false;

    if (this.isInitialized && this.kickAnalyser && this.snareAnalyser) {
      // 1. Read Kick Band Energy (Bins 0 to 4 correspond to ~0 - 180 Hz)
      this.kickAnalyser.getByteFrequencyData(this.kickFft);
      let kickSum = 0;
      for (let i = 0; i < 4; i++) {
        kickSum += this.kickFft[i];
      }
      this.kickEnergy = (kickSum / (4 * 255)) * sensitivityMultiplier;

      // 2. Read Snare Band Energy (Bins 10 to 24 correspond to ~1800 - 4500 Hz)
      this.snareAnalyser.getByteFrequencyData(this.snareFft);
      let snareSum = 0;
      for (let i = 10; i < 24; i++) {
        snareSum += this.snareFft[i];
      }
      this.snareEnergy = (snareSum / (14 * 255)) * sensitivityMultiplier;

      // 3. Adaptive Thresholding
      this.kickEnergyHistory.push(this.kickEnergy);
      if (this.kickEnergyHistory.length > this.historyLength) this.kickEnergyHistory.shift();
      const kickAvg = this.kickEnergyHistory.reduce((a, b) => a + b, 0) / this.kickEnergyHistory.length;

      this.snareEnergyHistory.push(this.snareEnergy);
      if (this.snareEnergyHistory.length > this.historyLength) this.snareEnergyHistory.shift();
      const snareAvg = this.snareEnergyHistory.reduce((a, b) => a + b, 0) / this.snareEnergyHistory.length;

      // 4. Edge-Triggered Half-Wave Rectified Energy Flux
      const kickFlux = this.kickEnergy - this.prevKickEnergy;
      this.prevKickEnergy = this.kickEnergy;

      const snareFlux = this.snareEnergy - this.prevSnareEnergy;
      this.prevSnareEnergy = this.snareEnergy;

      // Dynamic kick onset detection
      const minKickThresh = Math.max(0.08, kickAvg * 1.15);
      const minKickFlux = Math.max(0.02, kickAvg * 0.12);
      if (this.kickEnergy > minKickThresh && kickFlux > minKickFlux && (audioTime - this.lastKickTime) > this.kickOnsetCooldown) {
        isKickOnset = true;
        this.lastKickTime = audioTime;
        this.hasKickHistory = true;
        this.addOnset(audioTime, kickFlux, 'kick');
      }

      // Dynamic snare/clap onset detection
      const minSnareThresh = Math.max(0.07, snareAvg * 1.20);
      const minSnareFlux = Math.max(0.02, snareAvg * 0.15);
      if (this.snareEnergy > minSnareThresh && snareFlux > minSnareFlux && (audioTime - this.lastSnareTime) > this.snareOnsetCooldown) {
        isSnareOnset = true;
        this.lastSnareTime = audioTime;
        this.addOnset(audioTime, snareFlux, 'snare');
      }

      // Purge onsets older than 6 seconds
      this.onsets = this.onsets.filter(o => (audioTime - o.time) < this.maxOnsetAgeSec);

      // 5. Periodic Multi-Interval Harmonic Clustering (runs every ~80ms)
      if ((audioTime - this.lastAnalysisTime) > this.analysisIntervalSec && this.onsets.length >= 4) {
        this.lastAnalysisTime = audioTime;
        if (!this.isManual) {
          this.runHarmonicClustering(audioTime);
        }
      }

      // 6. Breakdown & Coast Detection:
      // If kicks were active previously and no kick drum has hit for >0.9s, enter coasting mode
      const timeSinceKick = audioTime - this.lastKickTime;
      if (this.hasKickHistory && timeSinceKick > 0.9) {
        this.isCoasting = true;
        // Retain confidence across breakdowns so risers maintain rock-solid locked BPM
        this.confidence = Math.max(0.65, this.confidence * 0.998);
      } else {
        this.isCoasting = false;
      }
    }

    // 7. Continuous 4/4 Beat Phase Clock
    const effectiveBpm = this.stableBpm || this.bpm || this.defaultBpm;
    const bps = effectiveBpm / 60.0;
    this.beatPhase = (this.beatPhase + bps * dt) % 1.0;

    // Resynchronize clock phase on direct kick onset strikes to eliminate visual latency
    if (isKickOnset) {
      this.beatPhase = 0.0;
      this.beatIndex = (this.beatIndex + 1) % 4;
    }

    return {
      bpm: effectiveBpm,
      stableBpm: this.stableBpm,
      rawBpm: this.rawBpm,
      confidence: this.confidence,
      isLocked: this.confidence >= 0.70,
      isCoasting: this.isCoasting,
      isManual: this.isManual,
      beatPhase: this.beatPhase,
      beatIndex: this.beatIndex,
      isKickOnset,
      isSnareOnset,
      kickEnergy: this.kickEnergy,
      snareEnergy: this.snareEnergy,
    };
  }

  addOnset(time, energy, band) {
    this.onsets.push({ time, energy, band });
    if (this.onsets.length > this.maxOnsets) {
      this.onsets.shift();
    }
  }

  /**
   * Inter-Onset Interval (IOI) Pairwise Harmonic Clustering Algorithm
   */
  runHarmonicClustering(audioTime) {
    const n = this.onsets.length;
    if (n < 4) return;

    // Score map for each candidate BPM in 0.5 BPM steps
    const scores = new Float32Array(this.candidateList.length);

    // Evaluate all pairwise intervals (t_j - t_i)
    let totalPairs = 0;
    for (let i = 0; i < n; i++) {
      const o1 = this.onsets[i];
      // Limit forward lookahead to 16 onsets
      const maxJ = Math.min(i + 16, n);
      for (let j = i + 1; j < maxJ; j++) {
        const o2 = this.onsets[j];
        const dt = o2.time - o1.time;

        // Valid musical interval range: 0.20s (300 BPM) to 3.2s (~19 BPM / 2 bars)
        if (dt < 0.20 || dt > 3.20) continue;
        totalPairs++;

        const pairEnergy = (o1.energy + o2.energy) * 0.5;

        // Test against all candidate tempos
        for (let c = 0; c < this.candidateList.length; c++) {
          const candBpm = this.candidateList[c];
          const tau = 60.0 / candBpm; // Expected beat period in seconds
          const ratio = dt / tau;

          // Check standard 4/4 musical subdivisions:
          // 1 beat (1.0), 2 beats (2.0), 3 beats (3.0), 4 beats (4.0), 6 beats (6.0), 8 beats (8.0)
          const k = Math.round(ratio);
          if (k >= 1 && k <= 8) {
            const err = Math.abs(ratio - k);
            if (err < 0.048) {
              const weight = (1.0 - (err / 0.048)) * (pairEnergy / Math.sqrt(k));
              scores[c] += weight;
            }
          } else if (Math.abs(ratio - 0.5) < 0.035) {
            // Half-beat (8th-note syncopation / snare backbeat)
            const err = Math.abs(ratio - 0.5);
            scores[c] += (1.0 - (err / 0.035)) * (pairEnergy * 0.70);
          } else if (Math.abs(ratio - 0.25) < 0.025) {
            // 16th-note fast roll
            const err = Math.abs(ratio - 0.25);
            scores[c] += (1.0 - (err / 0.025)) * (pairEnergy * 0.40);
          }
        }
      }
    }

    if (totalPairs < 4) return;

    // Find the winning candidate with the highest accumulated score
    let bestIdx = 0;
    let maxScore = -1.0;

    for (let c = 0; c < scores.length; c++) {
      if (scores[c] > maxScore) {
        maxScore = scores[c];
        bestIdx = c;
      }
    }

    // Find the second highest peak AT LEAST 5 BPM (10 bins) away from bestIdx
    // to avoid comparing against the primary peak's adjacent shoulders
    const minDistBins = 10;
    let secondMaxScore = 0.0;
    for (let c = 0; c < scores.length; c++) {
      if (Math.abs(c - bestIdx) >= minDistBins && scores[c] > secondMaxScore) {
        secondMaxScore = scores[c];
      }
    }

    const bestCandBpm = this.candidateList[bestIdx];

    // Sub-BPM Parabolic Interpolation around best peak
    let refinedBpm = bestCandBpm;
    if (bestIdx > 0 && bestIdx < scores.length - 1) {
      const y1 = scores[bestIdx - 1];
      const y2 = scores[bestIdx];
      const y3 = scores[bestIdx + 1];
      const denom = (y1 - 2 * y2 + y3);
      if (Math.abs(denom) > 1e-5) {
        const delta = 0.5 * (y1 - y3) / denom;
        refinedBpm = bestCandBpm + delta * 0.5;
      }
    }

    this.rawDetectedBpm = Math.max(this.minBpm, Math.min(this.maxBpm, refinedBpm));

    // Calculate confidence based on contrast with second highest distinct peak
    const contrastRatio = (secondMaxScore > 0) ? (maxScore / secondMaxScore) : 2.5;
    const rawConfidence = Math.min(1.0, Math.max(0.0, (contrastRatio - 1.20) / 0.90));

    // Temporal smoothing of confidence
    this.confidence = this.confidence * 0.70 + rawConfidence * 0.30;

    // Electronic Music Integer Snap Bias:
    // If refined BPM is within +/-0.35 of an integer, snap smoothly
    const nearestInt = Math.round(refinedBpm);
    const intDist = Math.abs(refinedBpm - nearestInt);
    let targetCandidate = refinedBpm;
    if (intDist <= 0.35 && this.confidence >= 0.65) {
      targetCandidate = nearestInt;
    }

    // Dynamic convergence rate:
    // When confidence is high or tempo adapting, converge swiftly
    const alpha = (this.confidence >= 0.70) ? 0.35 : 0.20;
    this.stableBpm = this.stableBpm * (1.0 - alpha) + targetCandidate * alpha;
    this.bpm = Math.round(this.stableBpm * 10) / 10;
  }

  /**
   * Direct BPM Setting (e.g. from preset or manual entry)
   */
  setBpm(newBpm, lock = false) {
    const clamped = Math.max(this.minBpm, Math.min(this.maxBpm, Math.round(newBpm * 10) / 10));
    this.bpm = clamped;
    this.stableBpm = clamped;
    this.rawBpm = clamped;
    this.confidence = 1.0;
    if (lock) this.isManual = true;
    console.log(`[BpmDetector] Tempo manually set to ${clamped.toFixed(1)} BPM (Locked: ${this.isManual}).`);
    window.dispatchEvent(new CustomEvent('engine:bpmChanged', { detail: { bpm: clamped, isManual: this.isManual } }));
    return clamped;
  }

  /**
   * Nudge BPM up or down (+/- 1.0, +/- 0.1, or +/- 5.0)
   */
  adjustBpm(delta) {
    return this.setBpm(this.bpm + delta, false);
  }

  /**
   * DJ Tap Tempo Calculator
   */
  tapTempo() {
    const now = performance.now();
    this.tapTimes = this.tapTimes.filter(t => (now - t) < 3200);
    this.tapTimes.push(now);

    if (this.tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this.tapTimes.length; i++) {
        intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tappedBpm = Math.round((60000 / avgInterval) * 10) / 10;

      if (tappedBpm >= this.minBpm && tappedBpm <= this.maxBpm) {
        this.setBpm(tappedBpm, false);
        // Reset clock phase to sync with tap strike
        this.beatPhase = 0.0;
        return tappedBpm;
      }
    }
    return this.bpm;
  }

  /**
   * Toggle manual force-lock mode
   */
  toggleLock() {
    this.isManual = !this.isManual;
    console.log(`[BpmDetector] Manual BPM Lock: ${this.isManual ? 'LOCKED' : 'AUTO'}`);
    window.dispatchEvent(new CustomEvent('engine:bpmLockToggled', { detail: { isManual: this.isManual, bpm: this.bpm } }));
    return this.isManual;
  }
}
