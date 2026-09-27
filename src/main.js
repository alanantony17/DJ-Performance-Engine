/**
 * DJ Performance Engine - Main Orchestrator
 * Integrates Web MIDI, Web Audio, Strobe Engine, and Hydra Synth.
 */

import { CONFIG } from './config.js';
import { MidiController } from './midi.js';
import { AudioEngine } from './audio.js';
import { DiagnosticHud } from './hud.js';
import { StrobeEngine } from './strobe.js';

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

// Active Asset State
let currentAssetIndex = 0;
let previewTimeout = null;
let strobe = null;

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

// Cycle to next asset
export function cycleAsset() {
  currentAssetIndex = (currentAssetIndex + 1) % CONFIG.assets.list.length;
  console.log(`[Engine] Switched to asset: ${CONFIG.assets.list[currentAssetIndex].name} (${CONFIG.assets.list[currentAssetIndex].path})`);
  showAssetPreview(currentAssetIndex);
  // Dispatch asset change event for visual pipeline
  window.dispatchEvent(new CustomEvent('engine:assetChange', { detail: { index: currentAssetIndex, asset: CONFIG.assets.list[currentAssetIndex] } }));
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
  // Optional direct asset selection via Shift + 1..4
  if (e.shiftKey) {
    if (e.code === 'Digit1') selectAsset(0);
    if (e.code === 'Digit2') selectAsset(1);
    if (e.code === 'Digit3') selectAsset(2);
    if (e.code === 'Digit4') selectAsset(3);
  }
});

// 4. Initialize Strobe Lighting Engine
strobe = new StrobeEngine(strobeCanvas);

// Main Animation & Update Loop
function loop() {
  const computedMidi = midi.getComputedValues();
  const audioState = audio.update(computedMidi.audioSensitivity);

  // Render 2D Strobe & Lighting Overlay
  strobe.render(midi.state, computedMidi, audioState);

  // Update diagnostic HUD
  hud.update(midi.state, computedMidi, audioState);

  requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);

// Initial asset preview display on boot
setTimeout(() => showAssetPreview(0), 500);

export { midi, audio, hud, currentAssetIndex };
console.log('[Engine] Phase 2 Hardware & Communications Layer Online.');
