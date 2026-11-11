/**
 * DJ Performance Engine - Main Orchestrator
 * Integrates Web MIDI, Web Audio, and Three.js 3D Displacement Engine.
 */

import { CONFIG, autoDiscoverAssets } from './config.js';
import { MidiController } from './midi.js';
import { AudioEngine } from './audio.js';
import { DiagnosticHud } from './hud.js';
import { ThreeDisplacementEngine } from './three-engine.js';
import { BuildupSequencer } from './buildup-sequencer.js';

console.log('[Engine] Initializing DJ Performance Engine Core...');

// DOM References
let threeCanvas = document.getElementById('three-canvas');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const assetPreviewCard = document.getElementById('asset-preview-card');
const assetPreviewThumb = document.getElementById('asset-preview-thumb');
const assetPreviewTag = document.getElementById('asset-preview-tag');
const assetPreviewName = document.getElementById('asset-preview-name');

// Buildup Preview Card DOM References
const buildupPreviewCard = document.getElementById('buildup-preview-card');
const buildupPreviewIcon = document.getElementById('buildup-preview-icon');
const buildupPreviewTag = document.getElementById('buildup-preview-tag');
const buildupPreviewMode = document.getElementById('buildup-preview-mode');
const buildupPreviewName = document.getElementById('buildup-preview-name');
const buildupPreviewDesc = document.getElementById('buildup-preview-desc');

// Visual Style Preview Card DOM References
const stylePreviewCard = document.getElementById('style-preview-card');
const stylePreviewTag = document.getElementById('style-preview-tag');
const stylePreviewMode = document.getElementById('style-preview-mode');
const stylePreviewName = document.getElementById('style-preview-name');
const stylePreviewDesc = document.getElementById('style-preview-desc');

// Hue Mode Preview Card DOM References
const huePreviewCard = document.getElementById('hue-preview-card');
const huePreviewName = document.getElementById('hue-preview-name');
const huePreviewDesc = document.getElementById('hue-preview-desc');

// Drop Mode Preview Card DOM References
const dropPreviewCard = document.getElementById('drop-preview-card');
const dropPreviewIcon = document.getElementById('drop-preview-icon');
const dropPreviewTag = document.getElementById('drop-preview-tag');
const dropPreviewMode = document.getElementById('drop-preview-mode');
const dropPreviewName = document.getElementById('drop-preview-name');
const dropPreviewDesc = document.getElementById('drop-preview-desc');

// Framing Mode Preview Card DOM References
const framingPreviewCard = document.getElementById('framing-preview-card');
const framingPreviewIcon = document.getElementById('framing-preview-icon');
const framingPreviewTag = document.getElementById('framing-preview-tag');
const framingPreviewMode = document.getElementById('framing-preview-mode');
const framingPreviewName = document.getElementById('framing-preview-name');
const framingPreviewDesc = document.getElementById('framing-preview-desc');

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
let huePreviewTimeout = null;
let dropPreviewTimeout = null;
let buildupPreviewTimeout = null;
let framingPreviewTimeout = null;
let threeEngine = null;

