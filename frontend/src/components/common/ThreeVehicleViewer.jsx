import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Loader2, AlertCircle } from 'lucide-react';

// In-memory GLTF model cache to avoid re-fetching across tab toggles
const gltfCache = new Map();

/**
 * ThreeVehicleViewer
 * 
 * Genuine Interactive 3D Vehicle Viewer powered by Three.js & WebGL.
 * Features:
 * 1. Loads authentic GLB/glTF 3D vehicle assets with auto-centering and scaling.
 * 2. Single WebGL context lifecycle with zero unnecessary context recreations.
 * 3. Smooth, continuous 360-degree horizontal rotation via mouse drag and touch gestures.
 * 4. Bounded elevation pitch (no gimbal lock, no flipping beneath floor).
 * 5. Smooth Auto 360° Spin with start/stop control and auto-pause on user interaction.
 * 6. Cardinal angle tweening: Front (0°), Side (90°), Rear (180°), Left (270°).
 * 7. Studio lighting and turntable floor shadow.
 * 8. Real-time Gyro Compass angle feedback.
 */
export default function ThreeVehicleViewer({
  modelUrl,
  vehicleName = 'Vehicle',
  vehicleType = 'bike',
  isAutoSpinning = false,
  onAutoSpinChange,
  onAngleUpdate,
  frontOffsetDeg = 0,
  targetPresetDeg = null,
  onPresetReached,
  zoomLevel = 1,
  isFullscreen = false,
  onError
}) {
  const mountRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(!gltfCache.has(modelUrl));
  const [loadError, setLoadError] = useState(null);

  // Callback refs to decouple from effect dependencies
  const onAngleUpdateRef = useRef(onAngleUpdate);
  onAngleUpdateRef.current = onAngleUpdate;

  const onAutoSpinChangeRef = useRef(onAutoSpinChange);
  onAutoSpinChangeRef.current = onAutoSpinChange;

  const onPresetReachedRef = useRef(onPresetReached);
  onPresetReachedRef.current = onPresetReached;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const frontOffsetDegRef = useRef(frontOffsetDeg);
  frontOffsetDegRef.current = frontOffsetDeg;

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRootRef = useRef(null);
  const animFrameRef = useRef(null);
  const tweenRef = useRef(null);
  const initialDistanceRef = useRef(4.5);

  // ─── 1. INITIALIZE THREE.JS SCENE ONCE ON MOUNT ───
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 4.5);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.90;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.touchAction = 'none'; // Ensure smooth mobile touch gesture control
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Showroom PBR Environment Map for Realistic Surface Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // OrbitControls: Natural continuous 360° turntable drag physics
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // Silky smooth inertia
    controls.rotateSpeed = 1.0;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;

    // Invert horizontal rotation only: dragging right spins vehicle to the right, dragging left spins vehicle to the left
    const origRotateLeft = controls.rotateLeft.bind(controls);
    controls.rotateLeft = (angle) => {
      origRotateLeft(-angle);
    };

    // Bounds for vertical elevation (sensible studio limits: prevents flipping/clipping under floor)
    controls.minPolarAngle = Math.PI * 0.15; // ~27° from top (bird's eye inspection)
    controls.maxPolarAngle = Math.PI * 0.48; // ~86° near ground level (wheel and chassis inspection)

    // Horizontal rotation: fully unconstrained continuous 360° in both directions
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // Pause auto-spin whenever user interacts
    const onStartInteraction = () => {
      if (tweenRef.current) tweenRef.current = null;
      if (onAutoSpinChangeRef.current) onAutoSpinChangeRef.current(false);
    };
    controls.addEventListener('start', onStartInteraction);

    // ── Professional Studio Lighting Rig (Balanced Contrast, Eliminates Washed-Out Colors) ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.55);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Key Light (Main focused studio light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    const d = 3.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    // Front-Low Undercarriage Fill Light
    const underFillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    underFillLight.position.set(0, -0.8, 4.5);
    scene.add(underFillLight);

    // Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.75);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    // Subtle Profile Lights
    const leftProfileLight = new THREE.DirectionalLight(0xffffff, 0.65);
    leftProfileLight.position.set(-6, 2.5, 1);
    scene.add(leftProfileLight);

    const rightProfileLight = new THREE.DirectionalLight(0xffffff, 0.65);
    rightProfileLight.position.set(6, 2.5, 1);
    scene.add(rightProfileLight);

    // Rim Light (Sharp silhouette highlight)
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.85);
    rimLight.position.set(0, 6, -6);
    scene.add(rimLight);

    // ── Turntable Stage Floor & Ground Shadow ──
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const floorMesh = new THREE.Mesh(floorGeo, shadowMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Decorative Studio Turntable Ring
    const ringGeo = new THREE.RingGeometry(2.1, 2.14, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6333,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.002;
    scene.add(ringMesh);

    const outerRingGeo = new THREE.RingGeometry(2.45, 2.47, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = -Math.PI / 2;
    outerRingMesh.position.y = 0.002;
    scene.add(outerRingMesh);

    // ── Animation & Render Loop ──
    let lastDegReported = -1;
    const animate = (time) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Handle Smooth Cardinal Angle Tweening
      if (tweenRef.current) {
        tweenRef.current.progress += 0.08;
        const p = Math.min(tweenRef.current.progress, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const currentA = THREE.MathUtils.lerp(tweenRef.current.startAzimuth, tweenRef.current.targetAzimuth, ease);

        const dist = camera.position.distanceTo(controls.target);
        const polar = controls.getPolarAngle();
        camera.position.x = controls.target.x + dist * Math.sin(polar) * Math.sin(currentA);
        camera.position.z = controls.target.z + dist * Math.sin(polar) * Math.cos(currentA);
        camera.position.y = controls.target.y + dist * Math.cos(polar);
        camera.lookAt(controls.target);

        if (controls._sphericalDelta) {
          controls._sphericalDelta.set(0, 0, 0);
        }

        if (p >= 1) {
          tweenRef.current = null;
          if (onPresetReachedRef.current) onPresetReachedRef.current();
        }
      }

      controls.update();

      // Read real-time azimuth and broadcast normalized degree (0° - 359.9°)
      const currentAzimuth = controls.getAzimuthalAngle();
      const frontRad = THREE.MathUtils.degToRad(frontOffsetDegRef.current || 0);
      const currentDeg = ((THREE.MathUtils.radToDeg(currentAzimuth - frontRad) % 360) + 360) % 360;
      const roundedDeg = Math.round(currentDeg * 10) / 10;
      if (Math.abs(roundedDeg - lastDegReported) >= 0.5) {
        lastDegReported = roundedDeg;
        if (onAngleUpdateRef.current) onAngleUpdateRef.current(roundedDeg);
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controls.removeEventListener('start', onStartInteraction);
      controls.dispose();
      pmremGenerator.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []); // Run ONLY once on mount!

  // ─── 2. LOAD 3D VEHICLE GLB MODEL (WITH IN-MEMORY CACHE) ───
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;

    let isMounted = true;

    const setupModel = (gltf) => {
      if (!isMounted || !sceneRef.current) return;

      if (modelRootRef.current) {
        sceneRef.current.remove(modelRootRef.current);
        modelRootRef.current = null;
      }

      // Clone scene for multiple instantiations if needed
      const model = gltf.scene.clone(true);

      const isNinjaH2R = (vehicleName || '').toLowerCase().includes('ninja') ||
        (modelUrl || '').includes('ninja_h2r');

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Smooth out vertex normals for realistic curved automotive surfaces
          if (child.geometry) {
            try {
              if (!child.geometry.attributes.normal || child.geometry.attributes.position.count < 8000) {
                child.geometry.computeVertexNormals();
              }
            } catch (e) {
              // Graceful fallback
            }
          }

          if (child.material) {
            // Clone materials before applying overrides to prevent mutating shared cached glTF
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => (m && typeof m.clone === 'function' ? m.clone() : m));
            } else if (child.material && typeof child.material.clone === 'function') {
              child.material = child.material.clone();
            }

            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (!mat) return;
              mat.envMapIntensity = 1.0;

              if (isNinjaH2R) {
                const matName = mat.name || '';

                // 1. Kawasaki Candy Lime Green Trellis Frame (Vt_Liu.006 - Object_74, Object_90, Object_97)
                // Real Ninja H2R: Vibrant electric candy lime green with high-gloss lacquer matching reference photo
                if (matName === 'Vt_Liu.006') {
                  mat.color = new THREE.Color(0x00e620);
                  mat.emissive = new THREE.Color(0x002804); // Saturated green inner radiance for deep shadow clarity
                  mat.metalness = 0.35;
                  mat.roughness = 0.12;
                }
                // 2. Main Bodywork Fairings & Cowling (Vt_Liu.001 - Object_81 main shell, Object_56, Object_20)
                // Real Ninja H2R: Dark Graphite Metallic Mirror Coat
                else if (matName === 'Vt_Liu.001') {
                  mat.color = new THREE.Color(0x1a1d21);
                  mat.metalness = 0.92;
                  mat.roughness = 0.16;
                }
                // 3. Fuel Tank (Vt_Liu.018 - Object_92)
                // Real Ninja H2R: Mirror Dark Smoke Liquid Chrome
                else if (matName === 'Vt_Liu.018') {
                  mat.color = new THREE.Color(0x22262a);
                  mat.metalness = 0.92;
                  mat.roughness = 0.12;
                }
                // 4. Exhaust Muffler Silencer Canister (Vt_Liu - Object_44)
                // Real Ninja H2R: Brushed Stainless Steel Canister
                else if (matName === 'Vt_Liu') {
                  mat.color = new THREE.Color(0xbcc2c7);
                  mat.metalness = 0.92;
                  mat.roughness = 0.22;
                }
                // 5. Exhaust Pipes, Headers & Collector (Vt_Liu.002 - Object_67, Object_72)
                // Real Ninja H2R: Heated Titanium / Stainless Steel Pipes
                else if (matName === 'Vt_Liu.002') {
                  mat.color = new THREE.Color(0xcfc5b4);
                  mat.metalness = 0.92;
                  mat.roughness = 0.18;
                }
                // 6. Tires (Vt_Liu.005 - Object_41 & Object_47)
                // Real Ninja H2R: Deep matte charcoal black vulcanized rubber
                else if (matName === 'Vt_Liu.005') {
                  mat.color = new THREE.Color(0x121314);
                  mat.metalness = 0.0;
                  mat.roughness = 0.96;
                }
                // 7. Wheels / 5-Spoke Star Rims (Vt_Liu.004 - Object_53 & Object_59)
                // Real Ninja H2R: Metallic satin black star wheels
                else if (matName === 'Vt_Liu.004') {
                  mat.color = new THREE.Color(0x15171a);
                  mat.metalness = 0.88;
                  mat.roughness = 0.18;
                }
                // 8. Swingarm, Rear Subframe & Inner Plastics (Vt_Liu.011 - Object_84)
                // Real Ninja H2R: Satin Gunmetal Black
                else if (matName === 'Vt_Liu.011') {
                  mat.color = new THREE.Color(0x1c1e22);
                  mat.metalness = 0.70;
                  mat.roughness = 0.35;
                }
                // 9. Front Forks (Vt_Liu.007 - Object_88)
                // Real Ninja H2R: Titanium Inverted Stanchions
                else if (matName === 'Vt_Liu.007') {
                  mat.color = new THREE.Color(0xc4c9ce);
                  mat.metalness = 0.95;
                  mat.roughness = 0.15;
                }
                // 10. Brake Discs & Caliper Rotors (Vt_Liu.009 - Object_35)
                // Real Ninja H2R: Drilled stainless steel floating rotors
                else if (matName === 'Vt_Liu.009') {
                  mat.color = new THREE.Color(0xd0d5da);
                  mat.metalness = 0.95;
                  mat.roughness = 0.18;
                }
                // 11. Windscreen & Headlight Screen (Vt_Liu.015 - Object_38, Object_76)
                // Real Ninja H2R: Smoked dark transparent acrylic glass
                else if (matName === 'Vt_Liu.015') {
                  mat.transparent = true;
                  mat.opacity = 0.38;
                  mat.color = new THREE.Color(0x0c1016);
                  mat.roughness = 0.05;
                  mat.metalness = 0.10;
                }
                // 12. Front Chin Spoiler & Fangs (Vt_Liu.019 - Object_50)
                // Real Ninja H2R: Carbon black chin spoiler
                else if (matName === 'Vt_Liu.019') {
                  mat.color = new THREE.Color(0x141517);
                  mat.metalness = 0.70;
                  mat.roughness = 0.22;
                }
                // 13. Aerodynamic Winglets & Stalks (Vt_Liu.008 - Object_17, Object_23)
                // Real Ninja H2R: Carbon fiber downforce wings
                else if (matName === 'Vt_Liu.008') {
                  mat.color = new THREE.Color(0x16181b);
                  mat.metalness = 0.75;
                  mat.roughness = 0.20;
                }
                // 14. Nose Lip / Upper Air Splitter (Vt_Liu.021 - Object_14)
                // Real Ninja H2R: Dark graphite nose matching main fairings
                else if (matName === 'Vt_Liu.021') {
                  mat.color = new THREE.Color(0x23272c);
                  mat.metalness = 0.92;
                  mat.roughness = 0.16;
                }
                // 15. Ram-Air Intake Mesh & Cavity (Mesh_0153.rip__0 - Object_8, Object_11, Object_26)
                // Real Ninja H2R: Dark aggressive aerodynamic intake cavern
                else if (matName.includes('Mesh_0153') || matName.includes('rip')) {
                  mat.color = new THREE.Color(0x0d0f12);
                  mat.roughness = 0.60;
                  mat.metalness = 0.15;
                }
                // 16. Engine Castings, Crankcase, Sump & Transmission
                // (Vt_Liu.010, Vt_Liu.016, Vt_Liu.012, Vt_Liu.003, Vt_Liu.013, Vt_Liu.020)
                else {
                  mat.color = new THREE.Color(0x202226);
                  mat.metalness = 0.80;
                  mat.roughness = 0.32;
                }
              } else {
                // Models like motorcycle.glb with untextured / white default mesh
                if (mat.color && mat.color.r === 1 && mat.color.g === 1 && mat.color.b === 1 && !mat.map) {
                  mat.color = new THREE.Color(0x1c1e22);
                  mat.metalness = 0.82;
                  mat.roughness = 0.24;
                } else {
                  if (mat.metalness > 0.88) {
                    mat.metalness = 0.82;
                  }
                  if (mat.roughness !== undefined) {
                    mat.roughness = Math.min(Math.max(mat.roughness, 0.12), 0.85);
                  }
                }
              }
              mat.needsUpdate = true;
            });
          }
        }
      });

      // Compute Bounding Box
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const targetDim = vehicleType === 'car' ? 3.6 : 3.0;
      const scaleFactor = targetDim / (maxDim || 1);
      model.scale.setScalar(scaleFactor);

      // Center model and align wheels with showroom turntable floor (Y = 0)
      model.position.x = -center.x * scaleFactor;
      model.position.y = -box.min.y * scaleFactor;
      model.position.z = -center.z * scaleFactor;

      const modelRoot = new THREE.Group();
      modelRoot.add(model);
      modelRootRef.current = modelRoot;
      sceneRef.current.add(modelRoot);

      const visualCenterY = (size.y * scaleFactor) * 0.45;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, visualCenterY, 0);

        const fitDist = targetDim * 1.35;
        initialDistanceRef.current = fitDist;

        controlsRef.current.minDistance = fitDist * 0.55;
        controlsRef.current.maxDistance = fitDist * 2.3;

        if (cameraRef.current) {
          const frontRad = THREE.MathUtils.degToRad(frontOffsetDegRef.current || 0);
          const initAzimuth = frontRad + THREE.MathUtils.degToRad(35);
          const initPolar = THREE.MathUtils.degToRad(68);
          cameraRef.current.position.set(
            fitDist * Math.sin(initPolar) * Math.sin(initAzimuth),
            visualCenterY + fitDist * Math.cos(initPolar),
            fitDist * Math.sin(initPolar) * Math.cos(initAzimuth)
          );
          cameraRef.current.lookAt(0, visualCenterY, 0);
        }
        controlsRef.current.update();
      }

      setIsLoading(false);
      setLoadingProgress(100);
    };

    if (gltfCache.has(modelUrl)) {
      setupModel(gltfCache.get(modelUrl));
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setLoadingProgress(15);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      modelUrl,
      (gltf) => {
        dracoLoader.dispose();
        gltfCache.set(modelUrl, gltf);
        setupModel(gltf);
      },
      (xhr) => {
        if (!isMounted) return;
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadingProgress(pct);
        } else {
          setLoadingProgress((p) => Math.min(p + 20, 95));
        }
      },
      (error) => {
        if (!isMounted) return;
        console.error('Failed to load 3D vehicle model:', error);
        setIsLoading(false);
        setLoadError(`Unable to load 3D model: ${error.message || 'Network / asset error'}`);
        if (onErrorRef.current) onErrorRef.current(error);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [modelUrl, vehicleType, vehicleName]);

  // ─── 3. SYNC AUTO-SPIN CONTROL ───
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoSpinning;
      controlsRef.current.autoRotateSpeed = 2.4; // Smooth ~25°/sec turntable spin
    }
  }, [isAutoSpinning]);

  // ─── 4. CARDINAL ANGLE TWEENING (FRONT 0°, SIDE 90°, REAR 180°, LEFT 270°) ───
  useEffect(() => {
    if (targetPresetDeg === null || !controlsRef.current) return;

    const frontRad = THREE.MathUtils.degToRad(frontOffsetDegRef.current || 0);
    const targetRad = frontRad + THREE.MathUtils.degToRad(targetPresetDeg);
    const currentAzimuth = controlsRef.current.getAzimuthalAngle();

    let diff = (targetRad - currentAzimuth) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;

    tweenRef.current = {
      startAzimuth: currentAzimuth,
      targetAzimuth: currentAzimuth + diff,
      progress: 0
    };
  }, [targetPresetDeg]);

  // ─── 5. ZOOM ADJUSTMENT ───
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const baseDist = initialDistanceRef.current;
    const targetDist = baseDist / zoomLevel;

    const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
    if (Math.abs(currentDist - targetDist) > 0.05) {
      const dir = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target).normalize();
      cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, targetDist);
      controlsRef.current.update();
    }
  }, [zoomLevel]);

  return (
    <div
      className="position-relative w-100 h-100 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className="w-100 h-100"
        style={{ cursor: isLoading ? 'wait' : 'grab' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 20
          }}
        >
          <div className="text-center p-3">
            <Loader2 size={36} className="text-warning spin-anim mb-2 mx-auto" />
            <h6 className="fw-bold text-dark mb-1">Loading 3D Model...</h6>
            <p className="text-muted text-xs mb-2">{vehicleName} Studio Geometry</p>

            <div
              className="progress mx-auto"
              style={{ width: '160px', height: '6px', borderRadius: '10px' }}
            >
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{
                  width: `${loadingProgress}%`,
                  transition: 'width 0.2s ease',
                  background: 'linear-gradient(90deg, #FF6333 0%, #FF8A00 100%)'
                }}
              />
            </div>
            <span className="text-xxs text-muted mt-1 d-block font-monospace">
              {loadingProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {loadError && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center"
          style={{ background: '#FFF7ED', zIndex: 22 }}
        >
          <AlertCircle size={36} className="text-warning mb-2" />
          <h6 className="fw-bold text-dark mb-1">3D Model Rendering Notice</h6>
          <p className="text-muted text-xs mb-3" style={{ maxWidth: '380px' }}>
            {loadError}
          </p>
        </div>
      )}
    </div>
  );
}
