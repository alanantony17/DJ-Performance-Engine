/**
 * DJ Performance Engine - Three.js 3D Mesh Displacement Engine (Layer 1)
 *
 * Architecture: "The Sacred Totem & Harmonized Atmosphere"
 *  - The Sacred Totem (Hero Centerpiece): 100% authentic, crisp artwork colors with
 *    physical beat-synced 3D wave displacement, subtle floating & heartbeat scale pump.
 *  - 3D Harmonized Stardust Motes: Volumetric particles streaming through the void,
 *    dynamically tinted to the active artwork's extracted chromatic palette.
 *  - Fluid Silhouette Corona (Edge Advection): Organic fluid smoke/ink breathing outward
 *    from the asset contours on beat transients via a 2-pass ping-pong feedback loop.
 *  - Obsidian Void Harmonization: Deep, velvety dark void (#030408) with microscopic color
 *    temperature from the asset. Zero sunbeams, zero piercing backlights, pure cinematic contrast.
 *  - Full Hardware Compatibility: AKAI MPK Mini 3 Knobs & Pads, Physical Slicer (Pad 7),
 *    Negative Invert (Pad 8), DROP SLAM (Pad 4), and Buildup Sequencer.
 */

import { CONFIG } from './config.js';

export const FRAMING_MODES = [
  { id: 0, key: 'world', name: 'World-Field', badge: 'WORLD FIELD', desc: '16:9 Screen Fill + UV Flow (seamless mirrored repeat)' },
  { id: 1, key: 'portal', name: 'Radial Portal', badge: 'RADIAL PORTAL', desc: 'Soft circular mask into floating totem with void & corona' },
  { id: 2, key: 'classic', name: 'Classic Totem', badge: 'CLASSIC', desc: 'Raw plane with physical 3D mesh rotation' },
];