// Synchronized Resize Handler for Three.js Engine
function resizeCanvases() {
  const width = window.innerWidth || CONFIG.display.width;
  const height = window.innerHeight || CONFIG.display.height;
  
  if (threeCanvas && (threeCanvas.width !== width || threeCanvas.height !== height)) {
    threeCanvas.width = width;
    threeCanvas.height = height;
  }
  if (threeEngine) threeEngine.resize(width, height);
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();


// Master Clean Projection Mode State & Controller (Key P / URL ?clean=1)
export let isCleanProjection = false;

export function toggleCleanProjection(forceState = null) {
  if (forceState !== null) {
    isCleanProjection = forceState;
  } else {
    isCleanProjection = !isCleanProjection;
  }

  if (isCleanProjection) {
    document.body.classList.add('clean-projection');
    if (hud) hud.hide();

    if (previewTimeout) clearTimeout(previewTimeout);
    if (stylePreviewTimeout) clearTimeout(stylePreviewTimeout);
    if (huePreviewTimeout) clearTimeout(huePreviewTimeout);
    if (dropPreviewTimeout) clearTimeout(dropPreviewTimeout);
    if (buildupPreviewTimeout) clearTimeout(buildupPreviewTimeout);
    if (framingPreviewTimeout) clearTimeout(framingPreviewTimeout);

    const cards = [
      assetPreviewCard, stylePreviewCard, huePreviewCard,
      dropPreviewCard, buildupPreviewCard, framingPreviewCard,
      startOverlay, audioModal
    ];
    cards.forEach(card => {
      if (card) {
        card.classList.remove('visible');
        card.classList.add('hidden');
      }
    });

    console.log('[Engine] Master Clean Projection Mode: ENGAGED (100% Visuals, Zero Overlays)');
  } else {
    document.body.classList.remove('clean-projection');
    console.log('[Engine] Master Clean Projection Mode: BYPASSED (UI Overlays Restored)');
    showEffectPreview('PROJECTION MODE OFF', 'UI Overlays & Previews Restored', '#10b981');
  }

  window.dispatchEvent(new CustomEvent('engine:projectionModeChanged', {
    detail: { active: isCleanProjection }
  }));

  return isCleanProjection;
}

// Retrieve assets strictly within the currently active performance crate
export function getActiveCrateAssets() {
  const crateId = CONFIG.assets.activeCrate || 'halloween';
  const filtered = (CONFIG.assets.list || []).filter(a => a.crate === crateId);
  return filtered.length > 0 ? filtered : (CONFIG.assets.list || []);
}

// Show on-screen Asset Preview card (smooth fade)
export function showAssetPreview(assetIndex) {
  if (isCleanProjection) return;
  const asset = CONFIG.assets.list[assetIndex % CONFIG.assets.list.length];
  if (!asset) return;

  const crateAssets = getActiveCrateAssets();
  const posInCrate = crateAssets.findIndex(a => a.id === asset.id);
  const posText = posInCrate >= 0 ? `[${posInCrate + 1}/${crateAssets.length}]` : `[${assetIndex + 1}/${CONFIG.assets.list.length}]`;
  const crateTag = asset.crateName ? `${asset.crateIcon || '📦'} ${asset.crateName}` : 'Asset';

  assetPreviewThumb.src = asset.path;
  assetPreviewTag.textContent = `${crateTag} ${posText}`;
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
  if (isCleanProjection) return;
  if (!stylePreviewCard || !style) return;

  if (stylePreviewTag) {
    stylePreviewTag.textContent = `Style [${style.id + 1}/${CONFIG.visualStyles.length}]`;
  }
  if (stylePreviewMode) {
    stylePreviewMode.textContent = style.kaleid ? `KALEID: ${style.kaleid}` : style.mode.toUpperCase();
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

// Show on-screen Hue Mode Preview card (smooth fade)
export function showHuePreview(hueMode) {
  if (isCleanProjection) return;
  if (!huePreviewCard || !hueMode) return;

  if (huePreviewName) {
    huePreviewName.textContent = hueMode.name;
    huePreviewName.style.color = hueMode.active ? '#22d3ee' : '#fbbf24';
  }
  if (huePreviewDesc) {
    huePreviewDesc.textContent = hueMode.active
      ? 'Seamless full-spectrum color cycling active'
      : '100% authentic artist colors preserved';
  }

  huePreviewCard.classList.remove('hidden');
  huePreviewCard.classList.add('visible');

  if (huePreviewTimeout) clearTimeout(huePreviewTimeout);
  huePreviewTimeout = setTimeout(() => {
    huePreviewCard.classList.remove('visible');
    huePreviewCard.classList.add('hidden');
  }, 2200);
}

// Show on-screen Drop Dynamics Preview card (smooth fade)
export function showDropPreview(dropDetail) {
  if (isCleanProjection) return;
  if (!dropPreviewCard || !dropDetail) return;

  if (dropDetail.mode === 'forced') {
    if (dropPreviewIcon) dropPreviewIcon.textContent = '🔥';
    if (dropPreviewTag) dropPreviewTag.textContent = 'DYNAMICS [FORCED]';
    if (dropPreviewMode) {
      dropPreviewMode.textContent = 'DROP MODE';
      dropPreviewMode.style.borderColor = '#ef4444';
      dropPreviewMode.style.color = '#fef08a';
    }
    if (dropPreviewName) dropPreviewName.textContent = 'DROP / CHORUS LOCKED';
    if (dropPreviewDesc) dropPreviewDesc.textContent = 'Massive bass pumping, 3D wave canyons & camera recoil unlocked';
  } else if (dropDetail.mode === 'chill') {
    if (dropPreviewIcon) dropPreviewIcon.textContent = '❄️';
    if (dropPreviewTag) dropPreviewTag.textContent = 'DYNAMICS [FORCED]';
    if (dropPreviewMode) {
      dropPreviewMode.textContent = 'CHILL MODE';
      dropPreviewMode.style.borderColor = '#38bdf8';
      dropPreviewMode.style.color = '#bae6fd';
    }
    if (dropPreviewName) dropPreviewName.textContent = 'VERSE / CHILL LOCKED';
    if (dropPreviewDesc) dropPreviewDesc.textContent = 'Calm floating motion, shallow ripples, minimal scale pump';
  } else {
    if (dropPreviewIcon) dropPreviewIcon.textContent = '⚡';
    if (dropPreviewTag) dropPreviewTag.textContent = 'DYNAMICS [AUTO]';
    if (dropPreviewMode) {
      dropPreviewMode.textContent = 'AUTO TRACKING';
      dropPreviewMode.style.borderColor = '#a855f7';
      dropPreviewMode.style.color = '#e9d5ff';
    }
    if (dropPreviewName) dropPreviewName.textContent = 'AUTO DYNAMICS RESUMED';
    if (dropPreviewDesc) dropPreviewDesc.textContent = 'Smart dynamic analysis will trigger drops automatically';
  }

  dropPreviewCard.classList.remove('hidden');
  dropPreviewCard.classList.add('visible');

  if (dropPreviewTimeout) clearTimeout(dropPreviewTimeout);
  dropPreviewTimeout = setTimeout(() => {
    dropPreviewCard.classList.remove('visible');
    dropPreviewCard.classList.add('hidden');
  }, 2200);
}

// Show on-screen Buildup Sequence Preview card (smooth fade)
export function showBuildupPreview(detail) {
  if (isCleanProjection) return;
  if (!buildupPreviewCard || !detail) return;

  if (detail.state === 'building') {
    const arch = detail.archetype || { name: 'Hyperdrive Warp', desc: 'Relativistic radial zoom streak to drop', color: '#38bdf8' };
    if (buildupPreviewIcon) buildupPreviewIcon.textContent = '⚡';
    if (buildupPreviewTag) {
      buildupPreviewTag.textContent = `BUILDUP: ${arch.name.toUpperCase()}`;
      buildupPreviewTag.style.color = arch.color || '#38bdf8';
    }
    if (buildupPreviewMode) {
      buildupPreviewMode.textContent = `${detail.totalBars || 4}-BAR BUILD`;
      buildupPreviewMode.style.borderColor = arch.color || '#38bdf8';
      buildupPreviewMode.style.color = arch.color || '#bae6fd';
    }
    if (buildupPreviewName) buildupPreviewName.textContent = `${detail.totalBars || 4}-BAR [${arch.name.toUpperCase()}] @ ${(detail.lockedBpm || 128).toFixed(0)} BPM`;
    if (buildupPreviewDesc) buildupPreviewDesc.textContent = `${arch.desc} Hit Pad 4 (SLAM) to drop!`;
  } else if (detail.state === 'holding_climax') {
    const arch = detail.archetype || { name: 'Hyperdrive Warp', color: '#ef4444' };
    if (buildupPreviewIcon) buildupPreviewIcon.textContent = '🔥';
    if (buildupPreviewTag) buildupPreviewTag.textContent = 'PEAK CLIMAX';
    if (buildupPreviewMode) {
      buildupPreviewMode.textContent = (arch.mode === 'singularity' || arch.mode === 'implosion') ? 'OBSIDIAN VOID' : '100% WHITEOUT';
      buildupPreviewMode.style.borderColor = '#ef4444';
      buildupPreviewMode.style.color = '#fef08a';
    }
    if (buildupPreviewName) buildupPreviewName.textContent = `CLIMAX: ${arch.name.toUpperCase()}`;
    if (buildupPreviewDesc) buildupPreviewDesc.textContent = 'Holding maximum climax tension. Hit Pad 4 (SLAM) on Beat 1 to drop!';
  } else {
    if (buildupPreviewIcon) buildupPreviewIcon.textContent = '⏹️';
    if (buildupPreviewTag) buildupPreviewTag.textContent = 'BUILDUP IDLE';
    if (buildupPreviewMode) {
      buildupPreviewMode.textContent = 'READY';
      buildupPreviewMode.style.borderColor = '#64748b';
      buildupPreviewMode.style.color = '#cbd5e1';
    }
    if (buildupPreviewName) buildupPreviewName.textContent = 'BUILDUP STOPPED / CUTOFF';
    if (buildupPreviewDesc) buildupPreviewDesc.textContent = 'Returned to standard 3D visual dynamics.';
  }

  buildupPreviewCard.classList.remove('hidden');
  buildupPreviewCard.classList.add('visible');

  if (buildupPreviewTimeout) clearTimeout(buildupPreviewTimeout);
  buildupPreviewTimeout = setTimeout(() => {
    buildupPreviewCard.classList.remove('visible');
    buildupPreviewCard.classList.add('hidden');
  }, 2400);
}

// Show on-screen Framing Mode Preview card (smooth fade)
export function showFramingPreview(framingInfo) {
  if (isCleanProjection) return;
  if (!framingPreviewCard || !framingInfo) return;

  if (framingPreviewTag) framingPreviewTag.textContent = 'FRAMING MODE';
  if (framingPreviewMode) {
    framingPreviewMode.textContent = framingInfo.badge || framingInfo.name.toUpperCase();
    framingPreviewMode.style.borderColor = framingInfo.id === 0 ? '#10b981' : (framingInfo.id === 1 ? '#06b6d4' : '#a855f7');
    framingPreviewMode.style.color = framingInfo.id === 0 ? '#6ee7b7' : (framingInfo.id === 1 ? '#67e8f9' : '#d8b4fe');
  }
  if (framingPreviewName) framingPreviewName.textContent = framingInfo.name;
  if (framingPreviewDesc) framingPreviewDesc.textContent = framingInfo.desc;

  framingPreviewCard.classList.remove('hidden');
  framingPreviewCard.classList.add('visible');

  if (framingPreviewTimeout) clearTimeout(framingPreviewTimeout);
  framingPreviewTimeout = setTimeout(() => {
    framingPreviewCard.classList.remove('visible');
    framingPreviewCard.classList.add('hidden');
  }, CONFIG.assets.previewDurationMs || 2200);
}

// Show generic FX notification using Hue Preview Card
export function showEffectPreview(title, desc, color = '#00f0ff') {
  if (isCleanProjection) return;
  if (!huePreviewCard) return;
  if (huePreviewName) {
    huePreviewName.textContent = title;
    huePreviewName.style.color = color;
  }
  if (huePreviewDesc) {
    huePreviewDesc.textContent = desc;
  }
  huePreviewCard.classList.remove('hidden');
  huePreviewCard.classList.add('visible');
  if (huePreviewTimeout) clearTimeout(huePreviewTimeout);
  huePreviewTimeout = setTimeout(() => {
    huePreviewCard.classList.remove('visible');
    huePreviewCard.classList.add('hidden');
  }, 2000);
}

// Toggle Drop Dynamics Mode (Pad 6 / Key B)
export function toggleDrop() {
  if (audio) {
    const res = audio.toggleDropOverride();
    showDropPreview(res);
  }
}

// Toggle Seamless Hue Flow Mode (Pad 2 / Key 2 / H)
export function toggleHue() {
  if (threeEngine) {
    const res = threeEngine.toggleHueFlow();
    showHuePreview(res);
  }
}

// Remote Companion State & Synchronization
let cuedAssetIndex = null;
let lastRemoteUpdate = 0;
const remoteChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dj_engine_assets') : null;

// Post local changes to backend API and BroadcastChannel
async function postActionToServer(action, id = null, extra = {}) {
  try {
    const payload = { action, id, source: 'engine', ...extra };
    if (remoteChannel) {
      remoteChannel.postMessage(payload);
    }
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.lastUpdate) lastRemoteUpdate = data.lastUpdate;
    }
  } catch (_) {}
}

// Persistent Session State (survives watchdog reloads or manual browser refreshes)
const SESSION_STORAGE_KEY = 'dj_engine_session_v1';
let isEngineEngaged = false;
let engineWakeLock = null;
let _saveSessionTimer = null;

function _writeSessionStateNow(extra = {}) {
  try {
    const snap = threeEngine && threeEngine.getSnapshot ? threeEngine.getSnapshot() : {};
    const payload = {
      activeCrate: CONFIG.assets.activeCrate || 'halloween',
      activeAssetId: currentAssetIndex,
      cuedAssetId: cuedAssetIndex,
      cleanProjection: isCleanProjection,
      engaged: isEngineEngaged,
      framingMode: snap.framingMode,
      framingManualOverride: snap.framingManualOverride,
      presetIndex: snap.currentPresetIndex,
      hueFlowActive: snap.hueFlowActive,
      pulseMode: Boolean(audio && audio.pulseMode),
      bpm: audio && audio.state ? (audio.state.bpm || 128.0) : 128.0,
      waveSpread: midi && midi.getComputedValues ? midi.getComputedValues().waveSpread : 2.5,
      savedAt: Date.now(),
      ...extra,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function saveSessionState(extra = {}) {
  // Immediate write when preparing for a page reload; otherwise debounce by 800ms to avoid synchronous disk I/O during slider drags
  if (extra && (extra.reloadReason || extra.autoEngage !== undefined)) {
    if (_saveSessionTimer) {
      clearTimeout(_saveSessionTimer);
      _saveSessionTimer = null;
    }
    _writeSessionStateNow(extra);
    return;
  }
  if (_saveSessionTimer) clearTimeout(_saveSessionTimer);
  _saveSessionTimer = setTimeout(() => {
    _saveSessionTimer = null;
    _writeSessionStateNow(extra);
  }, 800);
}

// Screen Wake Lock API for Projector / Laptop Display (prevents Windows 10-min display sleep)
async function requestEngineWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!engineWakeLock || engineWakeLock.released) {
        engineWakeLock = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] Projector display wake lock acquired.');
      }
    } catch (_) {}
  }
}
requestEngineWakeLock();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestEngineWakeLock();
  }
});

