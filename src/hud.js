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

    // Pads
    this.pad1 = document.getElementById('hud-pad-1');
    this.pad2 = document.getElementById('hud-pad-2');
    this.pad3 = document.getElementById('hud-pad-3');
    this.pad4 = document.getElementById('hud-pad-4');
    this.pad5 = document.getElementById('hud-pad-5');
    this.pad6 = document.getElementById('hud-pad-6');
    this.visualStyleEl = document.getElementById('hud-visual-style');
    this.hueStatusEl = document.getElementById('hud-hue-status');

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

  update(midiState, computedMidi, audioState) {
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
      this.bpmEl.textContent = `${Math.round(audioState.bpm)} BPM`;
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

    // 4. Performance Pads Active States
    if (this.pad1) this.pad1.classList.toggle('active', midiState.pads.pad1);
    if (this.pad2) this.pad2.classList.toggle('active', midiState.pads.pad2 || (window.threeEngine && window.threeEngine.hueFlowActive));
    if (this.pad3) this.pad3.classList.toggle('active', midiState.pads.pad3);
    if (this.pad4) this.pad4.classList.toggle('active', midiState.pads.pad4);
    if (this.pad5) this.pad5.classList.toggle('active', midiState.pads.pad5);
    if (this.pad6) this.pad6.classList.toggle('active', midiState.pads.pad6 || (audioState && audioState.dropMode === 'forced'));

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
