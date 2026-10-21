/**
 * DJ Performance Engine - Web MIDI API Interface
 * Direct hardware connection to AKAI MPK Mini 3 with zero simulated keystrokes.
 */

import { CONFIG } from './config.js';

export class MidiController {
  constructor(options = {}) {
    this.onStateChange = options.onStateChange || (() => {});
    this.onPadTrigger = options.onPadTrigger || (() => {});
    this.onAnyInput = options.onAnyInput || (() => {});
    this.onBpmAdjust = options.onBpmAdjust || (() => {});
    this.onTapTempo = options.onTapTempo || (() => {});

    // Live Controller State (Normalized 0.0 - 1.0 where applicable)
    this.state = {
      connected: false,
      deviceName: 'Disconnected',
      rawMessage: 'None',
      joystick: {
        pan: CONFIG.midi.joystick.panDefault, // 0.0 (left) to 1.0 (right)
        aperture: CONFIG.midi.joystick.apertureDefault, // 0.0 (slit) to 1.0 (wash)
      },
      knobs: {
        knob1: (CONFIG.midi.knobs.knob1.default - CONFIG.midi.knobs.knob1.min) / (CONFIG.midi.knobs.knob1.max - CONFIG.midi.knobs.knob1.min),
        knob2: CONFIG.midi.knobs.knob2.default,
        knob3: CONFIG.midi.knobs.knob3.default,
        knob4: (CONFIG.midi.knobs.knob4.default - CONFIG.midi.knobs.knob4.min) / (CONFIG.midi.knobs.knob4.max - CONFIG.midi.knobs.knob4.min),
        knob5: CONFIG.midi.knobs.knob5 ? (CONFIG.midi.knobs.knob5.default - CONFIG.midi.knobs.knob5.min) / (CONFIG.midi.knobs.knob5.max - CONFIG.midi.knobs.knob5.min) : 0.5,
      },
      pads: {
        // Bank A: Live Performance
        pad1: false, pad2: false, pad3: false, pad4: false,
        pad5: false, pad6: false, pad7: false, pad8: false,
        // Bank B: Configuration & Arming
        padB1: false, padB2: false, padB3: false, padB4: false,
        padB5: false, padB6: false, padB7: false, padB8: false,
      },
      padVelocities: {
        pad1: 0, pad2: 0, pad3: 0, pad4: 0, pad5: 0, pad6: 0, pad7: 0, pad8: 0,
        padB1: 0, padB2: 0, padB3: 0, padB4: 0, padB5: 0, padB6: 0, padB7: 0, padB8: 0,
      }
    };

    this.midiAccess = null;
    this.onPadRelease = null;
    this.initMidi();
    this.initKeyboardFallback();
  }

  async initMidi() {
    if (!navigator.requestMIDIAccess) {
      console.warn('[MIDI] Web MIDI API not supported in this browser environment.');
      this.state.deviceName = 'Web MIDI Not Supported';
      this.notify();
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      console.log('[MIDI] Web MIDI Access Granted.');

      this.midiAccess.onstatechange = (e) => this.handleDeviceStateChange(e);
      this.bindInputs();
    } catch (err) {
      console.error('[MIDI] Failed to access MIDI devices:', err);
      this.state.deviceName = 'Access Denied / Error';
      this.notify();
    }
  }

  bindInputs() {
    if (!this.midiAccess) return;

    const inputs = Array.from(this.midiAccess.inputs.values());

    // Clear any previous listeners on all ports to prevent duplicate/dangling callbacks
    inputs.forEach(input => {
      input.onmidimessage = null;
    });

    // 1. Explicitly isolate AKAI MPK Mini
    const mpkInputs = inputs.filter(i => i.name && i.name.toLowerCase().includes('mpk'));

    if (mpkInputs.length > 0) {
      this.state.connected = true;
      this.state.deviceName = mpkInputs[0].name || 'AKAI MPK Mini';
      console.log(`[MIDI] Exclusively connected to MPK Mini: ${this.state.deviceName}`);

      mpkInputs.forEach(input => {
        input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      });
    } else if (inputs.length > 0) {
      // 2. Safe fallback: exclude DJ controllers (Pioneer, DDJ, FLX) so Rekordbox stays untouched
      const safeInputs = inputs.filter(i => {
        const name = (i.name || '').toLowerCase();
        return !name.includes('flx') && !name.includes('ddj') && !name.includes('pioneer');
      });

      if (safeInputs.length > 0) {
        this.state.connected = true;
        this.state.deviceName = safeInputs[0].name || 'Generic MIDI Device';
        console.log(`[MIDI] MPK not found. Connected to non-DJ controller: ${this.state.deviceName}`);
        safeInputs.forEach(input => {
          input.onmidimessage = (msg) => this.handleMidiMessage(msg);
        });
      } else {
        this.state.connected = false;
        this.state.deviceName = 'DJ Controller Ignored (No MPK)';
        console.log('[MIDI] Only DJ controllers (DDJ-FLX4/Pioneer) detected. Ignoring to protect Rekordbox.');
      }
    } else {
      this.state.connected = false;
      this.state.deviceName = 'No MIDI device found';
      console.log('[MIDI] No MIDI input devices currently connected.');
    }
    this.notify();
  }