// Select direct asset by index (0-based)
export function selectAsset(index, notifyRemote = true) {
  if (index >= 0 && index < CONFIG.assets.list.length) {
    currentAssetIndex = index;
    cuedAssetIndex = null;
    showAssetPreview(currentAssetIndex);
    window.dispatchEvent(new CustomEvent('engine:assetChange', { detail: { index: currentAssetIndex, asset: CONFIG.assets.list[currentAssetIndex] } }));
    if (threeEngine && threeEngine.preloadCrateAssets) {
      threeEngine.preloadCrateAssets(getActiveCrateAssets(), currentAssetIndex, cuedAssetIndex);
    }
    saveSessionState();
    if (notifyRemote) {
      postActionToServer('select_asset', index);
    }
  }
}

// Cue asset for next drop without changing current projection
export function cueAsset(index, notifyRemote = true) {
  if (index >= 0 && index < CONFIG.assets.list.length) {
    cuedAssetIndex = index;
    const asset = CONFIG.assets.list[index];
    console.log(`[Engine] Cued asset for next drop: ${asset.name} (#${index})`);
    showEffectPreview('ARMED FOR DROP', `${asset.name} (Hit Pad 4 to drop)`, '#f59e0b');
    if (threeEngine && threeEngine.preloadCrateAssets) {
      threeEngine.preloadCrateAssets(getActiveCrateAssets(), currentAssetIndex, cuedAssetIndex);
    }
    saveSessionState();
    if (notifyRemote) {
      postActionToServer('cue_asset', index);
    }
  }
}

// Commit armed/cued asset to live projection
export function commitCuedAsset(notifyRemote = true) {
  if (cuedAssetIndex !== null && cuedAssetIndex >= 0 && cuedAssetIndex < CONFIG.assets.list.length) {
    const nextIdx = cuedAssetIndex;
    cuedAssetIndex = null;
    selectAsset(nextIdx, notifyRemote);
    showEffectPreview('CUED ASSET DROPPED', CONFIG.assets.list[nextIdx]?.name, '#10b981');
    if (notifyRemote) {
      postActionToServer('commit_cued');
    }
    return true;
  }
  return false;
}

// Switch Active Performance Crate (Halloween, Diwali, Master Vault, Kabir's Universe)
export function setActiveCrate(crateId, notifyRemote = true) {
  if (!crateId) return;
  CONFIG.assets.activeCrate = crateId;
  const crateAssets = getActiveCrateAssets();
  const crateInfo = (CONFIG.assets.crates || []).find(c => c.id === crateId) || { id: crateId, name: crateId, icon: '📦' };

  // If current asset is not inside this crate, jump to the first asset in the crate
  const isCurrentInCrate = crateAssets.some(a => a.id === currentAssetIndex);
  if (!isCurrentInCrate && crateAssets.length > 0) {
    selectAsset(crateAssets[0].id, notifyRemote);
  }

  showEffectPreview(`${crateInfo.icon || '📦'} CRATE: ${crateInfo.name.toUpperCase()}`, `${crateAssets.length} assets loaded • Pad 3 scoped to crate`, '#f97316');

  window.dispatchEvent(new CustomEvent('engine:crateChanged', {
    detail: { crateId, crateInfo, count: crateAssets.length }
  }));

  if (notifyRemote) {
    postActionToServer('select_crate', null, { crate: crateId, crateId });
  }
  if (threeEngine && threeEngine.preloadCrateAssets) {
    threeEngine.preloadCrateAssets(crateAssets, currentAssetIndex, cuedAssetIndex);
  }
  saveSessionState();
  console.log(`[Engine] Switched Active Party Crate to: ${crateInfo.name} (${crateAssets.length} assets)`);
}

// Cycle between performance crates (Key K or HUD button)
export function cycleCrate() {
  const crateIds = ['halloween', 'diwali', 'master', 'kabir'];
  const currentIdx = crateIds.indexOf(CONFIG.assets.activeCrate || 'halloween');
  const nextIdx = (currentIdx + 1) % crateIds.length;
  setActiveCrate(crateIds[nextIdx], true);
}

// Cycle to next asset (Hardware Pad 3 / Key 3) - strictly scoped to active crate!
export function cycleAsset() {
  const crateAssets = getActiveCrateAssets();
  if (!crateAssets.length) return;

  const currentPos = crateAssets.findIndex(a => a.id === currentAssetIndex);
  const nextPos = (currentPos + 1) % crateAssets.length;
  const nextAsset = crateAssets[nextPos];
  console.log(`[Engine] Switched to asset in crate [${CONFIG.assets.activeCrate}]: ${nextAsset.name} (#${nextAsset.id})`);
  selectAsset(nextAsset.id, true);
}

// Background auto-discovery polling every 30 seconds (non-disruptive)
setInterval(autoDiscoverAssets, 30000);

// Update Start Screen & HUD QR Code + Remote URL when server IP is discovered
function updateRemoteQrAndUrl(ip) {
  if (!ip) return;
  const remoteUrl = `http://${ip}:8000/remote`;
  const startUrlEl = document.getElementById('start-remote-url');
  const hudUrlEl = document.getElementById('hud-remote-url');
  const startQrEl = document.getElementById('start-qr-img');
  const hudQrEl = document.getElementById('hud-qr-img');
  if (startUrlEl) startUrlEl.textContent = remoteUrl;
  if (hudUrlEl) hudUrlEl.textContent = remoteUrl;
  const qrSrc = `/api/qr.svg?url=${encodeURIComponent(remoteUrl)}`;
  if (startQrEl && startQrEl.getAttribute('data-url') !== remoteUrl) {
    startQrEl.src = qrSrc;
    startQrEl.setAttribute('data-url', remoteUrl);
  }
  if (hudQrEl && hudQrEl.getAttribute('data-url') !== remoteUrl) {
    hudQrEl.src = qrSrc;
    hudQrEl.setAttribute('data-url', remoteUrl);
  }
}
window.addEventListener('engine:serverIpDiscovered', (e) => {
  if (e.detail && e.detail.ip) updateRemoteQrAndUrl(e.detail.ip);
});

