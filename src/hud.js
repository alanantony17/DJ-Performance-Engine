/**
 * DJ Performance Engine - Live Diagnostic & Hardware Telemetry HUD
 * Provides real-time visual feedback for AKAI MPK Mini 3, Web Audio FFT, and rendering FPS.
 */

import { CONFIG } from './config.js';

export class DiagnosticHud {
  constructor() {
    this.overlay = document.getElementById('hud-overlay');
    this.remoteUrlEl = document.getElementById('hud-remote-url');
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
    this.gratingStatusEl = document.getElementById('hud-grating-status') || document.getElementById('hud-repeat-status') || document.getElementById('hud-slicer-status');
    this.repeatStatusEl = this.gratingStatusEl;
    this.slicerStatusEl = this.repeatStatusEl;
    this.armedRiserEl = document.getElementById('hud-armed-riser');
    this.loadedGratingEl = document.getElementById('hud-loaded-grating') || document.getElementById('hud-loaded-repeat') || document.getElementById('hud-loaded-slicer');
    this.loadedRepeatEl = this.loadedGratingEl;
    this.loadedSlicerEl = this.loadedRepeatEl;
    this.riserRotationEl = document.getElementById('hud-riser-rotation');
    this.framingStatusEl = document.getElementById('hud-framing-status');
    this.framingBtn = document.getElementById('hud-framing-btn');
    this.framingPadB2 = document.getElementById('hud-pad-b2');
    this.laserStatusEl = document.getElementById('hud-laser-status');
    this.laserBtn = document.getElementById('hud-laser-btn');

    const triggerFramingCycle = (e) => {
      e.stopPropagation();
      if (window.threeEngine && window.threeEngine.cycleFramingMode) {
        window.threeEngine.cycleFramingMode();
      }
    };
    if (this.framingBtn) this.framingBtn.addEventListener('click', triggerFramingCycle);
    if (this.framingPadB2) this.framingPadB2.addEventListener('click', triggerFramingCycle);

    const triggerLaserToggle = (e) => {
      e.stopPropagation();
      if (window.threeEngine && window.threeEngine.toggleLaserPunch) {
        window.threeEngine.toggleLaserPunch();
      }
    };
    if (this.laserBtn) this.laserBtn.addEventListener('click', triggerLaserToggle);

    this.projectionStatusEl = document.getElementById('hud-projection-status');
    this.projectionBtn = document.getElementById('hud-projection-btn');
    if (this.projectionBtn) {
      this.projectionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.toggleCleanProjection) window.toggleCleanProjection();
      });
    }

    // Party Crate Selector Telemetry
    this.crateStatusEl = document.getElementById('hud-crate-status');
    this.crateBtn = document.getElementById('hud-crate-btn');
    if (this.crateBtn) {
      this.crateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.cycleCrate) window.cycleCrate();
      });
    }

    window.addEventListener('engine:crateChanged', (e) => {
      if (this.crateStatusEl && e.detail) {
        const { crateInfo, count } = e.detail;
        this.crateStatusEl.textContent = `${crateInfo.icon || '📦'} ${crateInfo.name} (${count})`;
        if (crateInfo.id === 'halloween') {
          this.crateStatusEl.style.color = '#f97316';
        } else if (crateInfo.id === 'diwali') {
          this.crateStatusEl.style.color = '#eab308';
        } else if (crateInfo.id === 'master') {
          this.crateStatusEl.style.color = '#38bdf8';
        } else if (crateInfo.id === 'kabir') {
          this.crateStatusEl.style.color = '#fbbf24';
        }
      }
    });

    window.addEventListener('engine:assetsDiscovered', (e) => {
      if (this.crateStatusEl && e.detail && e.detail.activeCrate && e.detail.crates) {
        const activeInfo = e.detail.crates.find(c => c.id === e.detail.activeCrate);
        if (activeInfo) {
          this.crateStatusEl.textContent = `${activeInfo.icon || '📦'} ${activeInfo.name} (${activeInfo.count})`;
          if (activeInfo.id === 'halloween') {
            this.crateStatusEl.style.color = '#f97316';
          } else if (activeInfo.id === 'diwali') {
            this.crateStatusEl.style.color = '#eab308';
          } else if (activeInfo.id === 'master') {
            this.crateStatusEl.style.color = '#38bdf8';
          } else if (activeInfo.id === 'kabir') {
            this.crateStatusEl.style.color = '#fbbf24';
          }
        }
      }
    });

    // BPM Header Controls
    this.bpmLockBadge = document.getElementById('hud-bpm-lock-badge');
    this.beatPulseEl = document.getElementById('hud-beat-pulse');
    this.bpmDownBtn = document.getElementById('hud-bpm-down');
    this.bpmUpBtn = document.getElementById('hud-bpm-up');
    this.bpmTapBtn = document.getElementById('hud-bpm-tap');

    if (this.bpmLockBadge) {
      this.bpmLockBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.audio && window.audio.togglePulseMode) {
          window.audio.togglePulseMode();
        } else if (window.audio && window.audio.toggleBpmLock) {
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

        // Listen for dynamic optical grating change events
    window.addEventListener('engine:gratingChanged', (e) => {
      if (this.gratingStatusEl && e.detail) {
        if (e.detail.active && e.detail.style) {
          this.gratingStatusEl.textContent = `${e.detail.style.badge || e.detail.style.name.toUpperCase()} ACTIVE`;
          this.gratingStatusEl.style.color = '#00f0ff';
        } else {
          this.gratingStatusEl.textContent = 'BYPASSED';
          this.gratingStatusEl.style.color = '#64748b';
        }
      }
      if (this.loadedGratingEl && e.detail && e.detail.style) {
        this.loadedGratingEl.textContent = `[${e.detail.index + 1}/4] ${e.detail.style.name}`;
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

    // Listen for dynamic projection mode change events
    window.addEventListener('engine:projectionModeChanged', (e) => {
      if (this.projectionStatusEl) {
        const active = e.detail && e.detail.active;
        this.projectionStatusEl.textContent = active ? 'CLEAN (100% VISUALS)' : 'OFF';
        this.projectionStatusEl.style.color = active ? '#c084fc' : '#64748b';
      }
    });

    // Listen for dynamic laser toggle events
    window.addEventListener('engine:serverIpDiscovered', (e) => {
      if (this.remoteUrlEl && e.detail && e.detail.ip) {
        this.remoteUrlEl.textContent = 'http://' + e.detail.ip + ':8000/remote';
      }
    });

    window.addEventListener('engine:laserToggled', (e) => {
      if (this.laserStatusEl) {
        const active = e.detail && e.detail.active;
        this.laserStatusEl.textContent = active ? 'VECTOR ACTIVE' : 'BYPASS';
        this.laserStatusEl.style.color = active ? '#00ff66' : '#64748b';
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

    // FPS Meter & DOM Throttle State
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.currentFps = 60;
    this._lastDomUpdateTime = 0;
    this._domCache = new WeakMap();
  }

  _setText(el, text) {
    if (!el) return;
    let rec = this._domCache.get(el);
    if (!rec) {
      rec = {};
      this._domCache.set(el, rec);
    }
    if (rec.text !== text) {
      rec.text = text;
      el.textContent = text;
    }
  }

  _setWidth(el, pctInt) {
    if (!el) return;
    let rec = this._domCache.get(el);
    if (!rec) {
      rec = {};
      this._domCache.set(el, rec);
    }
    if (rec.width !== pctInt) {
      rec.width = pctInt;
      el.style.width = `${pctInt}%`;
    }
  }

  _setColor(el, color) {
    if (!el) return;
    let rec = this._domCache.get(el);
    if (!rec) {
      rec = {};
      this._domCache.set(el, rec);
    }
    if (rec.color !== color) {
      rec.color = color;
      el.style.color = color;
    }
  }

  _setClass(el, className) {
    if (!el) return;
    let rec = this._domCache.get(el);
    if (!rec) {
      rec = {};
      this._domCache.set(el, rec);
    }
    if (rec.className !== className) {
      rec.className = className;
      el.className = className;
    }
  }

  _setActive(el, active) {
    if (!el) return;
    const isAct = Boolean(active);
    let rec = this._domCache.get(el);
    if (!rec) {
      rec = {};
      this._domCache.set(el, rec);
    }
    if (rec.active !== isAct) {
      rec.active = isAct;
      el.classList.toggle('active', isAct);
    }
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

    // 1. Calculate FPS on every frame, but throttle heavy DOM mutations to ~12Hz (85ms)
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
      this._setText(this.fpsEl, `${this.currentFps} FPS`);
    }

    if ((now - this._lastDomUpdateTime) < 85) return;
    this._lastDomUpdateTime = now;

    if (this.bpmEl && audioState && audioState.bpm) {
      this._setText(this.bpmEl, `${audioState.bpm.toFixed(1)} BPM`);

      if (this.bpmLockBadge) {
        let badgeKey = '';
        let badgeText = '';
        let bg = '';
        let col = '';
        let border = '';
        if (audioState.pulseMode) {
          badgeKey = 'pulse';
          badgeText = '💓 PULSE';
          bg = 'rgba(16, 185, 129, 0.28)';
          col = '#6ee7b7';
          border = '#10b981';
        } else if (audioState.isBpmManual) {
          badgeKey = 'manual';
          badgeText = '🔒 MANUAL';
          bg = 'rgba(59, 130, 246, 0.25)';
          col = '#60a5fa';
          border = '#3b82f6';
        } else if (audioState.isBpmCoasting) {
          badgeKey = 'coast';
          badgeText = '⚓ COAST';
          bg = 'rgba(6, 182, 212, 0.25)';
          col = '#22d3ee';
          border = '#06b6d4';
        } else if (audioState.isBpmLocked) {
          const conf = Math.round((audioState.bpmConfidence || 1.0) * 100);
          badgeKey = `locked_${conf}`;
          badgeText = `🔒 LOCKED ${conf}%`;
          bg = 'rgba(34, 197, 94, 0.25)';
          col = '#4ade80';
          border = '#22c55e';
        } else {
          const conf = Math.round((audioState.bpmConfidence || 0.0) * 100);
          badgeKey = `sync_${conf}`;
          badgeText = `⚡ SYNC ${conf}%`;
          bg = 'rgba(234, 179, 8, 0.25)';
          col = '#fde047';
          border = '#eab308';
        }
        if (this._lastBpmBadgeKey !== badgeKey) {
          this._lastBpmBadgeKey = badgeKey;
          this.bpmLockBadge.textContent = badgeText;
          this.bpmLockBadge.style.background = bg;
          this.bpmLockBadge.style.color = col;
          this.bpmLockBadge.style.borderColor = border;
        }
      }

      if (this.beatPulseEl && audioState.beatIndex !== undefined) {
        const bIdx = audioState.beatIndex % 4;
        if (this._lastBeatIdx !== bIdx) {
          this._lastBeatIdx = bIdx;
          const dots = ['○', '○', '○', '○'];
          dots[bIdx] = '●';
          this.beatPulseEl.textContent = dots.join(' ');
        }
      }
    }

    // 2. MIDI Device Status
    if (this.midiDeviceEl) {
      this._setText(this.midiDeviceEl, midiState.deviceName);
      this._setColor(this.midiDeviceEl, midiState.connected ? '#22c55e' : '#f59e0b');
    }
    this._setText(this.midiRawEl, midiState.rawMessage);

    // 3. Joystick & Knobs
    this._setWidth(this.barPan, Math.round(computedMidi.panX * 100));
    this._setText(this.valPan, computedMidi.panX.toFixed(2));

    this._setWidth(this.barIris, Math.round(computedMidi.aperture * 100));
    this._setText(this.valIris, computedMidi.aperture.toFixed(2));

    this._setWidth(this.barK1, Math.round(midiState.knobs.knob1 * 100));
    this._setText(this.valK1, `${computedMidi.strobeLfoHz.toFixed(1)} Hz`);

    this._setWidth(this.barK2, Math.round(computedMidi.hydraHue * 100));
    this._setText(this.valK2, computedMidi.hydraHue.toFixed(2));

    this._setWidth(this.barK3, Math.round(midiState.knobs.knob3 * 100));
    this._setText(this.valK3, (computedMidi.waveSpread || 2.5).toFixed(2));

    this._setWidth(this.barK4, Math.round(midiState.knobs.knob4 * 100));
    this._setText(this.valK4, `${computedMidi.audioSensitivity.toFixed(1)}x`);

    const k5Norm = computedMidi.dropThresholdNorm;
    const k5Pct = Math.round(k5Norm * 100);
    this._setWidth(this.barK5, k5Pct);
    let threshDesc = 'Sweet Spot';
    if (k5Norm < 0.35) threshDesc = 'Sensitive';
    else if (k5Norm > 0.65) threshDesc = 'Strict';
    this._setText(this.valK5, `${k5Pct}% (${threshDesc})`);

    // 4. Buildup Sequencer Telemetry
    if (this.buildupStatusEl) {
      if (buildupState && buildupState.state === 'building') {
        const pct = Math.round(buildupState.progress * 100);
        const subDesc = buildupState.subdivision ? ` [1/${buildupState.subdivision}]` : '';
        this._setText(this.buildupStatusEl, `BAR ${buildupState.currentBar}/${buildupState.totalBars} (${pct}%)${subDesc} ${buildupState.strobeFreq.toFixed(0)}Hz`);
        this._setColor(this.buildupStatusEl, '#eab308');
        this._setWidth(this.buildupBarEl, pct);
      } else if (buildupState && buildupState.state === 'holding_climax') {
        const archName = buildupState.archetype?.name || 'CLIMAX';
        this._setText(this.buildupStatusEl, `🔥 PEAK CLIMAX [${archName.toUpperCase()}] - HIT SLAM!`);
        this._setColor(this.buildupStatusEl, '#ef4444');
        this._setWidth(this.buildupBarEl, 100);
      } else if (buildupState && (buildupState.state === 'blackout_shut' || buildupState.isBlackout)) {
        this._setText(this.buildupStatusEl, '🛑 PRE-DROP SHUT [BLACKOUT]');
        this._setColor(this.buildupStatusEl, '#ef4444');
        this._setWidth(this.buildupBarEl, 100);
      } else {
        this._setText(this.buildupStatusEl, 'IDLE');
        this._setColor(this.buildupStatusEl, '#64748b');
        this._setWidth(this.buildupBarEl, 0);
      }
    }

    // 5. Performance Pads Active States (16-Pad Matrix across Bank A & Bank B)
    const isBuildActive = buildupState && (buildupState.state === 'building' || buildupState.state === 'holding_climax');
    const isBuild4 = isBuildActive && buildupState.totalBars === 4;
    const isBuild8 = isBuildActive && buildupState.totalBars === 8;
    const isShut = buildupState && (buildupState.state === 'blackout_shut' || buildupState.isBlackout);
    const slamActive = midiState.pads.pad4 || midiState.pads.padB4 || isShut;

    // --- BANK A: LIVE ACTION ---
    this._setActive(this.pad1, midiState.pads.pad1 || isBuild4);
    this._setActive(this.pad2, midiState.pads.pad2 || isBuild8);
    this._setActive(this.pad3, midiState.pads.pad3);
    this._setActive(this.pad4, slamActive);
    this._setActive(this.pad5, midiState.pads.pad5);
    this._setActive(this.pad6, midiState.pads.pad6 || (window.threeEngine && window.threeEngine.hueFlowActive));
    this._setActive(this.pad7, midiState.pads.pad7 || (window.threeEngine && (window.threeEngine.gratingActive || window.threeEngine.beatRepeatActive || window.threeEngine.slicerActive)));
    this._setActive(this.pad8, midiState.pads.pad8 || (window.threeEngine && window.threeEngine.negativeActive));

    // --- BANK B: ARMING & CONFIG ---
    this._setActive(this.padB1, midiState.pads.padB1);
    this._setActive(this.padB2, midiState.pads.padB2);
    this._setActive(this.padB3, midiState.pads.padB3 || (audioState && audioState.dropMode === 'forced'));
    this._setActive(this.padB4, slamActive);
    this._setActive(this.padB5, midiState.pads.padB5 || (buildupState && buildupState.archetypeIndex === 0));
    this._setActive(this.padB6, midiState.pads.padB6 || (buildupState && buildupState.archetypeIndex === 1));
    this._setActive(this.padB7, midiState.pads.padB7 || (buildupState && buildupState.archetypeIndex === 2));
    this._setActive(this.padB8, midiState.pads.padB8 || (buildupState && buildupState.archetypeIndex === 3));

    // Telemetry indicators
    if (this.gratingStatusEl && window.threeEngine) {
      if (window.threeEngine.gratingActive) {
        const curStyle = window.threeEngine.gratingStyles[window.threeEngine.gratingStyle];
        const isBuilding = buildupState && (buildupState.state === 'building' || buildupState.state === 'holding_climax');
        const badge = curStyle ? (curStyle.badge || curStyle.name.toUpperCase()) : 'GRATING';
        if (isBuilding) {
          this._setText(this.gratingStatusEl, `${badge} (RISER SYNC)`);
          this._setColor(this.gratingStatusEl, '#facc15');
        } else {
          this._setText(this.gratingStatusEl, `${badge} ACTIVE`);
          this._setColor(this.gratingStatusEl, '#00f0ff');
        }
      } else if (window.threeEngine.beatRepeatActive) {
        const curStyle = window.threeEngine.beatRepeatStyles[window.threeEngine.beatRepeatIndex];
        this._setText(this.gratingStatusEl, curStyle ? `${curStyle.name.toUpperCase()} [${window.threeEngine.beatRepeatIndex + 1}/4]` : 'ACTIVE');
        this._setColor(this.gratingStatusEl, '#22d3ee');
      } else {
        this._setText(this.gratingStatusEl, 'BYPASSED');
        this._setColor(this.gratingStatusEl, '#64748b');
      }
    }

    if (this.armedRiserEl && buildupState) {
      const arch = buildupState.archetype;
      if (arch) {
        this._setText(this.armedRiserEl, `[${buildupState.archetypeIndex + 1}/4] ${arch.name}`);
        this._setColor(this.armedRiserEl, arch.color || '#facc15');
      }
    }

    if (this.loadedGratingEl && window.threeEngine) {
      const curStyle = window.threeEngine.gratingStyles ? window.threeEngine.gratingStyles[window.threeEngine.gratingStyle] : null;
      if (curStyle) {
        this._setText(this.loadedGratingEl, `[${window.threeEngine.gratingStyle + 1}/4] ${curStyle.name}`);
      }
    }

    if (this.riserRotationEl && buildupState) {
      this._setText(this.riserRotationEl, buildupState.autoCycle ? 'Auto-Cycle (Round-Robin)' : 'Manual Locked');
      this._setColor(this.riserRotationEl, buildupState.autoCycle ? '#22c55e' : '#94a3b8');
    }

    if (this.laserStatusEl && window.threeEngine) {
      if (window.threeEngine.laserManualPunch) {
        this._setText(this.laserStatusEl, 'PUNCH ACTIVE');
        this._setColor(this.laserStatusEl, '#00ff66');
      } else if (buildupState && buildupState.state === 'building' && (buildupState.highPass || 0) > 0.05) {
        const hpPct = Math.round((buildupState.highPass || 0) * 100);
        this._setText(this.laserStatusEl, `BUILDUP (${hpPct}%)`);
        this._setColor(this.laserStatusEl, '#22d3ee');
      } else {
        this._setText(this.laserStatusEl, 'BYPASS');
        this._setColor(this.laserStatusEl, '#64748b');
      }
    }

    if (this.projectionStatusEl) {
      const isClean = document.body.classList.contains('clean-projection');
      this._setText(this.projectionStatusEl, isClean ? 'CLEAN (100% VISUALS)' : 'OFF');
      this._setColor(this.projectionStatusEl, isClean ? '#c084fc' : '#64748b');
    }

    // 5. Audio Transient Followers & Source
    if (audioState) {
      if (this.audioSourceEl) {
        this._setText(
          this.audioSourceEl,
          audioState.pulseMode
            ? `💓 BPM Pulse (${Math.round(audioState.bpm || 128)} BPM)`
            : (audioState.sourceName || 'Default Mic')
        );
      }
      this._setWidth(this.barKick, Math.round(Math.min(1.0, audioState.kickLevel) * 100));
      this._setText(this.valKick, audioState.kickLevel.toFixed(2));

      const punch = audioState.kickPunch !== undefined ? audioState.kickPunch : audioState.kickLevel;
      this._setWidth(this.barPunch, Math.round(Math.min(1.0, punch / 1.5) * 100));
      this._setText(this.valPunch, punch.toFixed(2));

      const dropPct = Math.round((audioState.dropIntensity || 0) * 100);
      this._setWidth(this.barDrop, dropPct);
      this._setText(this.valDrop, `${dropPct}%`);

      this._setWidth(this.barHigh, Math.round(Math.min(1.0, audioState.highLevel) * 100));
      this._setText(this.valHigh, audioState.highLevel.toFixed(2));

      // Dynamic Drop Dynamics Badge & 4/4 Kick Cadence Lock Status
      if (this.dropBadge) {
        const intensity = audioState.dropIntensity || 0;
        const mode = audioState.dropMode || 'auto';
        if (mode === 'forced') {
          this._setClass(this.dropBadge, 'hud-drop-badge drop');
          this._setText(this.dropBadge, '🔥 FORCED DROP');
        } else if (mode === 'chill') {
          this._setClass(this.dropBadge, 'hud-drop-badge verse');
          this._setText(this.dropBadge, '❄️ FORCED CHILL');
        } else if (intensity >= 0.50) {
          this._setClass(this.dropBadge, 'hud-drop-badge drop');
          this._setText(this.dropBadge, `🔥 DROP / CHORUS (${Math.round(audioState.bpm)} BPM)`);
        } else if (intensity >= 0.22 || (audioState.kickCadenceLock && audioState.kickCadenceLock > 0.3)) {
          this._setClass(this.dropBadge, 'hud-drop-badge buildup');
          this._setText(this.dropBadge, `⚡ BUILDING UP (${dropPct}%)`);
        } else {
          this._setClass(this.dropBadge, 'hud-drop-badge verse');
          this._setText(this.dropBadge, '🌊 VERSE / CHILL');
        }
      }
    }
  }
}