  handleDeviceStateChange(e) {
    console.log(`[MIDI] Port state change: ${e.port.name} (${e.port.state})`);
    this.bindInputs();
  }

  handleMidiMessage(event) {
    const data = event.data;
    if (!data || data.length < 2) return;

    this.onAnyInput(); // Wake up Web Audio context if suspended

    const status = data[0];
    const messageType = status & 0xF0; // Mask out channel
    const d1 = data[1];
    const d2 = data.length > 2 ? data[2] : 0;

    this.state.rawMessage = `0x${status.toString(16).toUpperCase()} ${d1} ${d2}`;

    switch (messageType) {
      // Note On
      case 0x90:
        if (d2 > 0) {
          this.handleNote(d1, d2, true);
        } else {
          this.handleNote(d1, 0, false);
        }
        break;

      // Note Off
      case 0x80:
        this.handleNote(d1, 0, false);
        break;

      // Control Change
      case 0xB0:
        this.handleControlChange(d1, d2);
        break;

      // Pitch Bend (Joystick X-Axis)
      case 0xE0:
        this.handlePitchBend(d1, d2);
        break;

      // Program Change (0xC0) - often sent by octave/prog buttons on AKAI
      case 0xC0:
        if (d1 === 0 || d1 === 127) {
          this.onBpmAdjust(d1 === 0 ? -1 : 1);
        } else {
          this.onBpmAdjust(1);
        }
        break;

      default:
        break;
    }

    this.notify();
  }

  handlePitchBend(d1, d2) {
    // 14-bit resolution: (d2 << 7) | d1, range 0 to 16383, center is 8192
    const rawVal = (d2 << 7) | d1;
    const normalized = Math.max(0, Math.min(1, rawVal / 16383));
    this.state.joystick.pan = normalized;
  }

  handleControlChange(cc, value) {
    const normalized = value / 127;

    // Joystick Modulation (Y-Axis Aperture)
    if (cc === CONFIG.midi.joystick.apertureCC) {
      const min = CONFIG.midi.joystick.apertureMin;
      const max = CONFIG.midi.joystick.apertureMax;
      this.state.joystick.aperture = min + normalized * (max - min);
      return;
    }

    // Joystick Fallback CC for Pan
    if (cc === CONFIG.midi.joystick.panCC) {
      this.state.joystick.pan = normalized;
      return;
    }

    // Rotary Knobs (CC 70 - 74)
    if (cc === CONFIG.midi.knobs.knob1.cc) {
      this.state.knobs.knob1 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob2.cc) {
      this.state.knobs.knob2 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob3.cc) {
      this.state.knobs.knob3 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob4.cc) {
      this.state.knobs.knob4 = normalized;
    } else if (CONFIG.midi.knobs.knob5 && cc === CONFIG.midi.knobs.knob5.cc) {
      this.state.knobs.knob5 = normalized;
    }

    // Octave / Program / BPM CC mappings (CC 14/15)
    if (cc === 14) {
      if (value > 0) this.onBpmAdjust(-1);
      return;
    }
    if (cc === 15) {
      if (value > 0) this.onBpmAdjust(1);
      return;
    }
    if (cc === 64) {
      // Tap Tempo via Sustain Pedal
      if (value > 64) this.onTapTempo();
      return;
    }

    // CC Pad Triggers (all 16 pads supported across Bank A and B)
    const pads = CONFIG.midi.pads;
    for (const padKey of Object.keys(pads)) {
      const padCfg = pads[padKey];
      if (padCfg && padCfg.cc === cc) {
        this.triggerPad(padKey, value > 0, normalized);
        break;
      }
    }
  }