// Handle remote live performance controls (Sensitivity Slider, 4/8-Bar Risers, Blackout, Drop Slam, Clean Mode)
let _lastSliderToastTime = 0;
export function executeRemoteControl(cmd, value = null) {
  if (!isEngineEngaged) {
    engageEngine();
  }
  const currentBpm = audio && audio.state ? (audio.state.bpm || 128.0) : 128.0;
  const nowMs = performance.now();

  if (cmd === 'set_sensitivity' && value !== null && value !== undefined) {
    const k4 = CONFIG.midi?.knobs?.knob4 || { min: 0.2, max: 3.5 };
    const clamped = Math.max(k4.min, Math.min(k4.max, parseFloat(value) || 1.5));
    const norm = (clamped - k4.min) / (k4.max - k4.min);
    if (midi && midi.state && midi.state.knobs) {
      midi.state.knobs.knob4 = Math.max(0.0, Math.min(1.0, norm));
    }
    if ((nowMs - _lastSliderToastTime) > 180) {
      _lastSliderToastTime = nowMs;
      showEffectPreview('AUDIO SENSITIVITY', `${clamped.toFixed(1)}x Reactivity`, '#38bdf8');
    }
    saveSessionState();
  } else if (cmd === 'riser_4') {
    if (threeEngine && threeEngine.masterBlackout) {
      threeEngine.toggleMasterBlackout(false);
    }
    if (buildup) {
      const summary = buildup.toggle(4, currentBpm);
      showBuildupPreview(summary);
    }
  } else if (cmd === 'riser_8') {
    if (threeEngine && threeEngine.masterBlackout) {
      threeEngine.toggleMasterBlackout(false);
    }
    if (buildup) {
      const summary = buildup.toggle(8, currentBpm);
      showBuildupPreview(summary);
    }
  } else if (cmd === 'blackout_toggle') {
    if (threeEngine) {
      const isBlack = threeEngine.toggleMasterBlackout(value !== null && value !== undefined ? Boolean(value) : null);
      if (isBlack && buildup && buildup.state !== 'idle') {
        buildup.cancel();
      } else if (!isBlack && buildup && buildup.state === 'blackout_shut') {
        buildup.cancel();
      }
      showEffectPreview(
        isBlack ? '🌑 MASTER BLACKOUT' : '⚡ VISUALS LIVE',
        isBlack ? 'Projector output blacked out' : 'Projector output restored',
        isBlack ? '#ef4444' : '#10b981'
      );
    }
  } else if (cmd === 'drop_slam') {
    if (buildup && buildup.state !== 'idle') {
      buildup.cancel();
      showBuildupPreview({ state: 'cancelled' });
    }
    if (threeEngine) {
      threeEngine.toggleMasterBlackout(false);
      threeEngine.resetSlicer();
      threeEngine.resetBeatRepeat();
      threeEngine.resetLaser();
      threeEngine.resetGrating();
    }
    const didDropCued = commitCuedAsset(false);
    if (!didDropCued) {
      showEffectPreview('DROP SLAM', 'Master Blackout & FX Cleared', '#f43f5e');
    }
  } else if (cmd === 'clean_projection_toggle') {
    toggleCleanProjection(value !== null && value !== undefined ? Boolean(value) : null);
    saveSessionState();
  } else if (cmd === 'bpm_pulse_toggle') {
    if (audio) {
      const isPulse = audio.togglePulseMode(value !== null && value !== undefined ? Boolean(value) : null);
      showEffectPreview(
        isPulse ? '💓 BPM PULSE ACTIVE' : '🎵 AUDIO REACTIVE',
        isPulse ? `Pulsing locked at ${audio.state.bpm.toFixed(1)} BPM` : 'Listening to live audio input',
        isPulse ? '#10b981' : '#38bdf8'
      );
      saveSessionState();
    }
  } else if (cmd === 'set_bpm' && value !== null && value !== undefined) {
    if (audio) {
      const newBpm = audio.setBpm(parseFloat(value) || 128.0, true);
      showEffectPreview('TEMPO SET', `${newBpm.toFixed(1)} BPM`, '#10b981');
      saveSessionState();
    }
  } else if (cmd === 'nudge_bpm' && value !== null && value !== undefined) {
    if (audio) {
      const newBpm = audio.adjustBpm(parseFloat(value) || 0);
      showEffectPreview('TEMPO ADJUST', `${newBpm.toFixed(1)} BPM`, '#00f0ff');
      saveSessionState();
    }
  } else if (cmd === 'tap_tempo') {
    if (audio) {
      let newBpm;
      if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
        newBpm = audio.setBpm(parseFloat(value), true);
        audio.syncBeatPhase();
      } else {
        newBpm = audio.tapTempo();
      }
      showEffectPreview('🥁 TAP TEMPO', `${newBpm.toFixed(1)} BPM • Beat 1 Synced`, '#10b981');
      saveSessionState();
    }
  } else if (cmd === 'set_spread' && value !== null && value !== undefined) {
    const k3 = CONFIG.midi?.knobs?.knob3 || { min: 1.8, max: 3.6 };
    const clamped = Math.max(k3.min, Math.min(k3.max, parseFloat(value) || 2.5));
    const norm = (clamped - k3.min) / (k3.max - k3.min);
    if (midi && midi.state && midi.state.knobs) {
      midi.state.knobs.knob3 = Math.max(0.0, Math.min(1.0, norm));
    }
    if (threeEngine && threeEngine.uniforms && threeEngine.uniforms.uSpread) {
      threeEngine.uniforms.uSpread.value = clamped;
    }
    if ((nowMs - _lastSliderToastTime) > 180) {
      _lastSliderToastTime = nowMs;
      showEffectPreview('WAVE SPREAD', `${clamped.toFixed(2)} Spatial Reach`, '#38bdf8');
    }
    saveSessionState();
  } else if (cmd === 'cycle_preset') {
    cycleStyle();
    saveSessionState();
  } else if (cmd === 'set_preset' && value !== null && value !== undefined) {
    if (threeEngine) {
      const idx = parseInt(value, 10);
      if (!isNaN(idx) && idx >= 0 && idx < CONFIG.visualStyles.length) {
        threeEngine.currentPresetIndex = idx;
        if (threeEngine.uniforms?.uPreset) threeEngine.uniforms.uPreset.value = idx;
        const activePreset = CONFIG.visualStyles[idx];
        showStylePreview(activePreset);
        saveSessionState();
      }
    }
  }
}

// Handle remote recovery & panic actions from mobile companion
function handleRemoteRecoveryAction(action, data = {}) {
  if (action === 'control' && data.cmd) {
    executeRemoteControl(data.cmd, data.value);
    return true;
  }
  if (action === 'reload_engine') {
    console.warn('[Engine] Remote requested full engine reload — saving session state & reloading...');
    saveSessionState({ autoEngage: true, reloadReason: 'remote_reload' });
    setTimeout(() => window.location.reload(), 60);
    return true;
  }
  if (action === 'rebuild_webgl') {
    console.warn('[Engine] Remote requested WebGL renderer rebuild...');
    if (typeof window.rebuildThreeEngine === 'function') {
      window.rebuildThreeEngine('remote_rebuild');
    }
    return true;
  }
  if (action === 'soft_reset') {
    console.log('[Engine] Remote requested FX soft reset...');
    if (typeof window.softResetEngine === 'function') {
      window.softResetEngine('remote_soft_reset');
    }
    return true;
  }
  return false;
}