export class ThreeDisplacementEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.currentTexture = null;
    this.rotSpeed = 0.005;
    this.rotationAngle = 0.0;
    this.surgeVelocity = 0.0;
    this.lastTime = performance.now();

    // Framing Paradigm Mode (World-Field vs. Radial Portal vs. Classic)
    this.framingMode = 0;
    this.framingManualOverride = false;

    // Active 3D Motion Preset Index
    this.currentPresetIndex = 0;

    // Seamless Hue Flow State (Toggled via Pad 2 / Key 2)
    this.hueFlowActive = false;
    this.autoHue = 0.0;

    // Dynamic Optical Grating / Comb Shutter Registers (Pad 7 / Master Lens Shutter)
    this.gratingActive = false;
    this.gratingStyle = 0; // 0: Linear Kinetic Sweep, 1: Radial Gobo Teeth, 2: Kinetic Moire Waves, 3: Sonic Breathing Slits
    this.gratingRotation = 0.785398; // 45 deg
    this.gratingDensity = 14.0;
    this.gratingWidth = 0.18; // Thick, high-contrast shadow bars
    this.gratingDeployProgress = 0.0;
    this.gratingDeployDuration = 1.0; // Standalone mechanical deployment duration (~2 beats)
    this.gratingBeatTime = 0.0; // Tempo-locked beat accumulator (1.0 = 1 quarter-note beat)
    this.gratingStyles = [
      { id: 0, name: 'Linear Kinetic Sweep', badge: 'LINEAR', desc: 'Thick diagonal shadow bars sweeping across the lens' },
      { id: 1, name: 'Radial Gobo Teeth', badge: 'RADIAL', desc: 'Motorized optical pinwheel teeth spinning from center core' },
      { id: 2, name: 'Kinetic Moiré Waves', badge: 'MOIRÉ', desc: 'Dual-layer optical interference producing massive swimming ripples' },
      { id: 3, name: 'Sonic Breathing Slits', badge: 'SONIC', desc: 'Acoustic shutter aperture breathing dynamically to kick bass' },
    ];
    // Backward compatibility references
    this.beatRepeatActive = false;
    this.beatRepeatIndex = 0;
    this.beatRepeatStyles = this.gratingStyles;

    // Physical In-Shader FX States (Legacy Slicer & Invert)
    this.slicerActive = false;
    this.slicerStyle = 0;
    this.slicerRotation = 0.785398;
    this.negativeActive = false;

    // ILDA Projector Laser & Spatial Strobe Engine Registers (Approach B)
    this.laserManualPunch = false;
    this.laserBeamWidth = 1.0;
    this.laserFanSpeed = 2.5;
    this.laserFanBlades = 12.0;

    // Camera smoothing registers
    this.camTiltX = 0.0;
    this.camPosY = 0.0;
    this.camPosZ = 6.2;

    // Drop / Chorus Dynamic Response Registers
    this.dropIntensity = 0.0;
    this.meshScaleRecoil = 0.0;
    this.camKickImpulse = 0.0;

    // Extracted Dual-Tone Harmonic Palette
    this.colorPrimary = [0.72, 0.76, 0.88];
    this.colorSecondary = [0.45, 0.55, 0.78];

    // Silhouette Corona & Fluid Advection Parameters (Subtle & Organic)
    this.coronaIntensity = 1.2;
    this.spreadReach = 1.3;
    this.curl = 1.0;
    this.decay = 0.93;

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

    // Scene & Perspective Camera Setup
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
    this.renderer.setClearColor(0x000000, 0.0);

    // 1. HARMONIZED 3D STARDUST PARTICLE FIELD
    this.initStardust();

    // 2. THE HERO PERFORMANCE MESH (16:9 Frustum Fill & Isotropic Cells)
    // 16.0x9.0 units, 160x90 grid for perfect 16:9 widescreen frustum fill with isotropic square cells
    this.geometry = new THREE.PlaneGeometry(16.0, 9.0, 160, 90);
    this.initMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // 3. FLUID SILHOUETTE CORONA & OBSIDIAN VOID FEEDBACK PIPELINE
    this.initFeedbackPipeline(width, height);

    // Initial asset load & drag-and-drop
    this.initDefaultTexture();
    this.initDragAndDrop();

    console.log('[ThreeEngine] Harmonized Totem & Obsidian Void Silhouette Corona Engine initialized.');
  }

  // --- 1. Harmonized 3D Stardust Setup ---
  initStardust() {
    this.starCount = 1800;
    this.starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(this.starCount * 3);
    this.starVelocities = new Float32Array(this.starCount);
    const starColors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.0 + Math.random() * 8.5;
      starPositions[i * 3 + 0] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = Math.sin(angle) * radius;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 22.0;

      this.starVelocities[i] = 0.8 + Math.random() * 2.2;

      // Base initialization
      starColors[i * 3 + 0] = 0.72;
      starColors[i * 3 + 1] = 0.76;
      starColors[i * 3 + 2] = 0.88;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uKick: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 color;
        uniform float uKick;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          float pSize = (12.0 / -mvPosition.z) * (1.0 + uKick * 0.35);
          gl_PointSize = clamp(pSize, 2.0, 22.0);

          vAlpha = smoothstep(0.4, 2.2, -mvPosition.z) * smoothstep(18.0, 7.0, -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float glow = exp(-dist * dist * 12.0);
          gl_FragColor = vec4(vColor, glow * vAlpha * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.starParticles = new THREE.Points(this.starGeometry, this.starMaterial);
    this.scene.add(this.starParticles);
  }

  // --- 2. Sacred Totem Material Setup ---
  initMaterial() {
    this.uniforms = {
      uTexture: { value: null },
      uTime: { value: 0.0 },
      uBeatPhase: { value: 0.0 },
      uMelody: { value: 0.0 },
      uBass: { value: 0.0 },
      uAmp: { value: 1.0 },
      uSpread: { value: 2.5 },
      uDrop: { value: 0.0 },
      uPreset: { value: 0 },
      uHue: { value: 0.0 },
      uMid: { value: 0.0 },
      uPadSlam: { value: 0.0 },
      uMasterBlackout: { value: 0.0 },
      uBuildupActive: { value: 0.0 },
      uStrobePulse: { value: 1.0 },
      uSlicer: { value: 0.0 },
      uSlicerStyle: { value: 0 },
      uSlicerAngle: { value: 0.785398 },
      uSlicerDensity: { value: 16.0 },
      uNegative: { value: 0.0 },
      uBlinder: { value: 0.0 },
      uGlitch: { value: 0.0 },
      uRiserType: { value: 0 },
      uRiserProgress: { value: 0.0 },
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
      uFramingMode: { value: 0 },
      uMeshAspect: { value: 16.0 / 9.0 },
      uUvRotation: { value: 0.0 },
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

        // Smooth subtle radial breathing on X/Y: gentle in verse, amplified in drop
        if (r > 0.0001) {
          vec2 dir = pos.xy / r;
          float expandAmount = mix(0.012, 0.14, uDrop);
          float expand = sin(uBeatPhase * 6.28318) * (uBass * expandAmount + uMelody * 0.025);
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
          float harm = sin(rMod * uSpread * 1.15 - uBeatPhase * 6.28318) * cos(angle * 4.0 + uTime * 0.85);
          melodyWave = harm * uMelody * 0.44;
        }

        float z = 0.0;

        // Apply according to active 3D motion preset
        if (uPreset == 0) {
          // PRESET 0: Beat-Synced Liquid Ripple (All instruments combined)
          z = (kickWave * 0.95 + snareWave * 0.65 + melodyWave) * uAmp;
        } else if (uPreset == 1) {
          // PRESET 1: Kinetic Kick Shockwave (Pure focus on kick transient rings + center bounce)
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
      uniform float uTime;
      uniform float uHue;
      uniform float uBass;
      uniform float uMid;
      uniform float uDrop;
      uniform float uPadSlam;
      uniform float uMasterBlackout;
      uniform float uBuildupActive;
      uniform float uStrobePulse;
      uniform float uSlicer;
      uniform int uSlicerStyle;
      uniform float uSlicerAngle;
      uniform float uSlicerDensity;
      uniform float uNegative;
      uniform float uBlinder;
      uniform float uGlitch;
      uniform int uRiserType;
      uniform float uRiserProgress;
      uniform int uFramingMode;
      uniform float uMeshAspect;
      uniform float uUvRotation;

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
        // 1. Master Blackout Gate (Pad 4 DROP SLAM or Buildup Pre-Drop Shut)
        if (uPadSlam > 0.5 || uMasterBlackout > 0.5) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        vec2 uv = vUv;

        // 2. In-Shader Glitch UV Displacement
        if (uGlitch > 0.001) {
          float slice = floor(uv.y * 32.0);
          float hash = fract(sin(slice * 12.9898) * 43758.5453);
          if (hash < uGlitch * 0.75) {
            uv.x += (fract(hash * 43.12) - 0.5) * uGlitch * 0.16;
          }
        }

        // 3. Aspect-Corrected Isotropic Coordinates
        vec2 centeredUv = uv - 0.5;
        vec2 isotropicUv = vec2(centeredUv.x * uMeshAspect, centeredUv.y);

        // UV Rotation (Used in World-Field and Radial Portal modes to keep screen frame locked)
        vec2 rotP = isotropicUv;
        if (uFramingMode == 0 || uFramingMode == 1) {
          float cRot = cos(uUvRotation);
          float sRot = sin(uUvRotation);
          rotP = vec2(cRot * isotropicUv.x - sRot * isotropicUv.y, sRot * isotropicUv.x + cRot * isotropicUv.y);
        }

        // SINGULARITY VOID (Riser 1): Centered Event Horizon Gravitational Pinch
        if (uBuildupActive > 0.5 && uRiserType == 1) {
          float pinch = 1.0 + pow(uRiserProgress, 2.4) * 2.2;
          rotP *= pinch;
        }

        float uvScale = 1.0 + (uMid * 0.12);
        vec2 finalUv = rotP * uvScale + 0.5;

        // PRISM OVERDRIVE (Riser 2): Rhythmic RGB Channel Split
        vec4 texColor;
        if (uBuildupActive > 0.5 && uRiserType == 2) {
          float chromOffset = pow(uRiserProgress, 1.4) * 0.045;
          float rVal = texture2D(uTexture, finalUv + vec2(chromOffset, 0.0)).r;
          float gVal = texture2D(uTexture, finalUv).g;
          float bVal = texture2D(uTexture, finalUv - vec2(chromOffset, 0.0)).b;
          float aVal = texture2D(uTexture, finalUv).a;
          texColor = vec4(rVal, gVal, bVal, aVal);
        } else {
          texColor = texture2D(uTexture, finalUv);
        }

        // 100% PURE, AUTHENTIC ARTWORK COLORS (Zero harsh glare, zero sunbeams)
        float shadeDepth = mix(0.10, 0.30, uDrop);
        float waveShade = 1.0 + clamp(vZ * shadeDepth, -0.20, 0.20);
        vec3 col = texColor.rgb * waveShade;

        // Sub-bass warm punch on kicks
        float bassGlow = mix(0.02, 0.14, uDrop);
        col += texColor.rgb * (uBass * bassGlow);

        // Color Hue shift from AKAI Knob 2
        if (uHue > 0.001) {
          vec3 hsv = rgb2hsv(col);
          hsv.x = fract(hsv.x + uHue);
          col = hsv2rgb(hsv);
        }

        // 4 WORLD-CLASS CONCERT RISER ARCHETYPE COLOR TRAJECTORIES
        if (uBuildupActive > 0.5) {
          if (uRiserType == 0) {
            // 0. HYPERDRIVE WARP: Electric cyan-white laser burn & high-energy saturation
            vec3 hyperCyan = vec3(0.65, 0.92, 1.15);
            col = mix(col, col * hyperCyan * 1.35, clamp(pow(uRiserProgress, 1.2) * 0.85, 0.0, 1.0));
          } else if (uRiserType == 1) {
            // 1. SINGULARITY VOID: Progressive Desaturation -> Arctic Silver/Cobalt -> Pure Obsidian Horizon
            float gray = dot(col, vec3(0.299, 0.587, 0.114));
            vec3 cobaltTint = vec3(gray * 0.60, gray * 0.75, gray * 1.15);
            col = mix(col, cobaltTint, clamp(uRiserProgress * 1.25, 0.0, 1.0));
            if (uRiserProgress > 0.90) {
              col *= (1.0 - smoothstep(0.90, 0.99, uRiserProgress));
            }
          } else if (uRiserType == 2) {
            // 2. PRISM OVERDRIVE: Acid cyan & electric magenta CRT raster split
            vec3 acidShift = mix(vec3(0.0, 1.0, 0.92), vec3(1.0, 0.15, 0.75), sin(vUv.y * 32.0 + uTime * 16.0) * 0.5 + 0.5);
            col = mix(col, col * acidShift * 1.45, clamp(pow(uRiserProgress, 1.25) * 0.90, 0.0, 1.0));
          } else if (uRiserType == 3) {
            // 3. THERMAL SUPERNOVA: Molten Bronze/Amber -> Plasma Magenta -> Solar Incandescence
            vec3 moltenAmber = vec3(1.0, 0.62, 0.20) * 1.6;
            vec3 plasmaMagenta = vec3(1.0, 0.18, 0.78) * 2.1;
            vec3 solarColor = mix(moltenAmber, plasmaMagenta, smoothstep(0.30, 0.80, uRiserProgress));
            col += solarColor * pow(uRiserProgress, 1.35);
          }
        }

        // PHYSICAL SLICER ENGINE (Pad 7)
        if (uSlicer > 0.001) {
          float mask = 1.0;
          if (uSlicerStyle == 0) {
            float s = sin(uSlicerAngle);
            float c = cos(uSlicerAngle);
            vec2 rotUv = vec2(c * centeredUv.x - s * centeredUv.y, s * centeredUv.x + c * centeredUv.y);
            float slat = sin(rotUv.x * uSlicerDensity * 6.28318);
            mask = smoothstep(-0.12, 0.12, slat);
          } else if (uSlicerStyle == 1) {
            float angle = atan(centeredUv.y, centeredUv.x) + uSlicerAngle;
            float r = length(centeredUv);
            float blades = max(4.0, floor(uSlicerDensity * 0.65));
            float wedge = sin(angle * blades);
            mask = smoothstep(-0.15, 0.15, wedge);
            mask = mix(1.0, mask, smoothstep(0.04, 0.10, r));
          } else if (uSlicerStyle == 2) {
            float r = length(centeredUv);
            float rings = sin(r * uSlicerDensity * 12.0 - uSlicerAngle * 2.5);
            mask = smoothstep(-0.14, 0.14, rings);
          } else if (uSlicerStyle == 3) {
            float s = sin(uSlicerAngle * 0.5);
            float c = cos(uSlicerAngle * 0.5);
            vec2 rotUv = vec2(c * centeredUv.x - s * centeredUv.y, s * centeredUv.x + c * centeredUv.y);
            float gridX = sin(rotUv.x * uSlicerDensity * 3.14159);
            float gridY = sin(rotUv.y * uSlicerDensity * 3.14159);
            float shard = gridX * gridY;
            mask = smoothstep(-0.10, 0.10, shard);
          }
          col *= mix(1.0, mask, uSlicer);
        }

        // NEGATIVE INVERT (Pad 8)
        if (uNegative > 0.5) {
          col = vec3(1.0) - col;
        }

        // BLINDER OVEREXPOSURE & CLIMAX ARRIVAL
        if (uBlinder > 0.001) {
          if (uBuildupActive > 0.5 && uRiserType == 3) {
            // Solar bloom climax: Blinding plasma magenta -> solar white burst
            vec3 climaxColor = mix(vec3(1.0, 0.75, 0.40), vec3(1.0, 0.92, 1.0), uBlinder);
            col = mix(col, climaxColor, clamp(uBlinder * 0.95, 0.0, 1.0));
          } else if (uBuildupActive > 0.5 && uRiserType == 1) {
            // Dark Implosion: Complete vanishing / absolute black silence, zero whiteout!
            col *= 0.0;
          } else if (uBuildupActive > 0.5 && uRiserType == 2) {
            // Chromatic tear climax: Intense prism neon flash
            col = mix(col, vec3(1.0), clamp(uBlinder * 0.75, 0.0, 1.0));
          } else {
            // Kinetic Blitz climax: 100% pure concert whiteout
            col = mix(col, vec3(1.0), clamp(uBlinder, 0.0, 1.0));
          }
        }

        // FRAMING ALPHA CALCULATION
        float alpha = texColor.a;

        if (uFramingMode == 1) {
          // RADIAL PORTAL: Smooth circular fade turning square images into floating sacred totems
          float rDist = length(isotropicUv);
          float portalAlpha = 1.0 - smoothstep(0.40, 0.48, rDist);
          alpha *= portalAlpha;
        } else if (uFramingMode == 2) {
          // CLASSIC TOTEM: Soft outer border feathering
          float edgeDist = min(min(finalUv.x, 1.0 - finalUv.x), min(finalUv.y, 1.0 - finalUv.y));
          float borderFeather = smoothstep(0.001, 0.035, edgeDist);
          alpha *= borderFeather;
        }
        // In WORLD FIELD mode (uFramingMode == 0):
        // alpha remains texColor.a with seamless MirroredRepeatWrapping edge-to-edge!

        gl_FragColor = vec4(col, alpha);
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

  // --- 3. Fluid Silhouette Corona & Obsidian Void Feedback Pipeline ---
  initFeedbackPipeline(width, height) {
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    this.renderTargetB = this.renderTargetA.clone();

    this.feedbackScene = new THREE.Scene();
    this.feedbackCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.feedbackQuadGeo = new THREE.PlaneGeometry(2, 2);

    this.feedbackMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uCurrentScene: { value: null },
        uPrevFeedback: { value: null },
        uTime: { value: 0.0 },
        uKick: { value: 0.0 },
        uCoronaIntensity: { value: this.coronaIntensity },
        uSpreadReach: { value: this.spreadReach },
        uCurl: { value: this.curl },
        uDecay: { value: this.decay },
        uColorPrimary: { value: new THREE.Vector3(0.72, 0.76, 0.88) },
        uColorSecondary: { value: new THREE.Vector3(0.45, 0.55, 0.78) },

        // Master Optical Processor Uniforms
        uPadSlam: { value: 0.0 },
        uMasterBlackout: { value: 0.0 },
        uBuildupActive: { value: 0.0 },
        uRiserType: { value: 0 },
        uRiserProgress: { value: 0.0 },
        uStrobePulse: { value: 1.0 },
        uRadialBlur: { value: 0.0 },
        uHighPass: { value: 0.0 },
        uChromatic: { value: 0.0 },
        uRetinalGhost: { value: 0.0 },
        uBlinder: { value: 0.0 },

        // Dynamic Optical Grating / Comb Shutter Uniforms (Master Lens Shutter)
        uGratingActive: { value: 0.0 },
        uGratingStyle: { value: 0 },
        uGratingDensity: { value: 14.0 },
        uGratingWidth: { value: 0.18 },
        uGratingAngle: { value: 0.785398 },
        uGratingTime: { value: 0.0 },
        uGratingAudio: { value: 0.0 },
        uGratingProgress: { value: 0.0 },
        uGratingSubdivision: { value: 1.0 },

        // ILDA Projector Laser & Spatial Vector Uniforms (Approach B)
        uLaserIntensity: { value: 0.0 },
        uLaserBeamWidth: { value: 1.0 },
        uLaserColor: { value: new THREE.Vector3(0.0, 1.0, 0.45) },
        uLaserFanSpeed: { value: 2.5 },
        uLaserFanBlades: { value: 12.0 },
        uJoystickPan: { value: 0.5 },
        uJoystickTilt: { value: 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uCurrentScene;
        uniform sampler2D uPrevFeedback;
        uniform float uTime;
        uniform float uKick;
        uniform float uCoronaIntensity;
        uniform float uSpreadReach;
        uniform float uCurl;
        uniform float uDecay;
        uniform vec3 uColorPrimary;
        uniform vec3 uColorSecondary;

        // Master Optical Processor Uniforms
        uniform float uPadSlam;
        uniform float uMasterBlackout;
        uniform float uBuildupActive;
        uniform int uRiserType;
        uniform float uRiserProgress;
        uniform float uStrobePulse;
        uniform float uRadialBlur;
        uniform float uHighPass;
        uniform float uChromatic;
        uniform float uRetinalGhost;
        uniform float uBlinder;

        // Dynamic Optical Grating / Comb Shutter Uniforms (Master Lens Shutter)
        uniform float uGratingActive;
        uniform int uGratingStyle;
        uniform float uGratingDensity;
        uniform float uGratingWidth;
        uniform float uGratingAngle;
        uniform float uGratingTime;
        uniform float uGratingAudio;
        uniform float uGratingProgress;
        uniform float uGratingSubdivision;

        // ILDA Projector Laser & Spatial Vector Uniforms (Approach B)
        uniform float uLaserIntensity;
        uniform float uLaserBeamWidth;
        uniform vec3 uLaserColor;
        uniform float uLaserFanSpeed;
        uniform float uLaserFanBlades;
        uniform float uJoystickPan;
        uniform float uJoystickTilt;

        varying vec2 vUv;

        void main() {
          // -------------------------------------------------------------
          // 1. MASTER BLACKOUT / DROP SLAM GATE (100% MANUAL PAD 4 CONTROL)
          // -------------------------------------------------------------
          if (uPadSlam > 0.5 || uMasterBlackout > 0.5) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          vec2 center = vec2(0.5);
          vec2 p = vUv - center;
          float r = length(p);
          float angle = atan(p.y, p.x);

          // -------------------------------------------------------------
          // 2. SINGULARITY VOID HORIZON PINCH (Archetype 1)
          // -------------------------------------------------------------
          vec2 sampleUv = vUv;
          if (uBuildupActive > 0.5 && uRiserType == 1) {
            float pinch = 1.0 + pow(uRiserProgress, 2.4) * 2.5;
            sampleUv = p * pinch + center;
          }

          // -------------------------------------------------------------
          // 3. RADIAL ZOOM BLUR & CHROMATIC DISPERSION (THE MASTER LENS)
          // -------------------------------------------------------------
          vec4 curr;
          if (uBuildupActive > 0.5 && uRadialBlur > 0.005) {
            vec2 dir = center - sampleUv;
            float dist = length(dir);
            vec2 normDir = dist > 0.0001 ? dir / dist : vec2(0.0);
            float chromOffset = uChromatic * 0.024 * pow(uRiserProgress, 1.2);

            vec4 accum = vec4(0.0);
            float stepScale = (uRadialBlur * 0.06) / 8.0;

            for (int i = 0; i < 8; i++) {
              float fi = float(i);
              vec2 off = normDir * (dist * fi * stepScale);
              vec2 uvR = clamp(sampleUv + off + normDir * chromOffset, 0.0, 1.0);
              vec2 uvG = clamp(sampleUv + off, 0.0, 1.0);
              vec2 uvB = clamp(sampleUv + off - normDir * chromOffset, 0.0, 1.0);

              float rC = texture2D(uCurrentScene, uvR).r;
              float gC = texture2D(uCurrentScene, uvG).g;
              float bC = texture2D(uCurrentScene, uvB).b;
              float aC = texture2D(uCurrentScene, uvG).a;
              accum += vec4(rC, gC, bC, aC);
            }
            curr = accum / 8.0;
          } else if (uBuildupActive > 0.5 && uChromatic > 0.005) {
            vec2 dir = center - sampleUv;
            float dist = length(dir);
            vec2 normDir = dist > 0.0001 ? dir / dist : vec2(0.0);
            float chromOffset = uChromatic * 0.018;

            float rC = texture2D(uCurrentScene, clamp(sampleUv + normDir * chromOffset, 0.0, 1.0)).r;
            float gC = texture2D(uCurrentScene, clamp(sampleUv, 0.0, 1.0)).g;
            float bC = texture2D(uCurrentScene, clamp(sampleUv - normDir * chromOffset, 0.0, 1.0)).b;
            float aC = texture2D(uCurrentScene, clamp(sampleUv, 0.0, 1.0)).a;
            curr = vec4(rC, gC, bC, aC);
          } else {
            curr = texture2D(uCurrentScene, sampleUv);
          }

          // -------------------------------------------------------------
          // 4. ILDA PROJECTOR LASER VECTORIZER & SPATIAL STROBE (APPROACH B)
          // -------------------------------------------------------------
          float effectiveLaser = max(uLaserIntensity, (uBuildupActive > 0.5) ? uHighPass : 0.0);

          if (effectiveLaser > 0.002) {
            // A. High-Precision 4-Tap Orthogonal Gradient for Vector Contour Extraction
            vec2 dUv = vec2(1.0 / 1920.0, 1.0 / 1080.0) * (1.2 + uLaserBeamWidth * 0.8);
            vec3 cL = texture2D(uCurrentScene, clamp(sampleUv - vec2(dUv.x, 0.0), 0.0, 1.0)).rgb;
            vec3 cR = texture2D(uCurrentScene, clamp(sampleUv + vec2(dUv.x, 0.0), 0.0, 1.0)).rgb;
            vec3 cT = texture2D(uCurrentScene, clamp(sampleUv + vec2(0.0, dUv.y), 0.0, 1.0)).rgb;
            vec3 cB = texture2D(uCurrentScene, clamp(sampleUv - vec2(0.0, dUv.y), 0.0, 1.0)).rgb;

            vec3 gradX = cR - cL;
            vec3 gradY = cT - cB;
            float edgeMag = (length(gradX) + length(gradY)) * 3.4;

            // B. Dual-Threshold: Incandescent Xenon Core + Saturated Laser Wavelength Envelope
            float laserCore = smoothstep(0.12, 0.40, edgeMag);
            float laserAura = smoothstep(0.025, 0.22, edgeMag);

            // Coherent laser line with overdriven phosphor core
            vec3 laserLine = mix(uLaserColor * laserAura * 2.4, vec3(1.0, 1.0, 1.0) * 2.8, laserCore * 0.88);

            // C. Solid Fill De-Materialization (Body dissolves into pure pitch-black)
            float dissolveFactor = smoothstep(0.10, 0.90, effectiveLaser);
            vec3 solidRemains = curr.rgb * (1.0 - dissolveFactor * 0.96);
            curr.rgb = solidRemains + laserLine * effectiveLaser;

            // D. Volumetric Spatial Laser Beams (Aerial Prism Fans & Warp Tunnels)
            vec2 fanCenter = center + vec2((uJoystickPan - 0.5) * 0.45, (uJoystickTilt - 0.5) * 0.28);
            vec2 fanP = sampleUv - fanCenter;
            float fanR = length(fanP);
            float fanAngle = atan(fanP.y, fanP.x) + uTime * uLaserFanSpeed;

            // Rotating Aerial Prism Blades (8-24 razor-thin laser rays slicing across the room)
            float spokeSin = abs(sin(fanAngle * uLaserFanBlades));
            float spokeRay = smoothstep(0.962, 0.998, spokeSin);
            // Center aperture cutout and outer reach
            spokeRay *= smoothstep(0.04, 0.18, fanR) * (1.0 - smoothstep(0.85, 1.25, fanR));

            // Concentric Warp Tunnel Rings (projecting cones into audience)
            float ringSin = abs(sin(fanR * 26.0 - uTime * 14.0));
            float ringRay = smoothstep(0.935, 0.995, ringSin) * smoothstep(0.06, 0.24, fanR);

            // Modulate spatial rays by strobe shutter pulse and laser intensity
            float beamPulse = (0.30 + 0.70 * uStrobePulse);
            vec3 spatialBeams = (uLaserColor * spokeRay * 2.6) + (vec3(1.0) * ringRay * 1.8);
            curr.rgb += spatialBeams * effectiveLaser * beamPulse;
          }

          // -------------------------------------------------------------
          // 5. OBSIDIAN VOID HARMONIC BASE & FLUID CORONA
          // -------------------------------------------------------------
          vec3 deepVoid = vec3(0.008, 0.010, 0.014) + uColorPrimary * 0.012;
          if (effectiveLaser > 0.05) {
            deepVoid *= (1.0 - effectiveLaser * 0.92);
          }

          float zoom = 1.0 + (0.010 * uSpreadReach) + (uKick * 0.030);
          vec2 warpedUv = p / zoom + center;
          float curlOffset = sin(r * 14.0 - uTime * 2.0) * (0.0022 * uCurl) * (1.0 + uKick * 1.2);
          warpedUv += vec2(cos(angle), sin(angle)) * curlOffset;

          vec4 prev1 = texture2D(uPrevFeedback, warpedUv);
          vec4 prev2 = texture2D(uPrevFeedback, warpedUv + vec2(0.0018, 0.0018));
          vec4 prev3 = texture2D(uPrevFeedback, warpedUv - vec2(0.0018, 0.0018));
          vec4 prev = (prev1 * 0.50 + prev2 * 0.25 + prev3 * 0.25) * uDecay;

          vec3 corona = prev.rgb * (uCoronaIntensity * 0.90);
          if (effectiveLaser > 0.05) {
            corona *= (1.0 - effectiveLaser * 0.85);
          }
          vec3 environment = deepVoid + corona;

          // Composite foreground Totem + Stardust over Environment
          vec3 finalRgb = mix(environment, curr.rgb, curr.a);

          // -------------------------------------------------------------
          // 6. MASTER STROBE SHUTTER & RETINAL PHOSPHOR GHOSTING
          // -------------------------------------------------------------
          if (uBuildupActive > 0.5) {
            // Hyperdrive Warp (0) and Prism Overdrive (2) engage rhythmic optical shutter
            if ((uRiserType == 0 || uRiserType == 2) && uStrobePulse < 0.01) {
              if (uRetinalGhost > 0.01) {
                // Inverted complementary phosphor after-image on strobe off-cycle
                vec3 ghost = (vec3(1.0) - finalRgb) * uRetinalGhost * 0.45;
                finalRgb = mix(vec3(0.0), ghost, uRetinalGhost);
              } else {
                finalRgb = vec3(0.0);
              }
            }
          }

          // -------------------------------------------------------------
          // 7. MASTER BLINDER & CLIMAX ARRIVAL
          // -------------------------------------------------------------
          if (uBuildupActive > 0.5 && uBlinder > 0.001) {
            if (uRiserType == 1) {
              // Singularity Void: Vanishing into obsidian silence (zero whiteout!)
              finalRgb *= (1.0 - clamp(uBlinder * 1.15, 0.0, 1.0));
            } else if (uRiserType == 3) {
              // Thermal Supernova: Incandescent solar blinder wash
              vec3 solarClimax = mix(vec3(1.0, 0.70, 0.35), vec3(1.0, 0.96, 1.0), uBlinder);
              finalRgb = mix(finalRgb, solarClimax, clamp(uBlinder * 0.95, 0.0, 1.0));
            } else if (uRiserType == 2) {
              // Prism Overdrive: Intense RGB neon flash
              vec3 prismClimax = mix(vec3(0.0, 1.0, 0.95), vec3(1.0, 0.15, 0.8), sin(uTime * 24.0) * 0.5 + 0.5);
              finalRgb = mix(finalRgb, prismClimax, clamp(uBlinder * 0.85, 0.0, 1.0));
            } else {
              // Hyperdrive Warp: Pure 100% stadium xenon whiteout
              finalRgb = mix(finalRgb, vec3(1.0), clamp(uBlinder, 0.0, 1.0));
            }
          }

          // -------------------------------------------------------------
          // 7b. DYNAMIC OPTICAL GRATING / COMB SHUTTER (PAD 7 - MASTER LENS SHUTTER)
          // BPM-synchronized, progressive, and interlaced mechanical occlusion engine
          // -------------------------------------------------------------
          if (uGratingActive > 0.001) {
            float shutterMask = 1.0;
            
            if (uGratingStyle == 0) {
              // Style 0: Linear Kinetic Sweep - Interlocking Comb Fingers (BPM Synced)
              // Even bars slide from top/left, Odd bars slide from bottom/right, interlocking like industrial fingers
              float cosA = cos(uGratingAngle);
              float sinA = sin(uGratingAngle);
              vec2 rotP = vec2(cosA * p.x - sinA * p.y, sinA * p.x + cosA * p.y);

              // Density tightens musically when clubbed with higher subdivisions
              float densityMult = (uGratingSubdivision >= 16.0) ? 1.25 : 1.0;
              float effDensity = uGratingDensity * densityMult;

              // Periodic bar coordinate along rotP.x (uGratingTime is in BPM musical beats)
              // 0.25 means bars shift by exactly 1 full slit every 4 beats (1 musical bar measure at song tempo)
              float barCoord = rotP.x * effDensity + uGratingTime * 0.25;
              float barIndex = floor(barCoord);
              float isEven = mod(barIndex, 2.0); // 0.0 or 1.0

              // Periodic wave for razor-sharp slits
              float wave = sin(barCoord * 6.283185);
              float af = fwidth(wave) * 1.5;
              
              // Shadow bar width expands with progress for solid industrial heft
              float curWidth = mix(uGratingWidth * 0.70, uGratingWidth * 1.30, uGratingProgress);
              float barCut = smoothstep(-af, af, wave - curWidth); // 0.0 in shadow bar, 1.0 in light slit

              // Mechanical Finger Interlacing along rotP.y:
              // Even fingers slide down from top (+y): reaches from +1.6 down to -1.6
              float evenTip = mix(1.6, -1.6, clamp(uGratingProgress * 1.40, 0.0, 1.0));
              float evenPresent = smoothstep(evenTip - 0.08, evenTip + 0.08, rotP.y);

              // Odd fingers slide up from bottom (-y): reaches from -1.6 up to +1.6
              float oddTip = mix(-1.6, 1.6, clamp(uGratingProgress * 1.40, 0.0, 1.0));
              float oddPresent = smoothstep(oddTip + 0.08, oddTip - 0.08, rotP.y);

              // Select finger reach based on even/odd bar
              float fingerReach = mix(oddPresent, evenPresent, isEven);

              // Apply shadow occlusion where fingers have reached (locks permanently across the entire screen once meshed!)
              shutterMask = mix(1.0, barCut, fingerReach);
            } else if (uGratingStyle == 1) {
              // Style 1: Radial Gobo Teeth - Clockwork Radar Spoke Spawn & Iris Choke (BPM Synced)
              // Rotates in tempo: 1 full 360° revolution every 16 beats (4 musical bars)
              float normAngle = (angle + 3.14159265) / 6.2831853; // 0.0 to 1.0
              
              float maxSpokes = max(6.0, floor(uGratingDensity * 0.75));
              float spokeCount = floor(mix(4.0, maxSpokes, clamp(uGratingProgress * 1.20, 0.0, 1.0)));

              // Angular spin speed synced to musical tempo (pi/8 radians per beat = 16 beats per revolution)
              float spinSpeed = 0.3927 * (1.0 + uGratingProgress * 0.40);
              float phi = angle + uGratingTime * spinSpeed;
              float wave = sin(phi * spokeCount);
              float af = fwidth(wave) * 1.5;
              float teethCut = smoothstep(-af, af, wave - uGratingWidth);

              // 1. Clockwork Spoke Spawn (spokes appear sequentially around the circle)
              float spawnLead = clamp(uGratingProgress * 1.35, 0.0, 1.0);
              float spokeSpawn = smoothstep(0.0, 0.15, spawnLead - normAngle * 0.85);

              // 2. Iris Aperture Choke (teeth creep inward from perimeter toward the core)
              float irisChoke = mix(0.85, 0.12, clamp(uGratingProgress * 1.15, 0.0, 1.0));
              float irisReach = smoothstep(irisChoke - 0.08, irisChoke + 0.08, r);

              float goboPresence = spokeSpawn * irisReach;
              shutterMask = mix(1.0, teethCut, goboPresence);
            } else if (uGratingStyle == 2) {
              // Style 2: Kinetic Moiré Waves - Two-Stage Layer Emergence (BPM Synced)
              // Layer 1: Sleek diagonal grating moving at musical tempo
              vec2 p1 = vec2(cos(uGratingAngle) * p.x - sin(uGratingAngle) * p.y, sin(uGratingAngle) * p.x + cos(uGratingAngle) * p.y);
              float speed1 = 0.125 + uGratingProgress * 0.08;
              float w1 = sin((p1.x * uGratingDensity + uGratingTime * speed1) * 6.283185);
              float af1 = fwidth(w1) * 1.5;
              float m1 = smoothstep(-af1, af1, w1 - 0.05);
              
              float l1Presence = clamp(uGratingProgress * 3.0, 0.0, 1.0);
              float l1 = mix(1.0, m1, l1Presence);

              // Stage 2: Layer 2 Emergence
              float l2Weight = smoothstep(0.30, 0.75, uGratingProgress);
              float angleOffset = mix(0.045, 0.125, l2Weight);
              float a2 = uGratingAngle + angleOffset;
              vec2 p2 = vec2(cos(a2) * p.x - sin(a2) * p.y, sin(a2) * p.x + cos(a2) * p.y);
              
              float speed2 = 0.09 + l2Weight * 0.10;
              float density2 = uGratingDensity * (1.0 + l2Weight * 0.06);
              float w2 = sin((p2.x * density2 - uGratingTime * speed2) * 6.283185);
              float af2 = fwidth(w2) * 1.5;
              float m2 = smoothstep(-af2, af2, w2 - 0.05);
              float l2 = mix(1.0, m2, l2Weight);

              shutterMask = l1 * l2;
            } else if (uGratingStyle == 3) {
              // Style 3: Sonic Breathing Slits - Progressive Claustrophobia Choke & Alternating Optical Diaphragm (BPM Synced)
              float kickAperture = clamp(uGratingAudio * 0.95, 0.0, 1.0);

              float baselineThresh = mix(0.12, 0.68, clamp(uGratingProgress * 1.15, 0.0, 1.0));
              float dynamicThresh = mix(baselineThresh, -0.70, kickAperture);

              float barCoord = p.y * uGratingDensity + uGratingTime * 0.06;
              float barId = floor(barCoord);
              float staggerSign = mod(barId, 2.0) > 0.5 ? 1.0 : -1.0;
              
              // 2-beat rhythmic breathing diaphragm (pulsing in musical lockstep)
              float diaphragmOsc = staggerSign * sin(uGratingTime * 3.14159265 + kickAperture * 1.57) * (0.12 + uGratingProgress * 0.22);
              float wave = sin((barCoord + diaphragmOsc) * 6.283185);
              float af = fwidth(wave) * 1.5;
              float slitMask = smoothstep(-af, af, wave - dynamicThresh);

              float presence = clamp(uGratingProgress * 2.5, 0.0, 1.0);
              shutterMask = mix(1.0, slitMask, presence);
            }

            finalRgb *= mix(1.0, shutterMask, uGratingActive);
          }

          // -------------------------------------------------------------
          // 8. RUTHLESS BLACK FLOOR CLAMPING (PROJECTOR TRAP ELIMINATOR)
          // Any near-black pixel is crushed strictly to #000000 so the projector lens casts zero gray box
          // -------------------------------------------------------------
          if (effectiveLaser > 0.12 || uBuildupActive > 0.5 || uGratingActive > 0.5) {
            float lum = dot(finalRgb, vec3(0.299, 0.587, 0.114));
            if (lum < 0.040) {
              finalRgb = vec3(0.0);
            }
          }

          gl_FragColor = vec4(finalRgb, 1.0);
        }
      `,
    });

    this.feedbackQuad = new THREE.Mesh(this.feedbackQuadGeo, this.feedbackMaterial);
    this.feedbackScene.add(this.feedbackQuad);
  }

  // --- 4. Dynamic Harmonic Palette Extraction (Primary & Secondary Tones) ---
  extractHarmonicPalette(img) {
    try {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // 8 Hue Bins: Red, Orange, Yellow, Green, Cyan/Teal, Blue/Lapis, Purple, Magenta
      const bins = Array.from({ length: 8 }, () => ({ r: 0, g: 0, b: 0, weight: 0, count: 0 }));
      let totalR = 0, totalG = 0, totalB = 0, totalCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 50) continue;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (max + min) * 0.5;
        const d = max - min;
        const sat = lum > 0.5 ? d / (2 - max - min + 1e-4) : d / (max + min + 1e-4);

        if (lum < 0.08) continue;
        if (lum > 0.95 && sat < 0.05) continue;

        totalR += r; totalG += g; totalB += b;
        totalCount++;

        let h = 0;
        if (d > 0.01) {
          if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h *= 60;
        }

        const weight = (sat * 0.75 + 0.25) * (1.0 - Math.abs(lum - 0.5) * 0.8);
        let binIdx = 0;
        if (h >= 15 && h < 45) binIdx = 1;
        else if (h >= 45 && h < 75) binIdx = 2;
        else if (h >= 75 && h < 165) binIdx = 3;
        else if (h >= 165 && h < 205) binIdx = 4;
        else if (h >= 205 && h < 255) binIdx = 5;
        else if (h >= 255 && h < 290) binIdx = 6;
        else if (h >= 290 && h < 345) binIdx = 7;
        else binIdx = 0;

        bins[binIdx].r += r * weight;
        bins[binIdx].g += g * weight;
        bins[binIdx].b += b * weight;
        bins[binIdx].weight += weight;
        bins[binIdx].count++;
      }

      const sortedBins = bins.filter(b => b.count > 10).sort((a, b) => b.weight - a.weight);

      let primary = [0.72, 0.76, 0.88];
      let secondary = [0.45, 0.55, 0.78];

      if (sortedBins.length > 0) {
        primary = [
          sortedBins[0].r / sortedBins[0].weight,
          sortedBins[0].g / sortedBins[0].weight,
          sortedBins[0].b / sortedBins[0].weight,
        ];
      } else if (totalCount > 0) {
        primary = [totalR / totalCount, totalG / totalCount, totalB / totalCount];
      }

      if (sortedBins.length > 1) {
        secondary = [
          sortedBins[1].r / sortedBins[1].weight,
          sortedBins[1].g / sortedBins[1].weight,
          sortedBins[1].b / sortedBins[1].weight,
        ];
      } else {
        secondary = [
          Math.min(1.0, primary[2] * 0.8 + 0.1),
          Math.min(1.0, primary[0] * 0.7 + 0.1),
          Math.min(1.0, primary[1] * 0.9 + 0.1),
        ];
      }

      // Inspect 4 corners to detect whether asset is naturally circular/transparent or full-bleed rectangular
      const cornerIndices = [0, (size - 1) * 4, ((size - 1) * size) * 4, ((size - 1) * size + (size - 1)) * 4];
      let cornerAlphaSum = 0;
      let cornerBriSum = 0;
      for (const cIdx of cornerIndices) {
        cornerAlphaSum += data[cIdx + 3];
        cornerBriSum += (data[cIdx] + data[cIdx + 1] + data[cIdx + 2]) / 3;
      }
      const isCornerVoid = (cornerAlphaSum / 4 < 80) || (cornerBriSum / 4 < 25);

      return { primary, secondary, isCornerVoid };
    } catch (e) {
      console.warn('[PaletteExtraction] Fallback:', e);
      return { primary: [0.72, 0.76, 0.88], secondary: [0.45, 0.55, 0.78], isCornerVoid: true };
    }
  }

  applyHarmonicPalette(palette, name) {
    this.colorPrimary = palette.primary;
    this.colorSecondary = palette.secondary;

    if (this.feedbackMaterial) {
      this.feedbackMaterial.uniforms.uColorPrimary.value.set(
        palette.primary[0],
        palette.primary[1],
        palette.primary[2]
      );
      this.feedbackMaterial.uniforms.uColorSecondary.value.set(
        palette.secondary[0],
        palette.secondary[1],
        palette.secondary[2]
      );
    }

    // Tint stardust particles naturally: half primary, half secondary with organic variance
    if (this.starGeometry) {
      const colors = this.starGeometry.attributes.color.array;
      for (let i = 0; i < this.starCount; i++) {
        const baseColor = (i % 2 === 0) ? palette.primary : palette.secondary;
        const vary = 0.70 + Math.random() * 0.50;
        colors[i * 3 + 0] = Math.min(1.0, baseColor[0] * vary + 0.12);
        colors[i * 3 + 1] = Math.min(1.0, baseColor[1] * vary + 0.12);
        colors[i * 3 + 2] = Math.min(1.0, baseColor[2] * vary + 0.12);
      }
      this.starGeometry.attributes.color.needsUpdate = true;
    }

    const rgbToHex = (c) => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    const hexPri = rgbToHex(palette.primary);
    const hexSec = rgbToHex(palette.secondary);

    window.dispatchEvent(new CustomEvent('engine:paletteChanged', {
      detail: {
        name,
        primary: palette.primary,
        secondary: palette.secondary,
        hexPrimary: hexPri,
        hexSecondary: hexSec,
      }
    }));
  }

  initDefaultTexture() {
    const defaultAsset = CONFIG.assets.list[0];
    const initialPath = defaultAsset ? defaultAsset.path : 'assets/wheel.png';
    const initialName = defaultAsset ? defaultAsset.name : 'Wheel';
    const initialFraming = defaultAsset ? defaultAsset.framing : 'totem';
    this.loadTexture(initialPath, initialName, initialFraming);
  }

  loadTexture(source, name = 'Artwork', hintFraming = null) {
    const loader = new THREE.TextureLoader();
    loader.load(
      source,
      (texture) => {
        if (this.currentTexture) {
          this.currentTexture.dispose();
        }
        this.currentTexture = texture;
        this.currentAssetName = name;

        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        this.uniforms.uTexture.value = texture;

        // Extract and apply harmonic palette & shape inspection
        const palette = this.extractHarmonicPalette(texture.image);
        this.applyHarmonicPalette(palette, name);

        // Native framing lock: circular assets ALWAYS load in Radial Portal (mode 1), square assets ALWAYS in World-Field (mode 0)
        let chosenMode = 0; // World-Field
        if (hintFraming === 'totem') {
          chosenMode = 1; // Radial Portal
        } else if (hintFraming === 'world') {
          chosenMode = 0; // World-Field
        } else {
          chosenMode = palette.isCornerVoid ? 1 : 0;
        }
        this.framingManualOverride = false;
        this.setFramingMode(chosenMode);

        console.log(`[ThreeEngine] Ingested Artwork: ${name} [${this.getFramingMode().name}] with Harmonic Palette.`);
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
      this.loadTexture(asset.path, asset.name, asset.framing);
    }
  }

  cycleFramingMode() {
    this.framingManualOverride = true;
    this.framingMode = (this.framingMode + 1) % FRAMING_MODES.length;
    this.uniforms.uFramingMode.value = this.framingMode;
    const current = FRAMING_MODES[this.framingMode];
    console.log(`[ThreeEngine] Switched Framing Mode: ${current.name} (${current.desc})`);
    window.dispatchEvent(new CustomEvent('engine:framingChanged', {
      detail: { mode: this.framingMode, info: current }
    }));
    return current;
  }

  setFramingMode(modeIndex) {
    this.framingMode = modeIndex % FRAMING_MODES.length;
    this.uniforms.uFramingMode.value = this.framingMode;
    const current = FRAMING_MODES[this.framingMode];
    window.dispatchEvent(new CustomEvent('engine:framingChanged', {
      detail: { mode: this.framingMode, info: current }
    }));
    return current;
  }

  getFramingMode() {
    return FRAMING_MODES[this.framingMode];
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

  cycleSlicer() {
    const styles = this.getSlicerStyles();
    if (!this.slicerActive) {
      this.slicerActive = true;
      this.slicerStyle = 0;
    } else {
      this.slicerStyle++;
      if (this.slicerStyle >= styles.length) {
        this.slicerActive = false;
        this.slicerStyle = 0;
      }
    }

    const currentStyle = this.slicerActive ? styles[this.slicerStyle] : null;
    const label = this.slicerActive ? `${currentStyle.name} [${this.slicerStyle + 1}/4]` : 'Slicer Bypassed / Off';
    console.log(`[ThreeEngine] Physical Slicer: ${label}`);

    window.dispatchEvent(new CustomEvent('engine:slicerChanged', {
      detail: { active: this.slicerActive, style: styles[this.slicerStyle], index: this.slicerStyle }
    }));

    return { active: this.slicerActive, style: styles[this.slicerStyle], index: this.slicerStyle };
  }

  getSlicerStyles() {
    return [
      { id: 0, name: 'Venetian Razor Slats', desc: 'Linear architectural slats cutting to deep black' },
      { id: 1, name: 'Radial Iris Turbine', desc: 'Rotating angular turbine blades radiating from lotus' },
      { id: 2, name: 'Concentric Ripple Discs', desc: 'Concentric circular black cuts rippling into discs' },
      { id: 3, name: 'Prism Crystal Shards', desc: 'Checkered kaleidoscope faceted crystal cuts' },
    ];
  }

  // Bank A Pad 7: Dynamic Optical Grating / Comb Shutter Master Punch
  toggleGratingPunch() {
    this.gratingActive = !this.gratingActive;
    this.beatRepeatActive = this.gratingActive;
    if (this.gratingActive) {
      this.gratingDeployProgress = 0.0;
    }
    const style = this.gratingStyles[this.gratingStyle];
    console.log(`[ThreeEngine] Optical Grating Shutter: ${this.gratingActive ? 'ACTIVE' : 'BYPASS'} (${style.name})`);

    const detail = { active: this.gratingActive, style: style, index: this.gratingStyle };
    window.dispatchEvent(new CustomEvent('engine:gratingChanged', { detail }));
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', { detail }));
    return detail;
  }

  // Bank B Pad 1: Cycle armed Optical Grating Style
  cycleGratingStyle() {
    this.gratingStyle = (this.gratingStyle + 1) % this.gratingStyles.length;
    this.beatRepeatIndex = this.gratingStyle;
    const style = this.gratingStyles[this.gratingStyle];
    console.log(`[ThreeEngine] Armed Grating Style: [${this.gratingStyle + 1}/4] ${style.name}`);

    const detail = { active: this.gratingActive, style: style, index: this.gratingStyle };
    window.dispatchEvent(new CustomEvent('engine:gratingChanged', { detail }));
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', { detail }));
    return detail;
  }

  setGratingStyle(index) {
    this.gratingStyle = Math.max(0, Math.min(this.gratingStyles.length - 1, index));
    this.beatRepeatIndex = this.gratingStyle;
    const style = this.gratingStyles[this.gratingStyle];

    const detail = { active: this.gratingActive, style: style, index: this.gratingStyle };
    window.dispatchEvent(new CustomEvent('engine:gratingChanged', { detail }));
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', { detail }));
    return detail;
  }

  resetGrating() {
    if (this.gratingActive) {
      this.gratingActive = false;
      this.beatRepeatActive = false;
      this.gratingDeployProgress = 0.0;
      const style = this.gratingStyles[this.gratingStyle];
      const detail = { active: false, style: style, index: this.gratingStyle };
      window.dispatchEvent(new CustomEvent('engine:gratingChanged', { detail }));
      window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', { detail }));
      return true;
    }
    return false;
  }

  // Backward compatibility aliases
  toggleBeatRepeat() {
    return this.toggleGratingPunch();
  }

  cycleBeatRepeatRate() {
    return this.cycleGratingStyle();
  }

  setBeatRepeatRate(index) {
    return this.setGratingStyle(index);
  }

  resetBeatRepeat() {
    return this.resetGrating();
  }

  toggleSlicerPunch() {
    return this.toggleGratingPunch();
  }

  cycleSlicerStyle() {
    return this.cycleGratingStyle();
  }

  setSlicerStyle(index) {
    return this.setGratingStyle(index);
  }

  toggleSlicer() {
    return this.toggleGratingPunch();
  }

  resetSlicer() {
    this.resetGrating();
    this.resetLaser();
    if (this.slicerActive) {
      this.slicerActive = false;
      this.slicerStyle = 0;
      if (this.uniforms && this.uniforms.uSlicer) {
        this.uniforms.uSlicer.value = 0.0;
      }
      console.log('[ThreeEngine] Physical Slicer cancelled by DROP SLAM.');
      window.dispatchEvent(new CustomEvent('engine:slicerChanged', {
        detail: { active: false, style: null, index: 0 }
      }));
      return true;
    }
    return false;
  }

  // Live ILDA Laser Vectorizer Hotcue Toggle (Triggered via Key X, MIDI, or Buildup)
  toggleLaserPunch() {
    this.laserManualPunch = !this.laserManualPunch;
    console.log(`[ThreeEngine] ILDA Laser Vectorizer: ${this.laserManualPunch ? 'ACTIVE' : 'BYPASS'}`);
    window.dispatchEvent(new CustomEvent('engine:laserToggled', {
      detail: { active: this.laserManualPunch }
    }));
    return this.laserManualPunch;
  }

  resetLaser() {
    if (this.laserManualPunch) {
      this.laserManualPunch = false;
      window.dispatchEvent(new CustomEvent('engine:laserToggled', {
        detail: { active: false }
      }));
      return true;
    }
    return false;
  }

  toggleNegative() {
    this.negativeActive = !this.negativeActive;
    console.log(`[ThreeEngine] Negative Invert: ${this.negativeActive ? 'ACTIVE' : 'OFF'}`);
    window.dispatchEvent(new CustomEvent('engine:negativeToggled', {
      detail: { active: this.negativeActive }
    }));
    return this.negativeActive;
  }

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

    if (this.uniforms && this.uniforms.uMeshAspect) {
      this.uniforms.uMeshAspect.value = width / height;
    }

    if (this.renderTargetA && this.renderTargetB) {
      this.renderTargetA.setSize(width, height);
      this.renderTargetB.setSize(width, height);
    }
  }

  update(computedMidi, audioState, buildupState = null) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // 1. Audio Frequency & Transient Decomposition
    let bass = 0.0;
    let snare = 0.0;
    let melody = 0.0;
    let bpm = 128.0;
    let beatPhase = 0.0;

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
    }

    // Continuous High-Performance Rendering Clock
    let effectiveNow = now;
    let effectiveBeatPhase = beatPhase;

    if (audioState) {
      // Extract Melody & Vocals from FFT bins 11 to 35
      if (audioState.fft && audioState.fft.length >= 35) {
        let sum = 0;
        for (let i = 11; i <= 35; i++) sum += audioState.fft[i];
        melody = (sum / 25) * 1.5;
      } else {
        melody = audioState.energyLevel || 0.0;
      }

      // Kinetic Angular Surge from kick strikes
      if (audioState.kickTrigger) {
        const surgeRate = THREE.MathUtils.lerp(dropCfg.surgeVerse, dropCfg.surgeDrop, dropFactor);
        this.surgeVelocity += bass * surgeRate;
      }

      // PHYSICAL KICK TRANSIENT SPAWNER
      const timeSinceKick = now - this.lastKickTimestamp;
      if (audioState.kickTrigger || (bass > 0.42 && timeSinceKick > 180)) {
        this.lastKickTimestamp = now;
        const ring = this.kickRings[this.kickRingIndex];
        ring.radius = 0.05;

        const waveIntensity = THREE.MathUtils.lerp(
          Math.min(0.35, bass * 0.35),
          Math.min(1.8, bass * 1.5),
          dropFactor
        );
        ring.intensity = waveIntensity;

        const baseSpeed = THREE.MathUtils.lerp(2.6, 4.6, dropFactor);
        ring.speed = (bpm / 60.0) * baseSpeed;
        ring.width = 0.65 + (computedMidi.waveSpread ? (computedMidi.waveSpread - 1.8) * 0.2 : 0.15);
        this.kickRingIndex = (this.kickRingIndex + 1) % this.kickRings.length;
      }

      // PHYSICAL SNARE TRANSIENT SPAWNER
      const timeSinceSnare = now - this.lastSnareTimestamp;
      if (audioState.highTrigger || (snare > 0.40 && timeSinceSnare > 220)) {
        this.lastSnareTimestamp = now;
        const ring = this.snareRings[this.snareRingIndex];
        ring.radius = 6.5;
        ring.intensity = Math.min(1.2, snare * 1.3);
        ring.speed = (bpm / 60.0) * 4.6;
        ring.width = 0.55;
        this.snareRingIndex = (this.snareRingIndex + 1) % this.snareRings.length;
      }
    }

    // Advance and decay active Kick Wave Rings (expand across full 16:9 canvas)
    for (let i = 0; i < this.kickRings.length; i++) {
      const ring = this.kickRings[i];
      if (ring.intensity > 0.005) {
        ring.radius += ring.speed * dt;
        ring.intensity *= Math.exp(-1.9 * dt);
        if (ring.radius > 9.5) ring.intensity = 0.0;
      }
      this.uniforms.uKickRings.value[i].set(ring.radius, ring.intensity, ring.width);
    }

    // Advance and decay active Snare Wave Rings
    for (let i = 0; i < this.snareRings.length; i++) {
      const ring = this.snareRings[i];
      if (ring.intensity > 0.005) {
        ring.radius -= ring.speed * dt;
        ring.intensity *= Math.exp(-2.4 * dt);
        if (ring.radius < 0.1) ring.intensity = 0.0;
      }
      this.uniforms.uSnareRings.value[i].set(ring.radius, ring.intensity, ring.width);
    }

    // 2. Advance Subtle Harmonized Stardust Stream
    if (this.starGeometry) {
      const starPos = this.starGeometry.attributes.position.array;
      let forwardVelocity = (1.0 * 3.5 + bass * 4.0) * dt;

      // Canvas-wide Riser Atmosphere Expansion:
      const isBuilding = buildupState && (buildupState.state === 'building' || buildupState.state === 'holding_climax');
      if (isBuilding) {
        const rType = buildupState.archetypeIndex !== undefined ? buildupState.archetypeIndex : 0;
        const rProg = buildupState.progress || 0.0;
        if (rType === 1) {
          // Dark Implosion: Space suction — stars reverse and plunge into the central void!
          forwardVelocity = -((1.0 * 3.5 + bass * 4.0) * (0.8 + rProg * 4.0)) * dt;
        } else {
          // Blitz, Chromatic, Solar: Stars accelerate into hyperspace streaks!
          forwardVelocity *= (1.0 + Math.pow(rProg, 1.4) * 4.2);
        }
      }

      for (let i = 0; i < this.starCount; i++) {
        starPos[i * 3 + 2] += forwardVelocity * this.starVelocities[i];

        if (starPos[i * 3 + 2] > 6.5) {
          starPos[i * 3 + 2] = -14.0;
          const angle = Math.random() * Math.PI * 2;
          const radius = 1.0 + Math.random() * 8.5;
          starPos[i * 3 + 0] = Math.cos(angle) * radius;
          starPos[i * 3 + 1] = Math.sin(angle) * radius;
        } else if (starPos[i * 3 + 2] < -14.0) {
          starPos[i * 3 + 2] = 6.5;
          const angle = Math.random() * Math.PI * 2;
          const radius = 1.0 + Math.random() * 8.5;
          starPos[i * 3 + 0] = Math.cos(angle) * radius;
          starPos[i * 3 + 1] = Math.sin(angle) * radius;
        }
      }
      this.starGeometry.attributes.position.needsUpdate = true;
      this.starMaterial.uniforms.uTime.value = effectiveNow * 0.001;
      this.starMaterial.uniforms.uKick.value = bass;
    }

    // 3. Hardware MIDI Knobs & Controls
    const k1Lfo = computedMidi.strobeLfoHz || 8.0;
    this.rotSpeed = 0.002 + (k1Lfo / 50.0) * 0.018;

    if (this.hueFlowActive) {
      this.autoHue = (this.autoHue + dt * 0.12) % 1.0;
    }
    const manualHue = computedMidi.hydraHue || 0.0;
    const effectiveHue = this.hueFlowActive ? (this.autoHue + manualHue) % 1.0 : manualHue;

    const waveSpread = computedMidi.waveSpread || 2.5;
    const sensitivity = computedMidi.audioSensitivity || 1.5;

    const waveDepthMult = THREE.MathUtils.lerp(dropCfg.verseWaveMultiplier, dropCfg.dropWaveMultiplier, dropFactor);
    const waveAmp = (0.25 + sensitivity * 0.45) * waveDepthMult;

    // 4. Totem Mesh Rotation & Floating Physics
    this.rotationAngle += (this.rotSpeed + this.surgeVelocity) * dt * 60;
    if (this.framingMode === 2) {
      // Classic Totem: physical 3D mesh plane rotates
      this.mesh.rotation.z = this.rotationAngle;
      this.uniforms.uUvRotation.value = 0.0;
    } else {
      // World-Field & Radial Portal: fixed screen frame, UV coordinates rotate inside
      this.mesh.rotation.z = 0.0;
      this.uniforms.uUvRotation.value = this.rotationAngle;
    }
    this.surgeVelocity *= Math.exp(-6.0 * dt);

    // Sub-bass Kick Heartbeat Scale Pulse
    if (audioState && audioState.kickTrigger && dropFactor > 0.15) {
      this.meshScaleRecoil = Math.min(0.22, bass * 0.20 * dropFactor);
    }
    this.meshScaleRecoil *= Math.exp(-10.5 * dt);

    const verseScale = 1.0 + (bass * dropCfg.verseScaleMultiplier) + Math.sin(beatPhase * 6.28318) * 0.005;
    const dropKickPump = Math.pow(Math.min(1.0, bass), 1.35) * dropCfg.dropScaleMultiplier;
    const dropScale = 1.0 + dropKickPump + this.meshScaleRecoil;
    const scalePunch = THREE.MathUtils.lerp(verseScale, dropScale, dropFactor);
    this.mesh.scale.set(scalePunch, scalePunch, 1.0);

    // Subtle 3D vertical float
    const floatY = Math.sin(now * 0.0007) * 0.05;
    this.mesh.position.y = floatY;

    // 5. Camera Target Setup
    let targetTiltX = 0.0;
    let targetPosY = 0.0;
    let targetPosZ = 6.2;

    if (audioState && audioState.kickTrigger && dropFactor > 0.25) {
      this.camKickImpulse += bass * dropCfg.camKickImpulse * dropFactor;
    }
    this.camKickImpulse *= Math.exp(-8.0 * dt);
    targetPosZ -= this.camKickImpulse;

    const targetCamX = (computedMidi.panX - 0.5) * 4.0;
    const zoomFactor = THREE.MathUtils.lerp(0.75, 1.45, computedMidi.aperture);
    targetPosZ = targetPosZ / zoomFactor;

    if (buildupState && buildupState.cameraTension > 0.0) {
      targetPosZ -= buildupState.cameraTension * 2.2;
    }
    // Grating shutter operates purely as optical lens occlusion without jarring camera jumps

    this.camTiltX = THREE.MathUtils.lerp(this.camTiltX, targetTiltX, 0.06);
    this.camPosY = THREE.MathUtils.lerp(this.camPosY, targetPosY, 0.06);
    this.camPosZ = THREE.MathUtils.lerp(this.camPosZ, targetPosZ, 0.06);

    this.camera.rotation.x = this.camTiltX;
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
    this.camera.position.y = this.camPosY;
    this.camera.position.z = this.camPosZ;

    // 6. Shader Uniform Updates (Totem Mesh)
    this.uniforms.uTime.value = effectiveNow * 0.001;
    this.uniforms.uBeatPhase.value = effectiveBeatPhase;
    this.uniforms.uMelody.value = melody;
    this.uniforms.uBass.value = bass;
    this.uniforms.uMid.value = audioState ? (audioState.midLevel || 0.0) : 0.0;
    this.uniforms.uAmp.value = waveAmp;
    this.uniforms.uSpread.value = waveSpread;
    this.uniforms.uDrop.value = dropFactor;
    this.uniforms.uPreset.value = this.currentPresetIndex;
    this.uniforms.uHue.value = effectiveHue;
    if (computedMidi.padSlam) {
      if (this.slicerActive) this.resetSlicer();
      if (this.gratingActive) this.resetGrating();
    }
    this.uniforms.uPadSlam.value = computedMidi.padSlam ? 1.0 : 0.0;

    const isBuilding = buildupState && (buildupState.state === 'building' || buildupState.state === 'holding_climax');
    const isShut = buildupState && (buildupState.state === 'blackout_shut' || buildupState.isBlackout);

    this.uniforms.uBuildupActive.value = isBuilding ? 1.0 : 0.0;
    this.uniforms.uStrobePulse.value = isBuilding ? buildupState.strobePulse : 1.0;
    this.uniforms.uMasterBlackout.value = isShut ? 1.0 : 0.0;
    this.uniforms.uBlinder.value = isBuilding ? buildupState.blinderIntensity : 0.0;

    const manualSlicer = this.slicerActive ? 1.0 : 0.0;
    const buildSlicer = isBuilding ? (buildupState.slicerDepth || 0.0) : 0.0;
    this.uniforms.uSlicer.value = Math.max(manualSlicer, buildSlicer);
    this.uniforms.uSlicerStyle.value = isBuilding && !this.slicerActive ? 0 : this.slicerStyle;

    const k1Rate = (computedMidi.strobeLfoHz || 8.0) / 50.0;
    this.slicerRotation += (0.3 + k1Rate * 2.0) * dt;
    this.uniforms.uSlicerAngle.value = this.slicerRotation;
    this.uniforms.uSlicerDensity.value = 6.0 + (waveSpread ? (waveSpread - 1.8) * 14.0 : 6.0);

    this.uniforms.uNegative.value = this.negativeActive ? 1.0 : 0.0;
    let glitchVal = isBuilding && buildupState.progress > 0.65
      ? (buildupState.progress - 0.65) * 1.8
      : 0.0;
    // Grating shutter is an optical occlusion comb, not a texture displacement/glitch
    this.uniforms.uGlitch.value = glitchVal;
    this.uniforms.uRiserType.value = buildupState ? (buildupState.archetypeIndex !== undefined ? buildupState.archetypeIndex : 0) : 0;
    this.uniforms.uRiserProgress.value = buildupState ? (buildupState.progress || 0.0) : 0.0;

    // 7. Feedback Pipeline Uniform Updates
    this.feedbackMaterial.uniforms.uTime.value = effectiveNow * 0.001;
    this.feedbackMaterial.uniforms.uKick.value = bass;

    // Canvas-Wide Atmosphere & Fluid Corona Riser Dynamics:
    let effCorona = this.coronaIntensity;
    let effSpread = this.spreadReach;
    let effPrimary = [this.colorPrimary[0], this.colorPrimary[1], this.colorPrimary[2]];

    if (isBuilding) {
      const rType = buildupState.archetypeIndex !== undefined ? buildupState.archetypeIndex : 0;
      const rProg = buildupState.progress || 0.0;
      const strobe = buildupState.strobePulse || 1.0;

      if (rType === 0) {
        // Kinetic Blitz: High-speed icy blue strobe to pure blinding whiteout
        effCorona += rProg * 2.6 * strobe;
        effSpread += rProg * 3.2;
        effPrimary = [
          THREE.MathUtils.lerp(this.colorPrimary[0], 0.95, rProg),
          THREE.MathUtils.lerp(this.colorPrimary[1], 0.98, rProg),
          1.0
        ];
      } else if (rType === 1) {
        // Dark Implosion: Void vacuum collapses corona into singularity!
        if (rProg > 0.84) {
          effCorona = 0.0;
          effSpread = 0.1;
          effPrimary = [0.0, 0.0, 0.0];
        } else {
          const t = rProg / 0.84;
          effCorona *= (1.0 - t * 0.95);
          effSpread *= (1.0 - t * 0.85);
          effPrimary = [
            THREE.MathUtils.lerp(this.colorPrimary[0], 0.02, t),
            THREE.MathUtils.lerp(this.colorPrimary[1], 0.08, t),
            THREE.MathUtils.lerp(this.colorPrimary[2], 0.40, t)
          ];
        }
      } else if (rType === 2) {
        // Chromatic Tear: Electric cyan & neon magenta distortion
        effCorona += rProg * 1.8;
        effSpread += rProg * 2.2;
        effPrimary = [
          strobe > 0.5 ? 0.0 : 1.0,
          strobe > 0.5 ? 0.95 : 0.05,
          1.0
        ];
      } else if (rType === 3) {
        // Solar Bloom: Overheating corona eruption across entire 1080p canvas!
        // Baseline -> molten amber -> plasma magenta -> solar whiteout
        effCorona += rProg * 2.4;
        effSpread += rProg * 3.8;
        if (rProg < 0.60) {
          const t = rProg / 0.60;
          effPrimary = [
            THREE.MathUtils.lerp(this.colorPrimary[0], 1.0, t),
            THREE.MathUtils.lerp(this.colorPrimary[1], 0.55, t),
            THREE.MathUtils.lerp(this.colorPrimary[2], 0.08, t)
          ];
        } else {
          const t = (rProg - 0.60) / 0.40;
          effPrimary = [
            1.0,
            THREE.MathUtils.lerp(0.55, 0.15 + 0.85 * t, t),
            THREE.MathUtils.lerp(0.08, 0.60 + 0.40 * t, t)
          ];
        }
      }
    } else if (isShut) {
      effCorona = 0.0;
      effSpread = 0.1;
      effPrimary = [0.0, 0.0, 0.0];
    }

    this.feedbackMaterial.uniforms.uCoronaIntensity.value = effCorona;
    this.feedbackMaterial.uniforms.uSpreadReach.value = effSpread;
    this.feedbackMaterial.uniforms.uCurl.value = this.curl;
    this.feedbackMaterial.uniforms.uDecay.value = this.decay;
    this.feedbackMaterial.uniforms.uColorPrimary.value.set(effPrimary[0], effPrimary[1], effPrimary[2]);

    // Master Optical Processor Uniform Updates
    this.feedbackMaterial.uniforms.uPadSlam.value = computedMidi.padSlam ? 1.0 : 0.0;
    this.feedbackMaterial.uniforms.uMasterBlackout.value = isShut ? 1.0 : 0.0;
    this.feedbackMaterial.uniforms.uBuildupActive.value = isBuilding ? 1.0 : 0.0;
    this.feedbackMaterial.uniforms.uRiserType.value = buildupState ? (buildupState.archetypeIndex !== undefined ? buildupState.archetypeIndex : 0) : 0;
    this.feedbackMaterial.uniforms.uRiserProgress.value = buildupState ? (buildupState.progress || 0.0) : 0.0;
    this.feedbackMaterial.uniforms.uStrobePulse.value = isBuilding ? (buildupState.strobePulse !== undefined ? buildupState.strobePulse : 1.0) : 1.0;
    this.feedbackMaterial.uniforms.uRadialBlur.value = isBuilding ? (buildupState.radialBlur || 0.0) : 0.0;
    this.feedbackMaterial.uniforms.uHighPass.value = isBuilding ? (buildupState.highPass || 0.0) : 0.0;
    this.feedbackMaterial.uniforms.uChromatic.value = isBuilding ? (buildupState.chromatic || 0.0) : 0.0;
    this.feedbackMaterial.uniforms.uRetinalGhost.value = isBuilding ? (buildupState.retinalGhost || 0.0) : 0.0;
    this.feedbackMaterial.uniforms.uBlinder.value = isBuilding ? (buildupState.blinderIntensity || 0.0) : 0.0;

    // ILDA Projector Laser & Spatial Vector Uniform Updates
    const laserBuild = isBuilding ? Math.max(0.0, Math.min(1.0, (buildupState.highPass || 0.0) * 1.35)) : 0.0;
    const finalLaserIntensity = Math.max(laserBuild, this.laserManualPunch ? 1.0 : 0.0);

    // Calculate Laser Wavelength Color
    let laserR = 0.0, laserG = 1.0, laserB = 0.45; // Default: 532nm DPSS Emerald Green
    if (computedMidi.hue !== undefined && computedMidi.hue > 0.001) {
      const h = computedMidi.hue;
      if (h < 0.25) {
        const t = h / 0.25;
        laserR = 0.0; laserG = 1.0; laserB = 0.45 + t * 0.55;
      } else if (h < 0.50) {
        const t = (h - 0.25) / 0.25;
        laserR = t; laserG = 1.0; laserB = 1.0;
      } else if (h < 0.75) {
        const t = (h - 0.50) / 0.25;
        laserR = 1.0; laserG = 1.0 - t * 0.92; laserB = 1.0 - t * 0.55;
      } else {
        const t = (h - 0.75) / 0.25;
        laserR = 1.0 - t; laserG = 0.08 + t * 0.92; laserB = 0.45;
      }
    } else if (buildupState && isBuilding) {
      const archIdx = buildupState.archetypeIndex || 0;
      if (archIdx === 0) {
        laserR = 0.0; laserG = 0.95; laserB = 1.0; // Hyperdrive: Electric Cyan
      } else if (archIdx === 1) {
        laserR = 0.85; laserG = 0.92; laserB = 1.0; // Singularity: Arctic Silver
      } else if (archIdx === 2) {
        laserR = 1.0; laserG = 0.08; laserB = 0.55; // Prism: Acid Ruby / Neon Magenta
      } else if (archIdx === 3) {
        laserR = 1.0; laserG = 0.65; laserB = 0.15; // Thermal: Solar Flare / Molten Amber
      }
    }

    this.feedbackMaterial.uniforms.uLaserIntensity.value = finalLaserIntensity;
    this.feedbackMaterial.uniforms.uLaserBeamWidth.value = this.laserBeamWidth;
    this.feedbackMaterial.uniforms.uLaserColor.value.set(laserR, laserG, laserB);
    this.feedbackMaterial.uniforms.uLaserFanSpeed.value = 2.0 + (computedMidi.rippleRate || 1.0) * 3.5;
    // Dynamic Optical Grating / Comb Shutter Master Uniforms
    const effectiveBpm = Math.max(60.0, Math.min(220.0, bpm || 128.0));
    // Accumulate tempo-locked musical beat clock (1.0 = 1 quarter-note beat)
    this.gratingBeatTime += (effectiveBpm / 60.0) * dt;

    if (this.gratingActive) {
      // Standalone deployment advances over ~2 musical beats at track BPM
      const deploySpeed = (effectiveBpm / 60.0) / 2.0;
      this.gratingDeployProgress = Math.min(1.0, this.gratingDeployProgress + dt * deploySpeed);
    } else {
      this.gratingDeployProgress = 0.0;
    }

    // If DJ clubbed grating with a riser, synchronize progress & subdivision; otherwise use standalone mechanical deployment
    let effGratingProgress = this.gratingDeployProgress;
    let effGratingSubdivision = 1.0;

    if (this.gratingActive && isBuilding && buildupState) {
      effGratingProgress = Math.max(this.gratingDeployProgress, buildupState.progress || 0.0);
      effGratingSubdivision = buildupState.subdivision || 4.0;
    }

    const gratingPunch = this.gratingActive ? 1.0 : 0.0;
    this.gratingRotation += (0.18 + (computedMidi.strobeLfoHz || 8.0) * 0.06 + (isBuilding ? effGratingProgress * 0.25 : 0.0)) * dt;
    const baseDensity = 12.0 + (computedMidi.waveSpread ? (computedMidi.waveSpread - 1.8) * 10.0 : 0.0);

    this.feedbackMaterial.uniforms.uGratingActive.value = gratingPunch;
    this.feedbackMaterial.uniforms.uGratingStyle.value = this.gratingStyle;
    this.feedbackMaterial.uniforms.uGratingDensity.value = this.gratingStyle === 1 ? Math.floor(baseDensity * 0.8) : baseDensity;
    this.feedbackMaterial.uniforms.uGratingWidth.value = this.gratingWidth;
    this.feedbackMaterial.uniforms.uGratingAngle.value = this.gratingRotation;
    this.feedbackMaterial.uniforms.uGratingTime.value = this.gratingBeatTime; // Tempo-locked to song BPM!
    this.feedbackMaterial.uniforms.uGratingAudio.value = bass;
    this.feedbackMaterial.uniforms.uGratingProgress.value = effGratingProgress;
    this.feedbackMaterial.uniforms.uGratingSubdivision.value = effGratingSubdivision;

    this.feedbackMaterial.uniforms.uLaserFanBlades.value = (isBuilding && buildupState.subdivision >= 16) ? 24.0 : 12.0;
    this.feedbackMaterial.uniforms.uJoystickPan.value = computedMidi.joystickPan !== undefined ? computedMidi.joystickPan : 0.5;
    this.feedbackMaterial.uniforms.uJoystickTilt.value = computedMidi.joystickAperture !== undefined ? computedMidi.joystickAperture : 0.5;

    // 8. 2-Pass Ping-Pong Render Execution
    // Pass 1: Render Crisp Totem Mesh & Stardust Motes to RenderTarget A
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Composite Fluid Silhouette Corona & Obsidian Void to Screen
    this.feedbackMaterial.uniforms.uCurrentScene.value = this.renderTargetA.texture;
    this.feedbackMaterial.uniforms.uPrevFeedback.value = this.renderTargetB.texture;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.feedbackScene, this.feedbackCamera);

    // Buffer Swap for continuous liquid advection
    const temp = this.renderTargetA;
    this.renderTargetA = this.renderTargetB;
    this.renderTargetB = temp;
  }

  dispose() {
    if (this.currentTexture) this.currentTexture.dispose();
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.starGeometry) this.starGeometry.dispose();
    if (this.starMaterial) this.starMaterial.dispose();
    if (this.feedbackQuadGeo) this.feedbackQuadGeo.dispose();
    if (this.feedbackMaterial) this.feedbackMaterial.dispose();
    if (this.renderTargetA) this.renderTargetA.dispose();
    if (this.renderTargetB) this.renderTargetB.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
