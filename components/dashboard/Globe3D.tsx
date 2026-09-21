'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TleRecord, ObserverLocation } from '@/lib/types';
import {
  GLOBE_RADIUS,
  latLngAltToVector3,
  computeOrbitPath3D,
  computeGroundTrack3D,
  getLiveSatelliteState,
  getSunVector3,
  createProceduralEarthCanvas,
} from '@/lib/globe-utils';
import {
  RotateCcw,
  Eye,
  Plus,
  Minus,
  Layers,
  Crosshair,
  Satellite as SatIcon,
} from 'lucide-react';

interface Globe3DProps {
  selectedSat: TleRecord | null;
  observerLocation: ObserverLocation;
  onSelectSatellite?: (sat: TleRecord) => void;
}

export default function Globe3D({
  selectedSat,
  observerLocation,
}: Globe3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Scene object references for dynamic updates
  const orbitLineRef = useRef<THREE.Line | null>(null);
  const groundTrackLineRef = useRef<THREE.Line | null>(null);
  const satMeshRef = useRef<THREE.Group | null>(null);
  const userPinRef = useRef<THREE.Group | null>(null);
  const losLineRef = useRef<THREE.Line | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Layer toggle states
  const [showOrbit, setShowOrbit] = useState(true);
  const [showGroundTrack, setShowGroundTrack] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [isFollowingSat, setIsFollowingSat] = useState(false);
  const [liveInfo, setLiveInfo] = useState<{
    alt: number;
    vel: number;
    lat: number;
    lng: number;
  } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.5, 6.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.2;
    controls.maxDistance = 15;
    controls.rotateSpeed = 0.7;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    const sunDir = getSunVector3(new Date());
    sunLight.position.copy(sunDir.multiplyScalar(15));
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Subtle blue fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-sunLight.position.x, -sunLight.position.y, -sunLight.position.z);
    scene.add(fillLight);

    // 1. Earth Sphere
    const earthCanvas = createProceduralEarthCanvas();
    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.85,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // 2. Atmosphere Outer Glow
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.025, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    atmosMesh.name = 'atmosphere';
    scene.add(atmosMesh);

    // 3. User Location Pin
    const pinGroup = new THREE.Group();
    // Pin shaft/cone
    const pinGeo = new THREE.ConeGeometry(0.04, 0.18, 16);
    pinGeo.rotateX(Math.PI); // Point downwards to ground
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.y = 0.09;
    pinGroup.add(pinMesh);

    // Pin head sphere
    const headGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 0.18;
    pinGroup.add(headMesh);

    // Pulsing beacon ring on surface
    const beaconGeo = new THREE.RingGeometry(0.06, 0.12, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.rotation.x = Math.PI / 2;
    pinGroup.add(beaconMesh);

    scene.add(pinGroup);
    userPinRef.current = pinGroup;

    // 4. Satellite 3D Marker Group
    const satGroup = new THREE.Group();
    // Glowing central core
    const coreGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    satGroup.add(coreMesh);

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(0.24, 0.015, 0.06);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    satGroup.add(panelMesh);

    // Pulsing radar ring
    const ringGeo = new THREE.RingGeometry(0.09, 0.14, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    satGroup.add(ringMesh);

    scene.add(satGroup);
    satMeshRef.current = satGroup;

    // 5. Starfield Background
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 40 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.cos(phi);
      starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let pulseAngle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      controls.update();

      // Animate pulsing radar ring on satellite
      pulseAngle += 0.04;
      const ringScale = 1 + Math.sin(pulseAngle) * 0.35;
      ringMesh.scale.set(ringScale, ringScale, ringScale);
      ringMat.opacity = 0.7 - (ringScale - 0.65) * 0.5;

      // Animate observer beacon
      beaconMesh.scale.set(ringScale, ringScale, ringScale);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // Update Observer Location Pin Position
  useEffect(() => {
    if (!userPinRef.current) return;
    const pinPos = latLngAltToVector3(
      observerLocation.latitude,
      observerLocation.longitude,
      0,
      GLOBE_RADIUS,
    );
    userPinRef.current.position.copy(pinPos);

    // Orient pin perpendicular to Earth's surface
    userPinRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      pinPos.clone().normalize(),
    );
  }, [observerLocation]);

  // Update Orbit Spline & Ground Track whenever Selected Satellite changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !selectedSat) return;

    // Remove old orbit line
    if (orbitLineRef.current) {
      scene.remove(orbitLineRef.current);
      orbitLineRef.current.geometry.dispose();
      (orbitLineRef.current.material as THREE.Material).dispose();
      orbitLineRef.current = null;
    }

    // Remove old ground track
    if (groundTrackLineRef.current) {
      scene.remove(groundTrackLineRef.current);
      groundTrackLineRef.current.geometry.dispose();
      (groundTrackLineRef.current.material as THREE.Material).dispose();
      groundTrackLineRef.current = null;
    }

    // 1. Build Orbit Spline
    const orbitPoints = computeOrbitPath3D(selectedSat, 360);
    if (orbitPoints.length > 1) {
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        linewidth: 2,
        transparent: true,
        opacity: showOrbit ? 0.85 : 0,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      scene.add(orbitLine);
      orbitLineRef.current = orbitLine;
    }

    // 2. Build Ground Track Line
    const groundPoints = computeGroundTrack3D(selectedSat, 180);
    if (groundPoints.length > 1) {
      const groundGeo = new THREE.BufferGeometry().setFromPoints(groundPoints);
      const groundMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 1,
        transparent: true,
        opacity: showGroundTrack ? 0.45 : 0,
      });
      const groundLine = new THREE.Line(groundGeo, groundMat);
      scene.add(groundLine);
      groundTrackLineRef.current = groundLine;
    }
  }, [selectedSat, showOrbit, showGroundTrack]);

  // Real-Time Position Ticker (1 Hz update for live position & LOS)
  useEffect(() => {
    if (!selectedSat) return;

    const updateLivePosition = () => {
      const now = new Date();
      const state = getLiveSatelliteState(selectedSat, now);
      if (!state) return;

      setLiveInfo({
        alt: Math.round(state.alt),
        vel: parseFloat(state.velocityKmS.toFixed(2)),
        lat: parseFloat(state.lat.toFixed(2)),
        lng: parseFloat(state.lng.toFixed(2)),
      });

      // Update 3D Satellite Mesh Position
      if (satMeshRef.current) {
        satMeshRef.current.position.copy(state.position3D);
        // Point panels perpendicular to Earth
        satMeshRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          state.position3D.clone().normalize(),
        );
      }

      // Update Line of Sight (LOS) Vector
      const scene = sceneRef.current;
      if (scene) {
        if (losLineRef.current) {
          scene.remove(losLineRef.current);
          losLineRef.current.geometry.dispose();
          (losLineRef.current.material as THREE.Material).dispose();
          losLineRef.current = null;
        }

        const obsPos = latLngAltToVector3(
          observerLocation.latitude,
          observerLocation.longitude,
          0,
          GLOBE_RADIUS,
        );

        // Check if line of sight is above horizon (dot product with observer normal > 0)
        const obsNormal = obsPos.clone().normalize();
        const toSat = state.position3D.clone().sub(obsPos);
        const isAboveHorizon = toSat.clone().normalize().dot(obsNormal) > 0.1;

        if (isAboveHorizon) {
          const losGeo = new THREE.BufferGeometry().setFromPoints([
            obsPos,
            state.position3D,
          ]);
          const losMat = new THREE.LineDashedMaterial({
            color: 0x10b981,
            dashSize: 0.1,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.75,
          });
          const losLine = new THREE.Line(losGeo, losMat);
          losLine.computeLineDistances();
          scene.add(losLine);
          losLineRef.current = losLine;
        }
      }

      // Smooth Follow Satellite camera if enabled
      if (isFollowingSat && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.lerp(state.position3D, 0.1);
      }
    };

    updateLivePosition();
    const interval = setInterval(updateLivePosition, 1000);
    return () => clearInterval(interval);
  }, [selectedSat, observerLocation, isFollowingSat]);

  // Atmosphere visibility toggle
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const atmos = scene.getObjectByName('atmosphere');
    if (atmos) {
      atmos.visible = showAtmosphere;
    }
  }, [showAtmosphere]);

  // Camera Control Actions
  const handleZoomIn = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const dir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(dir);
    cameraRef.current.position.addScaledVector(dir, 0.8);
    controlsRef.current.update();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const dir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(dir);
    cameraRef.current.position.addScaledVector(dir, -0.8);
    controlsRef.current.update();
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    cameraRef.current.position.set(0, 3.5, 6.5);
    controlsRef.current.update();
    setIsFollowingSat(false);
  }, []);

  const handleCenterObserver = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const obsPos = latLngAltToVector3(
      observerLocation.latitude,
      observerLocation.longitude,
      0,
      GLOBE_RADIUS,
    );
    const cameraTarget = obsPos.clone().multiplyScalar(2.2);
    cameraRef.current.position.copy(cameraTarget);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [observerLocation]);

  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[560px] bg-[#050811] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing flex-1" />

      {/* Top Left HUD: Active Tracking Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#0b1222]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 flex items-center gap-2.5 shadow-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold">
              3D ORBIT TRACKER
            </div>
            <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              <SatIcon className="w-3.5 h-3.5 text-cyan-400" />
              {selectedSat?.name || 'Selecting Satellite...'}
            </div>
          </div>
        </div>

        {liveInfo && (
          <div className="bg-[#0b1222]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-gray-300 flex items-center gap-3">
            <span>
              ALT <strong className="text-cyan-400">{liveInfo.alt} km</strong>
            </span>
            <span>
              VEL <strong className="text-emerald-400">{liveInfo.vel} km/s</strong>
            </span>
            <span>
              POS{' '}
              <strong className="text-gray-200">
                {liveInfo.lat}°{liveInfo.lat >= 0 ? 'N' : 'S'}, {Math.abs(liveInfo.lng)}°
                {liveInfo.lng >= 0 ? 'E' : 'W'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Top Right HUD: Camera & View Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-[#0b1222]/85 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
        <button
          onClick={handleCenterObserver}
          title="Center on Observer Location"
          className="p-2 rounded-lg text-gray-300 hover:text-emerald-400 hover:bg-white/10 transition-colors"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsFollowingSat(!isFollowingSat)}
          title={isFollowingSat ? 'Unfollow Satellite' : 'Follow Satellite'}
          className={`p-2 rounded-lg transition-colors ${
            isFollowingSat
              ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/40'
              : 'text-gray-300 hover:text-cyan-400 hover:bg-white/10'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          title="Reset Camera View"
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/15 mx-0.5" />
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left HUD: Layer Toggles */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-[#0b1222]/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg text-xs">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <button
            onClick={() => setShowOrbit(!showOrbit)}
            className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
              showOrbit
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Orbit
          </button>
          <button
            onClick={() => setShowGroundTrack(!showGroundTrack)}
            className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
              showGroundTrack
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Track
          </button>
          <button
            onClick={() => setShowAtmosphere(!showAtmosphere)}
            className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
              showAtmosphere
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Glow
          </button>
        </div>
      </div>

      {/* Bottom Right HUD: Observer Geolocation Badge */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-[#0b1222]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 text-[11px] font-mono text-gray-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            OBSERVE:{' '}
            <strong className="text-emerald-300">
              {observerLocation.latitude.toFixed(2)}°N, {observerLocation.longitude.toFixed(2)}°E
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