// Real-Time Server-Sent Events (SSE) Stream for Sub-10ms Wi-Fi Hot-Switching
let sseConnection = null;
let lastProcessedCommandSeq = 0;
function initSSE() {
  if (typeof EventSource === 'undefined') return;
  try {
    if (sseConnection) sseConnection.close();
    sseConnection = new EventSource('/api/events');
    sseConnection.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data) return;
        const { action, id, crate, state, source } = data;
        if (state && state.pendingCommand && state.pendingCommand.seq) {
          lastProcessedCommandSeq = Math.max(lastProcessedCommandSeq, state.pendingCommand.seq);
        }
        if (source === 'remote') {
          if (!isEngineEngaged) engageEngine();
          if (handleRemoteRecoveryAction(action, data)) return;
          if (action === 'select_asset' && id !== undefined && id !== currentAssetIndex) {
            selectAsset(id, false);
          } else if (action === 'cue_asset' && id !== undefined) {
            cueAsset(id, false);
          } else if (action === 'commit_cued') {
            commitCuedAsset(false);
          } else if (action === 'select_crate' && crate) {
            setActiveCrate(crate, false);
          }
        }
        if (state) {
          if (state.activeCrate && state.activeCrate !== CONFIG.assets.activeCrate) {
            setActiveCrate(state.activeCrate, false);
          }
        }
      } catch (_) {}
    };
    sseConnection.onerror = () => {
      // Browser auto-reconnects; syncRemoteCompanion serves as reliable fallback
    };
  } catch (err) {
    console.warn('[SSE] EventSource init fallback:', err);
  }
}
initSSE();

// Backup Telemetry Polling (only runs when SSE is disconnected or on initial IP discovery)
async function syncRemoteCompanion(force = false) {
  if (!force && window.__currentServerIp && sseConnection && sseConnection.readyState === 1) {
    return;
  }
  try {
    const res = await fetch('/api/state?t=' + Date.now());
    if (res.ok) {
      const state = await res.json();
      // Auto-update assets if server reports changes
      if (state.assetCount !== undefined && state.assetCount !== CONFIG.assets.list.length) {
        autoDiscoverAssets();
      }
      if (state.serverIp && (!window.__currentServerIp || window.__currentServerIp !== state.serverIp)) {
        window.__currentServerIp = state.serverIp;
        window.dispatchEvent(new CustomEvent('engine:serverIpDiscovered', { detail: { ip: state.serverIp } }));
      }
      // Execute any pending recovery or live control command sent while SSE was reconnecting
      if (state.pendingCommand && state.pendingCommand.seq > lastProcessedCommandSeq) {
        lastProcessedCommandSeq = state.pendingCommand.seq;
        if ((Date.now() / 1000) - (state.pendingCommand.time || 0) < 15) {
          handleRemoteRecoveryAction(state.pendingCommand.action, state.pendingCommand);
        }
      }
      // Synchronize active crate with remote
      if (state.activeCrate && state.activeCrate !== CONFIG.assets.activeCrate) {
        setActiveCrate(state.activeCrate, false);
      }
      if (state.lastUpdate && state.lastUpdate > lastRemoteUpdate) {
        lastRemoteUpdate = state.lastUpdate;
        if (state.actionSource === 'remote') {
          if (state.activeAssetId !== undefined && state.activeAssetId !== currentAssetIndex) {
            selectAsset(state.activeAssetId, false);
          }
          if (state.cuedAssetId !== undefined && state.cuedAssetId !== cuedAssetIndex) {
            cuedAssetIndex = state.cuedAssetId;
            if (cuedAssetIndex !== null) {
              const asset = CONFIG.assets.list[cuedAssetIndex];
              showEffectPreview('REMOTE ARMED CUE', `${asset?.name || 'Asset'} (Hit Pad 4 to drop)`, '#f59e0b');
            }
          }
        }
      }
    }
  } catch (_) {}
}
setInterval(syncRemoteCompanion, 4000);
setTimeout(() => syncRemoteCompanion(true), 200);

// Listen to local BroadcastChannel for multi-tab zero-latency sync
if (remoteChannel) {
  remoteChannel.onmessage = (e) => {
    const data = e.data || {};
    const { action, id, source } = data;
    if (source === 'remote') {
      if (!isEngineEngaged) engageEngine();
      if (handleRemoteRecoveryAction(action, data)) return;
      if (action === 'select_asset' && id !== undefined) {
        selectAsset(id, false);
      } else if (action === 'cue_asset' && id !== undefined) {
        cueAsset(id, false);
      } else if (action === 'commit_cued') {
        commitCuedAsset(false);
      } else if (action === 'select_crate' && (data.crate || data.crateId)) {
        setActiveCrate(data.crate || data.crateId, false);
      }
    }
  };
}

// Cycle to next 3D motion preset (Pad 5 / Key 5 / V)
export function cycleStyle() {
  if (threeEngine) {
    const activePreset = threeEngine.cyclePreset();
    showStylePreview(activePreset);
  }
}

// 1. Initialize Diagnostic HUD
const hud = new DiagnosticHud();

// 2. Initialize Web Audio Engine
const audio = new AudioEngine();

// 2b. Initialize One-Shot Buildup Sequencer
const buildup = new BuildupSequencer();

// Auto-engage engine function
async function engageEngine() {
  isEngineEngaged = true;
  if (startOverlay) {
    startOverlay.classList.add('hidden');
    startOverlay.style.display = 'none';
  }
  requestEngineWakeLock();
  saveSessionState({ engaged: true });
  try {
    await audio.resume();
  } catch (err) {
    console.warn('[Engine] AudioContext resume error handled:', err);
  }
}

if (startBtn) {
  startBtn.addEventListener('click', engageEngine);
}
if (startOverlay) {
  startOverlay.addEventListener('click', engageEngine);
}

// 3. Initialize Web MIDI Controller (AKAI MPK Mini 3 - Clean 8-Pad Layout)
let pad7PressTime = 0;
let pad7WasActiveOnPress = false;