  handleNote(note, velocity, isDown) {
    const normVel = velocity / 127;
    const pads = CONFIG.midi.pads;

    for (const padKey of Object.keys(pads)) {
      const padCfg = pads[padKey];
      if (padCfg && padCfg.notes && padCfg.notes.includes(note)) {
        this.triggerPad(padKey, isDown, normVel);
        break;
      }
    }
  }

  triggerPad(padId, isPressed, velocity = 1.0) {
    const wasPressed = this.state.pads[padId];
    this.state.pads[padId] = isPressed;
    this.state.padVelocities[padId] = isPressed ? velocity : 0;

    if (isPressed && !wasPressed) {
      if (this.onPadTrigger) this.onPadTrigger(padId, velocity);
    } else if (!isPressed && wasPressed) {
      if (this.onPadRelease) this.onPadRelease(padId);
    }
    this.notify();
  }

  // Keyboard Simulation Fallback for Testing without Hardware
  initKeyboardFallback() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const kb = CONFIG.midi.keyboardFallback;

      // Digits 1-8: Bank A normally, Bank B with Shift
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 8) {
          const padKey = e.shiftKey ? `padB${digit}` : `pad${digit}`;
          this.triggerPad(padKey, true, 1.0);
          return;
        }
      }

      if (e.code === kb.cycleStyleKey) this.triggerPad('pad5', true, 1.0);
      else if (e.code === kb.toggleDropKey) this.triggerPad('padB3', true, 1.0);
      else if (e.code === kb.toggleGratingKey || e.code === kb.toggleSlicerKey) this.triggerPad('pad7', true, 1.0);
      else if (e.code === kb.toggleNegativeKey) this.triggerPad('pad8', true, 1.0);
      else if (e.code === kb.resetPan) {
        this.state.joystick.pan = 0.5;
        this.notify();
      }
      // Arrow keys for Pan & Aperture
      else if (e.code === 'ArrowLeft') {
        this.state.joystick.pan = Math.max(0, this.state.joystick.pan - 0.05);
        this.notify();
      } else if (e.code === 'ArrowRight') {
        this.state.joystick.pan = Math.min(1, this.state.joystick.pan + 0.05);
        this.notify();
      } else if (e.code === 'ArrowUp') {
        this.state.joystick.aperture = Math.min(CONFIG.midi.joystick.apertureMax, this.state.joystick.aperture + 0.05);
        this.notify();
      } else if (e.code === 'ArrowDown') {
        this.state.joystick.aperture = Math.max(CONFIG.midi.joystick.apertureMin, this.state.joystick.aperture - 0.05);
        this.notify();
      }
      // Knob 1 (LFO Rate): Q / A
      else if (e.code === 'KeyQ') {
        this.state.knobs.knob1 = Math.min(1, this.state.knobs.knob1 + 0.08);
        this.notify();
      } else if (e.code === 'KeyA') {
        this.state.knobs.knob1 = Math.max(0, this.state.knobs.knob1 - 0.08);
        this.notify();
      }
      // Knob 2 (Hydra Hue): W / S
      else if (e.code === 'KeyW') {
        this.state.knobs.knob2 = (this.state.knobs.knob2 + 0.05) % 1.0;
        this.notify();
      } else if (e.code === 'KeyS') {
        this.state.knobs.knob2 = (this.state.knobs.knob2 - 0.05 + 1.0) % 1.0;
        this.notify();
      }
      // Knob 3 (Feedback Trails): E / Z
      else if (e.code === 'KeyE') {
        this.state.knobs.knob3 = Math.min(1, this.state.knobs.knob3 + 0.05);
        this.notify();
      } else if (e.code === 'KeyZ') {
        this.state.knobs.knob3 = Math.max(0, this.state.knobs.knob3 - 0.05);
        this.notify();
      }
      // Knob 4 (Audio Gain): R / F
      else if (e.code === 'KeyR') {
        this.state.knobs.knob4 = Math.min(1, this.state.knobs.knob4 + 0.08);
        this.notify();
      } else if (e.code === 'KeyF') {
        this.state.knobs.knob4 = Math.max(0, this.state.knobs.knob4 - 0.08);
        this.notify();
      }
      // Knob 5 (Drop Threshold): T / G
      else if (e.code === kb.knob5Up) {
        this.state.knobs.knob5 = Math.min(1, (this.state.knobs.knob5 !== undefined ? this.state.knobs.knob5 : 0.5) + 0.05);
        this.notify();
      } else if (e.code === kb.knob5Down) {
        this.state.knobs.knob5 = Math.max(0, (this.state.knobs.knob5 !== undefined ? this.state.knobs.knob5 : 0.5) - 0.05);
        this.notify();
      }
      // BPM Tempo Adjust: [ and ] or - and =
      else if (e.code === kb.bpmDown || e.code === 'Minus' || e.code === 'BracketLeft') {
        const delta = e.shiftKey ? -5 : -1;
        this.onBpmAdjust(delta);
      } else if (e.code === kb.bpmUp || e.code === 'Equal' || e.code === 'BracketRight') {
        const delta = e.shiftKey ? 5 : 1;
        this.onBpmAdjust(delta);
      } else if (e.code === kb.tapTempo || e.code === 'Backslash') {
        this.onTapTempo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 8) {
          this.triggerPad(`pad${digit}`, false, 0);
          this.triggerPad(`padB${digit}`, false, 0);
          return;
        }
      }
      const kb = CONFIG.midi.keyboardFallback;
      if (e.code === kb.cycleStyleKey) this.triggerPad('pad5', false, 0);
      else if (e.code === kb.toggleDropKey) this.triggerPad('padB3', false, 0);
      else if (e.code === kb.toggleGratingKey || e.code === kb.toggleSlicerKey) this.triggerPad('pad7', false, 0);
      else if (e.code === kb.toggleNegativeKey) this.triggerPad('pad8', false, 0);
    });

    // Optional mouse drag for Joystick testing
    window.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) { // Left mouse click drag
        this.state.joystick.pan = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
        this.state.joystick.aperture = Math.max(CONFIG.midi.joystick.apertureMin, Math.min(CONFIG.midi.joystick.apertureMax, 1 - (e.clientY / window.innerHeight)));
        this.notify();
      }
    });
  }

  // Compute scaled values based on config boundaries
  getComputedValues() {
    const k = CONFIG.midi.knobs;
    const k5Norm = this.state.knobs.knob5 !== undefined ? this.state.knobs.knob5 : 0.5;
    return {
      panX: this.state.joystick.pan, // 0.0 - 1.0
      aperture: this.state.joystick.aperture, // 0.03 - 1.0
      strobeLfoHz: k.knob1.min + this.state.knobs.knob1 * (k.knob1.max - k.knob1.min),
      hydraHue: k.knob2.min + this.state.knobs.knob2 * (k.knob2.max - k.knob2.min),
      waveSpread: k.knob3.min + this.state.knobs.knob3 * (k.knob3.max - k.knob3.min),
      hydraFeedback: k.knob3.min + this.state.knobs.knob3 * (k.knob3.max - k.knob3.min),
      audioSensitivity: k.knob4.min + this.state.knobs.knob4 * (k.knob4.max - k.knob4.min),
      dropThreshold: k.knob5 ? (k.knob5.min + k5Norm * (k.knob5.max - k.knob5.min)) : 0.50,
      dropThresholdNorm: k5Norm,
      // BANK A: Live Performance
      padBuildup4: this.state.pads.pad1,
      padBuildup8: this.state.pads.pad2,
      padAssetCycle: this.state.pads.pad3,
      padSlam: this.state.pads.pad4 || this.state.pads.padB4, // SLAM ON BOTH BANKS!
      padStyle: this.state.pads.pad5,
      padHueFlow: this.state.pads.pad6,
      padSlicer: this.state.pads.pad7,
      padNegative: this.state.pads.pad8,
      // BANK B: Arming & Configuration
      padBSlicerCycle: this.state.pads.padB1,
      padBRiserAutoCycle: this.state.pads.padB2,
      padBDrop: this.state.pads.padB3,
      padBSlam: this.state.pads.padB4,
      padBArmRiser0: this.state.pads.padB5,
      padBArmRiser1: this.state.pads.padB6,
      padBArmRiser2: this.state.pads.padB7,
      padBArmRiser3: this.state.pads.padB8,
      // Legacy aliases for backward compatibility:
      padRiser: this.state.pads.pad1,
      padShutter: this.state.pads.pad2,
      padAsset: this.state.pads.pad3,
      padDrop: this.state.pads.padB3,
    };
  }

  notify() {
    this.onStateChange(this.state, this.getComputedValues());
  }
}
