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

    // Musical Subdivision & Tension Registers
    this.subdivision = 4;        // 2, 4, 8, 16, 32, 64
    this.act = 1;                // 1, 2, or 3 (for 8-bar narrative tracking)
    this.strobeFreq = 4.0;
    this.strobePhase = 0.0;
    this.strobePulse = 0.0;
    this.blinderIntensity = 0.0;
    this.slicerDepth = 0.0;
    this.cameraTension = 0.0;

    // Master Optical Registers (Screen-Space Post-Processing Bus)
    this.radialBlur = 0.0;       // 0.0 to 1.0 (Hyperdrive zoom streak)
    this.highPass = 0.0;         // 0.0 to 1.0 (Optical wireframe edge extraction)
    this.chromatic = 0.0;        // 0.0 to 1.0 (Spectral dispersion)
    this.retinalGhost = 0.0;     // 0.0 to 1.0 (Phosphor negative burn on off-phase)

    // Master Blackout Gate (100% Manual via Pad 4 DROP SLAM)
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
   *  - Click while building / holding: Cancel / stop buildup
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
    this.strobePulse = 0.0;
    this.blinderIntensity = 0.0;
    this.cameraTension = 0.0;
    this.slicerDepth = 0.0;
    this.radialBlur = 0.0;
    this.highPass = 0.0;
    this.chromatic = 0.0;
    this.retinalGhost = 0.0;
    this.currentBar = 1;
    this.currentBeat = 1;
    this.act = 1;
    this.subdivision = 4;

    console.log(`[Buildup] Started ${this.totalBars}-Bar Buildup Sequence locked at ${this.lockedBpm.toFixed(1)} BPM (Duration: ${this.totalDurationSec.toFixed(2)}s).`);
    window.dispatchEvent(new CustomEvent('engine:buildupStarted', {
      detail: { bars: this.totalBars, beats: this.totalBeats, bpm: this.lockedBpm, durationSec: this.totalDurationSec }
    }));
  }

  /**
   * Instant Cancel / Cutoff (triggered via Pad 4 DROP SLAM or manual pad toggle)
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
    this.radialBlur = 0.0;
    this.highPass = 0.0;
    this.chromatic = 0.0;
    this.retinalGhost = 0.0;

    if (wasActive) {
      console.log('[Buildup] Sequence cancelled / cutoff via Pad 4 DROP SLAM.');
      window.dispatchEvent(new CustomEvent('engine:buildupCancelled', {
        detail: { bars: this.totalBars }
      }));
    }
  }

  update(dt) {
    const cfg = CONFIG.buildup;
    const maxFreq = cfg?.maxFreqHz || 60.0;
    const beatSec = 60.0 / this.lockedBpm;

    if (this.state === 'idle') {
      this.progress = 0.0;
      this.strobePulse = 0.0;
      this.blinderIntensity = 0.0;
      this.slicerDepth = 0.0;
      this.cameraTension = 0.0;
      this.radialBlur = 0.0;
      this.highPass = 0.0;
      this.chromatic = 0.0;
      this.retinalGhost = 0.0;
      this.isBlackout = false;
      return this.getStateSummary();
    }

    if (this.state === 'holding_climax') {
      // Holds 100% peak climax (pure blinder / singularity void / 60Hz audio-rate flutter)
      // Pure manual control: WAITS indefinitely until DJ hits Pad 4 (DROP SLAM) on Beat 1!
      this.progress = 1.0;
      this.currentBar = this.totalBars;
      this.currentBeat = this.totalBeats;
      this.subdivision = 64;

      this.strobeFreq = maxFreq;
      this.strobePhase = (this.strobePhase + 2.0 * Math.PI * this.strobeFreq * dt) % (2.0 * Math.PI);
      this.strobePulse = (this.strobePhase / (2.0 * Math.PI) < 0.70) ? 1.0 : 0.0;

      this.blinderIntensity = 1.0;
      this.cameraTension = 0.50;
      this.slicerDepth = 1.0;
      this.radialBlur = 1.0;
      this.highPass = 1.0;
      this.chromatic = 1.0;
      this.retinalGhost = 0.85;

      return this.getStateSummary();
    }

    if (this.state === 'building') {
      this.elapsedSec += dt;
      this.progress = Math.min(1.0, this.elapsedSec / this.totalDurationSec);

      // Quantized bar and beat tracking locked to initial snapshot BPM
      this.currentBeat = Math.min(this.totalBeats, Math.floor(this.elapsedSec / beatSec) + 1);
      this.currentBar = Math.min(this.totalBars, Math.floor((this.currentBeat - 1) / 4) + 1);

      const beatFraction = (this.elapsedSec % beatSec) / beatSec;
      const quarterFreq = (this.lockedBpm / 60.0); // 1.0x beat frequency (quarter note)

      // =========================================================================
      // 1. DISTINCT TENSION CURVES: 4-BAR (SPRINT) vs 8-BAR (3-ACT THEATRICAL)
      // =========================================================================
      if (this.totalBars === 4) {
        // --- 4-BAR KINETIC SPRINT (16 Beats) ---
        if (this.currentBeat <= 4) {
          // Bar 1: 1/4 note pulse
          this.subdivision = 4;
          this.act = 1;
          this.strobeFreq = quarterFreq;
          this.slicerDepth = 0.15 * this.progress * 4.0;
          this.cameraTension = 0.10 * (this.progress / 0.25);
          this.highPass = 0.0;
          this.radialBlur = 0.0;
          this.chromatic = 0.10 * (this.progress / 0.25);
          this.retinalGhost = 0.10;
        } else if (this.currentBeat <= 8) {
          // Bar 2: 1/8 note subdivision
          this.subdivision = 8;
          this.act = 1;
          this.strobeFreq = quarterFreq * 2.0;
          const t = (this.progress - 0.25) / 0.25;
          this.slicerDepth = 0.15 + t * 0.30;
          this.cameraTension = 0.10 + t * 0.15;
          this.highPass = t * 0.35;
          this.radialBlur = t * 0.15;
          this.chromatic = 0.10 + t * 0.25;
          this.retinalGhost = 0.25;
        } else if (this.currentBeat <= 12) {
          // Bar 3: 1/16 note accelerated drive
          this.subdivision = 16;
          this.act = 2;
          this.strobeFreq = quarterFreq * 4.0;
          const t = (this.progress - 0.50) / 0.25;
          this.slicerDepth = 0.45 + t * 0.35;
          this.cameraTension = 0.25 + t * 0.15;
          this.highPass = 0.35 + t * 0.40;
          this.radialBlur = 0.15 + t * 0.45;
          this.chromatic = 0.35 + t * 0.35;
          this.retinalGhost = 0.50;
        } else {
          // Bar 4: 1/32 note flutter rushing to 60Hz audio-rate flutter
          this.subdivision = this.currentBeat <= 14 ? 32 : 64;
          this.act = 2;
          const t = (this.progress - 0.75) / 0.25;
          const subBase = quarterFreq * 8.0;
          this.strobeFreq = subBase + Math.pow(t, 1.6) * (maxFreq - subBase);
          this.slicerDepth = 0.80 + t * 0.20;
          this.cameraTension = 0.40 + t * 0.10;
          this.highPass = 0.75 + t * 0.25;
          this.radialBlur = 0.60 + t * 0.40;
          this.chromatic = 0.70 + t * 0.30;
          this.retinalGhost = 0.75;
          this.blinderIntensity = Math.pow(t, 1.4);
        }
      } else {
        // --- 8-BAR THEATRICAL NARRATIVE (32 Beats) ---
        if (this.currentBeat <= 12) {
          // ACT I: The Weightless Deconstruction (Bars 1-3)
          // As bass drops out, tension is created by floating and stripping gravity
          this.act = 1;
          this.subdivision = this.currentBeat <= 6 ? 2 : 4;
          this.strobeFreq = this.subdivision === 2 ? quarterFreq * 0.5 : quarterFreq;
          const t = this.progress / 0.375;
          // Camera gently breathes back before locking
          this.cameraTension = (Math.sin(t * Math.PI) * -0.06) + (t * 0.08);
          this.slicerDepth = t * 0.20;
          this.highPass = 0.0;
          this.radialBlur = 0.0;
          this.chromatic = t * 0.15;
          this.retinalGhost = 0.15;
          this.blinderIntensity = 0.0;
        } else if (this.currentBeat <= 24) {
          // ACT II: Rhythmic Inception & Fracture (Bars 4-6)
          // Snare roll begins; tight rhythmic subdivisions lock in
          this.act = 2;
          this.subdivision = this.currentBeat <= 18 ? 8 : 16;
          this.strobeFreq = this.subdivision === 8 ? quarterFreq * 2.0 : quarterFreq * 4.0;
          const t = (this.progress - 0.375) / 0.375;
          this.cameraTension = 0.08 + t * 0.24;
          this.slicerDepth = 0.20 + t * 0.45;
          this.highPass = t * 0.55;
          this.radialBlur = t * 0.35;
          this.chromatic = 0.15 + t * 0.40;
          this.retinalGhost = 0.35;
          this.blinderIntensity = 0.0;
        } else {
          // ACT III: Hyperspace Overdrive & Climax (Bars 7-8)
          // 1/32 flutter to audio-rate; full screen-space radial streak
          this.act = 3;
          this.subdivision = this.currentBeat <= 28 ? 32 : 64;
          const t = (this.progress - 0.75) / 0.25;
          const subBase = quarterFreq * 8.0;
          this.strobeFreq = subBase + Math.pow(t, 1.5) * (maxFreq - subBase);
          this.cameraTension = 0.32 + t * 0.18;
          this.slicerDepth = 0.65 + t * 0.35;
          this.highPass = 0.55 + t * 0.45;
          this.radialBlur = 0.35 + t * 0.65;
          this.chromatic = 0.55 + t * 0.45;
          this.retinalGhost = 0.80;
          this.blinderIntensity = Math.pow(t, 1.5);
        }
      }

      // 2. Optical Strobe Phase & Rhythmic Shutter Pulse
      this.strobePhase = (this.strobePhase + 2.0 * Math.PI * this.strobeFreq * dt) % (2.0 * Math.PI);
      // Duty cycle expands smoothly as energy rises: tight 22% sharp flash at start -> 68% flood at peak
      const duty = 0.22 + this.progress * 0.46;
      const isLit = (this.strobePhase / (2.0 * Math.PI)) < duty;
      this.strobePulse = isLit ? (0.70 + this.progress * 0.30) : 0.0;

      // 3. Climax Arrival: Hold 100% peak climax waiting for DJ's manual Pad 4 SLAM!
      if (this.elapsedSec >= this.totalDurationSec) {
        this.state = 'holding_climax';
        this.progress = 1.0;
        this.blinderIntensity = 1.0;
        this.cameraTension = 0.50;
        this.slicerDepth = 1.0;
        this.radialBlur = 1.0;
        this.highPass = 1.0;
        this.chromatic = 1.0;
        this.retinalGhost = 0.85;
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
      subdivision: this.subdivision,
      act: this.act,
      strobePulse: this.strobePulse,
      strobeFreq: this.strobeFreq,
      blinderIntensity: this.blinderIntensity,
      slicerDepth: this.slicerDepth,
      cameraTension: this.cameraTension,
      radialBlur: this.radialBlur,
      highPass: this.highPass,
      chromatic: this.chromatic,
      retinalGhost: this.retinalGhost,
      isBlackout: this.isBlackout,
      archetypeIndex: this.archetypeIndex,
      archetype: this.getCurrentArchetype(),
      autoCycle: this.autoCycle,
    };
  }
}