const midi = new MidiController({
  onAnyInput: () => {
    // Zero-click auto resume on first MIDI touch
    engageEngine();
  },
  onBpmAdjust: (delta) => {
    if (audio) {
      const newBpm = audio.adjustBpm(delta);
      showEffectPreview('TEMPO ADJUST', `${newBpm.toFixed(1)} BPM`, '#00f0ff');
    }
  },
  onTapTempo: () => {
    if (audio) {
      const newBpm = audio.tapTempo();
      showEffectPreview('TAP TEMPO', `${newBpm.toFixed(1)} BPM`, '#00f0ff');
    }
  },
  onPadTrigger: (padId, velocity) => {
    const currentBpm = audio ? audio.state.bpm : 128.0;

    // --- BANK A: LIVE PERFORMANCE & ACTION HITS ---
    if (padId === 'pad1') {
      // Pad 1: 4-Bar Buildup Trigger (Armed Archetype)
      const summary = buildup.toggle(4, currentBpm);
      showBuildupPreview(summary);
    } else if (padId === 'pad2') {
      // Pad 2: 8-Bar Buildup Trigger (Armed Archetype)
      const summary = buildup.toggle(8, currentBpm);
      showBuildupPreview(summary);
    } else if (padId === 'pad3') {
      // Pad 3: Cycle Artwork Asset
      cycleAsset();
    } else if (padId === 'pad4') {
      // Pad 4: DROP SLAM Blackout & Buildup Cutoff & Beat-Repeat/Slicer Reset
      if (buildup && buildup.state !== 'idle') {
        buildup.cancel();
        showBuildupPreview({ state: 'cancelled' });
      }
      if (threeEngine) {
        threeEngine.resetSlicer();
        threeEngine.resetBeatRepeat();
        threeEngine.resetLaser();
        threeEngine.resetGrating();
      }
      // If an asset was armed/cued via phone, immediately drop it now!
      const didDropCued = commitCuedAsset(true);
      if (!didDropCued) {
        showEffectPreview('DROP SLAM', 'Master Blackout & FX Cleared', '#f43f5e');
      }
    } else if (padId === 'pad5') {
      // Pad 5: Cycle 3D Motion Preset
      cycleStyle();
    } else if (padId === 'pad6') {
      // Pad 6: Toggle Auto-Hue Flow
      toggleHue();
    } else if (padId === 'pad7') {
      // Pad 7: Dynamic Optical Grating / Comb Shutter (Tap to Lock / Hold to Punch)
      pad7PressTime = performance.now();
      if (threeEngine) {
        pad7WasActiveOnPress = threeEngine.gratingActive;
        const res = threeEngine.toggleGratingPunch();
        showEffectPreview('GRATING SHUTTER', res.active ? `${res.style.name.toUpperCase()} ACTIVE` : 'SHUTTER BYPASSED', res.active ? '#00f0ff' : '#94a3b8');
      }
    } else if (padId === 'pad8') {
      // Pad 8: Negative X-Ray Invert
      if (threeEngine) {
        const active = threeEngine.toggleNegative();
        showEffectPreview('NEGATIVE INVERT', active ? 'X-Ray Color Inversion Active' : 'Negative Invert Bypassed', active ? '#ec4899' : '#94a3b8');
      }
    }

    // --- BANK B: ARMING & UTILITY CONFIGURATION ---
    else if (padId === 'padB1') {
      // Pad B1: Cycle Armed Optical Grating Style
      if (threeEngine) {
        const res = threeEngine.cycleGratingStyle();
        showEffectPreview(`GRATING [${res.index + 1}/4]`, `${res.style.name}: ${res.style.desc}`, '#00f0ff');
      }
    } else if (padId === 'padB2') {
      // Pad B2: Cycle Framing Mode (World-Field / Radial Portal / Classic)
      if (threeEngine) {
        const mode = threeEngine.cycleFramingMode();
        showFramingPreview(mode);
      }
    } else if (padId === 'padB3') {
      // Pad B3: Toggle Drop Dynamics Override (Moved to Bank B per request)
      toggleDrop();
    } else if (padId === 'padB4') {
      // Pad B4: DROP SLAM (Panic Blackout available on Bank B too!)
      if (buildup && buildup.state !== 'idle') {
        buildup.cancel();
        showBuildupPreview({ state: 'cancelled' });
      }
      if (threeEngine) {
        threeEngine.resetSlicer();
        threeEngine.resetBeatRepeat();
        threeEngine.resetLaser();
        threeEngine.resetGrating();
      }
      // If an asset was armed/cued via phone, immediately drop it now!
      const didDropCued = commitCuedAsset(true);
      if (!didDropCued) {
        showEffectPreview('DROP SLAM', 'Master Blackout & FX Cleared', '#f43f5e');
      }
    } else if (padId === 'padB5') {
      // Pad B5: Arm Riser Archetype 0 (Kinetic Blitz)
      if (buildup) {
        const arch = buildup.setArchetype(0);
        showEffectPreview('ARMED RISER [1/4]', `${arch.name}: ${arch.desc}`, arch.color);
      }
    } else if (padId === 'padB6') {
      // Pad B6: Arm Riser Archetype 1 (Dark Implosion)
      if (buildup) {
        const arch = buildup.setArchetype(1);
        showEffectPreview('ARMED RISER [2/4]', `${arch.name}: ${arch.desc}`, arch.color);
      }
    } else if (padId === 'padB7') {
      // Pad B7: Arm Riser Archetype 2 (Chromatic Tear)
      if (buildup) {
        const arch = buildup.setArchetype(2);
        showEffectPreview('ARMED RISER [3/4]', `${arch.name}: ${arch.desc}`, arch.color);
      }
    } else if (padId === 'padB8') {
      // Pad B8: Arm Riser Archetype 3 (Solar Bloom)
      if (buildup) {
        const arch = buildup.setArchetype(3);
        showEffectPreview('ARMED RISER [4/4]', `${arch.name}: ${arch.desc}`, arch.color);
      }
    }
  },
  onStateChange: (rawState, computed) => {
    // State is read continuously in rAF loop
  },
  onPadRelease: (padId) => {
    if (padId === 'pad7') {
      const holdDuration = performance.now() - pad7PressTime;
      // Momentary hold: If held down for >= 250ms and this press activated it, release immediately on finger lift!
      if (holdDuration >= 250 && !pad7WasActiveOnPress) {
        if (threeEngine && threeEngine.gratingActive) {
          threeEngine.resetGrating();
          showEffectPreview('GRATING SHUTTER', 'SHUTTER RELEASED', '#94a3b8');
        }
      }
    }
  }
});

// Listen for buildup sequencer state transitions
window.addEventListener('engine:buildupStarted', (e) => {
  showBuildupPreview({ state: 'building', totalBars: e.detail.bars, lockedBpm: e.detail.bpm });
});
window.addEventListener('engine:buildupCancelled', (e) => {
  showBuildupPreview({ state: 'cancelled' });
});
window.addEventListener('engine:buildupShut', (e) => {
  showBuildupPreview({ state: 'blackout_shut' });
});
window.addEventListener('engine:buildupReleased', (e) => {
  showBuildupPreview({ state: 'idle' });
});

// Key bindings for HUD, Drop Mode, and Direct Asset Switching
window.addEventListener('keydown', (e) => {
  // Toggle Master Clean Projection Mode (Key P)
  if (e.code === (CONFIG.midi.keyboardFallback.toggleProjectionKey || 'KeyP')) {
    toggleCleanProjection();
    return;
  }
  if (e.code === CONFIG.midi.keyboardFallback.toggleHud) {
    hud.toggle();
  }
  if (e.code === CONFIG.midi.keyboardFallback.toggleDropKey) {
    toggleDrop();
  }
  // Switch Party Crate (Key K)
  if (e.code === 'KeyK') {
    cycleCrate();
  }
  // Toggle BPM Lock (Key L)
  if (e.code === 'KeyL') {
    if (audio) {
      const isLocked = audio.toggleBpmLock();
      showEffectPreview(isLocked ? 'BPM LOCKED' : 'BPM AUTO TRACK', `${audio.state.bpm.toFixed(1)} BPM`, isLocked ? '#22c55e' : '#00f0ff');
    }
  }
  // Toggle Manual BPM Pulse Mode (Key O)
  if (e.code === 'KeyO') {
    if (audio) {
      const isPulse = audio.togglePulseMode();
      showEffectPreview(
        isPulse ? '💓 BPM PULSE ACTIVE' : '🎵 AUDIO REACTIVE',
        isPulse ? `Pulsing locked at ${audio.state.bpm.toFixed(1)} BPM` : 'Listening to live audio input',
        isPulse ? '#10b981' : '#38bdf8'
      );
      saveSessionState();
    }
  }
  // Tap Tempo & Beat 1 Phase Sync (Key T)
  if (e.code === 'KeyT') {
    if (audio) {
      const newBpm = audio.tapTempo();
      showEffectPreview('🥁 TAP TEMPO', `${newBpm.toFixed(1)} BPM • Beat 1 Synced`, '#10b981');
      saveSessionState();
    }
  }
  // Toggle Framing Mode (Key M: World-Field / Radial Portal / Classic)
  if (e.code === CONFIG.midi.keyboardFallback.toggleFramingKey || e.code === 'KeyM') {
    if (threeEngine) {
      const mode = threeEngine.cycleFramingMode();
      showFramingPreview(mode);
    }
  }
  // Toggle ILDA Projector Laser Vectorizer (Key X)
  if (e.code === 'KeyX') {
    if (threeEngine) {
      const isLaser = threeEngine.toggleLaserPunch();
      showEffectPreview(
        isLaser ? 'ILDA LASER ENGAGED' : 'LASER BYPASS',
        isLaser ? 'Vector Contour Extraction & Spatial Prism Fan Active' : 'Normal Organic Rendering Restored',
        isLaser ? '#00ff66' : '#94a3b8'
      );
    }
  }
  // Direct asset selection via Alt + 1..9 (reserving Shift + 1-8 for Bank B pads)
  if (e.altKey && e.code.startsWith('Digit')) {
    const digit = parseInt(e.code.replace('Digit', ''), 10);
    if (!isNaN(digit) && digit >= 1 && digit <= CONFIG.assets.list.length) {
      selectAsset(digit - 1);
    }
  }
  if (e.code === 'Escape' && audioModal && !audioModal.classList.contains('hidden')) {
    closeAudioModal();
  }
});

// Listen for drop mode change events from audio or UI
window.addEventListener('engine:dropModeChanged', (e) => {
  showDropPreview(e.detail);
});

