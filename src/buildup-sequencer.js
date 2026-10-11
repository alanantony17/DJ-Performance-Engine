/**
 * DJ Performance Engine - One-Shot 4-Bar / 8-Bar Buildup Strobe Engine
 * Quantized buildup sequencer with BPM-locked musical subdivision acceleration,
 * 100% whiteout blinder climax, and instant master cancel via Pad 4 (DROP SLAM).
 */

import { CONFIG } from './config.js';

export class BuildupSequencer {
  constructor() {
    this.state = 'idle'; // 'idle' | 'building' | 'holding_climax'
    this.totalBars = 4;
    this.totalBeats = 16;

    this.lockedBpm = 128.0;
    this.elapsedSec = 0;
    this.totalDurationSec = 7.5; // Default at 128 BPM
    this.progress = 0.0;          // 0.0 to 1.0

    this.currentBar = 1;
    this.currentBeat = 1;

    // Strobe & Modulation Registers
    this.strobeFreq = 4.0;
    this.strobePhase = 0.0;
    this.strobePulse = 0.0;
    this.blinderIntensity = 0.0;
    this.slicerDepth = 0.0;
    this.cameraTension = 0.0;

    // Master Blackout Gate
    this.isBlackout = false;

    // 4 Distinct Riser Archetypes (Armed via Bank B)
    this.archetypeIndex = 0;
    this.autoCycle = false;
  }

  setArchetype(index) {
    const archetypes = CONFIG.buildup?.archetypes || [];
    this.archetypeIndex = Math.max(0, Math.min(archetypes.length ? archetypes.length - 1 : 0, index));
    const arch = this.getCurrentArchetype();
    console.log(`[Buildup] Armed Riser Archetype: [${this.archetypeIndex + 1}/4] ${arch.name}`);
    window.dispatchEvent(new CustomEvent('engine:riserArchetypeChanged', {
      detail: { index: this.archetypeIndex, archetype: arch, autoCycle: this.autoCycle }
    }));
    return arch;
  }

  cycleArchetype() {
    const archetypes = CONFIG.buildup?.archetypes || [];
    const len = archetypes.length || 4;
    this.archetypeIndex = (this.archetypeIndex + 1) % len;
    return this.setArchetype(this.archetypeIndex);
  }

  toggleAutoCycle() {
    this.autoCycle = !this.autoCycle;
    console.log(`[Buildup] Riser Auto-Cycle: ${this.autoCycle ? 'ENABLED (Round-Robin)' : 'MANUAL LOCKED'}`);
    window.dispatchEvent(new CustomEvent('engine:riserAutoCycleToggled', {
      detail: { autoCycle: this.autoCycle, currentArchetype: this.getCurrentArchetype() }
    }));
    return this.autoCycle;
  }

  getCurrentArchetype() {
    const archetypes = CONFIG.buildup?.archetypes || [];
    return archetypes[this.archetypeIndex] || { id: 0, name: 'Kinetic Blitz', color: '#facc15', mode: 'blitz' };
  }

  /**
   * One-Button Toggle Method:
   *  - Click in idle: Snapshot current BPM and start buildup (4 or 8 bars)
   *  - Click while building: Cancel / stop buildup
   */
  toggle(bars = 4, currentBpm = 128.0) {
    if (this.state === 'idle') {
      this.start(bars, currentBpm);
    } else {
      this.cancel();
    }
    return this.getStateSummary();
  }

  start(bars = 4, currentBpm = 128.0) {
    if (this.autoCycle) {
      const archetypes = CONFIG.buildup?.archetypes || [];
      if (archetypes.length > 0) {
        this.archetypeIndex = (this.archetypeIndex + 1) % archetypes.length;
      }
    }
    this.totalBars = bars;
    this.totalBeats = bars * 4;

    // Snapshot and lock track BPM at the exact moment of trigger to prevent mid-riser drift
    this.lockedBpm = Math.max(60.0, Math.min(220.0, currentBpm || CONFIG.buildup?.defaultBpm || 128.0));
    const beatSec = 60.0 / this.lockedBpm;
    this.totalDurationSec = beatSec * this.totalBeats;

    this.state = 'building';
    this.elapsedSec = 0;
    this.progress = 0.0;
    this.isBlackout = false;
    this.strobePhase = 0;
    this.blinderIntensity = 0.0;
    this.cameraTension = 0.0;
    this.currentBar = 1;
    this.currentBeat = 1;

    console.log(`[Buildup] Started ${this.totalBars}-Bar Buildup Sequence locked at ${this.lockedBpm.toFixed(1)} BPM (Duration: ${this.totalDurationSec.toFixed(2)}s).`);
    window.dispatchEvent(new CustomEvent('engine:buildupStarted', {
      detail: { bars: this.totalBars, beats: this.totalBeats, bpm: this.lockedBpm, durationSec: this.totalDurationSec }
    }));
  }

