/**
 * DJ Performance Engine - Main Orchestrator
 * Integrates Web MIDI, Web Audio, Strobe Engine, and Hydra Synth.
 */

import { CONFIG } from './config.js';
import { MidiController } from './midi.js';
import { AudioEngine } from './audio.js';
import { DiagnosticHud } from './hud.js';
import { StrobeEngine } from './strobe.js';
import { VisualPipeline } from './visuals.js';

console.log('[Engine] Initializing DJ Performance Engine Core...');

// DOM References
const hydraCanvas = document.getElementById('hydra-canvas');
const strobeCanvas = document.getElementById('strobe-canvas');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const assetPreviewCard = document.getElementById('asset-preview-card');
const assetPreviewThumb = document.getElementById('asset-preview-thumb');
const assetPreviewTag = document.getElementById('asset-preview-tag');
const assetPreviewName = document.getElementById('asset-preview-name');

// Visual Style Preview Card DOM References
const stylePreviewCard = document.getElementById('style-preview-card');
const stylePreviewTag = document.getElementById('style-preview-tag');
const stylePreviewMode = document.getElementById('style-preview-mode');
const stylePreviewName = document.getElementById('style-preview-name');
const stylePreviewDesc = document.getElementById('style-preview-desc');

// Audio Modal DOM References
const audioSourcePill = document.getElementById('audio-source-pill');
const audioPillLabel = document.getElementById('audio-pill-label');
const audioModal = document.getElementById('audio-modal');
const audioModalClose = document.getElementById('audio-modal-close');
const btnCaptureTab = document.getElementById('btn-capture-tab');
const btnDemoBeat = document.getElementById('btn-demo-beat');
const audioFileInput = document.getElementById('audio-file-input');
const audioDeviceSelect = document.getElementById('audio-device-select');
const hudAudioChangeBtn = document.getElementById('hud-audio-change-btn');

// Active Asset & Style State
let currentAssetIndex = 0;
let previewTimeout = null;
let stylePreviewTimeout = null;
let strobe = null;
let visuals = null;

// Resize handler to enforce 1920x1080 resolution
function resizeCanvases() {
  const width = CONFIG.display.width;
  const height = CONFIG.display.height;
  
  if (hydraCanvas.width !== width || hydraCanvas.height !== height) {
    hydraCanvas.width = width;
    hydraCanvas.height = height;
  }
  if (strobeCanvas.width !== width || strobeCanvas.height !== height) {
    strobeCanvas.width = width;
    strobeCanvas.height = height;
  }
  if (strobe) strobe.resize();
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// Show on-screen Asset Preview card (smooth fade)
export function showAssetPreview(assetIndex) {
  const asset = CONFIG.assets.list[assetIndex % CONFIG.assets.list.length];
  if (!asset) return;

  assetPreviewThumb.src = asset.path;
  assetPreviewTag.textContent = `Asset [${assetIndex + 1}/${CONFIG.assets.list.length}]`;
  assetPreviewName.textContent = asset.name;

  assetPreviewCard.classList.remove('hidden');
  assetPreviewCard.classList.add('visible');

  if (previewTimeout) clearTimeout(previewTimeout);
  previewTimeout = setTimeout(() => {
    assetPreviewCard.classList.remove('visible');
    assetPreviewCard.classList.add('hidden');
  }, CONFIG.assets.previewDurationMs);
}

// Show on-screen Visual Style Preview card (smooth fade)
export function showStylePreview(style) {
  if (!stylePreviewCard || !style) return;

  if (stylePreviewTag) {
    stylePreviewTag.textContent = `Style [${style.id + 1}/${CONFIG.visualStyles.length}]`;
  }
  if (stylePreviewMode) {
    stylePreviewMode.textContent = `KALEID: ${style.kaleid}`;
  }
  if (stylePreviewName) {
    stylePreviewName.textContent = style.name;
  }
  if (stylePreviewDesc) {
    stylePreviewDesc.textContent = style.desc;
  }

  stylePreviewCard.classList.remove('hidden');
  stylePreviewCard.classList.add('visible');

  if (stylePreviewTimeout) clearTimeout(stylePreviewTimeout);
  stylePreviewTimeout = setTimeout(() => {
    stylePreviewCard.classList.remove('visible');
    stylePreviewCard.classList.add('hidden');
  }, 2200);
}

// Cycle to next asset
export function cycleAsset() {
  currentAssetIndex = (currentAssetIndex + 1) % CONFIG.assets.list.length;
  console.log(`[Engine] Switched to asset: ${CONFIG.assets.list[currentAssetIndex].name} (${CONFIG.assets.list[currentAssetIndex].path})`);
  showAssetPreview(currentAssetIndex);
  // Dispatch asset change event for visual pipeline
  window.dispatchEvent(new CustomEvent('engine:assetChange', { detail: { index: currentAssetIndex, asset: CONFIG.assets.list[currentAssetIndex] } }));
}

// Cycle to next visual style (Pad 5 / Key 5 / V)
export function cycleStyle() {
  if (visuals) {
    const activeStyle = visuals.cycleStyle();
    showStylePreview(activeStyle);
  }
}

// Select direct asset by index (0-based)
export function selectAsset(index) {
  if (index >= 0 && index < CONFIG.assets.list.length) {
    currentAssetIndex = index;
    showAssetPreview(currentAssetIndex);
    window.dispatchEvent(new CustomEvent('engine:assetChange', { detail: { index: currentAssetIndex, asset: CONFIG.assets.list[currentAssetIndex] } }));
  }
}

// 1. Initialize Diagnostic HUD
const hud = new DiagnosticHud();

// 2. Initialize Web Audio Engine
const audio = new AudioEngine();

// Auto-engage engine function
async function engageEngine() {
  if (startOverlay && !startOverlay.classList.contains('hidden')) {
    startOverlay.classList.add('hidden');
  }
  await audio.resume();
}

if (startBtn) {
  startBtn.addEventListener('click', engageEngine);
}
if (startOverlay) {
  startOverlay.addEventListener('click', engageEngine);
}

// 3. Initialize Web MIDI Controller
const midi = new MidiController({
  onAnyInput: () => {
    // Zero-click auto resume on first MIDI touch
    engageEngine();
  },
  onPadTrigger: (padId, velocity) => {
    if (padId === 'pad3') {
      cycleAsset();
    } else if (padId === 'pad5') {
      cycleStyle();
    }
  },
  onStateChange: (rawState, computed) => {
    // State is read continuously in rAF loop
  }
});

// Key bindings for HUD and Direct Asset Switching
window.addEventListener('keydown', (e) => {
  if (e.code === CONFIG.midi.keyboardFallback.toggleHud) {
    hud.toggle();
  }
  // Direct asset selection via Shift + 1..9
  if (e.shiftKey && e.code.startsWith('Digit')) {
    const digit = parseInt(e.code.replace('Digit', ''), 10);
    if (!isNaN(digit) && digit >= 1 && digit <= CONFIG.assets.list.length) {
      selectAsset(digit - 1);
    }
  }
  if (e.code === 'Escape' && audioModal && !audioModal.classList.contains('hidden')) {
    closeAudioModal();
  }
});

// Audio Source Modal Management
async function openAudioModal() {
  if (!audioModal) return;
  audioModal.classList.remove('hidden');

  // Populate devices
  if (audioDeviceSelect) {
    const devices = await audio.getAvailableDevices();
    audioDeviceSelect.innerHTML = '<option value="default">Default Input Device / Microphone</option>';
    devices.forEach(dev => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label;
      audioDeviceSelect.appendChild(opt);
    });
  }
}