// Listen for framing mode change events from engine or UI
window.addEventListener('engine:framingChanged', (e) => {
  showFramingPreview(e.detail.info);
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

// 4. Initialize Three.js 3D Mesh Displacement Engine (Layer 1: Bottom)
if (threeCanvas && typeof THREE !== 'undefined') {
  try {
    threeEngine = new ThreeDisplacementEngine(threeCanvas);
  } catch (err) {
    console.error('[Engine] Failed to initialize Three.js Engine:', err);
  }
}

// Rebuild WebGL Engine in-place on a fresh canvas (self-healing recovery for GPU hang or context loss)
let engineRebuildCount = 0;
export function rebuildThreeEngine(reason = 'manual') {
  if (typeof THREE === 'undefined') return false;
  try {
    console.warn(`[Watchdog] Rebuilding Three.js WebGL Engine (reason: ${reason})...`);
    const snap = threeEngine && threeEngine.getSnapshot ? threeEngine.getSnapshot() : { currentAssetIndex };
    if (threeEngine && threeEngine.dispose) {
      try { threeEngine.dispose(); } catch (_) {}
    }

    const container = document.getElementById('canvas-container');
    const width = window.innerWidth || CONFIG.display.width;
    const height = window.innerHeight || CONFIG.display.height;
    if (container) {
      const freshCanvas = document.createElement('canvas');
      freshCanvas.id = 'three-canvas';
      freshCanvas.width = width;
      freshCanvas.height = height;
      if (threeCanvas && threeCanvas.parentNode === container) {
        container.replaceChild(freshCanvas, threeCanvas);
      } else {
        container.innerHTML = '';
        container.appendChild(freshCanvas);
      }
      threeCanvas = freshCanvas;
    }

    threeEngine = new ThreeDisplacementEngine(threeCanvas, { skipDefaultTexture: true });
    threeEngine.applySnapshot(snap);
    if (threeEngine.preloadCrateAssets) {
      threeEngine.preloadCrateAssets(getActiveCrateAssets(), currentAssetIndex, cuedAssetIndex);
    }
    window.threeEngine = threeEngine;
    engineRebuildCount++;
    lastFrameTime = performance.now();
    console.log(`[Watchdog] WebGL Engine rebuilt and state restored (#${engineRebuildCount}).`);
    return true;
  } catch (err) {
    recordLoopError('rebuildThreeEngine', err);
    return false;
  }
}

// Soft reset FX & risers back to clean artwork without reloading
export function softResetEngine(reason = 'manual') {
  try {
    if (buildup) buildup.cancel();
    if (threeEngine && threeEngine.softResetFx) threeEngine.softResetFx();
    if (midi && midi.state && midi.state.pads) {
      midi.state.pads.pad4 = false;
      midi.state.pads.padB4 = false;
    }
    showEffectPreview('ENGINE RESET', 'All FX & Risers cleared to clean artwork', '#10b981');
    console.log(`[Engine] Soft reset complete (${reason}).`);
  } catch (err) {
    recordLoopError('softResetEngine', err);
  }
}

// Listen for asset change events (Pad 3 / direct select)
window.addEventListener('engine:assetChange', (e) => {
  if (threeEngine) {
    threeEngine.setAsset(e.detail.index);
  }
});

// Listen for drag-and-drop asset loaded events
window.addEventListener('engine:assetLoaded', (e) => {
  if (assetPreviewCard) {
    assetPreviewThumb.src = e.detail.path;
    assetPreviewTag.textContent = 'Custom Drag-Drop';
    assetPreviewName.textContent = e.detail.name;
    assetPreviewCard.classList.remove('hidden');
    assetPreviewCard.classList.add('visible');
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      assetPreviewCard.classList.remove('visible');
      assetPreviewCard.classList.add('hidden');
    }, CONFIG.assets.previewDurationMs);
  }
});

// Ring-buffer error recorder (throttled so a repeating error never floods memory)
const MAX_ERROR_LOG = 25;
let lastErrorLogTime = 0;
let lastErrorMessage = '';
let totalErrorCount = 0;

function recordLoopError(stage, err) {
  totalErrorCount++;
  const now = performance.now();
  const msg = `[${stage}] ${err && (err.message || err.stack || String(err))}`;
  lastErrorMessage = msg;
  if (now - lastErrorLogTime > 2000) {
    lastErrorLogTime = now;
    if (!window.__errors) window.__errors = [];
    window.__errors.push(`${new Date().toISOString()} ${msg}`);
    if (window.__errors.length > MAX_ERROR_LOG) {
      window.__errors.shift();
    }
    console.error('[Engine Guard]', msg);
  }
}

// Unkillable Main Animation & Update Loop
const engineBootTime = performance.now();
let lastLoopTime = performance.now();
let lastFrameTime = performance.now();
let currentRafId = 0;
let watchdogFrameCount = 0;
let lastFpsSampleTime = performance.now();
let engineFps = 60;
let watchdogRestartedLoop = false;
let watchdogRebuiltEngine = false;

const FALLBACK_MIDI = {
  panX: 0.5,
  aperture: 0.5,
  joystickPan: 0.5,
  joystickAperture: 0.5,
  strobeLfoHz: 8.0,
  hydraHue: 0.0,
  hue: 0.0,
  waveSpread: 2.5,
  rippleRate: 1.0,
  audioSensitivity: 1.5,
  dropThresholdNorm: 0.5,
  padSlam: false,
};

function loop() {
  // 0. Schedule the next frame FIRST so an uncaught error can never stop the loop
  currentRafId = requestAnimationFrame(loop);

  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0.0001, (now - lastLoopTime) / 1000));
  lastLoopTime = now;

  let computedMidi = FALLBACK_MIDI;
  try {
    if (midi) computedMidi = midi.getComputedValues() || FALLBACK_MIDI;
  } catch (err) {
    recordLoopError('midi', err);
  }

  let audioState = null;
  try {
    if (audio) audioState = audio.update(computedMidi.audioSensitivity, computedMidi.dropThresholdNorm);
  } catch (err) {
    recordLoopError('audio', err);
  }

  // 1. Update One-Shot Buildup Sequencer (4Hz -> 60Hz Strobe, Blinder Climax, Pre-Drop Silence)
  let buildupState = null;
  try {
    if (buildup) buildupState = buildup.update(dt, audioState ? audioState.bpm : 128.0, audioState);
  } catch (err) {
    recordLoopError('buildup', err);
  }

  // 2. Render Three.js 3D Mesh Displacement Engine with In-Shader Physical Cuts & Invert
  let renderedFrame = false;
  try {
    if (threeEngine && !threeEngine.contextLost) {
      threeEngine.update(computedMidi, audioState, buildupState);
      renderedFrame = true;
    }
  } catch (err) {
    recordLoopError('threeEngine', err);
  }

  // 3. Update diagnostic telemetry HUD
  try {
    if (hud && midi) hud.update(midi.state, computedMidi, audioState, buildupState);
  } catch (err) {
    recordLoopError('hud', err);
  }

  if (renderedFrame) {
    lastFrameTime = now;
    watchdogFrameCount++;
    watchdogRestartedLoop = false;
    watchdogRebuiltEngine = false;
  }
}

// Start loop
currentRafId = requestAnimationFrame(loop);

