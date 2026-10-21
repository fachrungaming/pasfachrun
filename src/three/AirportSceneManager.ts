/**
 * Three.js 3D Digital Twin Engine for Airport IP Public Address System
 * Features:
 * - Full architectural BIM model of Airport Terminal Complex (5 Macro Zones)
 * - Procedural terminal concourses, jet bridges, airliners, baggage carousels, car park & tower
 * - Distributed IP speaker nodes with live status, pilot tone monitoring & wattage telemetry
 * - Dynamic sound wave propagation ripples from active broadcasting zones
 * - Toggleable Acoustic STI-PA / SPL Heatmap overlay
 * - Redundant RSTP 20kHz pilot tone cable network topology
 * - Phased Emergency evacuation routing visualizer
 * - Interactive raycasting zone/speaker selection & smooth camera transitions
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MacroZone, IPSpeaker, ZoneId } from '../types/pa-system';
import { EmergencyScenario } from '../types/simulation';

// Module-scope reusable math objects to prevent GC in render loop
const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _color = new THREE.Color();

export type VisualizerMode = 'bim_normal' | 'stipa_heatmap' | 'spl_noise' | 'cable_rstp';
export type CameraPresetType =
  | 'overview'
  | 'dom_all'
  | 'dom_dep'
  | 'dom_arr'
  | 'intl_all'
  | 'intl_dep'
  | 'intl_arr'
  | 'parking'
  | 'tower';

export interface AirportSceneCallbacks {
  onSelectZone: (zoneId: ZoneId | null) => void;
  onSelectSpeaker: (speaker: IPSpeaker | null) => void;
}

export class AirportSceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Data references
  private macroZones: MacroZone[];
  private speakers: IPSpeaker[];
  private callbacks: AirportSceneCallbacks;

  // 3D Interactive Objects
  private zoneMeshes: Map<ZoneId, THREE.Mesh[]> = new Map();
  private speakerMeshes: Map<string, THREE.Group> = new Map();
  private soundWaveRings: THREE.Mesh[] = [];
  private cableLinesGroup: THREE.Group = new THREE.Group();
  private evacuationPathGroup: THREE.Group = new THREE.Group();
  private heatmapMesh: THREE.Mesh | null = null;
  private radarDome: THREE.Mesh | null = null;

  // Theme & Lighting References
  private tarmacMat: THREE.MeshStandardMaterial | null = null;
  private plinthMat: THREE.MeshStandardMaterial | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private currentTheme: 'dark' | 'light' = 'dark';

  // Emergency Scenario Simulation 3D Objects
  private simulationIncidentGroup: THREE.Group = new THREE.Group();
  private simBeaconRings: THREE.Mesh[] = [];
  private simLightPillar: THREE.Mesh | null = null;
  private simEgressRoute: THREE.Mesh | null = null;
  private isSimulationActive: boolean = false;
  private activeSimZoneIds: Set<ZoneId> = new Set();
  private primarySimZoneId: ZoneId | null = null;

  // State
  private visualizerMode: VisualizerMode = 'bim_normal';
  private selectedZoneId: ZoneId | null = null;
  private selectedSpeakerId: string | null = null;
  private targetCameraPos: THREE.Vector3 | null = null;
  private targetControlsTarget: THREE.Vector3 | null = null;
  private isEmergencyActive: boolean = false;
  private activeBroadcastingZones: Set<ZoneId> = new Set();

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();
  private interactableObjects: THREE.Object3D[] = [];

  constructor(
    container: HTMLElement,
    macroZones: MacroZone[],
    speakers: IPSpeaker[],
    callbacks: AirportSceneCallbacks
  ) {
    this.container = container;
    this.macroZones = macroZones;
    this.speakers = speakers;
    this.callbacks = callbacks;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d); // Deep avionics navy
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0065);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 600);
    this.camera.position.set(0, 75, 110);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Lighting (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Directional, Ambient and Accent Lighting
    this.setupLighting();

    // 6. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera dipping below apron ground
    this.controls.minDistance = 10;
    this.controls.maxDistance = 250;
    this.controls.target.set(0, 0, 0);

    // Cancel camera glide if operator manually rotates/pans/zooms
    this.controls.addEventListener('start', () => {
      this.targetCameraPos = null;
      this.targetControlsTarget = null;
    });

    // 7. Build Procedural Airport Complex & Systems
    this.buildGroundAndRunway();
    this.buildTerminalBuildings();
    this.buildControlTower();
    this.buildParkedAircraft();
    this.buildCarParkComplex();
    this.buildSpeakerNodes();
    this.buildCableRoutes();
    this.buildHeatmapMesh();
    this.buildEvacuationPaths();
    this.scene.add(this.simulationIncidentGroup);

    // 8. Event listeners
    this.handleResize = this.handleResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);

    // 9. Prewarm & start render loop
    this.renderer.compile(this.scene, this.camera);
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting() {
    // Key Sun Light (Warm airport morning sun)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(70, 100, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 300;
    const d = 90;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    // Fill Light (Cool sky / blue ambient fill)
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // Terminal Interior Lighting glow
    const interiorLight1 = new THREE.PointLight(0x60a5fa, 2.0, 80);
    interiorLight1.position.set(-35, 6, 15);
    this.scene.add(interiorLight1);

    const interiorLight2 = new THREE.PointLight(0xa78bfa, 2.0, 80);
    interiorLight2.position.set(35, 6, 15);
    this.scene.add(interiorLight2);
  }

  /**
   * Apron, Ground, Runway Markings, and Service Roads
   */
  private buildGroundAndRunway() {
    const groundGroup = new THREE.Group();

    // Main apron tarmac
    const tarmacGeo = new THREE.PlaneGeometry(240, 200);
    const tarmacMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Dark asphalt
      roughness: 0.88,
      metalness: 0.1,
    });
    this.tarmacMat = tarmacMat;
    const tarmac = new THREE.Mesh(tarmacGeo, tarmacMat);
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.receiveShadow = true;
    groundGroup.add(tarmac);

    // Terminal Foundation Plinth
    const plinthGeo = new THREE.BoxGeometry(160, 0.4, 110);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.75,
      metalness: 0.2,
    });
    this.plinthMat = plinthMat;
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(0, 0.2, -5);
    plinth.receiveShadow = true;
    groundGroup.add(plinth);

    // Runway / Taxiway line markings (Yellow & White guide lines)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let x = -70; x <= 70; x += 35) {
      const lineGeo = new THREE.PlaneGeometry(0.6, 50);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.42, 55);
      groundGroup.add(line);
    }

    // Aircraft Gate Stop Markings (T-bars at Gates 1 - 12)
    const gatePositions = [
      [-52, 42], [-42, 42], [-32, 42], [-22, 42], [-14, 42],
      [18, 42], [26, 42], [34, 42], [42, 42], [50, 42]
    ];
    gatePositions.forEach(([gx, gz], idx) => {
      const tBarGeo = new THREE.BoxGeometry(4, 0.05, 0.8);
      const tBar = new THREE.Mesh(tBarGeo, lineMat);
      tBar.position.set(gx, 0.43, gz);
      groundGroup.add(tBar);
    });

    this.scene.add(groundGroup);
  }

  /**
   * Terminal Concourse Buildings:
   * Curved aerodynamic BIM glass roof, check-in islands, gate holdrooms, and piers
   */
  private buildTerminalBuildings() {
    const terminalGroup = new THREE.Group();

    // 1. Domestic Terminal Block (Macro 1 & 2: Departure & Arrival)
    const domHall = this.createTerminalWing(
      'macro-1',
      'macro-2',
      -35,
      0.4,
      0,
      50,
      8.5,
      70,
      0x38bdf8,
      0x34d399
    );
    terminalGroup.add(domHall);

    // 2. Central Nexus Concourse (Atrium connection & security arch)
    const centralGeo = new THREE.BoxGeometry(22, 10, 45);
    const centralMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.6,
      clearcoat: 0.4,
    });
    const centralNexus = new THREE.Mesh(centralGeo, centralMat);
    centralNexus.position.set(0, 5.4, 0);
    centralNexus.castShadow = true;
    centralNexus.receiveShadow = true;
    terminalGroup.add(centralNexus);

    // Central Glass Skylight Dome
    const skylightGeo = new THREE.CylinderGeometry(7, 9, 3, 16);
    const skylightMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
    });
    const skylight = new THREE.Mesh(skylightGeo, skylightMat);
    skylight.position.set(0, 11, 0);
    terminalGroup.add(skylight);

    // 3. International Terminal Block (Macro 3 & 4: Departure & Arrival)
    const intlHall = this.createTerminalWing(
      'macro-3',
      'macro-4',
      35,
      0.4,
      0,
      50,
      8.5,
      70,
      0x818cf8,
      0xa78bfa
    );
    terminalGroup.add(intlHall);

    // 4. Passenger Boarding Bridges (Jet Bridges extending from Gates)
    const jetBridgePositions = [
      [-52, 36], [-42, 36], [-32, 36], [-22, 36],
      [26, 36], [34, 36], [42, 36], [50, 36]
    ];

    const jetMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.3,
    });

    jetBridgePositions.forEach(([jx, jz]) => {
      const bridgeGroup = new THREE.Group();
      // Tunnel tube
      const tunnelGeo = new THREE.BoxGeometry(2.2, 2.6, 9);
      const tunnel = new THREE.Mesh(tunnelGeo, jetMat);
      tunnel.position.set(0, 4.0, 4.5);
      tunnel.castShadow = true;
      bridgeGroup.add(tunnel);

      // Support pylon
      const pylonGeo = new THREE.CylinderGeometry(0.3, 0.3, 4);
      const pylon = new THREE.Mesh(pylonGeo, jetMat);
      pylon.position.set(0, 2.0, 7);
      bridgeGroup.add(pylon);

      // Rotunda entrance
      const rotundaGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.2, 12);
      const rotunda = new THREE.Mesh(rotundaGeo, jetMat);
      rotunda.position.set(0, 4.0, 9);
      rotunda.castShadow = true;
      bridgeGroup.add(rotunda);

      bridgeGroup.position.set(jx, 0, jz);
      terminalGroup.add(bridgeGroup);
    });

    this.scene.add(terminalGroup);
  }

  /**
   * Helper to build a terminal wing with layered Departure (Top) and Arrival (Lower)
   */
  private createTerminalWing(
    depZoneId: ZoneId,
    arrZoneId: ZoneId,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    depColorHex: number,
    arrColorHex: number
  ): THREE.Group {
    const wing = new THREE.Group();
    wing.position.set(x, y, z);

    // Aerodynamic Curved Roof (Departure level above)
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w / 2, 0);
    roofShape.quadraticCurveTo(0, h * 0.35, w / 2, 0);
    roofShape.lineTo(w / 2, -0.6);
    roofShape.quadraticCurveTo(0, h * 0.35 - 0.6, -w / 2, -0.6);
    roofShape.closePath();

    const extrudeSettings = {
      depth: d,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.5,
      bevelThickness: 0.5,
    };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roofMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155, // Architectural zinc-slate
      metalness: 0.65,
      roughness: 0.28,
      clearcoat: 0.5,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, h, -d / 2);
    roof.castShadow = true;
    wing.add(roof);

    // Departure Hall Interactive Volume (Z > 0 side)
    const depGeo = new THREE.BoxGeometry(w - 2, h / 2, d / 2 - 2);
    const depMat = new THREE.MeshPhysicalMaterial({
      color: depColorHex,
      roughness: 0.3,
      metalness: 0.2,
      transmission: 0.6,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const depMesh = new THREE.Mesh(depGeo, depMat);
    depMesh.position.set(0, (h * 3) / 4, d / 4);
    depMesh.userData = { type: 'zone', zoneId: depZoneId };
    depMesh.castShadow = true;
    depMesh.receiveShadow = true;
    wing.add(depMesh);

    // Arrival Hall Interactive Volume (Z < 0 side)
    const arrGeo = new THREE.BoxGeometry(w - 2, h / 2, d / 2 - 2);
    const arrMat = new THREE.MeshPhysicalMaterial({
      color: arrColorHex,
      roughness: 0.3,
      metalness: 0.2,
      transmission: 0.6,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const arrMesh = new THREE.Mesh(arrGeo, arrMat);
    arrMesh.position.set(0, h / 4, -d / 4);
    arrMesh.userData = { type: 'zone', zoneId: arrZoneId };
    arrMesh.castShadow = true;
    arrMesh.receiveShadow = true;
    wing.add(arrMesh);

    // Register interactive zone meshes
    this.zoneMeshes.set(depZoneId, [depMesh]);
    this.zoneMeshes.set(arrZoneId, [arrMesh]);
    this.interactableObjects.push(depMesh, arrMesh);

    // Glass Curtain Wall Facade framing
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transmission: 0.88,
      opacity: 0.3,
      transparent: true,
      roughness: 0.05,
      metalness: 0.1,
      ior: 1.52,
    });
    const glassFacadeGeo = new THREE.BoxGeometry(w - 0.5, h, 0.4);
    const frontGlass = new THREE.Mesh(glassFacadeGeo, glassMat);
    frontGlass.position.set(0, h / 2, d / 2);
    wing.add(frontGlass);

    // Structural steel mullion columns
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    for (let cx = -w / 2 + 5; cx <= w / 2 - 5; cx += 10) {
      const colGeo = new THREE.CylinderGeometry(0.25, 0.25, h, 8);
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, h / 2, d / 2);
      wing.add(col);
    }

    return wing;
  }

  /**
   * Airport Control Tower (ATC)
   */
  private buildControlTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-65, 0, -25);

    // Tower base plinth
    const baseGeo = new THREE.CylinderGeometry(5, 6, 4, 16);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, towerMat);
    base.position.y = 2;
    towerGroup.add(base);

    // Tower main structural shaft
    const shaftGeo = new THREE.CylinderGeometry(2.8, 3.8, 38, 16);
    const shaft = new THREE.Mesh(shaftGeo, towerMat);
    shaft.position.y = 23;
    shaft.castShadow = true;
    towerGroup.add(shaft);

    // Observation Cab (Octagonal glass room)
    const cabGeo = new THREE.CylinderGeometry(6.2, 4.2, 5, 12);
    const cabGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.9,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
    });
    const cab = new THREE.Mesh(cabGeo, cabGlassMat);
    cab.position.y = 43;
    cab.castShadow = true;
    towerGroup.add(cab);

    // Cab roof
    const cabRoofGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.8, 12);
    const cabRoof = new THREE.Mesh(cabRoofGeo, towerMat);
    cabRoof.position.y = 45.8;
    towerGroup.add(cabRoof);

    // Rotating Radar Dome Antenna
    const domeGeo = new THREE.SphereGeometry(1.4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    this.radarDome = new THREE.Mesh(domeGeo, domeMat);
    this.radarDome.position.y = 46.5;
    towerGroup.add(this.radarDome);

    this.scene.add(towerGroup);
  }

  /**
   * Procedural Airliners Parked at Jet Bridges
   */
  private buildParkedAircraft() {
    const planesGroup = new THREE.Group();
    const planeSpots = [
      { x: -47, z: 52, heading: Math.PI, airline: 'Garuda Indonesia' },
      { x: -27, z: 52, heading: Math.PI, airline: 'Lion Air' },
      { x: 30, z: 52, heading: Math.PI, airline: 'Singapore Airlines' },
      { x: 46, z: 52, heading: Math.PI, airline: 'Emirates' },
    ];

    planeSpots.forEach((spot) => {
      const plane = this.createProceduralAirliner();
      plane.position.set(spot.x, 0.4, spot.z);
      plane.rotation.y = spot.heading;
      planesGroup.add(plane);
    });

    this.scene.add(planesGroup);
  }

  /**
   * Multi-part Procedural Commercial Jetliner (Fuselage, wings, jet engines, tailfin)
   */
  private createProceduralAirliner(): THREE.Group {
    const plane = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pearl white aircraft fuselage
      metalness: 0.4,
      roughness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Airline livery blue
      metalness: 0.3,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.8,
    });

    // 1. Fuselage
    const fuseGeo = new THREE.CylinderGeometry(1.3, 1.3, 18, 16);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.position.y = 2.4;
    fuse.castShadow = true;
    plane.add(fuse);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(1.3, 3, 16);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 2.4, 10.5);
    plane.add(nose);

    // Cockpit windows
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.5, 1.2);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 2.9, 9.6);
    cockpit.rotation.x = -0.3;
    plane.add(cockpit);

    // 2. Main Wings
    const wingGeo = new THREE.BoxGeometry(19, 0.2, 3.8);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.set(0, 2.1, 0.5);
    wings.castShadow = true;
    plane.add(wings);

    // Wingtips (Winglets)
    const wingletGeo = new THREE.BoxGeometry(0.15, 1.0, 0.8);
    const leftWinglet = new THREE.Mesh(wingletGeo, accentMat);
    leftWinglet.position.set(-9.5, 2.6, 0.5);
    plane.add(leftWinglet);

    const rightWinglet = new THREE.Mesh(wingletGeo, accentMat);
    rightWinglet.position.set(9.5, 2.6, 0.5);
    plane.add(rightWinglet);

    // 3. Jet Engines (Turbofans under each wing)
    const engineGeo = new THREE.CylinderGeometry(0.7, 0.7, 3.2, 14);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });

    const leftEngine = new THREE.Mesh(engineGeo, engineMat);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.position.set(-4.5, 1.3, 1.2);
    plane.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeo, engineMat);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.position.set(4.5, 1.3, 1.2);
    plane.add(rightEngine);

    // 4. Vertical Stabilizer (Tailfin)
    const tailGeo = new THREE.BoxGeometry(0.2, 4.2, 3.2);
    const tail = new THREE.Mesh(tailGeo, accentMat);
    tail.position.set(0, 4.2, -8.0);
    tail.rotation.x = -0.35;
    plane.add(tail);

    // Horizontal Stabilizers
    const hStabGeo = new THREE.BoxGeometry(6.5, 0.15, 1.8);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 2.7, -8.5);
    plane.add(hStab);

    // Scale to balanced airport proportions
    plane.scale.set(0.95, 0.95, 0.95);
    return plane;
  }

  /**
   * Gedung Parkir 3 Lantai & Drop-off Curbside (Macro Zone 5)
   */
  private buildCarParkComplex() {
    const parkGroup = new THREE.Group();
    parkGroup.position.set(0, 0.4, -58);

    const floorW = 85;
    const floorD = 24;
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.2,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Safety yellow barrier
      roughness: 0.4,
      metalness: 0.5,
    });

    // 3 Concrete Decks
    for (let lvl = 0; lvl < 3; lvl++) {
      const yPos = lvl * 3.5;
      const slabGeo = new THREE.BoxGeometry(floorW, 0.4, floorD);
      const slab = new THREE.Mesh(slabGeo, concreteMat);
      slab.position.y = yPos;
      slab.receiveShadow = true;
      slab.castShadow = true;
      parkGroup.add(slab);

      // Yellow safety railing around edges
      const railingGeo = new THREE.BoxGeometry(floorW, 0.8, 0.2);
      const railingFront = new THREE.Mesh(railingGeo, barrierMat);
      railingFront.position.set(0, yPos + 0.4, floorD / 2);
      parkGroup.add(railingFront);

      const railingBack = new THREE.Mesh(railingGeo, barrierMat);
      railingBack.position.set(0, yPos + 0.4, -floorD / 2);
      parkGroup.add(railingBack);

      // Support pillars
      if (lvl < 2) {
        for (let px = -floorW / 2 + 10; px <= floorW / 2 - 10; px += 18) {
          const colGeo = new THREE.CylinderGeometry(0.4, 0.4, 3.5, 8);
          const col = new THREE.Mesh(colGeo, concreteMat);
          col.position.set(px, yPos + 1.75, 0);
          col.castShadow = true;
          parkGroup.add(col);
        }
      }
    }

    // Vehicle access ramps
    const rampGeo = new THREE.BoxGeometry(10, 0.3, 14);
    const ramp1 = new THREE.Mesh(rampGeo, concreteMat);
    ramp1.position.set(-floorW / 2 + 5, 1.75, 0);
    ramp1.rotation.x = 0.25;
    parkGroup.add(ramp1);

    // Drop-Off Canopy over Curbside
    const canopyGeo = new THREE.BoxGeometry(floorW, 0.3, 8);
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      transmission: 0.6,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2,
      metalness: 0.3,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 4.5, floorD / 2 + 4);
    canopy.castShadow = true;
    parkGroup.add(canopy);

    // Interactive Zone 5 Volume Mesh
    const parkZoneGeo = new THREE.BoxGeometry(floorW + 2, 12, floorD + 10);
    const parkZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      transmission: 0.6,
      transparent: true,
      opacity: 0.5,
      roughness: 0.4,
      metalness: 0.1,
      depthWrite: false,
    });
    const parkMesh = new THREE.Mesh(parkZoneGeo, parkZoneMat);
    parkMesh.position.set(0, 6, 2);
    parkMesh.userData = { type: 'zone', zoneId: 'macro-5' };
    parkGroup.add(parkMesh);

    this.zoneMeshes.set('macro-5', [parkMesh]);
    this.interactableObjects.push(parkMesh);

    this.scene.add(parkGroup);
  }

  /**
   * IP Speaker Nodes in 3D Space
   * Distinct shapes: Ceiling Flush Loudspeakers in Terminals & PoE++ Horns in Car Park
   */
  private buildSpeakerNodes() {
    const speakerGroup = new THREE.Group();

    this.speakers.forEach((speaker) => {
      const node = new THREE.Group();
      node.position.set(...speaker.position);
      node.userData = { type: 'speaker', speakerId: speaker.id };

      const isHorn = speaker.macroZoneId === 'macro-5';

      if (isHorn) {
        // PoE++ Outdoor Horn Speaker (Weatherproof IP65 / IK10)
        const hornGeo = new THREE.ConeGeometry(0.7, 1.2, 12);
        const hornMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.6,
          roughness: 0.3,
        });
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.rotation.x = Math.PI / 2;
        node.add(horn);

        // Mounting bracket
        const bracketGeo = new THREE.BoxGeometry(0.2, 0.8, 0.4);
        const bracket = new THREE.Mesh(bracketGeo, hornMat);
        bracket.position.set(0, 0.5, -0.4);
        node.add(bracket);
      } else {
        // Architectural Flush Ceiling Speaker
        const discGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.15, 16);
        const discMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.1,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        node.add(disc);

        // Center grille
        const grilleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16);
        const grilleMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.7,
        });
        const grille = new THREE.Mesh(grilleGeo, grilleMat);
        node.add(grille);
      }

      // Telemetry Status LED Ring
      const ledRingGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 16);
      const ledColor = this.getSpeakerColor(speaker.status);
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const ledRing = new THREE.Mesh(ledRingGeo, ledMat);
      ledRing.rotation.x = Math.PI / 2;
      node.add(ledRing);

      // Acoustic Sound Propagation Pulse Ring (animated when broadcasting)
      const pulseGeo = new THREE.RingGeometry(0.8, 1.0, 24);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.rotation.x = Math.PI / 2;
      pulse.userData = { isWaveRing: true, baseScale: 1.0 };
      node.add(pulse);
      this.soundWaveRings.push(pulse);

      // Raycast collision proxy box (for easy clicking)
      const proxyGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.userData = { type: 'speaker', speakerId: speaker.id };
      node.add(proxy);

      this.speakerMeshes.set(speaker.id, node);
      this.interactableObjects.push(proxy);
      speakerGroup.add(node);
    });

    this.scene.add(speakerGroup);
  }

  private getSpeakerColor(status: IPSpeaker['status']): number {
    switch (status) {
      case 'broadcasting':
        return 0x38bdf8; // Sky blue
      case 'emergency':
        return 0xef4444; // Emergency red
      case 'pilot_fault':
        return 0xf59e0b; // Amber warning
      case 'offline':
        return 0x64748b; // Gray
      case 'online':
      default:
        return 0x10b981; // Green
    }
  }

  /**
   * Redundant RSTP 20kHz Cable Network Topology (FR-TEL-01)
   */
  private buildCableRoutes() {
    this.cableLinesGroup = new THREE.Group();

    // Central Core Switch Room at (0, 1.5, 0)
    const switchGeo = new THREE.BoxGeometry(3, 2, 2);
    const switchMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.3,
      metalness: 0.7,
    });
    const coreSwitch = new THREE.Mesh(switchGeo, switchMat);
    coreSwitch.position.set(0, 1.5, 0);
    this.cableLinesGroup.add(coreSwitch);

    // Distribution trunk lines connecting to each zone
    const trunkPoints = [
      [new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(-35, 5, 10)],
      [new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(-35, 4, -20)],
      [new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(35, 5, 10)],
      [new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(35, 4, -20)],
      [new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 3, -50)],
      // Redundant RSTP Ring Loop closure between Dom & Intl
      [new THREE.Vector3(-35, 5, 10), new THREE.Vector3(-35, 4, -20)],
      [new THREE.Vector3(35, 5, 10), new THREE.Vector3(35, 4, -20)],
    ];

    trunkPoints.forEach(([start, end]) => {
      const curve = new THREE.LineCurve3(start, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.18, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4, // Cyan data line
        transparent: true,
        opacity: 0.85,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.cableLinesGroup.add(tube);
    });

    this.cableLinesGroup.visible = false; // toggled by mode
    this.scene.add(this.cableLinesGroup);
  }

  /**
   * STI-PA Acoustic Intelligibility Heatmap Mesh
   */
  private buildHeatmapMesh() {
    const geo = new THREE.PlaneGeometry(150, 110, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Procedural gradient map for STI-PA (> 0.45 green/cyan, < 0.45 yellow/red)
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
    grad.addColorStop(0, '#10b981');   // Center high STI 0.58
    grad.addColorStop(0.35, '#06b6d4'); // 0.52
    grad.addColorStop(0.7, '#3b82f6');  // 0.48
    grad.addColorStop(0.9, '#f59e0b');  // 0.44
    grad.addColorStop(1.0, '#ef4444');  // 0.38 noisy perimeter
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.heatmapMesh = new THREE.Mesh(geo, mat);
    this.heatmapMesh.rotation.x = -Math.PI / 2;
    this.heatmapMesh.position.set(0, 0.48, 0);
    this.heatmapMesh.visible = false;
    this.scene.add(this.heatmapMesh);
  }

  /**
   * Phased Evacuation Path Visualizer (EN 54-16)
   */
  private buildEvacuationPaths() {
    this.evacuationPathGroup = new THREE.Group();

    // Emergency egress paths with directional green arrows
    const paths = [
      [[-50, 0.45, 10], [-50, 0.45, -35], [0, 0.45, -45]],
      [[50, 0.45, 10], [50, 0.45, -35], [0, 0.45, -45]],
      [[0, 0.45, 20], [0, 0.45, -45]],
    ];

    paths.forEach((ptSet) => {
      const points = ptSet.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.4, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e, // Safety Green
        transparent: true,
        opacity: 0.9,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.evacuationPathGroup.add(tube);
    });

    this.evacuationPathGroup.visible = false;
    this.scene.add(this.evacuationPathGroup);
  }

  /**
   * Raycasting interaction (distinguishes click vs orbit drag)
   */
  private onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    this.pointerDownPos.set(event.clientX, event.clientY);
  }

  private onPointerUp(event: PointerEvent) {
    if (event.button !== 0) return; // Left click only

    // Ignore if user dragged the mouse to orbit/pan the 3D scene
    const moveDist = Math.hypot(
      event.clientX - this.pointerDownPos.x,
      event.clientY - this.pointerDownPos.y
    );
    if (moveDist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);

    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;

      // Search up hierarchy for userData
      while (hitObj && !hitObj.userData.type && hitObj.parent) {
        hitObj = hitObj.parent;
      }

      if (hitObj && hitObj.userData) {
        if (hitObj.userData.type === 'speaker') {
          const spk = this.speakers.find((s) => s.id === hitObj!.userData.speakerId);
          if (spk) {
            this.selectSpeaker(spk);
            return;
          }
        } else if (hitObj.userData.type === 'zone') {
          const zoneId = hitObj.userData.zoneId as ZoneId;
          this.selectZone(zoneId, true, true);
          return;
        }
      }
    }

    // Deselect highlight if clicked empty ground (without yanking camera)
    this.selectZone(null, false, true);
    this.selectSpeaker(null);
  }

  public selectZone(
    zoneId: ZoneId | null,
    moveCamera: boolean = true,
    notifyCallback: boolean = true
  ) {
    this.selectedZoneId = zoneId;
    if (notifyCallback) {
      this.callbacks.onSelectZone(zoneId);
    }

    if (moveCamera) {
      if (zoneId === null) {
        // Return to All-Terminal Overview
        this.targetCameraPos = new THREE.Vector3(0, 75, 110);
        this.targetControlsTarget = new THREE.Vector3(0, 0, 0);
      } else {
        switch (zoneId) {
          case 'macro-1': // Domestic Departure
            this.targetControlsTarget = new THREE.Vector3(-35, 5, 18);
            this.targetCameraPos = new THREE.Vector3(-35, 34, 65);
            break;
          case 'macro-2': // Domestic Arrival
            this.targetControlsTarget = new THREE.Vector3(-35, 3, -18);
            this.targetCameraPos = new THREE.Vector3(-35, 30, -62);
            break;
          case 'macro-3': // International Departure
            this.targetControlsTarget = new THREE.Vector3(35, 5, 18);
            this.targetCameraPos = new THREE.Vector3(35, 34, 65);
            break;
          case 'macro-4': // International Arrival
            this.targetControlsTarget = new THREE.Vector3(35, 3, -18);
            this.targetCameraPos = new THREE.Vector3(35, 30, -62);
            break;
          case 'macro-5': // Car Park & Curbside
            this.targetControlsTarget = new THREE.Vector3(0, 4, -55);
            this.targetCameraPos = new THREE.Vector3(0, 34, -98);
            break;
          default: {
            const zone = this.macroZones.find((z) => z.id === zoneId);
            if (zone) {
              this.targetControlsTarget = new THREE.Vector3(...zone.centerPos);
              this.targetCameraPos = new THREE.Vector3(
                zone.centerPos[0] + 10,
                zone.centerPos[1] + 35,
                zone.centerPos[2] + 45
              );
            }
          }
        }
      }
    }

    this.updateHighlightMaterials();
  }

  public focusCoordinates(coords: [number, number, number]) {
    const [ix, iy, iz] = coords;
    this.targetControlsTarget = new THREE.Vector3(ix, iy, iz);
    this.targetCameraPos = new THREE.Vector3(ix + 14, iy + 28, iz + 36);
  }

  public setTheme(theme: 'dark' | 'light') {
    this.currentTheme = theme;
    if (theme === 'light') {
      // Crisp Daylight Architectural BIM Theme
      this.scene.background = new THREE.Color(0xdbeafe);
      this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.0045);
      if (this.tarmacMat) this.tarmacMat.color.setHex(0x64748b);
      if (this.plinthMat) this.plinthMat.color.setHex(0xcbd5e1);
      if (this.keyLight) this.keyLight.intensity = 2.2;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x94a3b8);
        this.hemiLight.intensity = 1.25;
      }
      this.renderer.toneMappingExposure = 1.28;
    } else {
      // Deep Avionics Night/Dusk Theme
      this.scene.background = new THREE.Color(0x0a0f1d);
      this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0065);
      if (this.tarmacMat) this.tarmacMat.color.setHex(0x111827);
      if (this.plinthMat) this.plinthMat.color.setHex(0x1f2937);
      if (this.keyLight) this.keyLight.intensity = 1.5;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0x38bdf8);
        this.hemiLight.groundColor.setHex(0x0f172a);
        this.hemiLight.intensity = 0.7;
      }
      this.renderer.toneMappingExposure = 1.15;
    }
  }

  public selectSpeaker(speaker: IPSpeaker | null) {
    this.selectedSpeakerId = speaker ? speaker.id : null;
    this.callbacks.onSelectSpeaker(speaker);

    if (speaker) {
      this.targetControlsTarget = new THREE.Vector3(...speaker.position);
      this.targetCameraPos = new THREE.Vector3(
        speaker.position[0],
        speaker.position[1] + 12,
        speaker.position[2] + 16
      );
    }
  }

  public setVisualizerMode(mode: VisualizerMode) {
    this.visualizerMode = mode;
    if (this.heatmapMesh) {
      this.heatmapMesh.visible = mode === 'stipa_heatmap' || mode === 'spl_noise';
    }
    this.cableLinesGroup.visible = mode === 'cable_rstp';
  }

  public setEmergencyState(isActive: boolean) {
    this.isEmergencyActive = isActive;
    this.evacuationPathGroup.visible = isActive;

    // Flash terminal materials in emergency
    this.macroZones.forEach((z) => {
      const meshes = this.zoneMeshes.get(z.id);
      if (meshes) {
        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshPhysicalMaterial;
          if (isActive) {
            mat.color.setHex(0xef4444);
            mat.opacity = 0.85;
          } else {
            mat.color.set(z.color);
            mat.opacity = 0.75;
          }
        });
      }
    });
  }

  public setBroadcastingZones(zones: ZoneId[]) {
    this.activeBroadcastingZones = new Set(zones);
  }

  public updateSpeakerStatus(speakerId: string, status: IPSpeaker['status']) {
    const spkGroup = this.speakerMeshes.get(speakerId);
    if (!spkGroup) return;

    // Find LED ring (child torus)
    spkGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.color.setHex(this.getSpeakerColor(status));
      }
    });
  }

  /**
   * Set 3D Visualization for Interactive Emergency Drill Simulation
   */
  public setSimulationIncident(
    scenario: EmergencyScenario | null,
    affectedZoneIds: ZoneId[],
    isEvacuating: boolean
  ) {
    // Clear old objects in simulationIncidentGroup
    while (this.simulationIncidentGroup.children.length > 0) {
      const obj = this.simulationIncidentGroup.children[0];
      this.simulationIncidentGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    }
    this.simBeaconRings = [];
    this.simLightPillar = null;
    this.simEgressRoute = null;

    if (!scenario) {
      this.isSimulationActive = false;
      this.activeSimZoneIds.clear();
      this.primarySimZoneId = null;
      this.updateHighlightMaterials();
      return;
    }

    this.isSimulationActive = true;
    this.activeSimZoneIds = new Set(affectedZoneIds);
    this.primarySimZoneId = scenario.primaryZoneId;

    const [ix, iy, iz] = scenario.incidentCoordinates;

    // 1. Vertical Light Column / Beacon Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.4, 1.4, 18, 16, 1, true);
    const pillarColor =
      scenario.category === 'fire' || scenario.category === 'hazmat'
        ? 0xef4444
        : scenario.category === 'security'
        ? 0xf97316
        : scenario.category === 'medical'
        ? 0x06b6d4
        : 0x8b5cf6;

    const pillarMat = new THREE.MeshBasicMaterial({
      color: pillarColor,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.simLightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.simLightPillar.position.set(ix, iy + 9, iz);
    this.simulationIncidentGroup.add(this.simLightPillar);

    // 2. Concentric Ground Pulsing Target Rings
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(1.6 + r * 1.0, 2.3 + r * 1.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: pillarColor,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ix, iy + 0.15 + r * 0.05, iz);
      ring.userData = { ringIndex: r };
      this.simBeaconRings.push(ring);
      this.simulationIncidentGroup.add(ring);
    }

    // 3. Floating Incident Octahedron Marker
    const diamondGeo = new THREE.OctahedronGeometry(1.3, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: pillarColor,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.set(ix, iy + 17, iz);
    this.simulationIncidentGroup.add(diamond);

    // 4. Dynamic Safe Egress Tube Corridor to assembly point
    if (isEvacuating) {
      const egressPoints = [
        new THREE.Vector3(ix, 0.45, iz),
        new THREE.Vector3(ix, 0.45, iz > 0 ? iz - 20 : iz + 20),
        new THREE.Vector3(0, 0.45, -45),
        new THREE.Vector3(25, 0.45, -55),
      ];
      const curve = new THREE.CatmullRomCurve3(egressPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.45, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x10b981, // Safety Green
        transparent: true,
        opacity: 0.9,
      });
      this.simEgressRoute = new THREE.Mesh(tubeGeo, tubeMat);
      this.simulationIncidentGroup.add(this.simEgressRoute);
    }

    // Smoothly fly camera to incident location
    this.targetControlsTarget = new THREE.Vector3(ix, iy, iz);
    this.targetCameraPos = new THREE.Vector3(ix + 16, iy + 32, iz + 42);

    this.updateHighlightMaterials();
  }

  public clearSimulationIncident() {
    this.setSimulationIncident(null, [], false);
  }

  private updateHighlightMaterials() {
    this.macroZones.forEach((zone) => {
      const meshes = this.zoneMeshes.get(zone.id);
      if (!meshes) return;

      const isSelected = this.selectedZoneId === zone.id;
      meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (this.isEmergencyActive) {
          mat.color.setHex(0xef4444);
          mat.opacity = 0.85;
        } else if (this.isSimulationActive) {
          if (this.primarySimZoneId === zone.id) {
            mat.color.setHex(0xef4444); // Primary incident epicenter = Red
            mat.opacity = 0.88;
            mat.roughness = 0.15;
          } else if (this.activeSimZoneIds.has(zone.id)) {
            mat.color.setHex(0xf59e0b); // Affected Standby = Amber
            mat.opacity = 0.8;
            mat.roughness = 0.25;
          } else {
            mat.color.setHex(0x10b981); // Unaffected Safe Holding Zone = Green
            mat.opacity = 0.55;
            mat.roughness = 0.35;
          }
        } else if (isSelected) {
          mat.color.setHex(0x38bdf8);
          mat.opacity = 0.95;
          mat.roughness = 0.15;
        } else {
          mat.color.set(zone.color);
          mat.opacity = 0.75;
          mat.roughness = 0.3;
        }
      });
    });
  }

  /**
   * Camera Presets for All Terminals & Individual Terminal Sections
   */
  public setCameraPreset(preset: CameraPresetType) {
    switch (preset) {
      case 'overview':
        this.selectZone(null, true, true);
        break;
      case 'dom_all':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(-35, 4, 0);
        this.targetCameraPos = new THREE.Vector3(-35, 52, 72);
        break;
      case 'dom_dep':
        this.selectZone('macro-1', true, true);
        break;
      case 'dom_arr':
        this.selectZone('macro-2', true, true);
        break;
      case 'intl_all':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(35, 4, 0);
        this.targetCameraPos = new THREE.Vector3(35, 52, 72);
        break;
      case 'intl_dep':
        this.selectZone('macro-3', true, true);
        break;
      case 'intl_arr':
        this.selectZone('macro-4', true, true);
        break;
      case 'parking':
        this.selectZone('macro-5', true, true);
        break;
      case 'tower':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(-65, 34, -25);
        this.targetCameraPos = new THREE.Vector3(-35, 48, 8);
        break;
    }
  }

  /**
   * Main Animation Loop (60 FPS, Zero GC)
   */
  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Rotate Radar Dome Antenna on ATC Tower
    if (this.radarDome) {
      this.radarDome.rotation.y += delta * 1.8;
    }

    // 2. Smooth exponential camera & target interpolation
    if (this.targetCameraPos) {
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.25) {
        this.targetCameraPos = null;
      }
    }
    if (this.targetControlsTarget) {
      this.controls.target.lerp(this.targetControlsTarget, 0.08);
      if (this.controls.target.distanceTo(this.targetControlsTarget) < 0.25) {
        this.targetControlsTarget = null;
      }
    }

    // 3. Acoustic Wave Ring Propagation (Sound waves expanding from active speakers)
    const wavePhase = (elapsedTime * 2.5) % 1.0;
    this.soundWaveRings.forEach((ring) => {
      const parentGroup = ring.parent as THREE.Group;
      const spkId = parentGroup?.userData?.speakerId;
      const speaker = this.speakers.find((s) => s.id === spkId);

      const isBroadcasting =
        speaker &&
        (this.activeBroadcastingZones.has(speaker.macroZoneId) ||
          this.isEmergencyActive ||
          speaker.status === 'broadcasting');

      if (isBroadcasting) {
        ring.visible = true;
        const scale = 1.0 + wavePhase * 3.5;
        ring.scale.set(scale, scale, scale);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.7 * (1.0 - wavePhase));
        if (this.isEmergencyActive) {
          mat.color.setHex(0xef4444);
        } else {
          mat.color.setHex(0x38bdf8);
        }
      } else {
        ring.visible = false;
      }
    });

    // 4. Emergency evacuation path pulse animation
    if (this.isEmergencyActive && this.evacuationPathGroup.visible) {
      const pulseGreen = 0.5 + 0.5 * Math.sin(elapsedTime * 6.0);
      this.evacuationPathGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.4 + 0.6 * pulseGreen;
        }
      });
    }

    // 5. Simulation incident beacon & egress route animation
    if (this.isSimulationActive) {
      const pulseTime = elapsedTime * 3.0;
      this.simBeaconRings.forEach((ring, idx) => {
        const phase = (pulseTime + idx * 0.35) % 1.0;
        const scale = 1.0 + phase * 3.2;
        ring.scale.set(scale, scale, 1);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.75 * (1.0 - phase));
      });

      if (this.simLightPillar) {
        this.simLightPillar.rotation.y += delta * 1.5;
        const mat = this.simLightPillar.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + 0.25 * Math.sin(elapsedTime * 6.0);
      }

      if (this.simEgressRoute) {
        const mat = this.simEgressRoute.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.5 + 0.4 * Math.sin(elapsedTime * 5.0);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);

    this.controls.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
