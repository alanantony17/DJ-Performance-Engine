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
      },
      pads: {
        pad1: false, // Snare Riser
        pad2: false, // Shutter Blinders
        pad3: false, // Asset Cycle
        pad4: false, // DROP SLAM
        pad5: false, // Visual Style Cycle
      },
      padVelocities: {
        pad1: 0,
        pad2: 0,
        pad3: 0,
        pad4: 0,
        pad5: 0,
      }
    };

    this.midiAccess = null;
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
    if (inputs.length === 0) {
      this.state.connected = false;
      this.state.deviceName = 'No MIDI device found';
      console.log('[MIDI] No MIDI input devices currently connected.');
    } else {
      this.state.connected = true;
      // Prefer MPK Mini if found, otherwise use first device
      const mpk = inputs.find(i => i.name && i.name.toLowerCase().includes('mpk'));
      const activeDevice = mpk || inputs[0];
      this.state.deviceName = activeDevice.name || 'Generic MIDI Device';
      console.log(`[MIDI] Connected to: ${this.state.deviceName}`);

      inputs.forEach(input => {
        input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      });
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

    // Rotary Knobs (CC 70 - 73)
    if (cc === CONFIG.midi.knobs.knob1.cc) {
      this.state.knobs.knob1 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob2.cc) {
      this.state.knobs.knob2 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob3.cc) {
      this.state.knobs.knob3 = normalized;
    } else if (cc === CONFIG.midi.knobs.knob4.cc) {
      this.state.knobs.knob4 = normalized;
    }

    // CC Pad Triggers (in case AKAI is in CC pad bank mode)
    if (cc === CONFIG.midi.pads.pad1.cc) {
      this.triggerPad('pad1', value > 0, normalized);
    } else if (cc === CONFIG.midi.pads.pad2.cc) {
      this.triggerPad('pad2', value > 0, normalized);
    } else if (cc === CONFIG.midi.pads.pad3.cc && value > 0) {
      this.triggerPad('pad3', true, normalized);
    } else if (cc === CONFIG.midi.pads.pad4.cc) {
      this.triggerPad('pad4', value > 0, normalized);
    } else if (cc === CONFIG.midi.pads.pad5.cc && value > 0) {
      this.triggerPad('pad5', true, normalized);
    }
  }

  handleNote(note, velocity, isDown) {
    const normVel = velocity / 127;
    const pads = CONFIG.midi.pads;

    if (pads.pad1.notes.includes(note)) {
      this.triggerPad('pad1', isDown, normVel);
    } else if (pads.pad2.notes.includes(note)) {
      this.triggerPad('pad2', isDown, normVel);
    } else if (pads.pad3.notes.includes(note)) {
      if (isDown) this.triggerPad('pad3', true, normVel);
      else this.triggerPad('pad3', false, 0);
    } else if (pads.pad4.notes.includes(note)) {
      this.triggerPad('pad4', isDown, normVel);
    } else if (pads.pad5.notes.includes(note)) {
      if (isDown) this.triggerPad('pad5', true, normVel);
      else this.triggerPad('pad5', false, 0);
    }
  }

  triggerPad(padId, isPressed, velocity = 1.0) {
    const wasPressed = this.state.pads[padId];
    this.state.pads[padId] = isPressed;
    this.state.padVelocities[padId] = isPressed ? velocity : 0;

    if (isPressed && !wasPressed) {
      this.onPadTrigger(padId, velocity);
    }
    this.notify();
  }

  // Keyboard Simulation Fallback for Testing without Hardware
  initKeyboardFallback() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const kb = CONFIG.midi.keyboardFallback;

      if (e.code === kb.pad1) this.triggerPad('pad1', true, 1.0);
      else if (e.code === kb.pad2) this.triggerPad('pad2', true, 1.0);
      else if (e.code === kb.pad3) this.triggerPad('pad3', true, 1.0);
      else if (e.code === kb.pad4) this.triggerPad('pad4', true, 1.0);
      else if (e.code === kb.pad5 || e.code === kb.cycleStyleKey) this.triggerPad('pad5', true, 1.0);
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
    });

    window.addEventListener('keyup', (e) => {
      const kb = CONFIG.midi.keyboardFallback;
      if (e.code === kb.pad1) this.triggerPad('pad1', false, 0);
      else if (e.code === kb.pad2) this.triggerPad('pad2', false, 0);
      else if (e.code === kb.pad3) this.triggerPad('pad3', false, 0);
      else if (e.code === kb.pad4) this.triggerPad('pad4', false, 0);
      else if (e.code === kb.pad5 || e.code === kb.cycleStyleKey) this.triggerPad('pad5', false, 0);
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
    return {
      panX: this.state.joystick.pan, // 0.0 - 1.0
      aperture: this.state.joystick.aperture, // 0.03 - 1.0
      strobeLfoHz: k.knob1.min + this.state.knobs.knob1 * (k.knob1.max - k.knob1.min),
      hydraHue: k.knob2.min + this.state.knobs.knob2 * (k.knob2.max - k.knob2.min),
      hydraFeedback: k.knob3.min + this.state.knobs.knob3 * (k.knob3.max - k.knob3.min),
      audioSensitivity: k.knob4.min + this.state.knobs.knob4 * (k.knob4.max - k.knob4.min),
      padRiser: this.state.pads.pad1,
      padShutter: this.state.pads.pad2,
      padAsset: this.state.pads.pad3,
      padSlam: this.state.pads.pad4,
      padStyle: this.state.pads.pad5,
    };
  }

  notify() {
    this.onStateChange(this.state, this.getComputedValues());
  }
}
