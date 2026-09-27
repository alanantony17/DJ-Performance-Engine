/**
 * DJ Performance Engine - Main Orchestrator
 */

import { CONFIG } from './config.js';

console.log('[Engine] Initializing DJ Performance Engine...');

// DOM References
const hydraCanvas = document.getElementById('hydra-canvas');
const strobeCanvas = document.getElementById('strobe-canvas');
const hudOverlay = document.getElementById('hud-overlay');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const assetPreviewCard = document.getElementById('asset-preview-card');
const assetPreviewThumb = document.getElementById('asset-preview-thumb');
const assetPreviewTag = document.getElementById('asset-preview-tag');
const assetPreviewName = document.getElementById('asset-preview-name');

// Resize handler to maintain exact 1920x1080 internal resolution
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
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// Initial Strobe Canvas Test Pattern (Phase 1 Baseline)
const ctx = strobeCanvas.getContext('2d');
if (ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, strobeCanvas.width, strobeCanvas.height);
}

// Global HUD Toggle
window.addEventListener('keydown', (e) => {
  if (e.code === CONFIG.midi.keyboardFallback.toggleHud) {
    hudOverlay.classList.toggle('hidden');
  }
});

// Start button handler
if (startBtn && startOverlay) {
  startBtn.addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    console.log('[Engine] Started via user gesture.');
  });
}

// Function to trigger Asset Preview Card
let previewTimeout = null;
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

console.log('[Engine] Phase 1 Shell Mounted Successfully.');
