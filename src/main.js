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
const threeCanvas = document.getElementById('three-canvas');
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
  if (!buildupPreviewCard || !detail) return;

  if (detail.state === 'building') {
    const arch = detail.archetype || { name: 'Kinetic Blitz', desc: 'Accelerating strobe to drop', color: '#facc15' };
    if (buildupPreviewIcon) buildupPreviewIcon.textContent = '⚡';
    if (buildupPreviewTag) {
      buildupPreviewTag.textContent = `BUILDUP: ${arch.name.toUpperCase()}`;
      buildupPreviewTag.style.color = arch.color || '#eab308';
    }
    if (buildupPreviewMode) {
      buildupPreviewMode.textContent = `${detail.totalBars || 4}-BAR BUILD`;
      buildupPreviewMode.style.borderColor = arch.color || '#eab308';
      buildupPreviewMode.style.color = arch.color || '#fef08a';
    }
    if (buildupPreviewName) buildupPreviewName.textContent = `${detail.totalBars || 4}-BAR [${arch.name.toUpperCase()}] @ ${(detail.lockedBpm || 128).toFixed(0)} BPM`;
    if (buildupPreviewDesc) buildupPreviewDesc.textContent = `${arch.desc} Hit Pad 4 (SLAM) to drop!`;
  } else if (detail.state === 'holding_climax') {
    const arch = detail.archetype || { name: 'Kinetic Blitz', color: '#ef4444' };
    if (buildupPreviewIcon) buildupPreviewIcon.textContent = '🔥';
    if (buildupPreviewTag) buildupPreviewTag.textContent = 'PEAK CLIMAX';
    if (buildupPreviewMode) {
      buildupPreviewMode.textContent = arch.mode === 'implosion' ? 'OBSIDIAN VOID' : '100% WHITEOUT';
      buildupPreviewMode.style.borderColor = '#ef4444';
      buildupPreviewMode.style.color = '#fef08a';
    }
    if (buildupPreviewName) buildupPreviewName.textContent = 'MAXIMUM CLIMAX REACHED';
    if (buildupPreviewDesc) buildupPreviewDesc.textContent = 'Holding peak climax tension. Hit Pad 4 (SLAM) to drop!';
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

// Cycle to next asset
export function cycleAsset() {
  currentAssetIndex = (currentAssetIndex + 1) % CONFIG.assets.list.length;
  console.log(`[Engine] Switched to asset: ${CONFIG.assets.list[currentAssetIndex].name} (${CONFIG.assets.list[currentAssetIndex].path})`);
  showAssetPreview(currentAssetIndex);
  // Dispatch asset change event for visual pipeline
  window.dispatchEvent(new CustomEvent('engine:assetChange', { detail: { index: currentAssetIndex, asset: CONFIG.assets.list[currentAssetIndex] } }));
  // Silently check if new assets have been placed in the folder
  autoDiscoverAssets();
}

// Background auto-discovery polling every 15 seconds
setInterval(autoDiscoverAssets, 15000);

// Cycle to next 3D motion preset (Pad 5 / Key 5 / V)
export function cycleStyle() {
  if (threeEngine) {
    const activePreset = threeEngine.cyclePreset();
    showStylePreview(activePreset);
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

// 2b. Initialize One-Shot Buildup Sequencer
const buildup = new BuildupSequencer();

// Auto-engage engine function
async function engageEngine() {
  if (startOverlay) {
    startOverlay.classList.add('hidden');
    startOverlay.style.display = 'none';
  }
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

// Support Space key to engage engine when overlay is active
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && startOverlay && !startOverlay.classList.contains('hidden')) {
    e.preventDefault();
    engageEngine();
  }
});

// Auto-engage for OBS Browser Source / Headless rigs (?autostart=1 or ?obs=1)
if (window.location.search.includes('autostart=1') || window.location.search.includes('obs=1')) {
  engageEngine();
}

// Open audio modal if ?modal=audio
if (window.location.search.includes('modal=audio')) {
  setTimeout(() => openAudioModal(), 200);
}

// 3. Initialize Web MIDI Controller (AKAI MPK Mini 3 - Clean 8-Pad Layout)
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
      }
      showEffectPreview('DROP SLAM', 'Master Blackout & FX Cleared', '#f43f5e');
    } else if (padId === 'pad5') {
      // Pad 5: Cycle 3D Motion Preset
      cycleStyle();
    } else if (padId === 'pad6') {
      // Pad 6: Toggle Auto-Hue Flow
      toggleHue();
    } else if (padId === 'pad7') {
      // Pad 7: Temporal Beat Repeat Hotcue Key (Quantized stutter/freeze)
      if (threeEngine) {
        const res = threeEngine.toggleBeatRepeat();
        showEffectPreview('BEAT REPEAT', res.active ? `${res.style.name.toUpperCase()} ACTIVE` : 'REPEAT BYPASSED', res.active ? '#00f0ff' : '#94a3b8');
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
      // Pad B1: Cycle Armed Beat Repeat Subdivision Rate
      if (threeEngine) {
        const res = threeEngine.cycleBeatRepeatRate();
        showEffectPreview(`REPEAT RATE [${res.index + 1}/4]`, `${res.style.name}: ${res.style.desc}`, '#00f0ff');
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
      }
      showEffectPreview('DROP SLAM', 'Master Blackout & FX Cleared', '#f43f5e');
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
  if (e.code === CONFIG.midi.keyboardFallback.toggleHud) {
    hud.toggle();
  }
  if (e.code === CONFIG.midi.keyboardFallback.toggleDropKey) {
    toggleDrop();
  }
  // Toggle BPM Lock (Key L)
  if (e.code === 'KeyL') {
    if (audio) {
      const isLocked = audio.toggleBpmLock();
      showEffectPreview(isLocked ? 'BPM LOCKED' : 'BPM AUTO TRACK', `${audio.state.bpm.toFixed(1)} BPM`, isLocked ? '#22c55e' : '#00f0ff');
    }
  }
  // Toggle Framing Mode (Key M: World-Field / Radial Portal / Classic)
  if (e.code === CONFIG.midi.keyboardFallback.toggleFramingKey || e.code === 'KeyM') {
    if (threeEngine) {
      const mode = threeEngine.cycleFramingMode();
      showFramingPreview(mode);
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

// Main Animation & Update Loop
let lastLoopTime = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastLoopTime) / 1000);
  lastLoopTime = now;

  const computedMidi = midi.getComputedValues();
  const audioState = audio.update(computedMidi.audioSensitivity, computedMidi.dropThresholdNorm);

  // 1. Update One-Shot Buildup Sequencer (4Hz -> 60Hz Strobe, Blinder Climax, Pre-Drop Silence)
  const buildupState = buildup.update(dt, audioState ? audioState.bpm : 128.0, audioState);

  // 2. Render Three.js 3D Mesh Displacement Engine with In-Shader Physical Cuts & Invert
  if (threeEngine) {
    threeEngine.update(computedMidi, audioState, buildupState);
  }

  // 3. Update diagnostic telemetry HUD
  hud.update(midi.state, computedMidi, audioState, buildupState);

  requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);

// Initial asset preview display on boot
setTimeout(() => showAssetPreview(0), 500);

// Expose on window for diagnostics, OBS docks, and telemetry
window.audio = audio;
window.threeEngine = threeEngine;
window.midi = midi;
window.hud = hud;
window.buildup = buildup;
window.CONFIG = CONFIG;

export { midi, audio, threeEngine, hud, buildup, currentAssetIndex, CONFIG };
console.log('[Engine] High-Performance Three.js Audiovisual Rig Online & Ready for OBS.');