  /**
   * Instant Cancel / Cutoff (triggered via Pad 4 DROP SLAM or pad toggle)
   */
  cancel() {
    const wasActive = this.state !== 'idle';
    this.state = 'idle';
    this.isBlackout = false;
    this.progress = 0.0;
    this.elapsedSec = 0;
    this.strobePulse = 0.0;
    this.blinderIntensity = 0.0;
    this.slicerDepth = 0.0;
    this.cameraTension = 0.0;

    if (wasActive) {
      console.log('[Buildup] Sequence cancelled / cutoff.');
      window.dispatchEvent(new CustomEvent('engine:buildupCancelled', {
        detail: { bars: this.totalBars }
      }));
    }
  }

  update(dt) {
    const cfg = CONFIG.buildup;

    if (this.state === 'idle') {
      this.progress = 0.0;
      this.strobePulse = 0.0;
      this.blinderIntensity = 0.0;
      this.slicerDepth = 0.0;
      this.cameraTension = 0.0;
      this.isBlackout = false;
      return this.getStateSummary();
    }

    if (this.state === 'holding_climax') {
      // Holds 100% peak climax (pure blinding whiteout + 60Hz audio-rate flutter) until DJ cuts off via SLAM
      this.progress = 1.0;
      this.currentBar = this.totalBars;
      this.currentBeat = this.totalBeats;

      const maxFreq = cfg?.maxFreqHz || 60.0;
      this.strobeFreq = maxFreq;
      this.strobePhase = (this.strobePhase + 2.0 * Math.PI * this.strobeFreq * dt) % (2.0 * Math.PI);
      this.strobePulse = (this.strobePhase / (2.0 * Math.PI) < 0.75) ? 1.0 : 0.0;

      this.blinderIntensity = 1.0; // 100% pure concert whiteout
      this.cameraTension = 0.50;
      this.slicerDepth = 1.0;
      return this.getStateSummary();
    }

    if (this.state === 'building') {
      this.elapsedSec += dt;
      this.progress = Math.min(1.0, this.elapsedSec / this.totalDurationSec);

      // Quantized bar and beat tracking locked to initial BPM
      const beatSec = 60.0 / this.lockedBpm;
      this.currentBeat = Math.min(this.totalBeats, Math.floor(this.elapsedSec / beatSec) + 1);
      this.currentBar = Math.min(this.totalBars, Math.floor((this.currentBeat - 1) / 4) + 1);

      // 1. Musical Subdivision Strobe Acceleration:
      // Starts at 1/8th note pulses, accelerating exponentially to 60Hz audio-rate flutter
      const baseFreq = (this.lockedBpm / 60.0) * 2.0; // 1/8 note rate (e.g. 4.26 Hz at 128 BPM)
      const maxFreq = cfg?.maxFreqHz || 60.0;
      this.strobeFreq = baseFreq * Math.pow(maxFreq / baseFreq, Math.pow(this.progress, 1.35));
      this.strobePhase = (this.strobePhase + 2.0 * Math.PI * this.strobeFreq * dt) % (2.0 * Math.PI);

      // Duty cycle widens as tension mounts (25% on at start -> 75% on at peak)
      const duty = 0.25 + this.progress * 0.50;
      const isLit = (this.strobePhase / (2.0 * Math.PI)) < duty;
      this.strobePulse = isLit ? (0.60 + this.progress * 0.40) : 0.0;

      // 2. Physical Slicer Depth: deepens smoothly into razor cuts
      this.slicerDepth = Math.min(1.0, this.progress * 1.25);

      // 3. Blinder Climax: Ramps smoothly in final 30% of build to reach 100% (1.0) pure whiteout!
      if (this.progress > 0.70) {
        const blinderNorm = (this.progress - 0.70) / 0.30;
        this.blinderIntensity = Math.min(1.0, Math.pow(blinderNorm, 1.5));
      } else {
        this.blinderIntensity = 0.0;
      }

      // 4. Camera Tension: Smooth claustrophobic zoom tightening
      this.cameraTension = Math.pow(this.progress, 1.4) * 0.50;

      // 5. Climax Arrival: When countdown reaches 100%, hold climax until DJ cuts it off with Pad 4 SLAM!
      if (this.elapsedSec >= this.totalDurationSec) {
        this.state = 'holding_climax';
        this.progress = 1.0;
        this.blinderIntensity = 1.0;
        this.cameraTension = 0.50;
        this.slicerDepth = 1.0;
      }

      return this.getStateSummary();
    }

    return this.getStateSummary();
  }

  getStateSummary() {
    return {
      state: this.state,
      progress: this.progress,
      currentBar: this.currentBar,
      totalBars: this.totalBars,
      currentBeat: this.currentBeat,
      totalBeats: this.totalBeats,
      lockedBpm: this.lockedBpm,
      strobePulse: this.strobePulse,
      strobeFreq: this.strobeFreq,
      blinderIntensity: this.blinderIntensity,
      slicerDepth: this.slicerDepth,
      cameraTension: this.cameraTension,
      isBlackout: this.isBlackout,
      archetypeIndex: this.archetypeIndex,
      archetype: this.getCurrentArchetype(),
      autoCycle: this.autoCycle,
    };
  }
}