function closeAudioModal() {
  if (audioModal) audioModal.classList.add('hidden');
}

if (audioSourcePill) audioSourcePill.addEventListener('click', openAudioModal);
if (hudAudioChangeBtn) hudAudioChangeBtn.addEventListener('click', openAudioModal);
if (audioModalClose) audioModalClose.addEventListener('click', closeAudioModal);

if (audioModal) {
  audioModal.addEventListener('click', (e) => {
    if (e.target === audioModal) closeAudioModal();
  });
}

if (btnCaptureTab) {
  btnCaptureTab.addEventListener('click', async () => {
    closeAudioModal();
    if (startOverlay && !startOverlay.classList.contains('hidden')) {
      startOverlay.classList.add('hidden');
    }
    const res = await audio.captureTabAudio();
    if (res && !res.success && res.error) {
      alert(res.error);
    }
  });
}

if (btnDemoBeat) {
  btnDemoBeat.addEventListener('click', async () => {
    closeAudioModal();
    if (startOverlay && !startOverlay.classList.contains('hidden')) {
      startOverlay.classList.add('hidden');
    }
    await audio.playDemoBeat();
  });
}

if (audioFileInput) {
  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      closeAudioModal();
      if (startOverlay && !startOverlay.classList.contains('hidden')) {
        startOverlay.classList.add('hidden');
      }
      await audio.loadAudioFile(file);
    }
  });
}

if (audioDeviceSelect) {
  audioDeviceSelect.addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    closeAudioModal();
    if (startOverlay && !startOverlay.classList.contains('hidden')) {
      startOverlay.classList.add('hidden');
    }
    await audio.useDevice(deviceId);
  });
}

// Update Audio Pill label on source change
window.addEventListener('engine:audioSourceChanged', (e) => {
  if (audioPillLabel) {
    audioPillLabel.textContent = e.detail.name;
  }
});

// 4. Initialize Strobe Lighting Engine
strobe = new StrobeEngine(strobeCanvas);

// 5. Initialize Hydra Visual Pipeline
visuals = new VisualPipeline(hydraCanvas);

// Listen for asset change events
window.addEventListener('engine:assetChange', (e) => {
  if (visuals) {
    visuals.setAsset(e.detail.index);
  }
});

// Main Animation & Update Loop
function loop() {
  const computedMidi = midi.getComputedValues();
  const audioState = audio.update(computedMidi.audioSensitivity);

  // Update Hydra GLSL dynamic uniform parameters
  if (visuals) {
    visuals.update(computedMidi, audioState);
  }

  // Render 2D Strobe & Lighting Overlay
  if (strobe) {
    strobe.render(midi.state, computedMidi, audioState);
  }

  // Update diagnostic HUD
  hud.update(midi.state, computedMidi, audioState);

  requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);

// Initial asset preview display on boot
setTimeout(() => showAssetPreview(0), 500);

export { midi, audio, strobe, visuals, hud, currentAssetIndex, cycleStyle, showStylePreview };
console.log('[Engine] Phase 4 Full Audiovisual Engine Online & Ready for OBS.');
