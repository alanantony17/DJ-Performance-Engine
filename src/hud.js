/**
 * DJ Performance Engine - Live Diagnostic & Hardware Telemetry HUD
 * Provides real-time visual feedback for AKAI MPK Mini 3, Web Audio FFT, and rendering FPS.
 */

import { CONFIG } from './config.js';

export class DiagnosticHud {
  constructor() {
    this.overlay = document.getElementById('hud-overlay');
    this.fpsEl = document.getElementById('hud-fps');
    this.bpmEl = document.getElementById('hud-bpm');
    this.midiDeviceEl = document.getElementById('hud-midi-device');
    this.midiRawEl = document.getElementById('hud-midi-raw');

    // Control Meters
    this.barPan = document.getElementById('hud-bar-pan');
    this.valPan = document.getElementById('hud-val-pan');
    this.barIris = document.getElementById('hud-bar-iris');
    this.valIris = document.getElementById('hud-val-iris');

    this.barK1 = document.getElementById('hud-bar-k1');
    this.valK1 = document.getElementById('hud-val-k1');
    this.barK2 = document.getElementById('hud-bar-k2');
    this.valK2 = document.getElementById('hud-val-k2');
    this.barK3 = document.getElementById('hud-bar-k3');
    this.valK3 = document.getElementById('hud-val-k3');
    this.barK4 = document.getElementById('hud-bar-k4');
    this.valK4 = document.getElementById('hud-val-k4');
    this.barK5 = document.getElementById('hud-bar-k5');
    this.valK5 = document.getElementById('hud-val-k5');

    // Bank A Pads
    this.pad1 = document.getElementById('hud-pad-1');
    this.pad2 = document.getElementById('hud-pad-2');
    this.pad3 = document.getElementById('hud-pad-3');
    this.pad4 = document.getElementById('hud-pad-4');
    this.pad5 = document.getElementById('hud-pad-5');
    this.pad6 = document.getElementById('hud-pad-6');
    this.pad7 = document.getElementById('hud-pad-7');
    this.pad8 = document.getElementById('hud-pad-8');
    // Bank B Pads
    this.padB1 = document.getElementById('hud-pad-b1');
    this.padB2 = document.getElementById('hud-pad-b2');
    this.padB3 = document.getElementById('hud-pad-b3');
    this.padB4 = document.getElementById('hud-pad-b4');
    this.padB5 = document.getElementById('hud-pad-b5');
    this.padB6 = document.getElementById('hud-pad-b6');
    this.padB7 = document.getElementById('hud-pad-b7');
    this.padB8 = document.getElementById('hud-pad-b8');
    this.visualStyleEl = document.getElementById('hud-visual-style');
    this.hueStatusEl = document.getElementById('hud-hue-status');
    this.repeatStatusEl = document.getElementById('hud-repeat-status') || document.getElementById('hud-slicer-status');
    this.slicerStatusEl = this.repeatStatusEl;
    this.armedRiserEl = document.getElementById('hud-armed-riser');
    this.loadedRepeatEl = document.getElementById('hud-loaded-repeat') || document.getElementById('hud-loaded-slicer');
    this.loadedSlicerEl = this.loadedRepeatEl;
    this.riserRotationEl = document.getElementById('hud-riser-rotation');
    this.framingStatusEl = document.getElementById('hud-framing-status');
    this.framingBtn = document.getElementById('hud-framing-btn');
    this.framingPadB2 = document.getElementById('hud-pad-b2');

    const triggerFramingCycle = (e) => {
      e.stopPropagation();
      if (window.threeEngine && window.threeEngine.cycleFramingMode) {
        window.threeEngine.cycleFramingMode();
      }
    };
    if (this.framingBtn) this.framingBtn.addEventListener('click', triggerFramingCycle);
    if (this.framingPadB2) this.framingPadB2.addEventListener('click', triggerFramingCycle);

    // BPM Header Controls
    this.bpmLockBadge = document.getElementById('hud-bpm-lock-badge');
    this.beatPulseEl = document.getElementById('hud-beat-pulse');
    this.bpmDownBtn = document.getElementById('hud-bpm-down');
    this.bpmUpBtn = document.getElementById('hud-bpm-up');
    this.bpmTapBtn = document.getElementById('hud-bpm-tap');

    if (this.bpmLockBadge) {
      this.bpmLockBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && window.audio.toggleBpmLock) {
          window.audio.toggleBpmLock();
        }
      });
    }

    if (this.bpmDownBtn) {
      this.bpmDownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && window.audio.adjustBpm) window.audio.adjustBpm(-1);
      });
    }
    if (this.bpmUpBtn) {
      this.bpmUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && window.audio.adjustBpm) window.audio.adjustBpm(1);
      });
    }
    if (this.bpmTapBtn) {
      this.bpmTapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && window.audio.tapTempo) window.audio.tapTempo();
      });
    }

    // Buildup Sequencer Telemetry
    this.buildupStatusEl = document.getElementById('hud-buildup-status');
    this.buildupBarEl = document.getElementById('hud-bar-buildup');

    // Drop Dynamics Controls
    this.dropBadge = document.getElementById('hud-drop-badge');
    this.dropBtn = document.getElementById('hud-drop-btn');
    const onDropToggle = (e) => {
      e.stopPropagation();
      if (window.audio && window.audio.toggleDropOverride) {
        window.audio.toggleDropOverride();
      }
    };
    if (this.dropBadge) this.dropBadge.addEventListener('click', onDropToggle);
    if (this.dropBtn) this.dropBtn.addEventListener('click', onDropToggle);

    // Listen for dynamic style change events
    window.addEventListener('engine:styleChanged', (e) => {
      if (this.visualStyleEl && e.detail && e.detail.style) {
        this.visualStyleEl.textContent = e.detail.style.name;
      }
    });

    // Listen for dynamic hue mode change events
    window.addEventListener('engine:hueModeChanged', (e) => {
      if (this.hueStatusEl && e.detail) {
        this.hueStatusEl.textContent = e.detail.name;
        this.hueStatusEl.style.color = e.detail.active ? '#22d3ee' : '#fbbf24';
      }
    });

    // Listen for dynamic beat repeat change events
    window.addEventListener('engine:beatRepeatChanged', (e) => {
      if (this.repeatStatusEl && e.detail) {
        if (e.detail.active && e.detail.style) {
          this.repeatStatusEl.textContent = `${e.detail.style.name.toUpperCase()} [${e.detail.index + 1}/4]`;
          this.repeatStatusEl.style.color = '#22d3ee';
        } else {
          this.repeatStatusEl.textContent = 'BYPASSED';
          this.repeatStatusEl.style.color = '#64748b';
        }
      }
      if (this.loadedRepeatEl && e.detail && e.detail.style) {
        this.loadedRepeatEl.textContent = `[${e.detail.index + 1}/4] ${e.detail.style.name}`;
      }
    });

    // Listen for dynamic slicer change events
    window.addEventListener('engine:slicerChanged', (e) => {
      if (this.slicerStatusEl && e.detail) {
        if (e.detail.active && e.detail.style) {
          this.slicerStatusEl.textContent = `${e.detail.style.name.toUpperCase()} [${e.detail.index + 1}/4]`;
          this.slicerStatusEl.style.color = '#22d3ee';
        } else {
          this.slicerStatusEl.textContent = 'OFF';
          this.slicerStatusEl.style.color = '#64748b';
        }
      }
    });

    // Listen for dynamic framing mode change events
    window.addEventListener('engine:framingChanged', (e) => {
      const label = e.detail && e.detail.info ? (e.detail.info.badge || e.detail.info.name.toUpperCase()) : 'WORLD FIELD';
      const color = e.detail.mode === 0 ? '#10b981' : (e.detail.mode === 1 ? '#06b6d4' : '#a855f7');
      if (this.framingStatusEl) {
        this.framingStatusEl.textContent = label;
        this.framingStatusEl.style.color = color;
      }
      const bEl = document.getElementById('hud-framing-status-b');
      if (bEl) {
        bEl.textContent = label;
        bEl.style.color = color;
      }
    });

    // Audio Meters & Source
    this.audioSourceEl = document.getElementById('hud-audio-source');
    this.barKick = document.getElementById('hud-bar-kick');
    this.valKick = document.getElementById('hud-val-kick');
    this.barPunch = document.getElementById('hud-bar-punch');
    this.valPunch = document.getElementById('hud-val-punch');
    this.barDrop = document.getElementById('hud-bar-drop');
    this.valDrop = document.getElementById('hud-val-drop');
    this.barHigh = document.getElementById('hud-bar-high');
    this.valHigh = document.getElementById('hud-val-high');

    // FPS Meter
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.currentFps = 60;
  }

  toggle() {
    if (this.overlay) {
      this.overlay.classList.toggle('hidden');
    }
  }

  show() {
    if (this.overlay) this.overlay.classList.remove('hidden');
  }

  hide() {
    if (this.overlay) this.overlay.classList.add('hidden');
  }

  update(midiState, computedMidi, audioState, buildupState = null) {
    if (!this.overlay || this.overlay.classList.contains('hidden')) return;

    // 1. Calculate FPS & Update BPM
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.fpsEl) this.fpsEl.textContent = `${this.currentFps} FPS`;
    }
    if (this.bpmEl && audioState && audioState.bpm) {
      this.bpmEl.textContent = `${audioState.bpm.toFixed(1)} BPM`;

      if (this.bpmLockBadge) {
        if (audioState.isBpmManual) {
          this.bpmLockBadge.textContent = '🔒 MANUAL';
          this.bpmLockBadge.style.background = 'rgba(59, 130, 246, 0.25)';
          this.bpmLockBadge.style.color = '#60a5fa';
          this.bpmLockBadge.style.borderColor = '#3b82f6';
        } else if (audioState.isBpmCoasting) {
          this.bpmLockBadge.textContent = '⚓ COAST';
          this.bpmLockBadge.style.background = 'rgba(6, 182, 212, 0.25)';
          this.bpmLockBadge.style.color = '#22d3ee';
          this.bpmLockBadge.style.borderColor = '#06b6d4';
        } else if (audioState.isBpmLocked) {
          const conf = Math.round((audioState.bpmConfidence || 1.0) * 100);
          this.bpmLockBadge.textContent = `🔒 LOCKED ${conf}%`;
          this.bpmLockBadge.style.background = 'rgba(34, 197, 94, 0.25)';
          this.bpmLockBadge.style.color = '#4ade80';
          this.bpmLockBadge.style.borderColor = '#22c55e';
        } else {
          const conf = Math.round((audioState.bpmConfidence || 0.0) * 100);
          this.bpmLockBadge.textContent = `⚡ SYNC ${conf}%`;
          this.bpmLockBadge.style.background = 'rgba(234, 179, 8, 0.25)';
          this.bpmLockBadge.style.color = '#fde047';
          this.bpmLockBadge.style.borderColor = '#eab308';
        }
      }

      if (this.beatPulseEl && audioState.beatIndex !== undefined) {
        const dots = ['○', '○', '○', '○'];
        dots[audioState.beatIndex % 4] = '●';
        this.beatPulseEl.textContent = dots.join(' ');
      }
    }

    // 2. MIDI Device Status
    if (this.midiDeviceEl) {
      this.midiDeviceEl.textContent = midiState.deviceName;
      this.midiDeviceEl.style.color = midiState.connected ? '#22c55e' : '#f59e0b';
    }
    if (this.midiRawEl) {
      this.midiRawEl.textContent = midiState.rawMessage;
    }

    // 3. Joystick & Knobs
    if (this.barPan) this.barPan.style.width = `${Math.round(computedMidi.panX * 100)}%`;
    if (this.valPan) this.valPan.textContent = computedMidi.panX.toFixed(2);

    if (this.barIris) this.barIris.style.width = `${Math.round(computedMidi.aperture * 100)}%`;
    if (this.valIris) this.valIris.textContent = computedMidi.aperture.toFixed(2);

    if (this.barK1) this.barK1.style.width = `${Math.round(midiState.knobs.knob1 * 100)}%`;
    if (this.valK1) this.valK1.textContent = `${computedMidi.strobeLfoHz.toFixed(1)} Hz`;

    if (this.barK2) this.barK2.style.width = `${Math.round(computedMidi.hydraHue * 100)}%`;
    if (this.valK2) this.valK2.textContent = computedMidi.hydraHue.toFixed(2);

    if (this.barK3) this.barK3.style.width = `${Math.round(midiState.knobs.knob3 * 100)}%`;
    if (this.valK3) this.valK3.textContent = (computedMidi.waveSpread || 2.5).toFixed(2);

    if (this.barK4) this.barK4.style.width = `${Math.round(midiState.knobs.knob4 * 100)}%`;
    if (this.valK4) this.valK4.textContent = `${computedMidi.audioSensitivity.toFixed(1)}x`;

    if (this.barK5) this.barK5.style.width = `${Math.round(computedMidi.dropThresholdNorm * 100)}%`;
    const k5Norm = computedMidi.dropThresholdNorm;
    let threshDesc = 'Sweet Spot';
    if (k5Norm < 0.35) threshDesc = 'Sensitive';
    else if (k5Norm > 0.65) threshDesc = 'Strict';
    if (this.valK5) this.valK5.textContent = `${Math.round(k5Norm * 100)}% (${threshDesc})`;

    // 4. Buildup Sequencer Telemetry
    if (this.buildupStatusEl) {
      if (buildupState && buildupState.state === 'building') {
        const pct = Math.round(buildupState.progress * 100);
        const subDesc = buildupState.subdivision ? ` [1/${buildupState.subdivision}]` : '';
        this.buildupStatusEl.textContent = `BAR ${buildupState.currentBar}/${buildupState.totalBars} (${pct}%)${subDesc} ${buildupState.strobeFreq.toFixed(0)}Hz`;
        this.buildupStatusEl.style.color = '#eab308';
        if (this.buildupBarEl) this.buildupBarEl.style.width = `${pct}%`;
      } else if (buildupState && buildupState.state === 'holding_climax') {
        const archName = buildupState.archetype?.name || 'CLIMAX';
        this.buildupStatusEl.textContent = `🔥 PEAK CLIMAX [${archName.toUpperCase()}] - HIT SLAM!`;
        this.buildupStatusEl.style.color = '#ef4444';
        if (this.buildupBarEl) this.buildupBarEl.style.width = '100%';
      } else if (buildupState && (buildupState.state === 'blackout_shut' || buildupState.isBlackout)) {
        this.buildupStatusEl.textContent = '🛑 PRE-DROP SHUT [BLACKOUT]';
        this.buildupStatusEl.style.color = '#ef4444';
        if (this.buildupBarEl) this.buildupBarEl.style.width = '100%';
      } else {
        this.buildupStatusEl.textContent = 'IDLE';
        this.buildupStatusEl.style.color = '#64748b';
        if (this.buildupBarEl) this.buildupBarEl.style.width = '0%';
      }
    }

    // 5. Performance Pads Active States (16-Pad Matrix across Bank A & Bank B)
    const isBuildActive = buildupState && (buildupState.state === 'building' || buildupState.state === 'holding_climax');
    const isBuild4 = isBuildActive && buildupState.totalBars === 4;
    const isBuild8 = isBuildActive && buildupState.totalBars === 8;
    const isShut = buildupState && (buildupState.state === 'blackout_shut' || buildupState.isBlackout);
    const slamActive = midiState.pads.pad4 || midiState.pads.padB4 || isShut;

    // --- BANK A: LIVE ACTION ---
    if (this.pad1) this.pad1.classList.toggle('active', midiState.pads.pad1 || isBuild4);
    if (this.pad2) this.pad2.classList.toggle('active', midiState.pads.pad2 || isBuild8);
    if (this.pad3) this.pad3.classList.toggle('active', midiState.pads.pad3);
    if (this.pad4) this.pad4.classList.toggle('active', slamActive);
    if (this.pad5) this.pad5.classList.toggle('active', midiState.pads.pad5);
    if (this.pad6) this.pad6.classList.toggle('active', midiState.pads.pad6 || (window.threeEngine && window.threeEngine.hueFlowActive));
    if (this.pad7) this.pad7.classList.toggle('active', midiState.pads.pad7 || (window.threeEngine && (window.threeEngine.beatRepeatActive || window.threeEngine.slicerActive)));
    if (this.pad8) this.pad8.classList.toggle('active', midiState.pads.pad8 || (window.threeEngine && window.threeEngine.negativeActive));

    // --- BANK B: ARMING & CONFIG ---
    if (this.padB1) this.padB1.classList.toggle('active', midiState.pads.padB1);
    if (this.padB2) this.padB2.classList.toggle('active', midiState.pads.padB2);
    if (this.padB3) this.padB3.classList.toggle('active', midiState.pads.padB3 || (audioState && audioState.dropMode === 'forced'));
    if (this.padB4) this.padB4.classList.toggle('active', slamActive);
    if (this.padB5) this.padB5.classList.toggle('active', midiState.pads.padB5 || (buildupState && buildupState.archetypeIndex === 0));
    if (this.padB6) this.padB6.classList.toggle('active', midiState.pads.padB6 || (buildupState && buildupState.archetypeIndex === 1));
    if (this.padB7) this.padB7.classList.toggle('active', midiState.pads.padB7 || (buildupState && buildupState.archetypeIndex === 2));
    if (this.padB8) this.padB8.classList.toggle('active', midiState.pads.padB8 || (buildupState && buildupState.archetypeIndex === 3));

    // Telemetry indicators
    if (this.repeatStatusEl && window.threeEngine) {
      if (window.threeEngine.beatRepeatActive) {
        const curStyle = window.threeEngine.beatRepeatStyles[window.threeEngine.beatRepeatIndex];
        this.repeatStatusEl.textContent = curStyle ? `${curStyle.name.toUpperCase()} [${window.threeEngine.beatRepeatIndex + 1}/4]` : 'ACTIVE';
        this.repeatStatusEl.style.color = '#22d3ee';
      } else if (window.threeEngine.slicerActive) {
        const styles = ['VENETIAN SLATS', 'RADIAL IRIS', 'CONCENTRIC DISCS', 'PRISM SHARDS'];
        const styleName = styles[window.threeEngine.slicerStyle] || 'ACTIVE';
        this.repeatStatusEl.textContent = `${styleName} [${window.threeEngine.slicerStyle + 1}/4]`;
        this.repeatStatusEl.style.color = '#22d3ee';
      } else {
        this.repeatStatusEl.textContent = 'BYPASSED';
        this.repeatStatusEl.style.color = '#64748b';
      }
    }

    if (this.armedRiserEl && buildupState) {
      const arch = buildupState.archetype;
      if (arch) {
        this.armedRiserEl.textContent = `[${buildupState.archetypeIndex + 1}/4] ${arch.name}`;
        this.armedRiserEl.style.color = arch.color || '#facc15';
      }
    }

    if (this.loadedRepeatEl && window.threeEngine) {
      const curStyle = window.threeEngine.beatRepeatStyles[window.threeEngine.beatRepeatIndex];
      if (curStyle) {
        this.loadedRepeatEl.textContent = `[${window.threeEngine.beatRepeatIndex + 1}/4] ${curStyle.name}`;
      }
    }

    if (this.riserRotationEl && buildupState) {
      this.riserRotationEl.textContent = buildupState.autoCycle ? 'Auto-Cycle (Round-Robin)' : 'Manual Locked';
      this.riserRotationEl.style.color = buildupState.autoCycle ? '#22c55e' : '#94a3b8';
    }

    // 5. Audio Transient Followers & Source
    if (audioState) {
      if (this.audioSourceEl && audioState.sourceName) {
        this.audioSourceEl.textContent = audioState.sourceName;
      }
      if (this.barKick) this.barKick.style.width = `${Math.round(Math.min(1.0, audioState.kickLevel) * 100)}%`;
      if (this.valKick) this.valKick.textContent = audioState.kickLevel.toFixed(2);

      const punch = audioState.kickPunch !== undefined ? audioState.kickPunch : audioState.kickLevel;
      if (this.barPunch) this.barPunch.style.width = `${Math.round(Math.min(1.0, punch / 1.5) * 100)}%`;
      if (this.valPunch) this.valPunch.textContent = punch.toFixed(2);

      const dropPct = Math.round((audioState.dropIntensity || 0) * 100);
      if (this.barDrop) this.barDrop.style.width = `${dropPct}%`;
      if (this.valDrop) this.valDrop.textContent = `${dropPct}%`;

      if (this.barHigh) this.barHigh.style.width = `${Math.round(Math.min(1.0, audioState.highLevel) * 100)}%`;
      if (this.valHigh) this.valHigh.textContent = audioState.highLevel.toFixed(2);

      // Dynamic Drop Dynamics Badge & 4/4 Kick Cadence Lock Status
      if (this.dropBadge) {
        const intensity = audioState.dropIntensity || 0;
        const mode = audioState.dropMode || 'auto';
        if (mode === 'forced') {
          this.dropBadge.className = 'hud-drop-badge drop';
          this.dropBadge.textContent = '🔥 FORCED DROP';
        } else if (mode === 'chill') {
          this.dropBadge.className = 'hud-drop-badge verse';
          this.dropBadge.textContent = '❄️ FORCED CHILL';
        } else if (intensity >= 0.50) {
          this.dropBadge.className = 'hud-drop-badge drop';
          this.dropBadge.textContent = `🔥 DROP / CHORUS (${Math.round(audioState.bpm)} BPM)`;
        } else if (intensity >= 0.22 || (audioState.kickCadenceLock && audioState.kickCadenceLock > 0.3)) {
          this.dropBadge.className = 'hud-drop-badge buildup';
          this.dropBadge.textContent = `⚡ BUILDING UP (${dropPct}%)`;
        } else {
          this.dropBadge.className = 'hud-drop-badge verse';
          this.dropBadge.textContent = '🌊 VERSE / CHILL';
        }
      }
    }
  }
}
