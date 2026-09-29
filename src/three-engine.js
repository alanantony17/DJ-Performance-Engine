/**
 * DJ Performance Engine - Three.js 3D Mesh Displacement Engine (Layer 1)
 * Physical Beat-Synced Wave Engine:
 *  - Kicks: Spawn physical outward liquid wave rings expanding from center lotus in exact BPM tempo.
 *  - Snares: Spawn inward wave rings from outer gold rim rippling toward center.
 *  - Melody & Vocals: Drive continuous fluid harmonic surface undulations.
 *  - 100% True Artwork Colors: Zero harsh specular glare; organic wave depth shading only.
 */

import { CONFIG } from './config.js';

export class ThreeDisplacementEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentTexture = null;
    this.rotSpeed = 0.005;
    this.rotationAngle = 0.0;
    this.surgeVelocity = 0.0;
    this.lastTime = performance.now();

    // Active 3D Motion Preset Index
    this.currentPresetIndex = 0;

    // Seamless Hue Flow State (Toggled via Pad 2 / Key 2)
    this.hueFlowActive = false;
    this.autoHue = 0.0;

    // Camera smoothing registers
    this.camTiltX = 0.0;
    this.camPosY = 0.0;
    this.camPosZ = 6.2;

    // Drop / Chorus Dynamic Response Registers
    this.dropIntensity = 0.0;
    this.meshScaleRecoil = 0.0;
    this.camKickImpulse = 0.0;

    // Physical Kick Wave Rings (Up to 4 concurrent expanding waves)
    this.kickRings = [
      { radius: 0.0, intensity: 0.0, width: 0.75, speed: 4.5 },
      { radius: 0.0, intensity: 0.0, width: 0.75, speed: 4.5 },
      { radius: 0.0, intensity: 0.0, width: 0.75, speed: 4.5 },
      { radius: 0.0, intensity: 0.0, width: 0.75, speed: 4.5 },
    ];
    this.kickRingIndex = 0;
    this.lastKickTimestamp = 0;

    // Physical Snare Wave Rings (Up to 2 concurrent inward waves)
    this.snareRings = [
      { radius: 4.2, intensity: 0.0, width: 0.60, speed: 5.2 },
      { radius: 4.2, intensity: 0.0, width: 0.60, speed: 5.2 },
    ];
    this.snareRingIndex = 0;
    this.lastSnareTimestamp = 0;

    // Scene & Camera Setup
    this.scene = new THREE.Scene();
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 6.2);

    // Renderer (alpha: true, powerPreference: high-performance)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Subdivided Plane Geometry (8x8 units, 128x128 grid = 16,641 vertices)
    this.geometry = new THREE.PlaneGeometry(8, 8, 128, 128);

    // Custom GPU GLSL ShaderMaterial
    this.initMaterial();

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Initial asset load & drag-and-drop
    this.initDefaultTexture();
    this.initDragAndDrop();

    console.log('[ThreeEngine] Beat-Synced 3D Physical Wave Engine initialized (128x128 grid).');
  }

  initMaterial() {
    this.uniforms = {
      uTexture: { value: null },
      uTime: { value: 0.0 },
      uBeatPhase: { value: 0.0 },
      uMelody: { value: 0.0 },
      uBass: { value: 0.0 },
      uAmp: { value: 1.0 },
      uSpread: { value: 2.5 }, // Controlled by Knob 3 (smooth wavelength, 1.8 to 3.6)
      uDrop: { value: 0.0 },   // Dynamic Drop / Chorus Intensity (0.0 = Verse, 1.0 = Peak Drop)
      uPreset: { value: 0 },
      uHue: { value: 0.0 },
      uPadSlam: { value: 0.0 },
      // Physical wave rings arrays passed to GPU: vec3(radius, intensity, width)
      uKickRings: {
        value: [
          new THREE.Vector3(0, 0, 0.75),
          new THREE.Vector3(0, 0, 0.75),
          new THREE.Vector3(0, 0, 0.75),
          new THREE.Vector3(0, 0, 0.75),
        ],
      },
      uSnareRings: {
        value: [
          new THREE.Vector3(4.2, 0, 0.60),
          new THREE.Vector3(4.2, 0, 0.60),
        ],
      },
    };

    const vertexShader = `
      uniform vec3 uKickRings[4];
      uniform vec3 uSnareRings[2];
      uniform float uMelody;
      uniform float uBeatPhase;
      uniform float uTime;
      uniform float uBass;
      uniform float uAmp;
      uniform float uSpread;
      uniform float uDrop;
      uniform int uPreset;

      varying vec2 vUv;
      varying float vZ;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float r = length(pos.xy);
        float rMod = r;

        // Smooth subtle radial breathing on X/Y: gentle in verse, heavily amplified in drop
        if (r > 0.0001) {
          vec2 dir = pos.xy / r;
          float expandAmount = mix(0.015, 0.16, uDrop);
          float expand = sin(uBeatPhase * 6.28318) * (uBass * expandAmount + uMelody * 0.03);
          pos.xy += dir * expand;
        }

        // 1. Kick Shockwave Rings (Expanding outward on each kick drum strike)
        float kickWave = 0.0;
        for (int i = 0; i < 4; i++) {
          if (uKickRings[i].y > 0.005) {
            float rDist = abs(rMod - uKickRings[i].x);
            float width = uKickRings[i].z;
            if (rDist < width * 2.2) {
              float wave = sin((uKickRings[i].x - rMod) / width * 3.14159);
              float env = exp(-rDist * rDist / (width * width * 0.85));
              kickWave += wave * env * uKickRings[i].y;
            }
          }
        }

        // 2. Snare Wave Rings (Rippling inward on each snare hit)
        float snareWave = 0.0;
        for (int i = 0; i < 2; i++) {
          if (uSnareRings[i].y > 0.005) {
            float rDist = abs(rMod - uSnareRings[i].x);
            float width = uSnareRings[i].z;
            if (rDist < width * 2.2) {
              float wave = sin((rMod - uSnareRings[i].x) / width * 3.14159);
              float env = exp(-rDist * rDist / (width * width * 0.85));
              snareWave += wave * env * uSnareRings[i].y;
            }
          }
        }

        // 3. Melody Fluid Harmonics (Dancing to vocals, leads, and harmonic chords)
        float melodyWave = 0.0;
        if (uMelody > 0.015) {
          float angle = atan(pos.y, pos.x);
          // Standing harmonic ripple modulated by beat phase and melody energy
          float harm = sin(rMod * uSpread * 1.15 - uBeatPhase * 6.28318) * cos(angle * 4.0 + uTime * 0.85);
          melodyWave = harm * uMelody * 0.44;
        }

        float z = 0.0;

        // Apply according to active 3D motion preset
        if (uPreset == 0) {
          // PRESET 0: Beat-Synced Liquid Ripple (All instruments combined)
          z = (kickWave * 0.95 + snareWave * 0.65 + melodyWave) * uAmp;
        } else if (uPreset == 1) {
          // PRESET 1: Kinetic Kick Shockwave (Pure focus on kick transient rings + lotus bounce)
          float centerPunch = exp(-rMod * 1.6) * sin(uBeatPhase * 6.28318) * uBass * 0.7;
          z = (kickWave * 1.35 + centerPunch) * uAmp;
        } else if (uPreset == 2) {
          // PRESET 2: Melody Harmonic Waves (Fluid standing ripples dancing to vocals & melody)
          float angle = atan(pos.y, pos.x);
          float standing = sin(rMod * uSpread - uBeatPhase * 6.28318) * cos(angle * 8.0);
          z = (melodyWave * 1.35 + standing * (uMelody * 0.5 + 0.12)) * uAmp;
        } else if (uPreset == 3) {
          // PRESET 3: Snare & Kick Dual Interlock (Opposing drum waves colliding across the mandala)
          z = (kickWave * 1.15 + snareWave * 1.15) * uAmp;
        }

        pos.z += z;
        vZ = pos.z;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uTexture;
      uniform float uHue;
      uniform float uBass;
      uniform float uMid;
      uniform float uDrop;
      uniform float uPadSlam;

      varying vec2 vUv;
      varying float vZ;

      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        // Instant Blackout on Pad 4 DROP SLAM
        if (uPadSlam > 0.5) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          return;
        }

        // Texture coordinate scaling with MirroredRepeatWrapping
        vec2 centeredUv = vUv - 0.5;
        float uvScale = 1.0 + (uMid * 0.12);
        vec2 finalUv = centeredUv * uvScale + 0.5;

        vec4 texColor = texture2D(uTexture, finalUv);

        // 100% PURE, VIBRANT ARTWORK COLORS
        // Wave depth shading: subtle in verse (+12% / -10%), deep dramatic contrast in drop (+25% / -20%)
        float shadeDepth = mix(0.12, 0.35, uDrop);
        float waveShade = 1.0 + clamp(vZ * shadeDepth, -0.22, 0.22);
        vec3 col = texColor.rgb * waveShade;

        // Sub-bass warm punch on kicks: gentle in verse (+2%), punchy in drop (+16%)
        float bassGlow = mix(0.02, 0.16, uDrop);
        col += texColor.rgb * (uBass * bassGlow);

        // Color Hue shift from AKAI Knob 2
        if (uHue > 0.001) {
          vec3 hsv = rgb2hsv(col);
          hsv.x = fract(hsv.x + uHue);
          col = hsv2rgb(hsv);
        }

        gl_FragColor = vec4(col, texColor.a);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      side: THREE.DoubleSide,
      transparent: true,
    });
  }

  initDefaultTexture() {
    const mandalaAsset = CONFIG.assets.list.find(a => a.name.toLowerCase().includes('mandala')) || CONFIG.assets.list[0];
    const initialPath = mandalaAsset ? mandalaAsset.path : 'assets/mandala.jpg';
    this.loadTexture(initialPath, mandalaAsset ? mandalaAsset.name : 'Mandala');
  }

  loadTexture(source, name = 'Artwork') {
    const loader = new THREE.TextureLoader();
    loader.load(
      source,
      (texture) => {
        // Prevent memory leaks: dispose existing texture GPU resources
        if (this.currentTexture) {
          this.currentTexture.dispose();
        }
        this.currentTexture = texture;

        // MirroredRepeatWrapping ensures gaps are seamlessly filled by mirroring the visuals' own patterns
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        this.uniforms.uTexture.value = texture;
        console.log(`[ThreeEngine] Ingested texture: ${name} with MirroredRepeatWrapping.`);
      },
      undefined,
      (err) => console.error('[ThreeEngine] Failed to load texture:', err)
    );
  }

  initDragAndDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.loadTexture(event.target.result, file.name);
          window.dispatchEvent(new CustomEvent('engine:assetLoaded', {
            detail: { name: file.name, path: event.target.result }
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  }

  setAsset(index) {
    if (index >= 0 && index < CONFIG.assets.list.length) {
      const asset = CONFIG.assets.list[index];
      this.loadTexture(asset.path, asset.name);
    }
  }

  cyclePreset() {
    this.currentPresetIndex = (this.currentPresetIndex + 1) % CONFIG.visualStyles.length;
    this.uniforms.uPreset.value = this.currentPresetIndex;
    const activePreset = CONFIG.visualStyles[this.currentPresetIndex];
    console.log(`[ThreeEngine] Switched 3D Motion Preset: ${activePreset.name} (${activePreset.desc})`);
    window.dispatchEvent(new CustomEvent('engine:styleChanged', {
      detail: { index: this.currentPresetIndex, style: activePreset }
    }));
    return activePreset;
  }

  setPreset(index) {
    if (index >= 0 && index < CONFIG.visualStyles.length) {
      this.currentPresetIndex = index;
      this.uniforms.uPreset.value = this.currentPresetIndex;
      const activePreset = CONFIG.visualStyles[this.currentPresetIndex];
      window.dispatchEvent(new CustomEvent('engine:styleChanged', {
        detail: { index: this.currentPresetIndex, style: activePreset }
      }));
      return activePreset;
    }
  }

  getPreset() {
    return CONFIG.visualStyles[this.currentPresetIndex];
  }

  // Toggle Seamless Hue Flow Mode (Pad 2 / Key 2)
  toggleHueFlow() {
    this.hueFlowActive = !this.hueFlowActive;
    const modeName = this.hueFlowActive ? 'Seamless Auto Flow' : 'Original Palette';
    console.log(`[ThreeEngine] Switched Hue Mode: ${modeName}`);
    window.dispatchEvent(new CustomEvent('engine:hueModeChanged', {
      detail: { active: this.hueFlowActive, name: modeName }
    }));
    return { active: this.hueFlowActive, name: modeName };
  }

  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(computedMidi, audioState) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 1. Audio Frequency & Transient Decomposition
    let bass = 0.0;
    let snare = 0.0;
    let melody = 0.0;
    let bpm = 128.0;
    let beatPhase = 0.0;

    // Dynamic Drop Intensity Tracking & Configuration
    const rawDrop = audioState ? (audioState.dropIntensity || 0.0) : 0.0;
    this.dropIntensity = THREE.MathUtils.lerp(this.dropIntensity, rawDrop, 0.18);
    const dropFactor = this.dropIntensity;
    const dropCfg = CONFIG.audio?.dynamics?.drop || {
      verseScaleMultiplier: 0.018,
      dropScaleMultiplier: 0.28,
      verseWaveMultiplier: 0.26,
      dropWaveMultiplier: 1.95,
      camKickImpulse: 0.85,
      surgeVerse: 0.04,
      surgeDrop: 0.45,
    };

    if (audioState) {
      bass = audioState.kickPunch !== undefined ? audioState.kickPunch : audioState.kickLevel;
      snare = audioState.highLevel || 0.0;
      bpm = audioState.bpm || 128.0;
      beatPhase = audioState.beatPhase || 0.0;

      // Extract Melody & Vocals from FFT bins 11 to 35
      if (audioState.fft && audioState.fft.length >= 35) {
        let sum = 0;
        for (let i = 11; i <= 35; i++) sum += audioState.fft[i];
        melody = (sum / 25) * 1.5;
      } else {
        melody = audioState.energyLevel || 0.0;
      }

      // Kinetic Angular Surge from kick strikes:
      // In verse: gentle +0.04 (minimal deviation from steady rotation)
      // In drop: high-octane +0.45 surge per kick strike!
      if (audioState.kickTrigger) {
        const surgeRate = THREE.MathUtils.lerp(dropCfg.surgeVerse, dropCfg.surgeDrop, dropFactor);
        this.surgeVelocity += bass * surgeRate;
      }

      // ==============================================================
      // PHYSICAL KICK TRANSIENT SPAWNER (WAVE RINGS BORN AT CENTER)
      // ==============================================================
      const timeSinceKick = now - this.lastKickTimestamp;
      if (audioState.kickTrigger || (bass > 0.42 && timeSinceKick > 180)) {
        this.lastKickTimestamp = now;
        const ring = this.kickRings[this.kickRingIndex];
        ring.radius = 0.05; // Born right at the center lotus!

        // In verse: gentle, subtle ripples (0.35 max)
        // In drop: explosive high-power shockwaves (1.8 max)
        const waveIntensity = THREE.MathUtils.lerp(
          Math.min(0.35, bass * 0.35),
          Math.min(1.8, bass * 1.5),
          dropFactor
        );
        ring.intensity = waveIntensity;

        // Wave propagation speed: calm in verse, fast in drop
        const baseSpeed = THREE.MathUtils.lerp(2.6, 4.6, dropFactor);
        ring.speed = (bpm / 60.0) * baseSpeed;
        ring.width = 0.65 + (computedMidi.waveSpread ? (computedMidi.waveSpread - 1.8) * 0.2 : 0.15);
        this.kickRingIndex = (this.kickRingIndex + 1) % this.kickRings.length;
      }

      // ==============================================================
      // PHYSICAL SNARE TRANSIENT SPAWNER (WAVE RINGS BORN AT RIM)
      // ==============================================================
      const timeSinceSnare = now - this.lastSnareTimestamp;
      if (audioState.highTrigger || (snare > 0.40 && timeSinceSnare > 220)) {
        this.lastSnareTimestamp = now;
        const ring = this.snareRings[this.snareRingIndex];
        ring.radius = 4.2; // Born at the outer gold rim!
        ring.intensity = Math.min(1.2, snare * 1.3);
        ring.speed = (bpm / 60.0) * 4.6;
        ring.width = 0.55;
        this.snareRingIndex = (this.snareRingIndex + 1) % this.snareRings.length;
      }
    }

    // Advance and decay active Kick Wave Rings
    for (let i = 0; i < this.kickRings.length; i++) {
      const ring = this.kickRings[i];
      if (ring.intensity > 0.005) {
        ring.radius += ring.speed * dt;
        ring.intensity *= Math.exp(-1.9 * dt); // Smooth exponential damping
        if (ring.radius > 5.5) ring.intensity = 0.0;
      }
      this.uniforms.uKickRings.value[i].set(ring.radius, ring.intensity, ring.width);
    }

    // Advance and decay active Snare Wave Rings (traveling inward)
    for (let i = 0; i < this.snareRings.length; i++) {
      const ring = this.snareRings[i];
      if (ring.intensity > 0.005) {
        ring.radius -= ring.speed * dt;
        ring.intensity *= Math.exp(-2.4 * dt);
        if (ring.radius < 0.1) ring.intensity = 0.0;
      }
      this.uniforms.uSnareRings.value[i].set(ring.radius, ring.intensity, ring.width);
    }

    // 2. Hardware MIDI Knobs & Controls
    const k1Lfo = computedMidi.strobeLfoHz || 8.0; // 2Hz to 50Hz
    this.rotSpeed = 0.002 + (k1Lfo / 50.0) * 0.018; // Slow majestic rotation

    // Seamless Auto-Hue Flow vs. Manual / Original Palette
    if (this.hueFlowActive) {
      this.autoHue = (this.autoHue + dt * 0.12) % 1.0;
    }
    const manualHue = computedMidi.hydraHue || 0.0;
    const effectiveHue = this.hueFlowActive ? (this.autoHue + manualHue) % 1.0 : manualHue;

    const waveSpread = computedMidi.waveSpread || 2.5; // Knob 3: Wave Spread (1.8 to 3.6)
    const sensitivity = computedMidi.audioSensitivity || 1.5; // Knob 4: Wave Depth Multiplier

    // Drop Wave Depth Multiplier:
    // In verse/breakdown: 0.26x (calm, glassy, subtle 3D displacement)
    // In drop/chorus: 1.95x (towering 3D wave canyons)
    const waveDepthMult = THREE.MathUtils.lerp(dropCfg.verseWaveMultiplier, dropCfg.dropWaveMultiplier, dropFactor);
    const waveAmp = (0.25 + sensitivity * 0.45) * waveDepthMult;

    // 3. Rotation Physics (Base + Kinetic Surge on Kicks)
    this.rotationAngle += (this.rotSpeed + this.surgeVelocity) * dt * 60;
    this.mesh.rotation.z = this.rotationAngle;
    this.surgeVelocity *= Math.exp(-6.0 * dt);

    // 4. Sub-bass (Kick) Master Mesh Pulse Scale
    // IN VERSE: Max +1.8% scale pump with gentle beat breath (barely noticeable)
    // IN DROP: Massive +28% scale pump on kick beats with elastic recoil!
    if (audioState && audioState.kickTrigger && dropFactor > 0.15) {
      this.meshScaleRecoil = Math.min(0.22, bass * 0.20 * dropFactor);
    }
    this.meshScaleRecoil *= Math.exp(-10.5 * dt);

    const verseScale = 1.0 + (bass * dropCfg.verseScaleMultiplier) + Math.sin(beatPhase * 6.28318) * 0.005;
    const dropKickPump = Math.pow(Math.min(1.0, bass), 1.35) * dropCfg.dropScaleMultiplier;
    const dropScale = 1.0 + dropKickPump + this.meshScaleRecoil;

    const scalePunch = THREE.MathUtils.lerp(verseScale, dropScale, dropFactor);
    this.mesh.scale.set(scalePunch, scalePunch, 1.0);

    // 5. Camera Target Setup
    let targetTiltX = 0.0;
    let targetPosY = 0.0;
    let targetPosZ = 6.2;

    // Dynamic Camera Z Recoil on heavy drop kicks
    if (audioState && audioState.kickTrigger && dropFactor > 0.25) {
      this.camKickImpulse += bass * dropCfg.camKickImpulse * dropFactor;
    }
    this.camKickImpulse *= Math.exp(-8.0 * dt);
    targetPosZ -= this.camKickImpulse;

    // Joystick Pan & Aperture
    const targetCamX = (computedMidi.panX - 0.5) * 4.0;
    const zoomFactor = THREE.MathUtils.lerp(0.75, 1.45, computedMidi.aperture);
    targetPosZ = targetPosZ / zoomFactor;

    this.camTiltX = THREE.MathUtils.lerp(this.camTiltX, targetTiltX, 0.06);
    this.camPosY = THREE.MathUtils.lerp(this.camPosY, targetPosY, 0.06);
    this.camPosZ = THREE.MathUtils.lerp(this.camPosZ, targetPosZ, 0.06);

    this.camera.rotation.x = this.camTiltX;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
    this.camera.position.y = this.camPosY;
    this.camera.position.z = this.camPosZ;

    // 6. Shader Uniform Updates
    this.uniforms.uTime.value = now * 0.001;
    this.uniforms.uBeatPhase.value = beatPhase;
    this.uniforms.uMelody.value = melody;
    this.uniforms.uBass.value = bass;
    this.uniforms.uAmp.value = waveAmp;
    this.uniforms.uSpread.value = waveSpread;
    this.uniforms.uDrop.value = dropFactor;
    this.uniforms.uPreset.value = this.currentPresetIndex;
    this.uniforms.uHue.value = effectiveHue;
    this.uniforms.uPadSlam.value = computedMidi.padSlam ? 1.0 : 0.0;

    // 7. Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.currentTexture) this.currentTexture.dispose();
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