// Self-Healing Frame Watchdog (monitors frame progress & WebGL context health every 1s)
const resCfg = CONFIG.resilience || {};
setInterval(() => {
  const now = performance.now();
  const elapsedFps = now - lastFpsSampleTime;
  if (elapsedFps >= 900) {
    engineFps = Math.round((watchdogFrameCount * 1000) / elapsedFps);
    watchdogFrameCount = 0;
    lastFpsSampleTime = now;
  }

  // Check if WebGL context has been lost and hasn't self-restored within timeout
  if (threeEngine && threeEngine.contextLost) {
    const lostDuration = now - (threeEngine.contextLostTime || now);
    if (lostDuration > (resCfg.contextLostRebuildMs || 3500)) {
      rebuildThreeEngine('webgl_context_lost_timeout');
      return;
    }
  }

  // Only trigger stall recovery when the projector tab is visible
  if (document.visibilityState && document.visibilityState !== 'visible') {
    return;
  }

  const stallMs = now - lastFrameTime;

  // Stage 1 (> 2.2s stall): Re-kick rAF loop & wake AudioContext
  if (stallMs > (resCfg.stallRestartMs || 2200) && !watchdogRestartedLoop) {
    watchdogRestartedLoop = true;
    console.warn(`[Watchdog] Frame stall detected (${Math.round(stallMs)}ms). Re-scheduling render loop...`);
    try { cancelAnimationFrame(currentRafId); } catch (_) {}
    currentRafId = requestAnimationFrame(loop);
    if (audio && audio.audioCtx && audio.audioCtx.state === 'suspended' && isEngineEngaged) {
      audio.audioCtx.resume().catch(() => {});
    }
  }

  // Stage 2 (> 6s stall): Rebuild Three.js WebGL renderer on a fresh canvas
  if (stallMs > (resCfg.stallRebuildMs || 6000) && !watchdogRebuiltEngine) {
    watchdogRebuiltEngine = true;
    rebuildThreeEngine(`frame_stall_${Math.round(stallMs)}ms`);
    try { cancelAnimationFrame(currentRafId); } catch (_) {}
    currentRafId = requestAnimationFrame(loop);
  }

  // Stage 3 (> 12s stall): Rate-limited page reload with automatic session restoration
  if (stallMs > (resCfg.stallReloadMs || 12000)) {
    try {
      const reloadKey = 'dj_engine_watchdog_reloads';
      const nowEpoch = Date.now();
      const recent = JSON.parse(sessionStorage.getItem(reloadKey) || '[]').filter(t => (nowEpoch - t) < 600000);
      const maxReloads = resCfg.maxAutoReloadsPer10Min || 3;
      if (recent.length < maxReloads) {
        recent.push(nowEpoch);
        sessionStorage.setItem(reloadKey, JSON.stringify(recent));
        console.error(`[Watchdog] Severe stall (${Math.round(stallMs)}ms). Saving state & reloading engine (${recent.length}/${maxReloads})...`);
        saveSessionState({ autoEngage: true, reloadReason: 'watchdog_stall' });
        window.location.reload();
      }
    } catch (_) {}
  }
}, resCfg.watchdogIntervalMs || 1000);

// Live Health Telemetry Heartbeat to Server & Phone Remote (every 2000ms)
function postHealthHeartbeat() {
  const now = performance.now();
  const computed = midi && midi.getComputedValues ? midi.getComputedValues() : FALLBACK_MIDI;
  const isBlackout = Boolean(
    (threeEngine && threeEngine.masterBlackout) ||
    (buildup && (buildup.state === 'blackout_shut' || buildup.isBlackout))
  );
  const curPresetIdx = threeEngine ? (threeEngine.currentPresetIndex || 0) : 0;
  const curPreset = CONFIG.visualStyles ? (CONFIG.visualStyles[curPresetIdx] || CONFIG.visualStyles[0]) : { name: 'Ripple' };
  const liveControls = {
    audioSensitivity: Math.round((computed.audioSensitivity || 1.5) * 100) / 100,
    waveSpread: Math.round((computed.waveSpread || 2.5) * 100) / 100,
    presetIndex: curPresetIdx,
    presetName: curPreset.name,
    blackout: isBlackout,
    buildupState: buildup ? (buildup.state || 'idle') : 'idle',
    buildupBars: buildup ? (buildup.totalBars || 4) : 4,
    buildupProgress: buildup ? Math.round((buildup.progress || 0) * 100) / 100 : 0,
    cleanProjection: isCleanProjection,
    bpmPulse: Boolean(audio && audio.pulseMode),
    bpm: audio && audio.state ? Math.round((audio.state.bpm || 128) * 10) / 10 : 128,
  };
  const health = {
    fps: engineFps,
    lastFrameAgeMs: Math.round(now - lastFrameTime),
    contextLost: Boolean(threeEngine && threeEngine.contextLost),
    cachedTextures: threeEngine && threeEngine.textureCache ? threeEngine.textureCache.size : 0,
    maxTextures: threeEngine ? (threeEngine.maxCachedTextures || 10) : 10,
    errorsCount: totalErrorCount,
    lastError: lastErrorMessage || null,
    rebuildCount: engineRebuildCount,
    engaged: isEngineEngaged,
    cleanProjection: isCleanProjection,
    bpm: audio && audio.state ? Math.round((audio.state.bpm || 128) * 10) / 10 : 128,
    uptimeSec: Math.round((now - engineBootTime) / 1000),
    ts: Date.now(),
  };
  postActionToServer('heartbeat', null, { health, liveControls });
}
setInterval(postHealthHeartbeat, resCfg.healthPostIntervalMs || 2000);
setTimeout(postHealthHeartbeat, 600);

// Restore saved session state on boot (especially after a watchdog or remote reload)
function restoreSessionOnBoot() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved) return;

    const ageMs = Date.now() - (saved.savedAt || 0);
    // Restore crate and active asset if saved within the last 12 hours
    if (ageMs < 12 * 3600 * 1000) {
      if (saved.activeCrate && saved.activeCrate !== CONFIG.assets.activeCrate) {
        CONFIG.assets.activeCrate = saved.activeCrate;
      }
      if (typeof saved.activeAssetId === 'number' && saved.activeAssetId >= 0 && saved.activeAssetId < CONFIG.assets.list.length) {
        selectAsset(saved.activeAssetId, false);
      }
      if (typeof saved.cuedAssetId === 'number' && saved.cuedAssetId >= 0 && saved.cuedAssetId < CONFIG.assets.list.length) {
        cuedAssetIndex = saved.cuedAssetId;
      }
      if (saved.cleanProjection) {
        toggleCleanProjection(true);
      }
      if (audio) {
        if (typeof saved.bpm === 'number' && saved.bpm >= 60 && saved.bpm <= 200) {
          audio.setBpm(saved.bpm, Boolean(saved.pulseMode));
        }
        if (typeof saved.pulseMode === 'boolean' && saved.pulseMode) {
          audio.togglePulseMode(true);
        }
      }
      if (threeEngine) {
        if (typeof saved.presetIndex === 'number') {
          threeEngine.currentPresetIndex = saved.presetIndex;
          if (threeEngine.uniforms?.uPreset) threeEngine.uniforms.uPreset.value = saved.presetIndex;
        }
        if (typeof saved.waveSpread === 'number' && midi && midi.state && midi.state.knobs) {
          const k3 = CONFIG.midi?.knobs?.knob3 || { min: 1.8, max: 3.6 };
          const norm = (saved.waveSpread - k3.min) / (k3.max - k3.min);
          midi.state.knobs.knob3 = Math.max(0, Math.min(1, norm));
        }
        if (typeof saved.hueFlowActive === 'boolean') {
          threeEngine.hueFlowActive = saved.hueFlowActive;
        }
        if (saved.framingManualOverride && typeof saved.framingMode === 'number') {
          threeEngine.framingManualOverride = true;
          threeEngine.setFramingMode(saved.framingMode);
        }
      }
    }

    // If reloaded by watchdog or remote within the last 60s (or already engaged), skip the start overlay automatically
    if ((saved.autoEngage && ageMs < 60000) || (saved.engaged && ageMs < 6 * 3600 * 1000)) {
      saveSessionState({ autoEngage: false });
      engageEngine();
    }
  } catch (_) {}
}

// Initial asset preview & session restore on boot
setTimeout(() => {
  restoreSessionOnBoot();
  if (!isCleanProjection) showAssetPreview(currentAssetIndex);
}, 350);

// Expose on window for diagnostics, OBS docks, and telemetry
window.audio = audio;
window.threeEngine = threeEngine;
window.midi = midi;
window.hud = hud;
window.buildup = buildup;
window.CONFIG = CONFIG;
window.setActiveCrate = setActiveCrate;
window.cycleCrate = cycleCrate;
window.getActiveCrateAssets = getActiveCrateAssets;
window.rebuildThreeEngine = rebuildThreeEngine;
window.softResetEngine = softResetEngine;

// URL Parameter Detection for OBS / Clean Projection Mode (?clean=1 or ?projection=1)
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('clean') === '1' || urlParams.get('projection') === '1' || urlParams.get('mode') === 'projection') {
    toggleCleanProjection(true);
  }
} catch (_) {}

window.toggleCleanProjection = toggleCleanProjection;


export { midi, audio, threeEngine, hud, buildup, currentAssetIndex, CONFIG };
console.log('[Engine] High-Performance Three.js Audiovisual Rig Online & Ready for OBS.');
