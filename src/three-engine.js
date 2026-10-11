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

    // Hotcue FX State: Temporal Beat Repeat (Pad 7) & Negative Invert (Pad 8)
    this.beatRepeatActive = false;
    this.beatRepeatIndex = 1; // 0: 1/4 Beat, 1: 1/8 Beat (Stutter), 2: 1/16 Beat (Roll), 3: 1/32 Beat (Hyper)
    this.beatRepeatDivisions = [1.0, 0.5, 0.25, 0.125];
    this.beatRepeatStyles = [
      { id: 0, name: '1/4 Beat Freeze', desc: 'Quarter-note frame hold & cadence snap' },
      { id: 1, name: '1/8 Beat Stutter', desc: 'High-energy 8th-note temporal stutter & glitch' },
      { id: 2, name: '1/16 Beat Roll', desc: 'Machine-gun 16th-note rapid micro-repeat' },
      { id: 3, name: '1/32 Beat Hyper', desc: 'Granular audio-rate hyper-flutter' },
    ];

    // Physical In-Shader FX States (Legacy Slicer & Invert)
    this.slicerActive = false;
    this.slicerStyle = 0;
    this.slicerRotation = 0.785398;
    this.negativeActive = false;

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

        // 2. Buildup Strobe Gate
        // Kinetic Blitz (0) & Chromatic Tear (2) use rapid strobe gating;
        // Dark Implosion (1) & Solar Bloom (3) rely on fluid continuous tension
        if (uBuildupActive > 0.5) {
          if ((uRiserType == 0 || uRiserType == 2) && uStrobePulse < 0.01) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
        }

        vec2 uv = vUv;

        // 3. In-Shader Glitch UV Displacement
        if (uGlitch > 0.001) {
          float slice = floor(uv.y * 32.0);
          float hash = fract(sin(slice * 12.9898) * 43758.5453);
          if (hash < uGlitch * 0.75) {
            uv.x += (fract(hash * 43.12) - 0.5) * uGlitch * 0.16;
          }
        }

        // 4. Aspect-Corrected Isotropic Coordinates
        vec2 centeredUv = uv - 0.5;
        vec2 isotropicUv = vec2(centeredUv.x * uMeshAspect, centeredUv.y);

        // UV Rotation (Used in World-Field and Radial Portal modes to keep screen frame locked)
        vec2 rotP = isotropicUv;
        if (uFramingMode == 0 || uFramingMode == 1) {
          float cRot = cos(uUvRotation);
          float sRot = sin(uUvRotation);
          rotP = vec2(cRot * isotropicUv.x - sRot * isotropicUv.y, sRot * isotropicUv.x + cRot * isotropicUv.y);
        }

        // DARK IMPLOSION (Riser 1): Centered Singularity Vortex Pinch
        if (uBuildupActive > 0.5 && uRiserType == 1) {
          float pinch = 1.0 + pow(uRiserProgress, 2.2) * 1.6;
          rotP *= pinch;
        }

        float uvScale = 1.0 + (uMid * 0.12);
        vec2 finalUv = rotP * uvScale + 0.5;

        // CHROMATIC TEAR (Riser 2): RGB Channel Split
        vec4 texColor;
        if (uBuildupActive > 0.5 && uRiserType == 2) {
          float chromOffset = pow(uRiserProgress, 1.5) * 0.045;
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

        // 4 RISER ARCHETYPE COLOR TEMPERATURE TRAJECTORIES
        if (uBuildupActive > 0.5) {
          if (uRiserType == 1) {
            // 1. DARK IMPLOSION: Progressive Desaturation -> Arctic Cobalt Chill -> Pre-Drop Total Silence
            float gray = dot(col, vec3(0.299, 0.587, 0.114));
            vec3 cobaltTint = vec3(gray * 0.45, gray * 0.65, gray * 1.18);
            col = mix(col, cobaltTint, clamp(uRiserProgress * 1.25, 0.0, 1.0));
            if (uRiserProgress > 0.84) {
              // Pre-Drop Silence Pocket: Complete vanishing into obsidian void before beat 1
              col *= (1.0 - smoothstep(0.84, 0.98, uRiserProgress));
            }
          } else if (uRiserType == 2) {
            // 2. CHROMATIC TEAR: Transitions artwork into acid cyan / electric magenta split
            vec3 acidShift = mix(vec3(0.0, 1.0, 0.92), vec3(1.0, 0.15, 0.75), sin(vUv.y * 24.0 + uTime * 12.0) * 0.5 + 0.5);
            col = mix(col, col * acidShift * 1.45, clamp(pow(uRiserProgress, 1.25) * 0.90, 0.0, 1.0));
          } else if (uRiserType == 3) {
            // 3. SOLAR BLOOM: Dynamic thermal progression:
            vec3 goldFlare = vec3(1.0, 0.65, 0.20) * 1.6;
            vec3 plasmaMagenta = vec3(1.0, 0.18, 0.78) * 2.1;
            vec3 solarColor = mix(goldFlare, plasmaMagenta, smoothstep(0.35, 0.82, uRiserProgress));
            col += solarColor * pow(uRiserProgress, 1.35);
          } else if (uRiserType == 0) {
            // 0. KINETIC BLITZ: Electric Ice-Blue shift into pure whiteout
            vec3 electricIce = vec3(0.70, 0.90, 1.05);
            col = mix(col, col * electricIce, clamp(pow(uRiserProgress, 1.2) * 0.65, 0.0, 1.0));
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
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5);
          vec2 p = vUv - center;
          float r = length(p);
          float angle = atan(p.y, p.x);

          // -------------------------------------------------------------
          // 1. OBSIDIAN VOID HARMONIC BASE (KEEP IT SIMPLE: ZERO SUNBEAMS, PURE DARK VOID)
          // -------------------------------------------------------------
          // Pure velvety dark void with microscopic color temperature from primary
          vec3 deepVoid = vec3(0.008, 0.010, 0.014) + uColorPrimary * 0.012;

          // -------------------------------------------------------------
          // 2. FLUID SILHOUETTE CORONA (ORGANIC EDGE ADVECTION)
          // -------------------------------------------------------------
          float zoom = 1.0 + (0.010 * uSpreadReach) + (uKick * 0.030);
          vec2 warpedUv = p / zoom + center;

          // Liquid curl for organic smoke/silk fluid movement
          float curlOffset = sin(r * 14.0 - uTime * 2.0) * (0.0022 * uCurl) * (1.0 + uKick * 1.2);
          warpedUv += vec2(cos(angle), sin(angle)) * curlOffset;

          // Multi-tap soft diffusion so edge fluid disperses like watercolor pigment in water
          vec4 prev1 = texture2D(uPrevFeedback, warpedUv);
          vec4 prev2 = texture2D(uPrevFeedback, warpedUv + vec2(0.0018, 0.0018));
          vec4 prev3 = texture2D(uPrevFeedback, warpedUv - vec2(0.0018, 0.0018));
          vec4 prev = (prev1 * 0.50 + prev2 * 0.25 + prev3 * 0.25) * uDecay;

          // -------------------------------------------------------------
          // 3. SAMPLE CURRENT FOREGROUND FRAME (TOTEM + STARDUST)
          // -------------------------------------------------------------
          vec4 curr = texture2D(uCurrentScene, vUv);

          // Subtle fluid silhouette trails carrying the true colors of the asset edges
          vec3 corona = prev.rgb * (uCoronaIntensity * 0.90);

          // -------------------------------------------------------------
          // 4. COMPOSITE
          // -------------------------------------------------------------
          vec3 environment = deepVoid + corona;

          // Composite foreground Totem over environment:
          // The center hero asset maintains 100% true, crisp, untouched colors.
          vec3 finalRgb = mix(environment, curr.rgb, curr.a);

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

  // Bank A Pad 7: Temporal Beat Repeat Hotcue
  toggleBeatRepeat() {
    this.beatRepeatActive = !this.beatRepeatActive;
    const style = this.beatRepeatStyles[this.beatRepeatIndex];
    console.log(`[ThreeEngine] Temporal Beat Repeat: ${this.beatRepeatActive ? 'ACTIVE' : 'BYPASS'} (${style.name})`);
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', {
      detail: { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex }
    }));
    return { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex };
  }

  // Bank B Pad 1: Cycle armed beat repeat subdivision rate
  cycleBeatRepeatRate() {
    this.beatRepeatIndex = (this.beatRepeatIndex + 1) % this.beatRepeatStyles.length;
    const style = this.beatRepeatStyles[this.beatRepeatIndex];
    console.log(`[ThreeEngine] Armed Beat Repeat Rate: [${this.beatRepeatIndex + 1}/4] ${style.name}`);
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', {
      detail: { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex }
    }));
    return { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex };
  }

  setBeatRepeatRate(index) {
    this.beatRepeatIndex = Math.max(0, Math.min(this.beatRepeatStyles.length - 1, index));
    const style = this.beatRepeatStyles[this.beatRepeatIndex];
    window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', {
      detail: { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex }
    }));
    return { active: this.beatRepeatActive, style: style, index: this.beatRepeatIndex };
  }

  resetBeatRepeat() {
    if (this.beatRepeatActive) {
      this.beatRepeatActive = false;
      const style = this.beatRepeatStyles[this.beatRepeatIndex];
      window.dispatchEvent(new CustomEvent('engine:beatRepeatChanged', {
        detail: { active: false, style: style, index: this.beatRepeatIndex }
      }));
    }
  }

  // Bank A Pad 7: Fast ON / OFF punch for the loaded slicer style
  toggleSlicerPunch() {
    return this.toggleBeatRepeat();
  }

  // Bank B Pad 1: Cycle armed slicer style without forcing on/off
  cycleSlicerStyle() {
    return this.cycleBeatRepeatRate();
  }

  setSlicerStyle(index) {
    return this.setBeatRepeatRate(index);
  }

  toggleSlicer() {
    return this.toggleBeatRepeat();
  }

  resetSlicer() {
    this.resetBeatRepeat();
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

    // Temporal Beat-Repeat Hotcue Quantization
    let effectiveNow = now;
    let effectiveBeatPhase = beatPhase;
    if (this.beatRepeatActive) {
      const beatSec = 60.0 / Math.max(60.0, bpm);
      const div = this.beatRepeatDivisions[this.beatRepeatIndex];
      const sliceMs = (beatSec * div) * 1000.0;
      effectiveNow = Math.floor(now / sliceMs) * sliceMs;
      effectiveBeatPhase = ((effectiveNow * 0.001) / beatSec) % 1.0;
    }

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
    if (this.beatRepeatActive) {
      targetPosZ -= 0.65;
    }

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
      if (this.beatRepeatActive) this.resetBeatRepeat();
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
    if (this.beatRepeatActive) {
      glitchVal = Math.max(glitchVal, 0.45);
    }
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
