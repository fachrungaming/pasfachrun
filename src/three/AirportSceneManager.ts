/**
 * Three.js 3D Digital Twin Engine for Airport IP Public Address System
 * Layout: Bandar Udara Internasional Sultan Hasanuddin Makassar (WAAA / MKS)
 *
 * Architectural & Spatial Elements:
 * - Terminal Utama (3 Lantai) [macro-1]: 3-floor main departure/arrival hall with sweeping Phinisi wave roof & twin connector bridges
 * - Terminal Eksisting (2 Lantai) [macro-2]: 2-floor airside concourse (Gate 07 - Gate 12) with 6 vaulted wave-shell roofs
 * - Terminal Selatan (2 Lantai) [macro-3]: 2-floor south expansion with curved fan rotunda (Gate 01 - Gate 04) & concourse (Gate 05 - Gate 06)
 * - Apron, 12 Garbarata & Pesawat Parkir [macro-4]: Concrete airside apron, 12 articulated jet bridges (Gate 01 - 12), and 8 parked airliners
 * - Gedung Parkir (3 Lantai) [macro-5]: 3-level multi-storey car park with helical ramp, parked cars, curbside canopy & skybridge
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MacroZone, IPSpeaker, ZoneId, SpeakerCategory } from '../types/pa-system';
import { EmergencyScenario } from '../types/simulation';

export type VisualizerMode = 'bim_normal' | 'stipa_heatmap' | 'spl_noise' | 'cable_rstp';
export type CameraPresetType =
  | 'overview'
  | 'lantai1'
  | 'lantai1_eksisting'
  | 'lantai1_eksisting_ruangan'
  | 'lantai2'
  | 'utama'
  | 'curbside'
  | 'eksisting'
  | 'selatan'
  | 'apron'
  | 'parking'
  | 'tower'
  | 'tollgate'
  | 'dom_all'
  | 'dom_dep'
  | 'dom_arr'
  | 'intl_all'
  | 'intl_dep'
  | 'intl_arr';

export interface AirportSceneCallbacks {
  onSelectZone: (zoneId: ZoneId | null) => void;
  onSelectSpeaker: (speaker: IPSpeaker | null) => void;
  onSelectEksistingRoomComplex?: (roomCode?: number | null) => void;
  onUpdateHotspotScreenPos?: (pos: { x: number; y: number; visible: boolean }) => void;
}

interface GateDefinition {
  gateNumber: string;
  rootX: number;
  rootZ: number;
  angleRad: number; // Direction in X-Z plane where (0, +1) is angle 0, (-1, 0) is -PI/2
  length: number;
  hasAircraft: boolean;
  isWideBody?: boolean;
  liveryColor?: number;
  tailColor?: number;
  hasTwinArm?: boolean;
}

const SULTAN_HASANUDDIN_GATES: GateDefinition[] = [
  // Terminal Selatan Curved Quarter-Circle Pier (Gates 01 - 04 radiating along outer arc around center X=-42, Z=-16, R=32)
  { gateNumber: '01', rootX: -71.2, rootZ: -3.2, angleRad: -1.16, length: 11.5, hasAircraft: false, isWideBody: true, liveryColor: 0x0284c7, tailColor: 0x0369a1, hasTwinArm: false },
  { gateNumber: '02', rootX: -64.8, rootZ: 6.4, angleRad: -0.80, length: 11.0, hasAircraft: false, isWideBody: false, liveryColor: 0xef4444, tailColor: 0xdc2626 },
  { gateNumber: '03', rootX: -55.4, rootZ: 13.0, angleRad: -0.44, length: 10.5, hasAircraft: false, isWideBody: false, liveryColor: 0x10b981, tailColor: 0x059669 },
  { gateNumber: '04', rootX: -46.8, rootZ: 15.6, angleRad: -0.16, length: 10.5, hasAircraft: false, liveryColor: 0xf59e0b, tailColor: 0xd97706 },
  // Terminal Selatan Straight Concourse (Gates 05 - 06)
  { gateNumber: '05', rootX: -33.5, rootZ: 16.0, angleRad: -0.05, length: 10.5, hasAircraft: true, isWideBody: false, liveryColor: 0xe11d48, tailColor: 0xbe123c },
  { gateNumber: '06', rootX: -20.5, rootZ: 16.0, angleRad: -0.02, length: 10.5, hasAircraft: true, isWideBody: false, liveryColor: 0x0284c7, tailColor: 0x0369a1 },
  // Terminal Eksisting Concourse (Gates 07 - 12 angled parallel as in Lantai 2 architectural plan)
  { gateNumber: '07', rootX: -6.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: false, liveryColor: 0x6366f1, tailColor: 0x4f46e5 },
  { gateNumber: '08', rootX: 6.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: true, isWideBody: false, liveryColor: 0x7c3aed, tailColor: 0x6d28d9 },
  { gateNumber: '09', rootX: 18.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: true, isWideBody: true, liveryColor: 0x0ea5e9, tailColor: 0x0284c7 },
  { gateNumber: '10', rootX: 30.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: true, isWideBody: false, liveryColor: 0x16a34a, tailColor: 0x15803d },
  { gateNumber: '11', rootX: 42.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: true, isWideBody: true, liveryColor: 0xf59e0b, tailColor: 0xb45309 },
  { gateNumber: '12', rootX: 54.0, rootZ: 16.0, angleRad: -0.32, length: 10.8, hasAircraft: false, liveryColor: 0xec4899, tailColor: 0xdb2777 },
];

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
  private upperRoofMeshes: THREE.Object3D[] = [];
  private lantai1Meshes: THREE.Object3D[] = [];
  private lantai2Meshes: THREE.Object3D[] = [];
  private isLantai1Cutaway: boolean = false;
  private isLantai2Cutaway: boolean = false;
  private activeCategoryFilter: SpeakerCategory | 'all' = 'all';
  private speakerBadgeTextures: Map<SpeakerCategory, THREE.CanvasTexture> = new Map();
  private eksistingRedOutlineGroup: THREE.Group | null = null;
  private eksistingRoomHighlightMeshes: Map<number, THREE.Mesh[]> = new Map();
  private highlightedEksistingRoomCode: number | null = null;
  private eksistingHotspotWorldPos = new THREE.Vector3(6.4, 3.25, 15.1);
  private lastHotspotScreen = { x: -999, y: -999, visible: false };

  // Animated Road Traffic Vehicles (Main Viaduct Loop + Inner Ground Loop + Monument Roundabout + Tollgate Highway)
  private roadLoopSamples: THREE.Vector3[] = [];
  private roadLoopNormals: { nx: number; nz: number }[] = [];
  private groundLoopSamples: THREE.Vector3[] = [];
  private groundLoopNormals: { nx: number; nz: number }[] = [];
  private tollInboundSamples: THREE.Vector3[] = [];
  private tollOutboundSamples: THREE.Vector3[] = [];
  private animatedVehicles: {
    mesh: THREE.Group;
    wheels: THREE.Object3D[];
    mode: 'viaduct_loop' | 'ground_loop' | 'roundabout' | 'tollgate_in' | 'tollgate_out';
    progress: number;
    speed: number;
    direction: 1 | -1;
    laneOffset: number;
    loopLength: number;
  }[] = [];

  // Theme & Lighting References
  private tarmacMat: THREE.MeshStandardMaterial | null = null;
  private apronConcreteMat: THREE.MeshStandardMaterial | null = null;
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
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0052);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.12, 700);
    this.camera.position.set(0, 82, 118);

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
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 260;
    this.controls.target.set(-2, 2, -4);

    // Cancel camera glide if operator manually rotates/pans/zooms
    this.controls.addEventListener('start', () => {
      this.targetCameraPos = null;
      this.targetControlsTarget = null;
    });

    // 7. Build Sultan Hasanuddin Makassar (WAAA) Complex & Systems
    this.buildGroundAndRunway();
    this.buildTerminalBuildings();
    this.buildControlTower();
    this.buildParkedAircraft();
    this.buildCarParkComplex();
    this.buildBuildingLabels();
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

  private addZoneMesh(zoneId: ZoneId, mesh: THREE.Mesh) {
    mesh.userData = { type: 'zone', zoneId };
    const existing = this.zoneMeshes.get(zoneId) || [];
    existing.push(mesh);
    this.zoneMeshes.set(zoneId, existing);
    this.interactableObjects.push(mesh);
  }

  private setupLighting() {
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.55);
    keyLight.position.set(75, 110, 55);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 320;
    const d = 105;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.75);
    hemiLight.position.set(0, 90, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;

    // Interior warm/cool architectural lights for Terminal Selatan, Eksisting & Utama
    const southLight = new THREE.PointLight(0x818cf8, 2.2, 85);
    southLight.position.set(-45, 7, 8);
    this.scene.add(southLight);

    const existingLight = new THREE.PointLight(0x34d399, 2.0, 85);
    existingLight.position.set(24, 7, 8);
    this.scene.add(existingLight);

    const mainTermLight = new THREE.PointLight(0x38bdf8, 2.4, 90);
    mainTermLight.position.set(24, 10, -25);
    this.scene.add(mainTermLight);
  }

  /**
   * Apron, Ground, Taxiway Markings, Green Courtyards, and Landside Roads (WAAA Layout)
   */
  private buildGroundAndRunway() {
    const groundGroup = new THREE.Group();

    // 1. Base surrounding terrain / asphalt
    const tarmacGeo = new THREE.PlaneGeometry(290, 240);
    const tarmacMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.08,
    });
    this.tarmacMat = tarmacMat;
    const tarmac = new THREE.Mesh(tarmacGeo, tarmacMat);
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.receiveShadow = true;
    groundGroup.add(tarmac);

    // 2. Concrete Airside Apron Slab (Lighter rigid pavement where aircraft park & taxi)
    const apronConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.12,
    });
    this.apronConcreteMat = apronConcreteMat;

    // Main Apron rectangle in front of Terminal Selatan & Terminal Eksisting
    const mainApronGeo = new THREE.BoxGeometry(168, 0.25, 58);
    const mainApron = new THREE.Mesh(mainApronGeo, apronConcreteMat);
    mainApron.position.set(-4, 0.12, 41);
    mainApron.receiveShadow = true;
    groundGroup.add(mainApron);

    // Radial Apron wrap-around on the West/South side for Gate 01 - Gate 03
    const westApronGeo = new THREE.CylinderGeometry(36, 36, 0.25, 32);
    const westApron = new THREE.Mesh(westApronGeo, apronConcreteMat);
    westApron.position.set(-56, 0.12, 12);
    westApron.receiveShadow = true;
    groundGroup.add(westApron);

    // 3. Terminal Complex Foundation Plinth
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.75,
      metalness: 0.2,
    });
    this.plinthMat = plinthMat;
    const plinthGeo = new THREE.BoxGeometry(162, 0.35, 62);
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(10, 0.18, -12);
    plinth.receiveShadow = true;
    groundGroup.add(plinth);

    // 4. Tropical Green Courtyard between Terminal Utama & Terminal Eksisting + Landside median
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.85,
    });
    const courtyardGeo = new THREE.BoxGeometry(36, 0.42, 9);
    const courtyard = new THREE.Mesh(courtyardGeo, grassMat);
    courtyard.position.set(23, 0.22, -7);
    groundGroup.add(courtyard);

    // Green landscape belt on South-West landside (behind Terminal Selatan)
    const southParkGeo = new THREE.BoxGeometry(44, 0.4, 22);
    const southPark = new THREE.Mesh(southParkGeo, grassMat);
    southPark.position.set(-34, 0.2, -20);
    groundGroup.add(southPark);

    // 5. Dual Taxiway Centerlines & Apron Service Road Markings
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const redSafetyMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 });

    // Main Parallel Taxiway Line at Z = +64
    const taxiLineGeo = new THREE.PlaneGeometry(175, 0.55);
    const taxiLine = new THREE.Mesh(taxiLineGeo, yellowLineMat);
    taxiLine.rotation.x = -Math.PI / 2;
    taxiLine.position.set(-6, 0.28, 64);
    groundGroup.add(taxiLine);

    // Red/White GSE Equipment Staging Safety Line along Terminal Airside edge
    const gseLineGeo = new THREE.PlaneGeometry(126, 0.45);
    const gseLine = new THREE.Mesh(gseLineGeo, whiteLineMat);
    gseLine.rotation.x = -Math.PI / 2;
    gseLine.position.set(6, 0.28, 18.5);
    groundGroup.add(gseLine);

    // Stand Lead-in Lines & Red Safety Boxes for each Gate (01 - 12)
    SULTAN_HASANUDDIN_GATES.forEach((gate) => {
      const dirX = Math.sin(gate.angleRad);
      const dirZ = Math.cos(gate.angleRad);
      const standDist = gate.length + 13;
      const sx = gate.rootX + dirX * standDist;
      const sz = gate.rootZ + dirZ * standDist;

      // Yellow lead-in line under aircraft nose
      const leadGeo = new THREE.PlaneGeometry(0.45, 16);
      const lead = new THREE.Mesh(leadGeo, yellowLineMat);
      lead.rotation.x = -Math.PI / 2;
      lead.rotation.z = gate.angleRad;
      lead.position.set(sx, 0.29, sz);
      groundGroup.add(lead);

      // T-bar stop marker
      const tBarGeo = new THREE.PlaneGeometry(3.6, 0.5);
      const tBar = new THREE.Mesh(tBarGeo, yellowLineMat);
      tBar.rotation.x = -Math.PI / 2;
      tBar.rotation.z = gate.angleRad;
      tBar.position.set(
        gate.rootX + dirX * (gate.length + 4.5),
        0.29,
        gate.rootZ + dirZ * (gate.length + 4.5)
      );
      groundGroup.add(tBar);

      // Red Apron Stand Safety Box outline
      const redBoxGeo = new THREE.PlaneGeometry(8.5, 1.2);
      const redBox = new THREE.Mesh(redBoxGeo, redSafetyMat);
      redBox.rotation.x = -Math.PI / 2;
      redBox.rotation.z = gate.angleRad;
      redBox.position.set(
        gate.rootX + dirX * (gate.length + 2.2),
        0.28,
        gate.rootZ + dirZ * (gate.length + 2.2)
      );
      groundGroup.add(redBox);
    });

    this.scene.add(groundGroup);
  }

  /**
   * Helper to create a curved ring-sector shape in X-Y plane (to be extruded and rotated into X-Z plane)
   */
  private createArcSectorShape(
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
    segments: number = 32
  ): THREE.Shape {
    const shape = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (i / segments) * (endAngle - startAngle);
      const x = Math.cos(a) * outerR;
      const y = Math.sin(a) * outerR;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = segments; i >= 0; i--) {
      const a = startAngle + (i / segments) * (endAngle - startAngle);
      const x = Math.cos(a) * innerR;
      const y = Math.sin(a) * innerR;
      shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  /**
   * Generates a subtle warm cream-white diamond ceramic tile texture for Lantai 1 (matching image_6015f581.png)
   */
  private createLantai1TileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f8f5f0';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#e6e0d6';
    ctx.lineWidth = 2;
    const step = 32;
    for (let i = -256; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 256);
      ctx.lineTo(i + 256, 0);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 14);
    return tex;
  }

  /**
   * Generates a speckled cream-white terrazzo floor texture matching the lower-center
   * and right concourse halls of Terminal Eksisting Lantai 1 (Tanpa-judul-920-x-197-mm-5.png)
   */
  private createEksistingTerrazzoTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e7e5e0';
    ctx.fillRect(0, 0, 256, 256);

    // Fine terrazzo mineral speckles
    const speckleColors = ['#c8c4bc', '#b6b1a7', '#f5f3ef', '#9ca3af', '#d6d2c9'];
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = speckleColors[i % speckleColors.length];
      const sx = (i * 73) % 256;
      const sy = (i * 137) % 256;
      const sr = (i % 3) + 1;
      ctx.fillRect(sx, sy, sr, sr);
    }

    // Subtle square architectural tile joints
    ctx.strokeStyle = 'rgba(180, 175, 166, 0.38)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g <= 256; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(256, g);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 8);
    return tex;
  }

  /**
   * Helper to create a crisp 2D/3D badge plaque with canvas texture
   * Used for Yellow Gate Badges (GATE 01 - GATE 12), Room Sectors, and Zone Markers (matching PDF Page 2)
   */
  private createPlaqueMesh(
    text: string,
    bgColor: string = '#facc15',
    textColor: string = '#0f172a',
    w: number = 3.8,
    h: number = 1.3,
    fontSize: number = 44,
    subtitle?: string,
    subColor?: string
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;

    // Rounded rectangle background
    const r = 26;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(canvas.width - r, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
    ctx.lineTo(canvas.width, canvas.height - r);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
    ctx.lineTo(r, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // High-contrast border
    ctx.lineWidth = 10;
    ctx.strokeStyle = textColor === '#ffffff' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.3)';
    ctx.stroke();

    // Main text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;

    if (subtitle) {
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 24);
      ctx.font = `700 24px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = subColor || textColor;
      ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 36);
    } else {
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2; // Flat horizontal facing upwards for top-down & axonometric view
    return mesh;
  }

  /**
   * Helper to create a circular number badge (e.g. rooms 10, 31..35, 16..29 matching PDF Page 2)
   */
  private createCircularPlaqueMesh(
    text: string,
    bgColor: string = '#0f172a',
    textColor: string = '#38bdf8',
    radius: number = 0.85,
    fontSize: number = 52
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Circle background
    ctx.beginPath();
    ctx.arc(128, 128, 114, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // High-contrast Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = textColor;
    ctx.stroke();

    // Center text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(text, 128, 130);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  /**
   * Builds the 3 Distinct Terminal Buildings of Sultan Hasanuddin Makassar (WAAA)
   * with:
   * - Full Lantai 1 (Y = 0.4m) 3D Architectural Floor Plan Mockup (Baggage Claim 4 Carousels Racetrack, BHS Hall, Rotunda Selatan)
   * - Full Lantai 2 (Y = 4.6m) 3D Architectural Floor Plan Mockup (Gates 01-12, Check-In Islands A-D, Retail 10-39)
   * - Solid Opaque Sweeping Phinisi Wave & Vaulted Roofs for "Semua Terminal" view
   * - Clean 12 Garbarata (Jet Bridges) with fixed single-arm Gate 01
   */
  private buildTerminalBuildings() {
    const terminalGroup = new THREE.Group();
    this.upperRoofMeshes = [];
    this.lantai1Meshes = [];
    this.lantai2Meshes = [];

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.55,
      metalness: 0.2,
    });
    const whiteFloorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.38,
      metalness: 0.08,
    });
    const l1TileFloorMat = new THREE.MeshStandardMaterial({
      map: this.createLantai1TileTexture(),
      roughness: 0.36,
      metalness: 0.06,
    });
    const bhsDarkFloorMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.72,
      metalness: 0.12,
    });
    const darkFloorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.62,
      metalness: 0.12,
    });
    const selatanCarpetMat = new THREE.MeshStandardMaterial({
      color: 0x2c3844,
      roughness: 0.65,
      metalness: 0.1,
    });
    const partitionWallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.32,
      metalness: 0.08,
    });
    const wallCapMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.38,
      metalness: 0.18,
    });
    const greenNodeMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    // Solid opaque metallic white-silver Phinisi roof (100% visible when "Semua Terminal" is active, hidden in Lantai 1/2 cutaway)
    const roofShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.36,
      roughness: 0.24,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    });
    const roofBronzeFasciaMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.65,
      roughness: 0.32,
    });
    const roofAccentMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const curtainGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      transmission: 0.82,
      opacity: 0.32,
      transparent: true,
      roughness: 0.08,
      metalness: 0.15,
      ior: 1.5,
      depthWrite: false,
    });

    // Helper to add a 3D architectural partition wall on Lantai 2 (Y = 4.65m) and register in lantai2Meshes
    const addL2Wall = (
      parent: THREE.Group,
      cx: number,
      cz: number,
      w: number,
      d: number,
      h: number = 2.45,
      rotY: number = 0
    ) => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(cx, 4.65 + h / 2, cz);
      wallGroup.rotation.y = rotY;

      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), partitionWallMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallGroup.add(wallMesh);

      const capMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.12, d + 0.06), wallCapMat);
      capMesh.position.y = h / 2 + 0.06;
      wallGroup.add(capMesh);

      parent.add(wallGroup);
      this.lantai2Meshes.push(wallGroup);
    };

    // Helper to add a 3D white cylindrical structural column on Lantai 2
    const addL2Column = (parent: THREE.Group, x: number, z: number, h: number = 2.65) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, h, 16), partitionWallMat);
      col.position.set(x, 4.65 + h / 2, z);
      col.castShadow = true;
      col.receiveShadow = true;
      parent.add(col);
      this.lantai2Meshes.push(col);
    };

    // Helper to add a green PA zone indicator dot on Lantai 2 (matching reference diagram)
    const addL2GreenNode = (parent: THREE.Group, x: number, z: number) => {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14), greenNodeMat);
      dot.position.set(x, 4.82, z);
      parent.add(dot);
      this.lantai2Meshes.push(dot);
    };

    // Helper to add a 3D architectural partition wall on Lantai 1 (Y = 0.62m)
    const addL1Wall = (
      parent: THREE.Group,
      cx: number,
      cz: number,
      w: number,
      d: number,
      h: number = 2.35,
      rotY: number = 0
    ) => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(cx, 0.62 + h / 2, cz);
      wallGroup.rotation.y = rotY;

      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), partitionWallMat);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallGroup.add(wallMesh);

      const capMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.1, d + 0.05), wallCapMat);
      capMesh.position.y = h / 2 + 0.05;
      wallGroup.add(capMesh);

      parent.add(wallGroup);
      this.lantai1Meshes.push(wallGroup);
    };

    // Helper to add a 3D white square structural column on Lantai 1 (matching square pillars in image_6015f581.png & PDF)
    const addL1SquareColumn = (
      parent: THREE.Group,
      x: number,
      z: number,
      size: number = 0.56,
      h: number = 2.55
    ) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), partitionWallMat);
      col.position.set(x, 0.62 + h / 2, z);
      col.castShadow = true;
      col.receiveShadow = true;
      parent.add(col);
      this.lantai1Meshes.push(col);
    };

    // Materials for 3D Baggage Claim Carousels & Infeed Chutes
    const beltRubberMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.15,
    });
    const beltRimMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.25,
    });

    // Helper to build a large racetrack 3D Baggage Claim Carousel matching Page 1 of PDF (Red Box - Terminal Utama)
    const addL1DetailedCarousel = (
      parent: THREE.Group,
      cx: number,
      claimNum: number,
      flightCode: string,
      flightRoute: string,
      statusText: string
    ) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, 0.64, 0);

      const loopLen = 8.5; // length in Z
      const loopW = 4.2;   // width in X
      const beltW = 1.15;

      // 1. Outer Stainless Steel Rim / Guard Rail
      const outerRim = new THREE.Mesh(
        new THREE.BoxGeometry(loopW, 0.38, loopLen),
        beltRimMat
      );
      outerRim.position.set(0, 0.19, -18.0);
      outerRim.castShadow = true;
      outerRim.receiveShadow = true;
      cGroup.add(outerRim);

      // Rounded semicircular ends (North & South)
      const southCap = new THREE.Mesh(
        new THREE.CylinderGeometry(loopW / 2, loopW / 2, 0.38, 24, 1, false, -Math.PI / 2, Math.PI),
        beltRimMat
      );
      southCap.position.set(0, 0.19, -18.0 - loopLen / 2);
      cGroup.add(southCap);

      const northCap = new THREE.Mesh(
        new THREE.CylinderGeometry(loopW / 2, loopW / 2, 0.38, 24, 1, false, Math.PI / 2, Math.PI),
        beltRimMat
      );
      northCap.position.set(0, 0.19, -18.0 + loopLen / 2);
      cGroup.add(northCap);

      // 2. Black Rubber Moving Slatted Conveyor Belt
      const beltH = 0.44;
      [-loopW / 2 + beltW / 2, loopW / 2 - beltW / 2].forEach((bx) => {
        const sideBelt = new THREE.Mesh(
          new THREE.BoxGeometry(beltW, beltH, loopLen),
          beltRubberMat
        );
        sideBelt.position.set(bx, 0.22, -18.0);
        cGroup.add(sideBelt);
      });

      // Curved belt end loops
      const sBelt = new THREE.Mesh(
        new THREE.RingGeometry(loopW / 2 - beltW, loopW / 2, 24),
        beltRubberMat
      );
      sBelt.rotation.x = -Math.PI / 2;
      sBelt.position.set(0, 0.44, -18.0 - loopLen / 2);
      cGroup.add(sBelt);

      const nBelt = new THREE.Mesh(
        new THREE.RingGeometry(loopW / 2 - beltW, loopW / 2, 24),
        beltRubberMat
      );
      nBelt.rotation.x = -Math.PI / 2;
      nBelt.position.set(0, 0.44, -18.0 + loopLen / 2);
      cGroup.add(nBelt);

      // 3. Central Stainless Steel Island Platform
      const islandW = loopW - beltW * 2 - 0.1;
      const islandMesh = new THREE.Mesh(
        new THREE.BoxGeometry(islandW, 0.50, loopLen),
        beltRimMat
      );
      islandMesh.position.set(0, 0.25, -18.0);
      cGroup.add(islandMesh);

      // 4. Sloped Baggage Infeed Chute from rear BHS wall (Z = -12.0)
      const chuteLen = 3.6;
      const chute = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.25, chuteLen),
        beltRimMat
      );
      chute.position.set(0, 0.72, -13.8);
      chute.rotation.x = 0.26;
      cGroup.add(chute);

      const chuteBelt = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.28, chuteLen - 0.2),
        beltRubberMat
      );
      chuteBelt.position.set(0, 0.74, -13.8);
      chuteBelt.rotation.x = 0.26;
      cGroup.add(chuteBelt);

      // Wall opening hatch
      const hatch = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.2, 0.4),
        beltRubberMat
      );
      hatch.position.set(0, 0.85, -12.1);
      cGroup.add(hatch);

      // 5. 3D Colorful Luggage Pieces on the Belt
      const luggageColors = [0xb91c1c, 0x1d4ed8, 0x047857, 0xd97706, 0x1e293b, 0x475569, 0xa855f7, 0x0891b2];
      const luggagePositions = [
        { x: -loopW / 2 + beltW / 2, z: -15.0, ry: 0.15 },
        { x: -loopW / 2 + beltW / 2, z: -17.5, ry: -0.22 },
        { x: -loopW / 2 + beltW / 2, z: -20.0, ry: 0.08 },
        { x: 0, z: -18.0 - loopLen / 2 + 0.35, ry: Math.PI / 2 + 0.1 },
        { x: loopW / 2 - beltW / 2, z: -21.0, ry: -0.12 },
        { x: loopW / 2 - beltW / 2, z: -18.5, ry: 0.28 },
        { x: loopW / 2 - beltW / 2, z: -16.0, ry: -0.05 },
        { x: 0, z: -18.0 + loopLen / 2 - 0.4, ry: Math.PI / 2 - 0.15 },
      ];

      luggagePositions.forEach((lp, lIdx) => {
        const lugColor = luggageColors[(claimNum + lIdx) % luggageColors.length];
        const lugMat = new THREE.MeshStandardMaterial({
          color: lugColor,
          roughness: 0.4,
          metalness: 0.2,
        });

        const bagW = 0.55 + (lIdx % 3) * 0.1;
        const bagD = 0.75 + (lIdx % 2) * 0.15;
        const bagH = 0.32;
        const bag = new THREE.Mesh(new THREE.BoxGeometry(bagW, bagH, bagD), lugMat);
        bag.position.set(lp.x, 0.44 + bagH / 2, lp.z);
        bag.rotation.y = lp.ry;
        bag.castShadow = true;
        cGroup.add(bag);

        // Silver Handle
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.04, 0.06),
          beltRimMat
        );
        handle.position.set(lp.x, 0.44 + bagH + 0.02, lp.z);
        handle.rotation.y = lp.ry;
        cGroup.add(handle);
      });

      // 6. Overhead Twin-Chrome-Pillar FIDS Display Screen at front of carousel (Z = -22.8)
      [-1.3, 1.3].forEach((px) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 2.3, 12),
          beltRimMat
        );
        pole.position.set(px, 1.15, -22.6);
        cGroup.add(pole);
      });

      // FIDS Screen Box
      const screenHousing = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.85, 0.22),
        beltRubberMat
      );
      screenHousing.position.set(0, 2.2, -22.6);
      cGroup.add(screenHousing);

      // FIDS Display Canvas Texture
      const fidsCanvas = document.createElement('canvas');
      fidsCanvas.width = 512;
      fidsCanvas.height = 160;
      const fctx = fidsCanvas.getContext('2d')!;
      fctx.fillStyle = '#0f172a';
      fctx.fillRect(0, 0, 512, 160);
      fctx.strokeStyle = '#38bdf8';
      fctx.lineWidth = 6;
      fctx.strokeRect(4, 4, 504, 152);

      fctx.fillStyle = '#facc15';
      fctx.font = 'bold 36px monospace';
      fctx.fillText(`CONVEYOR 0${claimNum}`, 20, 48);

      fctx.fillStyle = '#38bdf8';
      fctx.font = 'bold 26px sans-serif';
      fctx.fillText(`${flightCode} • ${flightRoute}`, 20, 95);

      fctx.fillStyle = '#4ade80';
      fctx.font = 'bold 22px sans-serif';
      fctx.fillText(statusText, 20, 134);

      const fidsTex = new THREE.CanvasTexture(fidsCanvas);
      fidsTex.colorSpace = THREE.SRGBColorSpace;
      const fidsMat = new THREE.MeshBasicMaterial({ map: fidsTex });

      // Front & rear screen faces
      const fidsScreenFront = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.78), fidsMat);
      fidsScreenFront.position.set(0, 2.2, -22.48);
      cGroup.add(fidsScreenFront);

      const fidsScreenBack = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.78), fidsMat);
      fidsScreenBack.position.set(0, 2.2, -22.72);
      fidsScreenBack.rotation.y = Math.PI;
      cGroup.add(fidsScreenBack);

      // 7. Floor Plaque in front of Carousel
      const plaque = this.createPlaqueMesh(
        `SABUK BAGASI 0${claimNum}`,
        '#f59e0b',
        '#0f172a',
        3.2,
        0.9,
        38,
        flightCode
      );
      plaque.position.set(0, 0.62, -24.0);
      cGroup.add(plaque);

      parent.add(cGroup);
      this.lantai1Meshes.push(cGroup);
    };

    // =========================================================================
    // LANTAI 1 (Y = 0.4m) ARCHITECTURAL MOCKUP — TERMINAL UTAMA, EKSISTING & SELATAN
    // Faithfully matches Page 1 ("Lantai 1") in PDF reference
    // =========================================================================
    const lantai1Group = new THREE.Group();

    // 1A. Lantai 1 Cream-White Diamond Tile Floor across Terminal Utama & Baggage Claim (X: -13 to +61, Z: -38 to -12)
    const l1MainTileFloor = new THREE.Mesh(
      new THREE.BoxGeometry(74.0, 0.14, 26.2),
      l1TileFloorMat
    );
    l1MainTileFloor.position.set(24.0, 0.56, -25.0);
    l1MainTileFloor.receiveShadow = true;
    lantai1Group.add(l1MainTileFloor);
    this.lantai1Meshes.push(l1MainTileFloor);

    // 1B. Front Landside Arrival Concourse Colonnade (2 Rows of 14 White Square Pillars along Z = -37.2 & Z = -32.6)
    for (let px = -9.5; px <= 57.5; px += 5.15) {
      addL1SquareColumn(lantai1Group, px, -37.2, 0.62, 2.55);
      addL1SquareColumn(lantai1Group, px, -32.6, 0.56, 2.55);
    }

    // Two Central Enclosed Information / Ticketing Counter Islands in the Front Arrival Hall (Z = -32.6)
    [16.5, 29.5].forEach((islandX) => {
      addL1Wall(lantai1Group, islandX, -33.6, 6.2, 0.28, 1.85);
      addL1Wall(lantai1Group, islandX, -31.6, 6.2, 0.28, 1.85);
      addL1Wall(lantai1Group, islandX - 3.0, -32.6, 0.28, 2.1, 1.85);
      addL1Wall(lantai1Group, islandX + 3.0, -32.6, 0.28, 2.1, 1.85);
      addL1Wall(lantai1Group, islandX, -32.6, 0.24, 2.0, 1.85);
    });

    // Left (+X: 54..61) & Right (-X: -13..-6) Perimeter Flank Room Bays on Lantai 1
    addL1Wall(lantai1Group, 60.8, -25.0, 0.42, 25.5, 2.45); // Far left outer wall
    addL1Wall(lantai1Group, 54.2, -25.0, 0.35, 22.0, 2.35); // Left inner corridor wall
    for (let rz = -35.0; rz <= -15.0; rz += 3.3) {
      addL1Wall(lantai1Group, 57.5, rz, 6.6, 0.28, 2.35);
    }

    addL1Wall(lantai1Group, -12.8, -25.0, 0.42, 25.5, 2.45); // Far right outer wall
    addL1Wall(lantai1Group, -6.2, -25.0, 0.35, 22.0, 2.35);  // Right inner corridor wall
    for (let rz = -35.0; rz <= -15.0; rz += 3.3) {
      addL1Wall(lantai1Group, -9.5, rz, 6.6, 0.28, 2.35);
    }

    // 1C. Middle-Front Partitioned Arrival Offices, Customs, VIP Suites & Restrooms Band (Z: -29.2 to -22.2)
    addL1Wall(lantai1Group, 24.0, -29.2, 60.0, 0.36, 2.35); // Front wall of office band
    addL1Wall(lantai1Group, 24.0, -25.6, 58.0, 0.32, 2.35); // Internal corridor spine wall
    addL1Wall(lantai1Group, 24.0, -22.2, 60.0, 0.38, 2.35); // Wall separating offices from Baggage Claim Hall
    for (let ox = -4.0; ox <= 52.0; ox += 4.6) {
      addL1Wall(lantai1Group, ox, -27.4, 0.28, 3.5, 2.35);
      if (Math.abs(ox - 23.6) > 3.0) {
        addL1Wall(lantai1Group, ox + 1.2, -23.9, 0.28, 3.3, 2.35);
      }
    }

    // Arrival Customs & Immigration Inspection Counters (Z: -26.5 to -28.5)
    for (let cx = 6.0; cx <= 42.0; cx += 11.0) {
      const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 1.2), partitionWallMat);
      table.position.set(cx, 0.62 + 0.48, -27.0);
      table.castShadow = true;
      lantai1Group.add(table);
      this.lantai1Meshes.push(table);

      const pc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.08), beltRubberMat);
      pc.position.set(cx, 0.62 + 0.95 + 0.22, -27.0);
      lantai1Group.add(pc);
      this.lantai1Meshes.push(pc);

      const portal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.3, 0.8), beltRubberMat);
      portal.position.set(cx - 2.4, 0.62 + 1.15, -27.0);
      lantai1Group.add(portal);
      this.lantai1Meshes.push(portal);
    }

    // Customs & Arrival Sign Plaque
    const customsPlaque = this.createPlaqueMesh(
      'PEMERIKSAAN KEDATANGAN & BEA CUKAI',
      '#0284c7',
      '#ffffff',
      9.5,
      1.3,
      34,
      'CUSTOMS & QUARANTINE INSPECTION'
    );
    customsPlaque.position.set(24.0, 0.62, -29.2);
    lantai1Group.add(customsPlaque);
    this.lantai1Meshes.push(customsPlaque);

    // 1D. Middle Baggage Claim Hall (Z: -22.2 to -12.0) — 4 Prominent Racetrack Carousels (Conveyor Sabuk Bagasi)
    // As explicitly shown in the Red Box ("Terminal utama") of PDF Page 1
    addL1Wall(lantai1Group, 33.0, -17.1, 0.38, 10.2, 2.40); // Partition separating Carousel 1/2 from 3/4
    addL1Wall(lantai1Group, 21.0, -12.0, 64.0, 0.42, 2.45); // Continuous rear BHS partition wall at Z = -12.0

    // Build the 4 Large Racetrack Baggage Claim Carousels matching Page 1
    addL1DetailedCarousel(lantai1Group, 39.0, 1, 'GA 612 CGK', 'JAKARTA (CGK)', 'LANDED • CLAIM READY');
    addL1DetailedCarousel(lantai1Group, 27.0, 2, 'JT 780 SUB', 'SURABAYA (SUB)', 'DELIVERING BAGGAGE');
    addL1DetailedCarousel(lantai1Group, 15.0, 3, 'QG 314 DPS', 'DENPASAR (DPS)', 'DELIVERING BAGGAGE');
    addL1DetailedCarousel(lantai1Group, 3.0, 4, 'ID 6288 AMQ', 'AMBON (AMQ)', 'BAGGAGE COMPLETE');

    // Structural columns in front of carousels
    for (let cx = -3.0; cx <= 45.0; cx += 12.0) {
      addL1SquareColumn(lantai1Group, cx, -21.5, 0.58, 2.5);
    }

    // =========================================================================
    // 1E & 1F. TERMINAL EKSISTING — LANTAI 1 ARCHITECTURAL MOCKUP
    // High-precision 1:1 3D reconstruction of reference:
    // https://i.ibb.co.com/2YSprwpW/Tanpa-judul-920-x-197-mm-5.png
    // Spanning X: +66.5 (East/Left L-Wing) to -16.8 (West/Right Wing), Z: -10.8 to +19.4
    // =========================================================================
    const eksRoadApronMat = new THREE.MeshStandardMaterial({
      color: 0x76726e,
      roughness: 0.88,
      metalness: 0.06,
    });
    const eksSidewalkCurbMat = new THREE.MeshStandardMaterial({
      color: 0xa6a29c,
      roughness: 0.72,
      metalness: 0.08,
    });
    const eksRecessedBayMat = new THREE.MeshStandardMaterial({
      color: 0x4b4845,
      roughness: 0.85,
      metalness: 0.1,
    });
    const eksSmoothGreyFloorMat = new THREE.MeshStandardMaterial({
      color: 0xcdd0d5,
      roughness: 0.56,
      metalness: 0.08,
    });
    const eksSunkenAlleyMat = new THREE.MeshStandardMaterial({
      color: 0x8b8e94,
      roughness: 0.76,
      metalness: 0.08,
    });
    const eksTerrazzoFloorMat = new THREE.MeshStandardMaterial({
      map: this.createEksistingTerrazzoTexture(),
      roughness: 0.42,
      metalness: 0.06,
    });

    const addEksFloorSlab = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      mat: THREE.Material,
      yPos: number = 0.57,
      thickness: number = 0.14
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
      m.position.set(cx, yPos, cz);
      m.receiveShadow = true;
      lantai1Group.add(m);
      this.lantai1Meshes.push(m);
    };

    const addEksRoomBox = (
      rx: number,
      rz: number,
      rw: number,
      rd: number,
      subDivsX: number = 1,
      subDivsZ: number = 1,
      wallH: number = 2.38,
      rotY: number = 0
    ) => {
      const rGroup = new THREE.Group();
      rGroup.position.set(rx, 0, rz);
      rGroup.rotation.y = rotY;

      const addLocalWall = (lx: number, lz: number, lw: number, ld: number) => {
        const wg = new THREE.Group();
        wg.position.set(lx, 0.62 + wallH / 2, lz);
        const wm = new THREE.Mesh(new THREE.BoxGeometry(lw, wallH, ld), partitionWallMat);
        wm.castShadow = true;
        wm.receiveShadow = true;
        wg.add(wm);
        const cm = new THREE.Mesh(new THREE.BoxGeometry(lw + 0.05, 0.1, ld + 0.05), wallCapMat);
        cm.position.y = wallH / 2 + 0.05;
        wg.add(cm);
        rGroup.add(wg);
      };

      addLocalWall(0, -rd / 2, rw, 0.28);
      addLocalWall(0, rd / 2, rw, 0.28);
      addLocalWall(-rw / 2, 0, 0.28, rd);
      addLocalWall(rw / 2, 0, 0.28, rd);

      for (let sx = 1; sx < subDivsX; sx++) {
        const dx = -rw / 2 + (rw / subDivsX) * sx;
        addLocalWall(dx, 0, 0.24, rd);
      }
      for (let sz = 1; sz < subDivsZ; sz++) {
        const dz = -rd / 2 + (rd / subDivsZ) * sz;
        addLocalWall(0, dz, rw, 0.24);
      }

      lantai1Group.add(rGroup);
      this.lantai1Meshes.push(rGroup);
    };

    // -------------------------------------------------------------------------
    // 0. SURROUNDING ASPHALT SERVICE ROAD, CONCRETE CURB PERIMETER & 3 RECESSED BAYS
    // -------------------------------------------------------------------------
    // Asphalt roadway apron framing Terminal Eksisting Lantai 1
    addEksFloorSlab(25.2, 4.2, 87.5, 30.8, eksRoadApronMat, 0.46, 0.10);

    // Light-grey concrete sidewalk / curb border hugging the building footprint
    addEksFloorSlab(24.0, 5.8, 79.6, 22.8, eksSidewalkCurbMat, 0.50, 0.12);
    // Bottom-left L-wing concrete sidewalk extension
    addEksFloorSlab(60.2, -7.2, 13.8, 4.8, eksSidewalkCurbMat, 0.50, 0.12);
    // Top-center protruding block sidewalk border
    addEksFloorSlab(9.0, 17.2, 17.2, 3.8, eksSidewalkCurbMat, 0.50, 0.12);
    // Bottom-right 3-bay concrete sidewalk border
    addEksFloorSlab(-14.8, -0.8, 5.8, 7.6, eksSidewalkCurbMat, 0.50, 0.12);

    // 3 Dark-Grey Recessed Rectangular Loading / Drop-Off Bays along the Bottom Edge (Z = -4.6)
    [
      { x: 26.5, w: 5.6, d: 1.7 },
      { x: 5.8,  w: 6.8, d: 1.7 },
      { x: -8.2, w: 4.4, d: 1.5 },
    ].forEach((bay) => {
      addEksFloorSlab(bay.x, -4.55, bay.w, bay.d, eksRecessedBayMat, 0.53, 0.12);
      addL1Wall(lantai1Group, bay.x, -4.55 - bay.d / 2, bay.w + 0.2, 0.18, 0.45);
      addL1Wall(lantai1Group, bay.x - bay.w / 2, -4.55, 0.18, bay.d, 0.45);
      addL1Wall(lantai1Group, bay.x + bay.w / 2, -4.55, 0.18, bay.d, 0.45);
    });

    // -------------------------------------------------------------------------
    // 1. FAR-LEFT VERTICAL L-SHAPED SERVICE & TECHNICAL WING (X: +54.2 to +65.6, Z: -8.2 to +14.8)
    // -------------------------------------------------------------------------
    // Sunken vertical service alley between main left wall (X=54.2) and L-wing (X=58.4)
    addEksFloorSlab(56.3, 5.5, 4.2, 18.6, eksSunkenAlleyMat, 0.53, 0.12);
    // Raised light-grey platform at the bottom of the vertical service alley
    addEksFloorSlab(56.3, -5.0, 4.2, 2.8, eksSmoothGreyFloorMat, 0.57, 0.16);
    addL1Wall(lantai1Group, 56.3, -6.4, 4.2, 0.26, 1.2);
    addL1Wall(lantai1Group, 56.3, -3.6, 4.2, 0.26, 1.2);

    // Main floor of Far-Left Vertical Wing (X: +58.4 to +65.4, Z: -8.2 to +14.6)
    addEksFloorSlab(61.9, 3.2, 7.0, 22.8, eksSmoothGreyFloorMat, 0.57, 0.14);
    // Bottom-Left Horizontal L-Hook Floor (X: +56.6 to +65.4, Z: -8.2 to -5.6)
    addEksFloorSlab(61.0, -6.9, 8.8, 2.6, eksSmoothGreyFloorMat, 0.57, 0.14);

    // Right inner wall of Far-Left Wing (X = +58.4, Z: -5.6 to +14.6) & Top wall (Z = +14.6)
    addL1Wall(lantai1Group, 58.4, 4.5, 0.36, 20.2, 2.40);
    addL1Wall(lantai1Group, 61.4, 14.6, 6.2, 0.36, 2.40);
    // Inner corridor divider wall at X = +61.4 (Z: -5.6 to +14.6)
    addL1Wall(lantai1Group, 61.4, 4.5, 0.30, 20.2, 2.38);
    // Outer-left slightly angled perimeter wall (X: +64.4 at top to +65.4 at bottom)
    addL1Wall(lantai1Group, 64.9, 3.2, 0.38, 22.9, 2.40, -0.045);

    // 5 Square Structural Pillars inside the Far-Left Vertical Corridor (X = +60.2)
    [-4.2, -0.6, 3.0, 6.6, 10.2].forEach((pz) => {
      addL1SquareColumn(lantai1Group, 60.2, pz, 0.48, 2.45);
    });

    // 12 Stacked Small Technical / Office / Lavatory Rooms along the Outer-Left Strip (X: +61.4 to +64.9)
    for (let rz = -5.6; rz <= 13.8; rz += 1.62) {
      addL1Wall(lantai1Group, 63.1, rz, 3.5, 0.24, 2.35);
      // Internal sub-partitions inside alternating rooms matching the dense left strip
      if (Math.round(rz * 10) % 3 === 0) {
        addL1Wall(lantai1Group, 63.0, rz + 0.8, 0.22, 1.55, 2.30);
      }
    }

    // Bottom-Left Horizontal L-Hook with 5 Narrow Vertical Stalls (X: +56.6 to +65.2, Z: -8.2 to -5.6)
    addL1Wall(lantai1Group, 60.9, -8.2, 8.8, 0.36, 2.40); // Bottom outer wall
    addL1Wall(lantai1Group, 60.2, -5.6, 7.4, 0.32, 2.38); // Top wall of bottom bar
    addL1Wall(lantai1Group, 56.6, -6.9, 0.34, 2.6, 2.40); // Right end cap of L-hook
    [58.0, 59.3, 60.6, 61.9, 63.2].forEach((sx) => {
      addL1Wall(lantai1Group, sx, -6.9, 0.24, 2.5, 2.35);
    });

    // -------------------------------------------------------------------------
    // 2. LEFT MAIN SECTION — SMOOTH GREY BHS / OPERATIONAL HALL & LOWER OFFICE BLOCK
    // Spanning X: +35.5 to +54.2, Z: -3.6 to +15.2
    // -------------------------------------------------------------------------
    addEksFloorSlab(44.85, 5.8, 18.7, 18.8, eksSmoothGreyFloorMat, 0.57, 0.14);

    // Perimeter Walls of Left Main Section
    addL1Wall(lantai1Group, 54.2, 5.8, 0.40, 18.8, 2.42);  // Left outer wall (X = +54.2)
    addL1Wall(lantai1Group, 44.85, 15.2, 18.7, 0.38, 2.42); // Top airside wall (Z = +15.2)
    addL1Wall(lantai1Group, 44.85, -3.6, 18.7, 0.38, 2.42); // Bottom landside wall (Z = -3.6)

    // Small Enclosed Alcove Room against Top Wall (X = +46.2, Z = +14.4)
    addEksRoomBox(46.2, 14.4, 2.9, 1.5, 1, 1, 2.38);

    // 3 Rows of White Square Structural Columns inside the Left Hall
    // Top row (Z = +14.0): 5 columns
    [51.6, 48.8, 43.2, 40.2, 37.2].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 14.0, 0.52, 2.50);
    });
    // Middle row (Z = +9.2): 8 columns (with central close pair/triplet at X=47.2, 45.9, 44.6)
    [52.6, 49.8, 47.2, 45.9, 44.6, 41.8, 39.0, 36.4].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 9.2, 0.52, 2.50);
    });
    // Lower-middle row (Z = +4.5): 4 columns on the right half of this hall
    [43.4, 41.0, 38.6, 36.3].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 4.5, 0.52, 2.50);
    });

    // Lower-Left Dense Office / Locker Sub-Grid (X: +44.2 to +54.0, Z: -0.2 to +4.2)
    addEksRoomBox(49.1, 2.0, 9.8, 4.4, 5, 2, 2.38);
    // Protruding small control box at top-right of the locker grid (X = +45.0, Z = +3.6)
    addEksRoomBox(45.0, 3.6, 2.2, 1.4, 1, 1, 2.38);

    // Bottom Row of 4 Large Square/Rectangular Rooms along Z: -3.6 to -0.2 (X: +35.5 to +54.0)
    addL1Wall(lantai1Group, 44.75, -0.2, 18.5, 0.30, 2.38);
    [50.4, 46.2, 41.8, 38.2].forEach((divX) => {
      addL1Wall(lantai1Group, divX, -1.9, 0.28, 3.4, 2.38);
    });
    // Internal sub-walls in the right-most room of the bottom row (X: 35.5 to 41.8)
    addL1Wall(lantai1Group, 38.6, 0.9, 6.2, 0.26, 2.35);
    addL1Wall(lantai1Group, 40.2, 0.3, 0.26, 1.4, 2.35);

    // -------------------------------------------------------------------------
    // 3. LEFT-CENTER FULL-HEIGHT VERTICAL TRIPLE-COLUMN ROOM SPINE
    // Spanning X: +29.5 to +35.5, Z: -3.6 to +15.2
    // -------------------------------------------------------------------------
    addEksFloorSlab(32.5, 5.8, 6.0, 18.8, eksSmoothGreyFloorMat, 0.57, 0.14);

    // 4 Vertical Spine Walls (X = +35.5, +33.6, +31.4, +29.5) from Z = +2.6 to +15.2
    addL1Wall(lantai1Group, 35.5, 8.9, 0.34, 12.6, 2.40);
    addL1Wall(lantai1Group, 33.6, 8.9, 0.28, 12.6, 2.38);
    addL1Wall(lantai1Group, 31.4, 8.9, 0.28, 12.6, 2.38);
    addL1Wall(lantai1Group, 29.5, 8.9, 0.34, 12.6, 2.40);
    addL1Wall(lantai1Group, 32.5, 15.2, 6.0, 0.38, 2.42); // Top cap wall

    // 6 Stacked Rooms in Left Column (X: 33.6..35.5) & Right Column (X: 29.5..31.4)
    [13.1, 11.0, 8.9, 6.8, 4.7, 2.6].forEach((rz) => {
      addL1Wall(lantai1Group, 34.55, rz, 1.9, 0.24, 2.36);
      addL1Wall(lantai1Group, 30.45, rz, 1.9, 0.24, 2.36);
    });
    // Central elongated vertical shaft box inside X: 31.4..33.6 (Z: +5.0 to +12.2)
    addEksRoomBox(32.5, 8.6, 1.3, 7.2, 1, 2, 2.36);

    // Lower Block of Vertical Spine (Z: -3.6 to +2.6, X: +29.5 to +35.5)
    addEksRoomBox(32.5, 1.2, 6.0, 2.8, 3, 2, 2.38); // Middle lavatory/utility rooms
    addEksRoomBox(32.5, -1.9, 6.0, 3.4, 4, 1, 2.38); // Bottom row of 4 narrow vertical rooms

    // -------------------------------------------------------------------------
    // 4. CENTRAL SECTION — DUAL-ZONE CONCOURSE, NARROW ISLAND BAR, TOP STEPPED
    //    MULTI-ROOM EXTENSION & LOWER SPECKLED TERRAZZO HALL (X: +1.5 to +29.5)
    // -------------------------------------------------------------------------
    // 4A. Upper & Middle Smooth Light-Grey Concourse Floor (X: +1.5 to +29.5, Z: +5.2 to +15.2)
    addEksFloorSlab(15.5, 10.2, 28.0, 10.0, eksSmoothGreyFloorMat, 0.57, 0.14);
    // Top-center protruding block floor (X: +1.5 to +16.5, Z: +15.2 to +18.0)
    addEksFloorSlab(9.0, 16.6, 15.0, 2.8, eksSmoothGreyFloorMat, 0.57, 0.14);

    // Top wall from X = +16.5 to +29.5 (Z = +15.2)
    addL1Wall(lantai1Group, 23.0, 15.2, 13.0, 0.38, 2.42);

    // Small Angled/Trapezoidal Room Enclosure near Top-Left of Central Hall (X = +22.8, Z = +14.1)
    addEksRoomBox(22.8, 14.1, 2.3, 1.8, 2, 1, 2.38, -0.26);
    // Rectangular Room Box against Top Wall (X = +14.8, Z = +14.1)
    addEksRoomBox(14.8, 14.1, 3.4, 1.8, 1, 1, 2.38);

    // =========================================================================
    // TOP-CENTER RED-MARKED MULTI-ROOM COMPLEX ON LT. 1 EKSISTING
    // Exact 1:1 3D Interior Reconstruction of Reference:
    // https://i.ibb.co.com/GQyKsYTj/Tanpa-judul-920-x-197-mm-6.png
    // Kode Ruangan:
    // 1. R. Standby (Bottom-Center Room & Right Wing Bay 2)
    // 2. Storage (Right Wing Bay 3 with Brown Crates & Shelving)
    // 3. Restroom (Right Wing Bay 4 & Top-Center 4-Stall Toilet)
    // 4. Control Room (Middle-Center Room with NOC Workstation Island & 6 Chairs)
    // 5. Data Center Lama (Middle-Left Room with 2 Rows of Black 42U Server Racks)
    // 6. Data Center Baru (Middle-Right Large Room with 4 Rows of High-Density Server Racks)
    // =========================================================================
    // Left stepped bay outside red box (X: +11.6 to +16.5, Z: +15.2 to +17.4)
    addEksRoomBox(14.05, 16.3, 4.9, 2.2, 1, 1, 2.40);

    const dcComplexGroup = new THREE.Group();
    const dcWallH = 2.38;
    const dcFloorY = 0.60;

    // Materials for detailed Data Center, Control Room, Storage, Standby & Restroom interiors
    const dcRaisedFloorMat = new THREE.MeshStandardMaterial({
      color: 0xb8bec6,
      roughness: 0.45,
      metalness: 0.14,
    });
    const dcControlFloorMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3cd,
      roughness: 0.48,
      metalness: 0.08,
    });
    const dcWhiteFloorMat = new THREE.MeshStandardMaterial({
      color: 0xf4f5f7,
      roughness: 0.35,
      metalness: 0.06,
    });
    const dcRackBlackMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.32,
      metalness: 0.65,
    });
    const dcRackGreyMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.36,
      metalness: 0.58,
    });
    const dcCableTrayMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.5,
      metalness: 0.5,
    });
    const dcDeskWoodMat = new THREE.MeshStandardMaterial({
      color: 0xd4c5b1,
      roughness: 0.45,
      metalness: 0.1,
    });
    const dcBoxBrownMat = new THREE.MeshStandardMaterial({
      color: 0x92623a,
      roughness: 0.72,
      metalness: 0.05,
    });
    const dcWoodFrameMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.55,
      metalness: 0.1,
    });
    const dcYellowFrameMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });

    const addDcWall = (cx: number, cz: number, w: number, d: number, h: number = dcWallH) => {
      const wg = new THREE.Group();
      wg.position.set(cx, 0.62 + h / 2, cz);
      const wm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), partitionWallMat);
      wm.castShadow = true;
      wm.receiveShadow = true;
      wg.add(wm);
      const cm = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.09, d + 0.04), wallCapMat);
      cm.position.y = h / 2 + 0.045;
      wg.add(cm);
      dcComplexGroup.add(wg);
    };

    const addDcFloor = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      mat: THREE.Material,
      roomCode?: number
    ) => {
      const fm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), mat);
      fm.position.set(cx, dcFloorY, cz);
      fm.receiveShadow = true;
      if (roomCode) {
        fm.userData = { type: 'eksisting_room_complex', roomCode };
        this.interactableObjects.push(fm);

        // Soft highlight overlay mesh when a specific room code is selected
        const hlMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const hlMesh = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.15, d - 0.15), hlMat);
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.position.set(cx, dcFloorY + 0.11, cz);
        dcComplexGroup.add(hlMesh);
        const list = this.eksistingRoomHighlightMeshes.get(roomCode) || [];
        list.push(hlMesh);
        this.eksistingRoomHighlightMeshes.set(roomCode, list);
      }
      dcComplexGroup.add(fm);
    };

    // Helper to create bold black room-code number plaque (1, 2, 3, 4, 5, 6) matching the reference image
    const addRoomNumberBadge = (numStr: string, roomCode: number, x: number, z: number, scale: number = 1.05) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Subtle translucent white halo disc for high contrast from any angle
      ctx.beginPath();
      ctx.arc(128, 128, 108, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#10b981';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#09090b';
      ctx.font = '900 156px system-ui, -apple-system, sans-serif';
      ctx.fillText(numStr, 128, 136);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), mat);
      badge.rotation.x = -Math.PI / 2;
      // Rotate PI around Z so when viewed from Z=-25 looking towards +Z, the number is right-side up!
      badge.rotation.z = Math.PI;
      badge.position.set(x, 2.35, z);
      badge.userData = { type: 'eksisting_room_complex', roomCode };
      this.interactableObjects.push(badge);
      dcComplexGroup.add(badge);
    };

    // -------------------------------------------------------------------------
    // A. MAIN LEFT-CENTER BLOCK (X: +3.6 to +11.5, Z: +12.0 to +18.0)
    // -------------------------------------------------------------------------
    // 1. Top Row (Z: +16.2 to +18.0): Utility Room, 4-Stall Restroom, M&E Shafts
    addDcFloor(10.05, 17.1, 2.9, 1.8, dcControlFloorMat); // Top-left enclosed room
    addDcFloor(7.5, 17.1, 1.8, 1.8, dcWhiteFloorMat, 3);  // Top-middle 4-stall toilet
    addDcFloor(5.85, 17.1, 1.5, 1.8, dcControlFloorMat);  // Top-right-center room
    addDcFloor(4.2, 17.1, 1.2, 1.8, dcControlFloorMat);   // Top-right room

    // Outer top walls & dividers for Top Row (Z = +18.0 and Z = +16.2)
    addDcWall(7.55, 18.0, 7.9, 0.22);
    addDcWall(7.55, 16.2, 7.9, 0.22);
    addDcWall(11.5, 17.1, 0.22, 1.8);
    addDcWall(8.6, 17.1, 0.18, 1.8);
    addDcWall(8.35, 17.1, 0.16, 1.8);
    addDcWall(6.6, 17.1, 0.18, 1.8);
    addDcWall(5.1, 17.1, 0.18, 1.8);
    addDcWall(4.8, 17.1, 0.18, 1.8);
    addDcWall(3.6, 17.1, 0.22, 1.8);

    // 2x2 Restroom Stalls & Ceramic Toilet Fixtures inside Top-Middle Toilet (X: +6.6 to +8.35, Z: +16.2 to +18.0)
    addDcWall(7.48, 17.1, 1.75, 0.12, 1.9);
    addDcWall(7.48, 17.1, 0.12, 1.75, 1.9);
    [
      { x: 7.9, z: 17.55 },
      { x: 7.05, z: 17.55 },
      { x: 7.9, z: 16.65 },
      { x: 7.05, z: 16.65 },
    ].forEach((tl) => {
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.36), partitionWallMat);
      fixture.position.set(tl.x, 0.85, tl.z);
      dcComplexGroup.add(fixture);
    });

    // 2. Middle Row (Z: +13.6 to +16.2):
    //    Room 5 (Data Center Lama), Room 4 (Control Room), Room 6 (Data Center Baru)
    // --- ROOM 5: DATA CENTER LAMA (X: +8.7 to +11.5, Z: +13.6 to +16.2) ---
    addDcFloor(10.1, 14.9, 2.8, 2.6, dcRaisedFloorMat, 5);
    addDcWall(11.5, 14.9, 0.22, 2.6); // Left outer wall
    addDcWall(8.7, 14.9, 0.20, 2.6);  // Partition wall between Room 5 & Room 4
    addDcWall(10.1, 13.6, 2.8, 0.20); // Bottom wall of Room 5

    // 2 Parallel Vertical Rows of 6 Black 42U Server Racks inside Room 5 (Data Center Lama)
    [10.65, 9.5].forEach((rackX) => {
      for (let rz = 14.0; rz <= 15.8; rz += 0.34) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.45, 0.30), dcRackBlackMat);
        rack.position.set(rackX, 0.68 + 0.725, rz);
        rack.castShadow = true;
        rack.userData = { type: 'eksisting_room_complex', roomCode: 5 };
        this.interactableObjects.push(rack);
        dcComplexGroup.add(rack);
      }
      // Overhead cable tray ladder above each rack row
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 2.3), dcCableTrayMat);
      tray.position.set(rackX, 2.22, 14.9);
      dcComplexGroup.add(tray);
    });
    // Cross cable tray bridges in Room 5
    [14.3, 15.5].forEach((cz) => {
      const cTray = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.18), dcCableTrayMat);
      cTray.position.set(10.1, 2.24, cz);
      dcComplexGroup.add(cTray);
    });
    addRoomNumberBadge('5', 5, 10.08, 14.9, 1.15);

    // --- ROOM 4: CONTROL ROOM (X: +6.5 to +8.7, Z: +13.6 to +16.2) ---
    addDcFloor(7.6, 14.9, 2.2, 2.6, dcControlFloorMat, 4);
    addDcWall(6.5, 14.9, 0.20, 2.6);  // Partition wall between Room 4 & Room 6
    // Bottom wall of Room 4 (Z = +13.6) with open doorway (X: 8.06..8.44) connecting Room 1 (R. Standby) to Room 4 (Control Room)
    addDcWall(7.28, 13.6, 1.56, 0.16); // Right segment of wall at Z=13.6 (X: 6.50..8.06)
    addDcWall(8.57, 13.6, 0.26, 0.16); // Left jamb segment at Z=13.6 (X: 8.44..8.70)

    // Central NOC / Control Room Conference & Operator Desk Island in Room 4
    const ctrlTable = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.58, 1.35), dcDeskWoodMat);
    ctrlTable.position.set(7.45, 0.68 + 0.29, 14.9);
    ctrlTable.castShadow = true;
    ctrlTable.userData = { type: 'eksisting_room_complex', roomCode: 4 };
    this.interactableObjects.push(ctrlTable);
    dcComplexGroup.add(ctrlTable);

    // Dual Operator Monitors on Control Room Desk
    [-0.32, 0.0, 0.32].forEach((dz) => {
      const mon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.26), dcRackBlackMat);
      mon.position.set(7.45, 0.68 + 0.68, 14.9 + dz);
      dcComplexGroup.add(mon);
    });
    // 6 Black Ergonomic Operator Chairs flanking the Control Desk
    [-0.42, 0.0, 0.42].forEach((dz) => {
      [-0.52, 0.52].forEach((dx) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.24), dcRackBlackMat);
        chair.position.set(7.45 + dx, 0.68 + 0.24, 14.9 + dz);
        dcComplexGroup.add(chair);
      });
    });
    addRoomNumberBadge('4', 4, 7.62, 14.9, 1.15);

    // --- ROOM 6: DATA CENTER BARU (X: +3.6 to +6.5, Z: +13.1 to +16.2) ---
    addDcFloor(5.05, 14.65, 2.9, 3.1, dcRaisedFloorMat, 6);
    addDcWall(3.6, 14.65, 0.22, 3.1); // Right wall of Room 6 bordering vertical corridor
    addDcWall(5.05, 13.1, 2.9, 0.22); // Bottom wall of Room 6

    // 4 Parallel Vertical Rows of 8 High-Density Server Racks inside Room 6 (Data Center Baru)
    [6.02, 5.38, 4.74, 4.10].forEach((rackX) => {
      for (let rz = 13.75; rz <= 15.55; rz += 0.25) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.48, 0.22), dcRackGreyMat);
        rack.position.set(rackX, 0.68 + 0.74, rz);
        rack.castShadow = true;
        rack.userData = { type: 'eksisting_room_complex', roomCode: 6 };
        this.interactableObjects.push(rack);
        dcComplexGroup.add(rack);
      }
      // Overhead containment / cable runner per row
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 2.1), dcCableTrayMat);
      runner.position.set(rackX, 2.22, 14.65);
      dcComplexGroup.add(runner);
    });
    // Top-wall CRAC Precision Cooling Units (Z = +15.98) & Bottom-wall PDU/UPS Cabinets (Z = +13.32)
    [5.8, 5.05, 4.3].forEach((ux) => {
      const crac = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.52, 0.26), dcRackBlackMat);
      crac.position.set(ux, 0.68 + 0.76, 15.98);
      dcComplexGroup.add(crac);

      const ups = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.35, 0.24), dcCableTrayMat);
      ups.position.set(ux, 0.68 + 0.675, 13.32);
      dcComplexGroup.add(ups);
    });
    addRoomNumberBadge('6', 6, 4.95, 14.65, 1.18);

    // 3. Bottom Row under Rooms 5 & 4 (X: +5.8 to +11.5, Z: +12.0 to +13.6)
    // Bottom-Left Enclosed White Room (X: +8.7 to +11.5, Z: +12.0 to +13.6)
    addDcFloor(10.1, 12.8, 2.8, 1.6, dcWhiteFloorMat);
    addDcWall(11.5, 12.8, 0.22, 1.6);
    addDcWall(10.1, 12.0, 2.8, 0.22);
    addDcWall(8.7, 12.8, 0.16, 1.6);

    // =========================================================================
    // --- ROOM 1 (GREEN-MARKED ROOM): R. STANDBY (X: +7.25 to +8.70, Z: +12.0 to +13.6) ---
    // Built in full 3D matching the 5 reference images:
    //  - Denah Hijau (Tanpa_judul__920_x_197_mm___7__94ceae72.png):
    //      depan = +X wall (X = 8.70), belakang = -X wall (X = 7.25),
    //      kanan = +Z wall (Z = 13.60), Kiri = -Z wall (Z = 12.00)
    //  - Tampilan Depan (Tampilan_Depan_a8f44f77.jpeg)
    //  - Tampilan Belakang (Tampilan_Belakang_2314ea8a.jpeg)
    //  - Tampilan Kanan (Tampilan_Kanan_7e5f03f3.jpeg)
    //  - Tampilan Kiri (Tampilan_kiri_634fbe9b.jpeg)
    // =========================================================================
    const r1CreamTileMat = new THREE.MeshStandardMaterial({
      color: 0xefe7d6,
      roughness: 0.26,
      metalness: 0.08,
    });
    const r1TileGroutMat = new THREE.MeshBasicMaterial({
      color: 0xcbbfa8,
    });
    addDcFloor(7.98, 12.8, 1.46, 1.6, r1CreamTileMat, 1);

    // Subtle ceramic floor tile grout grid inside Room 1 & hallway
    for (let tx = 7.45; tx <= 8.55; tx += 0.28) {
      const gLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 1.56), r1TileGroutMat);
      gLine.position.set(tx, 0.682, 12.8);
      dcComplexGroup.add(gLine);
    }
    for (let tz = 12.22; tz <= 13.45; tz += 0.28) {
      const gLine = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.004, 0.008), r1TileGroutMat);
      gLine.position.set(7.98, 0.682, tz);
      dcComplexGroup.add(gLine);
    }

    // Sisi Kiri (-Z wall at Z = 12.0) & Sisi Belakang (-X partial partition wall at X = 7.25, Z: 12.0..12.96)
    addDcWall(7.98, 12.0, 1.46, 0.16); // Sisi Kiri (-Z wall)
    addDcWall(7.25, 12.48, 0.15, 0.96); // Sisi Belakang solid right half (-X wall, leaving Z: 12.96..13.56 open to hallway)

    // Bright Green 3D Outline Frame around Room 1 matching Tanpa_judul__920_x_197_mm___7__94ceae72.png
    const r1GreenOutlineMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const r1GreenTopN = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.045, 0.055), r1GreenOutlineMat);
    r1GreenTopN.position.set(7.98, 2.26, 13.60);
    dcComplexGroup.add(r1GreenTopN);
    const r1GreenTopS = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.045, 0.055), r1GreenOutlineMat);
    r1GreenTopS.position.set(7.98, 2.26, 12.00);
    dcComplexGroup.add(r1GreenTopS);
    const r1GreenTopE = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 1.65), r1GreenOutlineMat);
    r1GreenTopE.position.set(8.70, 2.26, 12.80);
    dcComplexGroup.add(r1GreenTopE);
    const r1GreenTopW = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 1.65), r1GreenOutlineMat);
    r1GreenTopW.position.set(7.25, 2.26, 12.80);
    dcComplexGroup.add(r1GreenTopW);

    // Helper to add 3D directional text labels ("depan", "belakang", "kanan", "Kiri") around the green box
    const addRoom1SideLabel = (text: string, lx: number, lz: number, rotZ: number = Math.PI) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 96;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(8, 12, 240, 72, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.font = '900 44px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 50);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.21), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rotZ;
      mesh.position.set(lx, 2.34, lz);
      dcComplexGroup.add(mesh);
    };
    addRoom1SideLabel('depan', 8.92, 12.80, Math.PI);
    addRoom1SideLabel('belakang', 7.02, 12.80, Math.PI);
    addRoom1SideLabel('kanan', 7.98, 13.78, Math.PI);
    addRoom1SideLabel('Kiri', 7.98, 11.82, Math.PI);

    // Shared Materials for Room 1 Furniture & Appliances
    const r1BrownWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.55, metalness: 0.08 });
    const r1DarkSlattedMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.45, metalness: 0.22 });
    const r1BlueChairMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, metalness: 0.05 });
    const r1YellowVestMat = new THREE.MeshStandardMaterial({
      color: 0xd9f99d,
      emissive: 0x84cc16,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    });
    const r1SilverMetalMat = new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.22, metalness: 0.82 });
    const r1GlossBlackMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.18, metalness: 0.35 });
    const r1WaterGallonMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
      metalness: 0.1,
    });
    const r1GreySofaMat = new THREE.MeshStandardMaterial({ color: 0x787c85, roughness: 0.75, metalness: 0.04 });
    const r1GreenSeatMat = new THREE.MeshStandardMaterial({ color: 0x4d9c2d, roughness: 0.38, metalness: 0.25 });
    const r1TealSeatMat = new THREE.MeshStandardMaterial({ color: 0x0d8a72, roughness: 0.38, metalness: 0.25 });
    const r1RedAparMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.25 });
    const r1CardboardMat = new THREE.MeshStandardMaterial({ color: 0xb08254, roughness: 0.75 });
    const r1BlueScreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const r1DarkWindowMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.65,
      transparent: true,
      opacity: 0.88,
    });

    const markR1Interactable = (obj: THREE.Object3D) => {
      obj.userData = { type: 'eksisting_room_complex', roomCode: 1 };
      if (obj instanceof THREE.Mesh) {
        this.interactableObjects.push(obj);
      }
    };

    // -------------------------------------------------------------------------
    // 1. TAMPILAN DEPAN (+X WALL AT X = 8.70, Z: 12.0..13.6)
    //    - Brown wooden PC desk with 3 drawers, white LCD monitor, black PC tower, subwoofer
    //    - Tilted blue/white CCTV/NMS monitoring TV + digital clock on wall above desk
    //    - Silver tall water dispenser
    //    - Glossy black floral single-door refrigerator (with red biscuit tins & white bowl on top)
    //    - 8 blue 19L water gallons in 2 rows on floor + black tripod stand with gooseneck arm
    //    - Cylindrical stainless-steel trash bin with dome lid at right corner
    // -------------------------------------------------------------------------
    // Brown Wooden PC Desk (X = 8.46, Z = 12.32)
    const r1PcDeskTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.52), r1BrownWoodMat);
    r1PcDeskTop.position.set(8.46, 0.68 + 0.42, 12.32);
    r1PcDeskTop.castShadow = true;
    markR1Interactable(r1PcDeskTop);
    dcComplexGroup.add(r1PcDeskTop);

    const r1PcDeskLeftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.41, 0.03), r1BrownWoodMat);
    r1PcDeskLeftPanel.position.set(8.46, 0.68 + 0.205, 12.08);
    dcComplexGroup.add(r1PcDeskLeftPanel);

    const r1PcDeskDrawerBox = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.41, 0.18), r1BrownWoodMat);
    r1PcDeskDrawerBox.position.set(8.46, 0.68 + 0.205, 12.48);
    dcComplexGroup.add(r1PcDeskDrawerBox);

    // Black Subwoofer under PC Desk
    const r1Subwoofer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), r1GlossBlackMat);
    r1Subwoofer.position.set(8.48, 0.68 + 0.08, 12.26);
    dcComplexGroup.add(r1Subwoofer);

    // White/Silver LCD Monitor + Black PC Tower on PC Desk
    const r1PcMonitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.24), partitionWallMat);
    r1PcMonitorFrame.position.set(8.44, 0.68 + 0.54, 12.24);
    dcComplexGroup.add(r1PcMonitorFrame);
    const r1PcMonitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.20), r1BlueScreenMat);
    r1PcMonitorScreen.position.set(8.42, 0.68 + 0.54, 12.24);
    dcComplexGroup.add(r1PcMonitorScreen);
    const r1PcTower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.09), r1GlossBlackMat);
    r1PcTower.position.set(8.46, 0.68 + 0.54, 12.48);
    dcComplexGroup.add(r1PcTower);

    // Wall-mounted Tilted Glowing Blue CCTV/NMS Monitoring TV above PC Desk (X = 8.59, Y = 1.66, Z = 12.34)
    const r1WallCctvGroup = new THREE.Group();
    r1WallCctvGroup.position.set(8.59, 1.66, 12.34);
    r1WallCctvGroup.rotation.z = 0.16; // Slight downward tilt towards room
    const r1WallCctvBezel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.48), r1GlossBlackMat);
    r1WallCctvGroup.add(r1WallCctvBezel);
    const r1WallCctvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.25, 0.43), r1BlueScreenMat);
    r1WallCctvScreen.position.x = -0.022;
    r1WallCctvGroup.add(r1WallCctvScreen);
    dcComplexGroup.add(r1WallCctvGroup);

    // Small Digital Clock / Sensor Box above the CCTV TV
    const r1ClockBox = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.16), partitionWallMat);
    r1ClockBox.position.set(8.60, 1.92, 12.34);
    dcComplexGroup.add(r1ClockBox);

    // Silver & Black Tall Standing Water Dispenser (X = 8.48, Z = 12.70)
    const r1DispenserBody = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.56, 0.20), r1SilverMetalMat);
    r1DispenserBody.position.set(8.48, 0.68 + 0.28, 12.70);
    r1DispenserBody.castShadow = true;
    markR1Interactable(r1DispenserBody);
    dcComplexGroup.add(r1DispenserBody);
    const r1DispenserNiche = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.14), r1GlossBlackMat);
    r1DispenserNiche.position.set(8.375, 0.68 + 0.40, 12.70);
    dcComplexGroup.add(r1DispenserNiche);

    // Glossy Black Single-Door Refrigerator with Golden Floral Motif (X = 8.45, Z = 12.98)
    const r1Fridge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.74, 0.32), r1GlossBlackMat);
    r1Fridge.position.set(8.45, 0.68 + 0.37, 12.98);
    r1Fridge.castShadow = true;
    markR1Interactable(r1Fridge);
    dcComplexGroup.add(r1Fridge);
    // Subtle golden floral accent strip on the black fridge door
    const r1FridgeGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 });
    const r1FridgeMotif = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.52, 0.08), r1FridgeGoldMat);
    r1FridgeMotif.position.set(8.288, 0.68 + 0.38, 12.94);
    dcComplexGroup.add(r1FridgeMotif);
    // Red biscuit tins & white ceramic bowl on top of the refrigerator
    const r1RedTin1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), r1RedAparMat);
    r1RedTin1.position.set(8.44, 0.68 + 0.80, 12.90);
    dcComplexGroup.add(r1RedTin1);
    const r1WhiteBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.06, 14), partitionWallMat);
    r1WhiteBowl.position.set(8.42, 0.68 + 0.77, 13.04);
    dcComplexGroup.add(r1WhiteBowl);

    // 8 Translucent Blue 19L Water Gallons in 2 Rows on Floor (X: 8.04 & 8.22, Z: 12.66..13.20)
    [8.04, 8.22].forEach((gx) => {
      [12.68, 12.84, 13.00, 13.16].forEach((gz) => {
        const galGroup = new THREE.Group();
        galGroup.position.set(gx, 0.68, gz);
        const galBody = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.24, 14), r1WaterGallonMat);
        galBody.position.y = 0.12;
        galBody.castShadow = true;
        galGroup.add(galBody);
        const galNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.036, 0.05, 12), r1WaterGallonMat);
        galNeck.position.y = 0.26;
        galGroup.add(galNeck);
        const galCap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 12), r1BlueChairMat);
        galCap.position.y = 0.29;
        galGroup.add(galCap);
        dcComplexGroup.add(galGroup);
      });
    });

    // Black Telescopic Tripod Stand with Gooseneck Holder in front of the Water Gallons (X = 7.88, Z = 12.78)
    const r1TripodPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.68, 10), r1GlossBlackMat);
    r1TripodPole.position.set(7.88, 0.68 + 0.34, 12.78);
    dcComplexGroup.add(r1TripodPole);
    const r1TripodBase = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.12, 3), r1GlossBlackMat);
    r1TripodBase.position.set(7.88, 0.68 + 0.06, 12.78);
    dcComplexGroup.add(r1TripodBase);

    // Cylindrical Brushed Stainless-Steel Trash Bin with Dome Lid at Right Corner (X = 8.48, Z = 13.43)
    const r1TrashBin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.36, 18), r1SilverMetalMat);
    r1TrashBin.position.set(8.48, 0.68 + 0.18, 13.43);
    r1TrashBin.castShadow = true;
    dcComplexGroup.add(r1TrashBin);
    const r1TrashDome = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), r1SilverMetalMat);
    r1TrashDome.position.set(8.48, 0.68 + 0.36, 13.43);
    dcComplexGroup.add(r1TrashDome);

    // -------------------------------------------------------------------------
    // 2. TAMPILAN KIRI (-Z WALL AT Z = 12.00, X: 7.25..8.70)
    //    - Wall-mounted Whiteboard (left-center) & Wall-mounted Black Flat-Screen TV (right-center)
    //    - Grey 2-Seater Fabric Sofa against -Z wall below whiteboard + black backpack
    //    - Black Slatted Rectangular Coffee/Meeting Table in front of sofa (with cardboard box, bottle & tumbler)
    //    - 2 Blue Ergonomic Swivel Office Chairs (1 in front of coffee table, 1 with yellow safety vest at PC desk)
    // -------------------------------------------------------------------------
    // Wall-mounted Whiteboard on -Z wall (X = 7.70, Y = 1.54, Z = 12.09)
    const r1WhiteboardFrame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.025), r1SilverMetalMat);
    r1WhiteboardFrame.position.set(7.70, 1.54, 12.09);
    dcComplexGroup.add(r1WhiteboardFrame);
    const r1WhiteboardSurface = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.015), partitionWallMat);
    r1WhiteboardSurface.position.set(7.70, 1.54, 12.10);
    dcComplexGroup.add(r1WhiteboardSurface);

    // Wall-mounted Black Flat-Screen TV (OFF) on -Z wall (X = 8.26, Y = 1.55, Z = 12.09)
    const r1LeftWallTv = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.03), r1GlossBlackMat);
    r1LeftWallTv.position.set(8.26, 1.55, 12.09);
    dcComplexGroup.add(r1LeftWallTv);

    // Grey 2-Seater Upholstered Fabric Sofa against -Z wall (X = 7.72, Z = 12.24)
    const r1SofaGroup = new THREE.Group();
    r1SofaGroup.position.set(7.72, 0.68, 12.24);
    const r1SofaSeat = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.28), r1GreySofaMat);
    r1SofaSeat.position.y = 0.14;
    r1SofaSeat.castShadow = true;
    markR1Interactable(r1SofaSeat);
    r1SofaGroup.add(r1SofaSeat);
    const r1SofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 0.09), r1GreySofaMat);
    r1SofaBack.position.set(0, 0.26, -0.10);
    r1SofaGroup.add(r1SofaBack);
    [-0.29, 0.29].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.28), r1GreySofaMat);
      arm.position.set(ax, 0.19, 0);
      r1SofaGroup.add(arm);
    });
    // Black backpack resting on left side of sofa
    const r1Backpack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.12), r1GlossBlackMat);
    r1Backpack.position.set(-0.18, 0.30, 0.02);
    r1SofaGroup.add(r1Backpack);
    dcComplexGroup.add(r1SofaGroup);

    // Black Slatted Rectangular Coffee / Meeting Table in front of Sofa (X = 7.74, Z = 12.60)
    const r1CoffeeTableTop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.32), r1DarkSlattedMat);
    r1CoffeeTableTop.position.set(7.74, 0.68 + 0.34, 12.60);
    r1CoffeeTableTop.castShadow = true;
    markR1Interactable(r1CoffeeTableTop);
    dcComplexGroup.add(r1CoffeeTableTop);
    [-0.24, 0.24].forEach((lx) => {
      [-0.12, 0.12].forEach((lz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), r1DarkSlattedMat);
        leg.position.set(7.74 + lx, 0.68 + 0.17, 12.60 + lz);
        dcComplexGroup.add(leg);
      });
    });
    // Brown cardboard box + water bottle + black tumbler on the coffee table
    const r1TableBox = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.12), r1CardboardMat);
    r1TableBox.position.set(7.62, 0.68 + 0.41, 12.58);
    dcComplexGroup.add(r1TableBox);
    const r1TableTumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 10), r1GlossBlackMat);
    r1TableTumbler.position.set(7.86, 0.68 + 0.41, 12.62);
    dcComplexGroup.add(r1TableTumbler);

    // Helper to build Blue Ergonomic Swivel Office Chair (with optional yellow safety vest)
    const addR1BlueSwivelChair = (cx: number, cz: number, rotY: number, withYellowVest: boolean = false) => {
      const cg = new THREE.Group();
      cg.position.set(cx, 0.68, cz);
      cg.rotation.y = rotY;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 6), r1GlossBlackMat);
      base.position.y = 0.03;
      cg.add(base);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), r1GlossBlackMat);
      stem.position.y = 0.12;
      cg.add(stem);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.22), r1BlueChairMat);
      seat.position.y = 0.22;
      seat.castShadow = true;
      markR1Interactable(seat);
      cg.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.26, 0.04), withYellowVest ? r1YellowVestMat : r1BlueChairMat);
      back.position.set(0, 0.36, -0.09);
      cg.add(back);
      dcComplexGroup.add(cg);
    };
    // Blue swivel chair 1: at PC desk with yellow safety vest
    addR1BlueSwivelChair(8.18, 12.28, -Math.PI / 2, true);
    // Blue swivel chair 2: in front of the black coffee table
    addR1BlueSwivelChair(7.76, 12.92, Math.PI, false);

    // -------------------------------------------------------------------------
    // 3. TAMPILAN KANAN (+Z WALL AT Z = 13.60, BORDERING ROOM 4 CONTROL ROOM)
    //    - Open aluminum-framed glass doorway (X: 8.06..8.44) with black threshold step looking into Room 4
    //    - Black 3-tier low storage cabinet / credenza in center-right (X = 7.82, Z = 13.44)
    //    - 3-panel dark-tinted glass window with silver aluminum frame on right (X = 7.46, Y = 1.48, Z = 13.51)
    // -------------------------------------------------------------------------
    // Silver Aluminum Door Frame around open doorway to Room 4 (X: 8.06..8.44, Z = 13.60)
    const r1DoorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.18), r1SilverMetalMat);
    r1DoorHeader.position.set(8.25, 0.68 + 1.28, 13.60);
    dcComplexGroup.add(r1DoorHeader);
    [8.06, 8.44].forEach((jx) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.28, 0.18), r1SilverMetalMat);
      jamb.position.set(jx, 0.68 + 0.64, 13.60);
      dcComplexGroup.add(jamb);
    });
    // Black Threshold Step & Mat at the Doorway
    const r1DoorStep = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.22), r1GlossBlackMat);
    r1DoorStep.position.set(8.25, 0.68 + 0.02, 13.54);
    dcComplexGroup.add(r1DoorStep);
    // Open Aluminum-Framed Glass Door Leaf swung open at X = 8.42, Z: 13.26..13.58
    const r1OpenDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.22, 0.34), r1SilverMetalMat);
    r1OpenDoorLeaf.position.set(8.41, 0.68 + 0.61, 13.42);
    dcComplexGroup.add(r1OpenDoorLeaf);

    // Black 3-Tier Low Storage Cabinet / Credenza against +Z wall (X = 7.82, Z = 13.44)
    const r1BlackCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.18), r1GlossBlackMat);
    r1BlackCabinet.position.set(7.82, 0.68 + 0.28, 13.44);
    r1BlackCabinet.castShadow = true;
    markR1Interactable(r1BlackCabinet);
    dcComplexGroup.add(r1BlackCabinet);
    // Shelf divider lines on the black 3-tier cabinet
    [0.18, 0.36].forEach((sy) => {
      const shelfLine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.19), r1SilverMetalMat);
      shelfLine.position.set(7.82, 0.68 + sy, 13.44);
      dcComplexGroup.add(shelfLine);
    });

    // 3-Panel Dark-Tinted Window with Silver Aluminum Frame on +Z wall (X = 7.46, Y = 1.46, Z = 13.50)
    const r1WinFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.58, 0.03), r1SilverMetalMat);
    r1WinFrame.position.set(7.46, 1.46, 13.50);
    dcComplexGroup.add(r1WinFrame);
    [-0.10, 0.0, 0.10].forEach((wx) => {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.52, 0.036), r1DarkWindowMat);
      pane.position.set(7.46 + wx, 1.46, 13.50);
      dcComplexGroup.add(pane);
    });

    // -------------------------------------------------------------------------
    // 4. TAMPILAN BELAKANG (-X SIDE AT X = 7.25 & HALLWAY X: 5.80..7.25)
    //    - 4-Seater Green & Teal Metallic Airport Waiting Bench against -X partition wall (Z: 12.14..12.86)
    //    - Open Cream-Tiled Hallway (Z: 12.96..13.56, X: 5.80..7.25)
    //    - Freestanding Black Dual-Pillar Standing TV / Digital Totem in hallway (X = 6.88, Z = 13.34)
    //    - Red APAR Fire Extinguisher + Red Inverted Triangle Sign on far corridor wall (X = 5.92, Z = 13.18)
    // -------------------------------------------------------------------------
    // 4-Seater Green & Teal Airport Waiting Bench against -X wall (X = 7.42, Z = 12.50)
    const r1BenchBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.72), r1SilverMetalMat);
    r1BenchBar.position.set(7.42, 0.68 + 0.18, 12.50);
    dcComplexGroup.add(r1BenchBar);
    [-0.27, -0.09, 0.09, 0.27].forEach((bz, idx) => {
      const seatMat = idx === 0 || idx === 3 ? r1GreenSeatMat : r1TealSeatMat;
      const bSeat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.15), seatMat);
      bSeat.position.set(7.44, 0.68 + 0.21, 12.50 + bz);
      bSeat.castShadow = true;
      markR1Interactable(bSeat);
      dcComplexGroup.add(bSeat);
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.15), seatMat);
      bBack.position.set(7.35, 0.68 + 0.32, 12.50 + bz);
      dcComplexGroup.add(bBack);
    });
    [-0.33, 0.33].forEach((lz) => {
      const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.03), r1SilverMetalMat);
      bLeg.position.set(7.42, 0.68 + 0.10, 12.50 + lz);
      dcComplexGroup.add(bLeg);
    });

    // Bottom-Center-Right Hallway & Enclosure (X: +5.8 to +7.25, Z: +12.0 to +13.6)
    addDcFloor(6.52, 12.8, 1.45, 1.6, r1CreamTileMat);
    addDcWall(6.5, 12.55, 1.4, 0.16);
    addDcWall(5.8, 12.8, 0.20, 1.6);
    addDcWall(6.52, 12.0, 1.45, 0.22);

    // Freestanding Black Dual-Pillar Standing TV / Digital Totem in Hallway (X = 6.92, Z = 13.34)
    const r1TotemBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.18), r1GlossBlackMat);
    r1TotemBase.position.set(6.92, 0.68 + 0.015, 13.34);
    dcComplexGroup.add(r1TotemBase);
    [-0.06, 0.06].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.78, 0.025), r1GlossBlackMat);
      pillar.position.set(6.92 + px, 0.68 + 0.39, 13.34);
      dcComplexGroup.add(pillar);
    });
    const r1TotemScreen = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.035), r1GlossBlackMat);
    r1TotemScreen.position.set(6.92, 0.68 + 0.68, 13.32);
    dcComplexGroup.add(r1TotemScreen);

    // Red APAR Fire Extinguisher Cylinder + Inverted Red Triangle Sign on Far Hallway Wall (X = 5.93, Z = 13.18)
    const r1AparCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 12), r1RedAparMat);
    r1AparCylinder.position.set(5.94, 0.68 + 0.42, 13.18);
    dcComplexGroup.add(r1AparCylinder);
    const r1AparSign = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 3), r1RedAparMat);
    r1AparSign.rotation.x = Math.PI;
    r1AparSign.position.set(5.93, 0.68 + 0.78, 13.18);
    dcComplexGroup.add(r1AparSign);

    addRoomNumberBadge('1', 1, 7.98, 12.80, 0.92);

    // -------------------------------------------------------------------------
    // B. NARROW VERTICAL CORRIDOR & RIGHT VERTICAL 5-ROOM WING (X: +1.3 to +3.6, Z: +12.0 to +18.1)
    // -------------------------------------------------------------------------
    // Vertical Corridor Floor between Room 6 and Right Wing (X: +3.0 to +3.6, Z: +12.0 to +18.0)
    addDcFloor(3.3, 15.0, 0.65, 6.0, dcRaisedFloorMat);

    // Yellow Portal Safety Frames at Bottom of Right Wing & Corridor (matching yellow markings in reference)
    const yellowPortalLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.85, 0.75), dcYellowFrameMat);
    yellowPortalLeft.position.set(3.58, 0.68 + 0.925, 12.45);
    dcComplexGroup.add(yellowPortalLeft);

    const yellowPortalRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.85, 0.75), dcYellowFrameMat);
    yellowPortalRight.position.set(1.38, 0.68 + 0.925, 12.45);
    dcComplexGroup.add(yellowPortalRight);

    // Right Vertical Wing Outer Walls (X: +1.35 to +3.0, Z: +12.2 to +18.1)
    addDcWall(1.35, 15.15, 0.22, 5.9); // Far-right outer wall
    addDcWall(3.0, 15.15, 0.20, 5.9);  // Left corridor wall of Right Wing
    addDcWall(2.18, 18.1, 1.65, 0.22); // Top cap wall
    addDcWall(2.18, 12.2, 1.65, 0.22); // Bottom cap wall

    // 3 Dark-Brown Window/Door Frames along Left Corridor Wall (X = +3.0) of Right Wing
    [14.0, 15.2, 16.4].forEach((wz) => {
      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.15, 0.48), dcWoodFrameMat);
      wFrame.position.set(3.0, 1.55, wz);
      dcComplexGroup.add(wFrame);
    });

    // 1. Topmost Bay of Right Wing (Z: +17.0 to +18.1): Staff Lounge / Rest Area
    addDcFloor(2.18, 17.55, 1.65, 1.1, dcControlFloorMat);
    addDcWall(2.18, 17.0, 1.65, 0.18);
    const topBench = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.35), dcDeskWoodMat);
    topBench.position.set(1.75, 0.68 + 0.24, 17.45);
    dcComplexGroup.add(topBench);

    // 2. --- ROOM 3: RESTROOM (Right Wing Bay, Z: +15.8 to +17.0) ---
    addDcFloor(2.18, 16.4, 1.65, 1.2, dcControlFloorMat, 3);
    addDcWall(2.18, 15.8, 1.65, 0.18);
    const rrFixture = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.35), partitionWallMat);
    rrFixture.position.set(1.65, 0.68 + 0.24, 16.65);
    dcComplexGroup.add(rrFixture);
    addRoomNumberBadge('3', 3, 2.12, 16.4, 1.0);

    // 3. --- ROOM 2: STORAGE (Right Wing Bay, Z: +14.6 to +15.8) ---
    addDcFloor(2.18, 15.2, 1.65, 1.2, dcDeskWoodMat, 2);
    addDcWall(2.18, 14.6, 1.65, 0.18);
    // Brown storage boxes & shelving racks inside Room 2 (Storage) matching reference image
    [
      { x: 2.55, z: 15.52, w: 0.42, d: 0.36 },
      { x: 2.02, z: 15.52, w: 0.46, d: 0.36 },
      { x: 1.62, z: 15.25, w: 0.36, d: 0.48 },
      { x: 1.95, z: 14.85, w: 0.55, d: 0.32 },
    ].forEach((bx) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(bx.w, 0.62, bx.d), dcBoxBrownMat);
      crate.position.set(bx.x, 0.68 + 0.31, bx.z);
      crate.castShadow = true;
      crate.userData = { type: 'eksisting_room_complex', roomCode: 2 };
      this.interactableObjects.push(crate);
      dcComplexGroup.add(crate);
    });
    addRoomNumberBadge('2', 2, 2.48, 15.15, 1.0);

    // 4. --- ROOM 1 (RIGHT WING): R. STANDBY (Z: +13.4 to +14.6) ---
    addDcFloor(2.18, 14.0, 1.65, 1.2, dcControlFloorMat, 1);
    addDcWall(2.18, 13.4, 1.65, 0.18);
    const sbDesk2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.34), dcDeskWoodMat);
    sbDesk2.position.set(2.15, 0.68 + 0.27, 13.65);
    dcComplexGroup.add(sbDesk2);
    addRoomNumberBadge('1', 1, 2.15, 14.05, 1.0);

    // 5. Bottom Vestibule Bay of Right Wing (Z: +12.2 to +13.4)
    addDcFloor(2.18, 12.8, 1.65, 1.2, dcWhiteFloorMat);

    // -------------------------------------------------------------------------
    // C. INVISIBLE CLICK HITBOX OVER THE PROTRUDING COMPLEX (Red Outline Removed)
    // -------------------------------------------------------------------------
    const redOutlineGroup = new THREE.Group();
    const minX = 1.05;
    const maxX = 11.75;
    const minZ = 11.75;
    const maxZ = 18.35;

    // Invisible top-surface click target covering the room complex for effortless clicking
    const redComplexHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(maxX - minX, 0.2, maxZ - minZ),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    redComplexHitbox.position.set((minX + maxX) / 2, 3.18, (minZ + maxZ) / 2);
    redComplexHitbox.userData = { type: 'eksisting_room_complex', roomCode: null };
    this.interactableObjects.push(redComplexHitbox);
    redOutlineGroup.add(redComplexHitbox);

    dcComplexGroup.add(redOutlineGroup);
    this.eksistingRedOutlineGroup = redOutlineGroup;

    lantai1Group.add(dcComplexGroup);
    this.lantai1Meshes.push(dcComplexGroup);

    // Angled transition rooms connecting protruding block to central island (X = +11.2, Z = +13.2)
    addEksRoomBox(11.2, 13.2, 2.8, 2.4, 2, 2, 2.38, -0.22);

    // Long Narrow 7-Compartment Horizontal Island Bar in Middle of Central Hall (X: +10.2 to +23.8, Z: +10.2 to +12.2)
    addEksRoomBox(17.2, 11.2, 13.2, 2.0, 7, 1, 2.36);
    // Slightly angled right end room of the central island bar (X = +10.0, Z = +11.2)
    addEksRoomBox(10.0, 11.2, 1.8, 2.1, 1, 2, 2.36, -0.18);

    // Horizontal Row of 12 White Square Structural Columns across Central Hall (Z = +8.8)
    [28.4, 26.0, 23.4, 20.8, 18.2, 15.6, 13.0, 10.4, 8.0, 6.2, 4.4, 2.6].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 8.8, 0.50, 2.50);
    });
    // Upper row of square columns in Central Hall (Z = +13.8)
    [28.4, 26.0, 20.5, 18.0].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 13.8, 0.50, 2.50);
    });

    // 4B. Lower Central Speckled Terrazzo / Cream Tile Hall (X: +8.4 to +29.2, Z: -3.8 to +5.2)
    addEksFloorSlab(18.8, 0.7, 20.8, 9.0, eksTerrazzoFloorMat, 0.58, 0.14);

    // Top framing wall of the Speckled Tile Hall (Z = +5.2, X: +9.0 to +29.0) with 8 pilasters
    addL1Wall(lantai1Group, 19.0, 5.2, 20.0, 0.34, 2.40);
    for (let px = 10.2; px <= 28.2; px += 2.55) {
      addL1SquareColumn(lantai1Group, px, 5.3, 0.48, 2.45);
    }
    // Slightly angled left & right framing walls of the Speckled Tile Hall
    addL1Wall(lantai1Group, 29.1, 0.7, 0.34, 9.0, 2.40, -0.09);
    addL1Wall(lantai1Group, 8.8, 3.2, 0.34, 4.2, 2.40, 0.16);

    // Dense Multi-Room Cluster inside the Speckled Tile Hall (X: +15.4 to +24.2, Z: -2.8 to +3.2)
    addEksRoomBox(21.2, 1.2, 5.6, 3.8, 3, 2, 2.38);
    addEksRoomBox(17.2, 0.8, 3.4, 4.4, 2, 3, 2.38);
    addEksRoomBox(20.0, -1.6, 8.2, 2.2, 4, 1, 2.38);
    // Angled right wall of the central room cluster (X = +15.3, Z = -0.5)
    addL1Wall(lantai1Group, 15.3, -0.5, 0.34, 5.2, 2.38, 0.14);

    // Square Structural Columns inside the Speckled Tile Hall
    // Left open tile bay (X = +26.6)
    addL1SquareColumn(lantai1Group, 26.6, 1.8, 0.50, 2.48);
    addL1SquareColumn(lantai1Group, 26.6, -0.8, 0.50, 2.48);
    // Right open tile bay (2 rows x 3 columns at X = +14.0, +11.8, +9.6)
    [14.0, 11.8, 9.6].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 1.8, 0.50, 2.48);
      addL1SquareColumn(lantai1Group, cx, -0.8, 0.50, 2.48);
    });
    // Small enclosed booth on the right edge of the tile hall (X = +9.2, Z = +1.8)
    addEksRoomBox(9.2, 1.8, 1.8, 2.0, 1, 2, 2.36);

    // Narrow Double-Walled Bottom Corridor along Z: -3.8 to -2.8 (X: +8.8 to +28.8)
    addL1Wall(lantai1Group, 18.8, -3.8, 20.2, 0.38, 2.42);
    addL1Wall(lantai1Group, 18.8, -2.8, 16.5, 0.28, 2.38);

    // 4C. Lower Right-Center 8-Room Office Block (X: +1.5 to +8.8, Z: -3.6 to +3.8)
    addEksFloorSlab(5.15, 0.8, 7.3, 8.8, eksSmoothGreyFloorMat, 0.57, 0.14);
    addEksRoomBox(6.0, 2.2, 5.4, 2.8, 3, 2, 2.38);  // Upper sub-rooms
    addEksRoomBox(5.15, -1.4, 7.3, 4.4, 4, 2, 2.38); // Lower 4x2 rectangular rooms

    // -------------------------------------------------------------------------
    // 5. RIGHT SECTION — SPECKLED TERRAZZO ARRIVAL HALL, CENTRAL DIVIDER WALL,
    //    TOP 10 CUBICLES, SLANTED RIGHT WALL & BOTTOM-RIGHT ROOM COMPLEX
    //    Spanning X: -16.8 to +1.5, Z: -3.8 to +17.0
    // -------------------------------------------------------------------------
    // 5A. Top Row of 10 Uniform Cubicles (X: -11.2 to +1.2, Z: +12.8 to +14.8)
    addEksFloorSlab(-5.0, 13.8, 12.6, 2.2, eksSmoothGreyFloorMat, 0.57, 0.14);
    addEksRoomBox(-5.0, 13.8, 12.4, 2.0, 10, 1, 2.40);

    // Protruding 2-Room Square Block above Cubicles 8-10 (X: -11.2 to -8.4, Z: +14.8 to +16.8)
    addEksFloorSlab(-9.8, 15.8, 2.8, 2.0, eksSmoothGreyFloorMat, 0.57, 0.14);
    addEksRoomBox(-9.8, 15.8, 2.8, 2.0, 2, 1, 2.40);

    // Row of 7 Freestanding White Exterior Bollards/Pillars on Top Apron (Z = +16.6, X: -11.2 to +0.2)
    for (let bx = 0.2; bx >= -11.3; bx -= 1.9) {
      addL1SquareColumn(lantai1Group, bx, 16.6, 0.42, 1.85);
    }

    // 5B. Main Right Speckled Terrazzo Hall (X: -13.2 to +1.5, Z: +2.2 to +12.8)
    addEksFloorSlab(-5.85, 7.5, 14.7, 10.6, eksTerrazzoFloorMat, 0.58, 0.14);

    // Central Vertical Freestanding White Partition Wall (X = -6.2, Z: +4.2 to +12.8)
    addL1Wall(lantai1Group, -6.2, 8.5, 0.44, 8.6, 2.42);

    // Square Structural Columns inside the Right Speckled Terrazzo Hall
    // Left half of hall (X: -5.2 to +0.6): 2 rows of 4 columns + 2 left-edge columns
    [0.5, -1.4, -3.2, -5.0].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 9.2, 0.52, 2.50);
      addL1SquareColumn(lantai1Group, cx, 4.8, 0.52, 2.50);
    });
    addL1SquareColumn(lantai1Group, 1.2, 11.2, 0.52, 2.50);
    addL1SquareColumn(lantai1Group, 1.2, 7.0, 0.52, 2.50);

    // Right half of hall (X: -11.5 to -7.4): 2 rows of 4 columns
    [-7.4, -8.8, -10.2, -11.5].forEach((cx) => {
      addL1SquareColumn(lantai1Group, cx, 9.0, 0.52, 2.50);
      addL1SquareColumn(lantai1Group, cx, 4.8, 0.52, 2.50);
    });

    // 5C. Slanted Far-Right Perimeter Wall with 7 Stepped/Angled Room Bays (X: -11.4 to -13.8, Z: +2.2 to +14.8)
    addEksRoomBox(-12.5, 8.5, 1.8, 12.6, 1, 7, 2.40, -0.12);

    // 5D. Bottom-Right Multi-Room Complex & 3 Far-Right Vertical Bays (X: -16.8 to +1.5, Z: -3.8 to +2.2)
    addEksFloorSlab(-7.65, -0.8, 18.3, 6.0, eksSmoothGreyFloorMat, 0.57, 0.14);

    // Left bay of bottom-right section (X: -4.8 to +1.5, Z: -3.6 to +2.2)
    addEksRoomBox(-1.65, 1.0, 6.3, 2.4, 5, 1, 2.38); // Top row of 5 small cubicles
    addL1Wall(lantai1Group, -1.65, -3.6, 6.3, 0.36, 2.40); // Bottom wall
    addL1Wall(lantai1Group, -4.8, -1.3, 0.34, 4.6, 2.40);  // Right divider wall

    // Middle multi-room grid of bottom-right section (X: -12.8 to -4.8, Z: -3.8 to +2.2)
    addEksRoomBox(-8.8, 0.8, 8.0, 2.8, 4, 2, 2.38);  // Upper tier of rooms
    addEksRoomBox(-8.8, -2.2, 8.0, 3.2, 4, 2, 2.38); // Lower tier of rooms

    // Far Bottom-Right 3 Parallel Vertical Rectangular Bays (X: -16.8 to -12.8, Z: -3.8 to +2.2)
    addEksRoomBox(-14.8, -0.8, 4.0, 6.0, 3, 1, 2.40);

    // -------------------------------------------------------------------------
    // 1G. TERMINAL SELATAN LANTAI 1 CONNECTOR CORRIDOR (X: -17.0 to -63.8, Z: +6.8 to +15.6)
    // Positioned cleanly west of X = -17.0 so Terminal Eksisting Lantai 1 is 100% unobstructed
    // -------------------------------------------------------------------------
    const rightLongCorridorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(46.8, 0.15, 4.6),
      l1TileFloorMat
    );
    rightLongCorridorFloor.position.set(-40.4, 0.56, 9.0);
    lantai1Group.add(rightLongCorridorFloor);
    this.lantai1Meshes.push(rightLongCorridorFloor);
    addL1Wall(lantai1Group, -40.4, 6.7, 46.8, 0.38, 2.40);
    addL1Wall(lantai1Group, -40.4, 11.3, 46.8, 0.38, 2.40);

    // Upward L-Turn at the Far-Right End of the Corridor (X: -59.5 to -63.8, Z: +6.8 to +15.6)
    const rightTipFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.15, 8.8),
      l1TileFloorMat
    );
    rightTipFloor.position.set(-61.5, 0.56, 11.2);
    lantai1Group.add(rightTipFloor);
    this.lantai1Meshes.push(rightTipFloor);
    addL1Wall(lantai1Group, -63.8, 11.2, 0.38, 8.8, 2.40);
    addL1Wall(lantai1Group, -59.2, 13.4, 0.38, 4.4, 2.40);
    addL1Wall(lantai1Group, -61.5, 15.6, 4.6, 0.38, 2.40);

    // Architectural Sector Plaques for Lantai 1
    const l1UtamaPlaque = this.createPlaqueMesh(
      'TERMINAL UTAMA • LANTAI 1',
      '#dc2626',
      '#ffffff',
      8.8,
      1.2,
      36,
      'AREA KEDATANGAN & KLAIM BAGASI'
    );
    l1UtamaPlaque.position.set(24.0, 0.62, -37.5);
    lantai1Group.add(l1UtamaPlaque);
    this.lantai1Meshes.push(l1UtamaPlaque);

    const l1EksPlaque = this.createPlaqueMesh(
      'TERMINAL EKSISTING • LANTAI 1',
      '#eab308',
      '#0f172a',
      9.4,
      1.2,
      36,
      'BHS, OPERASIONAL & CONCOURSE TIMUR-BARAT'
    );
    l1EksPlaque.position.set(24.0, 0.64, -7.8);
    lantai1Group.add(l1EksPlaque);
    this.lantai1Meshes.push(l1EksPlaque);

    terminalGroup.add(lantai1Group);
    this.lantai1Meshes.push(lantai1Group);

    // =========================================================================
    // 1. TERMINAL UTAMA — Macro Zone 1
    // Main footprint: X: -6 to +54 (W=60), Z: -38 to -12 (D=26), plus T-wing side extensions
    // Floor elevations:
    // - Lantai 1: Y = 0.4m (Kedatangan / Ground — Mockup Lantai 1)
    // - Lantai 2: Y = 4.6m (Mockup Lantai 2 + Terhubung Jembatan Penghubung Gedung Parkir & Eksisting)
    // - Lantai 3: Y = 9.6m (Curbside Drop-Off Keberangkatan — Terhubung langsung dengan Jalanan)
    // =========================================================================
    const utamaGroup = new THREE.Group();
    const utamaX = 24;
    const utamaZ = -25;
    const utamaW = 60;
    const utamaD = 26;
    const utamaH = 14.8;

    const whiteColumnMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.15,
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.7,
      metalness: 0.1,
    });
    const silverCanopyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.68,
      roughness: 0.26,
    });

    // Lantai 1 & Lantai 2 Structural Base Slabs (including Left +X and Right -X T-Wing Extensions)
    [0.24, 4.6].forEach((flY) => {
      const slabH = flY < 1.0 ? 0.28 : 0.42;
      const mainSlab = new THREE.Mesh(new THREE.BoxGeometry(utamaW, slabH, utamaD), slabMat);
      mainSlab.position.set(utamaX, flY, utamaZ);
      mainSlab.receiveShadow = true;
      utamaGroup.add(mainSlab);

      // Left Wing Extension (+X: 54 to 61, Z: -34 to -16) matching T-wing in Lantai 2 diagram
      const leftWingSlab = new THREE.Mesh(new THREE.BoxGeometry(7.2, slabH, 18), slabMat);
      leftWingSlab.position.set(57.5, flY, -25);
      leftWingSlab.receiveShadow = true;
      utamaGroup.add(leftWingSlab);

      // Right Wing Extension (-X: -13 to -6, Z: -34 to -16)
      const rightWingSlab = new THREE.Mesh(new THREE.BoxGeometry(7.2, slabH, 18), slabMat);
      rightWingSlab.position.set(-9.5, flY, -25);
      rightWingSlab.receiveShadow = true;
      utamaGroup.add(rightWingSlab);

      if (flY > 2.0) {
        this.lantai2Meshes.push(mainSlab, leftWingSlab, rightWingSlab);
      }
    });

    // Lantai 3 Interior Slab (registered in upperRoofMeshes so Lantai 2 Mockup is visible below)
    const lt3InteriorSlab = new THREE.Mesh(
      new THREE.BoxGeometry(utamaW, 0.35, utamaD),
      roofShellMat
    );
    lt3InteriorSlab.position.set(utamaX, 9.6, utamaZ);
    utamaGroup.add(lt3InteriorSlab);
    this.upperRoofMeshes.push(lt3InteriorSlab);

    // -------------------------------------------------------------------------
    // LANTAI 2 (Y = 4.6m) ARCHITECTURAL MOCKUP — TERMINAL UTAMA
    // Matches the 2-tone floor (White front/right hall + Dark charcoal rear/left hall),
    // side wing cubicles, column grid, central void walls, and twin connector bridges
    // -------------------------------------------------------------------------
    // White Ceramic Floor Zone on Lantai 2 (Front Concourse Z: -37.8 to -25 & Right Concourse X: -12.8 to +20)
    const uWhiteFrontFloor = new THREE.Mesh(
      new THREE.BoxGeometry(73.6, 0.12, 12.8),
      whiteFloorMat
    );
    uWhiteFrontFloor.position.set(24, 4.82, -31.4);
    uWhiteFrontFloor.receiveShadow = true;
    utamaGroup.add(uWhiteFrontFloor);
    this.lantai2Meshes.push(uWhiteFrontFloor);

    const uWhiteRightFloor = new THREE.Mesh(
      new THREE.BoxGeometry(32.5, 0.12, 13.2),
      whiteFloorMat
    );
    uWhiteRightFloor.position.set(3.5, 4.82, -18.6);
    uWhiteRightFloor.receiveShadow = true;
    utamaGroup.add(uWhiteRightFloor);
    this.lantai2Meshes.push(uWhiteRightFloor);

    // Dark Charcoal / Slate Floor Zone on Lantai 2 (Rear-Left & Central Hall X: +14 to +54, Z: -26 to -12)
    const uDarkRearFloor = new THREE.Mesh(
      new THREE.BoxGeometry(41.5, 0.14, 14.0),
      darkFloorMat
    );
    uDarkRearFloor.position.set(34.5, 4.83, -19.0);
    uDarkRearFloor.receiveShadow = true;
    utamaGroup.add(uDarkRearFloor);
    this.lantai2Meshes.push(uDarkRearFloor);

    // Perimeter 3D White Walls of Terminal Utama Lantai 2
    addL2Wall(utamaGroup, 24, -37.8, 60.2, 0.42, 2.45); // Front landside wall (Z = -37.8)
    addL2Wall(utamaGroup, 23, -12.2, 35.5, 0.42, 2.45); // Rear wall between Connector Bridges (X = 5 to 41)
    addL2Wall(utamaGroup, 52.5, -12.2, 3.5, 0.42, 2.45); // Rear-left corner wall
    addL2Wall(utamaGroup, -5.2, -12.2, 2.2, 0.42, 2.45); // Rear-right corner wall

    // Left Wing (+X = 54 to 61) Perimeter & 6 Partitioned Office/VIP Rooms
    addL2Wall(utamaGroup, 60.9, -25.0, 0.42, 18.0, 2.45); // Far left outer wall
    addL2Wall(utamaGroup, 57.4, -34.0, 7.2, 0.42, 2.45);  // Left wing front wall
    addL2Wall(utamaGroup, 57.4, -16.0, 7.2, 0.42, 2.45);  // Left wing rear wall
    addL2Wall(utamaGroup, 53.8, -25.0, 0.35, 16.5, 2.45); // Left wing inner corridor wall
    for (let rz = -31.0; rz <= -19.0; rz += 3.0) {
      addL2Wall(utamaGroup, 57.4, rz, 7.0, 0.3, 2.45);    // 5 cross partitions forming 6 rooms
    }

    // Right Wing (-X = -13 to -6) Perimeter & 5 Partitioned Rooms + Stepped Walls
    addL2Wall(utamaGroup, -12.9, -25.0, 0.42, 18.0, 2.45); // Far right outer wall
    addL2Wall(utamaGroup, -9.4, -34.0, 7.2, 0.42, 2.45);   // Right wing front wall
    addL2Wall(utamaGroup, -9.4, -16.0, 7.2, 0.42, 2.45);   // Right wing rear wall
    addL2Wall(utamaGroup, -5.8, -25.0, 0.35, 16.5, 2.45);  // Right wing inner corridor wall
    for (let rz = -30.5; rz <= -19.5; rz += 3.6) {
      addL2Wall(utamaGroup, -9.4, rz, 7.0, 0.3, 2.45);
    }

    // Central Mezzanine Void Enclosures, Curved/Angled Partition Walls & Check-In / SCP Islands on Lantai 2
    // Central rectangular void/atrium rooms (X: 16 to 34, Z: -27 to -20)
    addL2Wall(utamaGroup, 25.0, -26.8, 18.0, 0.38, 2.45);
    addL2Wall(utamaGroup, 25.0, -20.2, 16.0, 0.38, 2.45);
    addL2Wall(utamaGroup, 16.2, -23.5, 0.38, 6.8, 2.45);
    addL2Wall(utamaGroup, 33.8, -23.5, 0.38, 6.8, 2.45);
    addL2Wall(utamaGroup, 25.0, -23.5, 0.32, 6.6, 2.45);

    // Angled / curved transition partition walls on left-center (X: 38 to 49, Z: -28 to -21)
    addL2Wall(utamaGroup, 42.5, -26.5, 9.5, 0.38, 2.45, 0.28);
    addL2Wall(utamaGroup, 45.0, -21.5, 8.0, 0.38, 2.45, -0.22);

    // Right-center partition cubicles & ticketing/security counters (X: -2 to +12, Z: -26 to -18)
    addL2Wall(utamaGroup, 5.0, -25.5, 11.0, 0.35, 2.45);
    addL2Wall(utamaGroup, -0.5, -22.0, 0.35, 7.2, 2.45);
    addL2Wall(utamaGroup, 10.5, -22.0, 0.35, 7.2, 2.45);
    addL2Wall(utamaGroup, 5.0, -18.5, 11.0, 0.35, 2.45);

    // Row of Rear Counter / Retail Rooms along Z = -14.5 (between the two connector bridges)
    for (let cx = 8; cx <= 38; cx += 5.0) {
      addL2Wall(utamaGroup, cx, -14.2, 0.3, 3.8, 2.3);
    }
    addL2Wall(utamaGroup, 23.0, -16.1, 30.5, 0.32, 2.3);

    // 4 Check-In Islands (Islands A, B, C, D) matching Page 2 of PDF
    const checkInConfigs = [
      { x: 3.5, label: 'ISLAND A', sub: 'LION AIR GROUP' },
      { x: 17.5, label: 'ISLAND B', sub: 'CITILINK / SRIWIJAYA' },
      { x: 31.5, label: 'ISLAND C', sub: 'GARUDA INDONESIA' },
      { x: 45.5, label: 'ISLAND D', sub: 'INTERNATIONAL & CHARTER' },
    ];
    checkInConfigs.forEach((ci) => {
      // Check-In Counter Island Desk
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 1.1, 2.2),
        partitionWallMat
      );
      desk.position.set(ci.x, 4.82 + 0.55, -31.5);
      desk.castShadow = true;
      utamaGroup.add(desk);
      this.lantai2Meshes.push(desk);

      // Weigh scale conveyor belt
      const scaleBelt = new THREE.Mesh(
        new THREE.BoxGeometry(7.6, 0.15, 0.7),
        darkFloorMat
      );
      scaleBelt.position.set(ci.x, 4.82 + 0.3, -30.0);
      utamaGroup.add(scaleBelt);
      this.lantai2Meshes.push(scaleBelt);

      // Overhead Sign Plaque
      const sign = this.createPlaqueMesh(
        ci.label,
        '#0284c7',
        '#ffffff',
        3.8,
        1.1,
        40,
        ci.sub
      );
      sign.position.set(ci.x, 5.25, -31.5);
      utamaGroup.add(sign);
      this.lantai2Meshes.push(sign);
    });

    // Central Green Carpet Atrium & Mezzanine Lounge (X = 24.5, Z = -23.5)
    const atriumCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(16.0, 0.14, 7.8),
      new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.65,
        metalness: 0.08,
      })
    );
    atriumCarpet.position.set(24.5, 4.84, -23.5);
    atriumCarpet.receiveShadow = true;
    utamaGroup.add(atriumCarpet);
    this.lantai2Meshes.push(atriumCarpet);

    const atriumPlaque = this.createPlaqueMesh(
      'CENTRAL ATRIUM & MEZZANINE',
      '#059669',
      '#ffffff',
      7.2,
      1.1,
      36,
      'PASSENGER LOUNGE & BOARDING TRANSIT'
    );
    atriumPlaque.position.set(24.5, 5.25, -23.5);
    utamaGroup.add(atriumPlaque);
    this.lantai2Meshes.push(atriumPlaque);

    // Domestic Security Checkpoint (SCP 2)
    const scpPlaque = this.createPlaqueMesh(
      'SECURITY CHECK POINT (SCP 2)',
      '#dc2626',
      '#ffffff',
      7.2,
      1.1,
      36,
      'DOMESTIC DEPARTURE SCREENING'
    );
    scpPlaque.position.set(24.5, 5.25, -16.5);
    utamaGroup.add(scpPlaque);
    this.lantai2Meshes.push(scpPlaque);

    // Twin Connector Bridge Directional Plaques
    const bridgeEksPlaque = this.createPlaqueMesh(
      '→ JEMBATAN KE GATE 07 - 12',
      '#eab308',
      '#0f172a',
      6.8,
      1.1,
      36,
      'TERMINAL EKSISTING'
    );
    bridgeEksPlaque.position.set(39.5, 5.25, -9.0);
    utamaGroup.add(bridgeEksPlaque);
    this.lantai2Meshes.push(bridgeEksPlaque);

    const bridgeSelPlaque = this.createPlaqueMesh(
      '← JEMBATAN KE GATE 01 - 06',
      '#6366f1',
      '#ffffff',
      6.8,
      1.1,
      36,
      'TERMINAL SELATAN'
    );
    bridgeSelPlaque.position.set(2.5, 5.25, -9.0);
    utamaGroup.add(bridgeSelPlaque);
    this.lantai2Meshes.push(bridgeSelPlaque);

    // Structural Grid of 36 White Columns across Terminal Utama Lantai 2 (4 rows x 9 cols)
    for (let colX = -2; colX <= 50; colX += 6.5) {
      [-34.2, -29.0, -23.0, -16.8].forEach((colZPos) => {
        addL2Column(utamaGroup, colX, colZPos, 2.65);
      });
    }

    // PA Speaker Indicator Nodes on Terminal Utama Lantai 2 (matching PDF diagram)
    [
      [4, -32], [18, -32], [32, -32], [46, -32],
      [8, -22], [24, -22], [40, -22], [48, -16], [0, -16]
    ].forEach(([gx, gz]) => {
      addL2GreenNode(utamaGroup, gx, gz);
      const speakerBadge = this.createCircularPlaqueMesh('SPK', '#1e293b', '#22c55e', 0.55, 36);
      speakerBadge.position.set(gx, 5.22, gz);
      utamaGroup.add(speakerBadge);
      this.lantai2Meshes.push(speakerBadge);
    });

    // Interactive Volume for Terminal Utama [macro-1]
    const utamaZoneGeo = new THREE.BoxGeometry(utamaW - 1, utamaH - 0.8, utamaD - 1);
    const utamaZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.65,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const utamaZoneMesh = new THREE.Mesh(utamaZoneGeo, utamaZoneMat);
    utamaZoneMesh.position.set(utamaX, utamaH / 2 + 0.4, utamaZ);
    utamaZoneMesh.castShadow = true;
    utamaZoneMesh.receiveShadow = true;
    utamaGroup.add(utamaZoneMesh);
    this.addZoneMesh('macro-1', utamaZoneMesh);

    // Front Glass Windscreen Curtain Wall with White Mullion Grid (facing Jalanan at Z = -38)
    const frontWallZ = utamaZ - utamaD / 2; // Z = -38
    const utamaFrontGlass = new THREE.Mesh(
      new THREE.BoxGeometry(utamaW, utamaH, 0.35),
      curtainGlassMat
    );
    utamaFrontGlass.position.set(utamaX, utamaH / 2 + 0.4, frontWallZ);
    utamaGroup.add(utamaFrontGlass);
    this.upperRoofMeshes.push(utamaFrontGlass);

    // White Horizontal & Vertical Mullion Grid across the Front Glass Facade
    for (let my = 2.4; my <= utamaH; my += 2.2) {
      const hMullion = new THREE.Mesh(
        new THREE.BoxGeometry(utamaW + 0.2, 0.14, 0.44),
        whiteColumnMat
      );
      hMullion.position.set(utamaX, my, frontWallZ - 0.05);
      utamaGroup.add(hMullion);
      this.upperRoofMeshes.push(hMullion);
    }
    for (let mx = utamaX - utamaW / 2 + 3; mx <= utamaX + utamaW / 2 - 3; mx += 3.0) {
      const vMullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, utamaH, 0.44),
        whiteColumnMat
      );
      vMullion.position.set(mx, utamaH / 2 + 0.4, frontWallZ - 0.05);
      utamaGroup.add(vMullion);
      this.upperRoofMeshes.push(vMullion);
    }

    // 3-Lobe Scalloped Phinisi Wave Roof over Terminal Utama (Opaque metallic shell matching image_bf82482f.png)
    const lobeConfigs = [
      { cx: utamaX - 19.5, w: 21, archH: 4.0, frontExtend: 3.2 },
      { cx: utamaX,        w: 22, archH: 5.5, frontExtend: 5.6 },
      { cx: utamaX + 19.5, w: 21, archH: 4.0, frontExtend: 3.2 },
    ];
    lobeConfigs.forEach((lobe) => {
      const archShape = new THREE.Shape();
      archShape.moveTo(-lobe.w / 2, 0);
      archShape.quadraticCurveTo(0, lobe.archH, lobe.w / 2, 0);
      archShape.lineTo(lobe.w / 2, -0.75);
      archShape.quadraticCurveTo(0, lobe.archH - 0.78, -lobe.w / 2, -0.75);
      archShape.closePath();

      const depth = utamaD + lobe.frontExtend + 2.0;
      const archGeo = new THREE.ExtrudeGeometry(archShape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.32,
        bevelThickness: 0.32,
      });
      const archMesh = new THREE.Mesh(archGeo, roofShellMat);
      archMesh.position.set(
        lobe.cx,
        utamaH + 0.4,
        frontWallZ - lobe.frontExtend
      );
      archMesh.castShadow = true;
      archMesh.receiveShadow = true;
      utamaGroup.add(archMesh);
      this.upperRoofMeshes.push(archMesh);

      // Dark Bronze/Slate Eave Trim Band along Front & Rear of each Phinisi Wave Lobe
      const trimGeo = new THREE.ExtrudeGeometry(archShape, {
        depth: 0.55,
        bevelEnabled: false,
      });
      const frontTrim = new THREE.Mesh(trimGeo, roofBronzeFasciaMat);
      frontTrim.position.set(lobe.cx, utamaH + 0.35, frontWallZ - lobe.frontExtend - 0.25);
      utamaGroup.add(frontTrim);
      this.upperRoofMeshes.push(frontTrim);

      const rearTrim = new THREE.Mesh(trimGeo, roofBronzeFasciaMat);
      rearTrim.position.set(lobe.cx, utamaH + 0.35, frontWallZ - lobe.frontExtend + depth - 0.25);
      utamaGroup.add(rearTrim);
      this.upperRoofMeshes.push(rearTrim);

      // Rounded Scalloped Front Nose Bullnose Cap facing the Curbside Road (-Z)
      const lobeTipGeo = new THREE.CylinderGeometry(
        lobe.w / 2 - 0.5,
        lobe.w / 2,
        1.1,
        24,
        1,
        false,
        0,
        Math.PI
      );
      const lobeTip = new THREE.Mesh(lobeTipGeo, roofShellMat);
      lobeTip.rotation.y = Math.PI;
      lobeTip.position.set(lobe.cx, utamaH + 0.9, frontWallZ - lobe.frontExtend + 0.4);
      utamaGroup.add(lobeTip);
      this.upperRoofMeshes.push(lobeTip);
    });

    // Side Wing Roofs over Left (+X=57.5) and Right (-X=-9.5) T-Wings of Terminal Utama
    [-9.5, 57.5].forEach((wingX) => {
      const wingRoof = new THREE.Mesh(
        new THREE.BoxGeometry(7.6, 0.55, 18.6),
        roofShellMat
      );
      wingRoof.position.set(wingX, 9.8, -25.0);
      wingRoof.castShadow = true;
      utamaGroup.add(wingRoof);
      this.upperRoofMeshes.push(wingRoof);
    });

    // =========================================================================
    // LANTAI 3 CURBSIDE DROP-OFF PLAZA & CANOPY (Y = 9.6m — Connected to Jalanan)
    // Extends from Terminal Utama front wall (Z = -38.0) out to the Jalanan inner edge (Z = -43.6)
    // =========================================================================
    const lt3Y = 9.6;
    const canopyW = utamaW + 4;
    const sidewalkDepth = 5.6; // Z: -38.0 to -43.6

    // Lantai 3 Curbside Sidewalk / Trotoar Slab directly connecting Lt.3 Terminal Utama & Jalanan
    const lt3SidewalkGeo = new THREE.BoxGeometry(canopyW, 0.55, sidewalkDepth);
    const lt3Sidewalk = new THREE.Mesh(lt3SidewalkGeo, pedestalMat);
    lt3Sidewalk.position.set(utamaX, lt3Y + 0.05, frontWallZ - sidewalkDepth / 2);
    lt3Sidewalk.receiveShadow = true;
    lt3Sidewalk.castShadow = true;
    utamaGroup.add(lt3Sidewalk);
    this.lantai2Meshes.push(lt3Sidewalk);

    // Lower Structural Support Columns under Lantai 3 Curbside Sidewalk (from Y=0 to Y=9.6m)
    for (let sx = utamaX - utamaW / 2 + 4; sx <= utamaX + utamaW / 2 - 4; sx += 13.0) {
      const subCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.6, lt3Y, 12),
        roofAccentMat
      );
      subCol.position.set(sx, lt3Y / 2, frontWallZ - 3.2);
      subCol.castShadow = true;
      utamaGroup.add(subCol);
      this.lantai2Meshes.push(subCol);
    }

    // Chamfered Silver-Metallic Curbside Drop-Off Canopy Overhang above Lantai 3 (Y = 13.6m)
    const canopyD = 6.2;
    const canopyY = 13.6;
    const canopyBox = new THREE.Mesh(
      new THREE.BoxGeometry(canopyW, 0.62, canopyD),
      silverCanopyMat
    );
    canopyBox.position.set(utamaX, canopyY, frontWallZ - canopyD / 2 + 0.2);
    canopyBox.castShadow = true;
    utamaGroup.add(canopyBox);
    this.upperRoofMeshes.push(canopyBox);

    // Angled Chamfered Front Lip Plate on Silver Canopy
    const lipPlate = new THREE.Mesh(
      new THREE.BoxGeometry(canopyW, 0.85, 0.45),
      silverCanopyMat
    );
    lipPlate.position.set(utamaX, canopyY + 0.15, frontWallZ - canopyD + 0.2);
    lipPlate.rotation.x = 0.35;
    utamaGroup.add(lipPlate);
    this.upperRoofMeshes.push(lipPlate);

    // Row of White Cylindrical Structural Columns on Octagonal Concrete Pedestals ON Lantai 3 Sidewalk
    const colZ = frontWallZ - 4.3; // Z = -42.3 along the Lantai 3 curbside edge
    for (let cx = utamaX - utamaW / 2 + 2; cx <= utamaX + utamaW / 2 - 2; cx += 8.0) {
      const octBaseGeo = new THREE.CylinderGeometry(0.72, 0.84, 1.15, 8);
      const octBase = new THREE.Mesh(octBaseGeo, pedestalMat);
      octBase.position.set(cx, lt3Y + 0.32 + 0.57, colZ);
      octBase.castShadow = true;
      octBase.receiveShadow = true;
      utamaGroup.add(octBase);
      this.lantai2Meshes.push(octBase);

      const collarGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.12, 16);
      const collar = new THREE.Mesh(collarGeo, roofAccentMat);
      collar.position.set(cx, lt3Y + 1.5, colZ);
      utamaGroup.add(collar);
      this.lantai2Meshes.push(collar);

      const whiteColGeo = new THREE.CylinderGeometry(0.42, 0.46, 4.2, 20);
      const whiteCol = new THREE.Mesh(whiteColGeo, whiteColumnMat);
      whiteCol.position.set(cx, lt3Y + 1.55 + 2.1, colZ);
      whiteCol.castShadow = true;
      utamaGroup.add(whiteCol);
      this.lantai2Meshes.push(whiteCol);

      const strutGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 12);
      const strut = new THREE.Mesh(strutGeo, silverCanopyMat);
      strut.position.set(cx, canopyY + 0.9, colZ + 0.4);
      strut.rotation.x = 0.25;
      utamaGroup.add(strut);
      this.upperRoofMeshes.push(strut);
    }

    // Parked Drop-Off Realistic SUVs / Sedans & Orange Traffic Cones along the Lantai 3 Drop-Off Lane
    const dropOffCars = [
      { x: 0,  color: 0x0f172a, isSUV: true },
      { x: 11, color: 0xf8fafc, isSUV: true },
      { x: 22, color: 0x1e293b, isSUV: false },
      { x: 34, color: 0xe2e8f0, isSUV: false },
      { x: 45, color: 0x0f172a, isSUV: true },
    ];
    dropOffCars.forEach((car) => {
      const carModel = this.createRealisticCar(car.color, car.isSUV);
      carModel.position.set(car.x, lt3Y + 0.26, frontWallZ - 6.8);
      carModel.rotation.y = Math.PI / 2;
      utamaGroup.add(carModel);
      this.lantai2Meshes.push(carModel);
    });

    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    for (let kx = 5; kx <= 49; kx += 11) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 12), coneMat);
      cone.position.set(kx, lt3Y + 0.6, frontWallZ - 5.3);
      utamaGroup.add(cone);
      this.lantai2Meshes.push(cone);
    }

    // -------------------------------------------------------------------------
    // TWO LANTAI 2 CONNECTOR BRIDGES (X = 0 and X = 46, Z: -12 to -2)
    // Dark charcoal floors + 3D white side parapet walls + structural columns
    // -------------------------------------------------------------------------
    [0, 46].forEach((bridgeX) => {
      // Lantai 1 & Lantai 2 slabs for bridge
      const bSlab1 = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.4, 10.4), slabMat);
      bSlab1.position.set(bridgeX, 0.4, -7);
      utamaGroup.add(bSlab1);

      const bFloor2 = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.38, 10.4), darkFloorMat);
      bFloor2.position.set(bridgeX, 4.7, -7);
      bFloor2.receiveShadow = true;
      utamaGroup.add(bFloor2);
      this.lantai2Meshes.push(bFloor2);

      // Left & Right 3D White Corridor Walls on Lantai 2 Bridge
      addL2Wall(utamaGroup, bridgeX - 4.9, -7.0, 0.42, 10.2, 2.45);
      addL2Wall(utamaGroup, bridgeX + 4.9, -7.0, 0.42, 10.2, 2.45);

      // Internal bridge divider columns & threshold portals
      addL2Column(utamaGroup, bridgeX - 2.2, -9.5, 2.5);
      addL2Column(utamaGroup, bridgeX + 2.2, -9.5, 2.5);
      addL2Column(utamaGroup, bridgeX - 2.2, -4.5, 2.5);
      addL2Column(utamaGroup, bridgeX + 2.2, -4.5, 2.5);

      const bridgeGeo = new THREE.BoxGeometry(10, 8.2, 10);
      const bridgeMat = utamaZoneMat.clone();
      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.position.set(bridgeX, 4.5, -7);
      bridgeMesh.castShadow = true;
      utamaGroup.add(bridgeMesh);
      this.addZoneMesh('macro-1', bridgeMesh);

      const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.45, 10.6), roofShellMat);
      bridgeRoof.position.set(bridgeX, 8.8, -7);
      bridgeRoof.castShadow = true;
      utamaGroup.add(bridgeRoof);
      this.upperRoofMeshes.push(bridgeRoof);
    });

    terminalGroup.add(utamaGroup);

    // =========================================================================
    // 2. TERMINAL EKSISTING (2 LANTAI · GATE 07–12) — Macro Zone 2
    // Located at Airside Center-Left: X: -12 to +60 (W=72), Z: -2 to +16 (D=18), H=8.2m
    // Plus Central Recessed Courtyard Bay at X: +10 to +36, Z: -6.5 to -2
    // =========================================================================
    const eksistingGroup = new THREE.Group();
    const eksX = 24;
    const eksZ = 7;
    const eksW = 72;
    const eksD = 18;
    const eksH = 8.2;

    // Lantai 2 Structural Base Slab at Y=4.6m (Lantai 1 slabs are built in detail inside lantai1Group)
    [4.6].forEach((flY) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(eksW, 0.38, eksD), slabMat);
      slab.position.set(eksX, flY, eksZ);
      slab.receiveShadow = true;
      eksistingGroup.add(slab);

      // Central Recessed Rear Bay between the 2 Connector Bridges (X: 10 to 36, Z: -6.5 to -2)
      const rearBaySlab = new THREE.Mesh(new THREE.BoxGeometry(26, 0.38, 4.6), slabMat);
      rearBaySlab.position.set(23, flY, -4.3);
      rearBaySlab.receiveShadow = true;
      eksistingGroup.add(rearBaySlab);

      if (flY > 2.0) {
        this.lantai2Meshes.push(slab, rearBaySlab);
      }
    });

    // -------------------------------------------------------------------------
    // LANTAI 2 (Y = 4.6m) ARCHITECTURAL MOCKUP — TERMINAL EKSISTING
    // Light grey/white boarding concourse floor + rear dark transfer bay +
    // 3D white partition rooms, gate holdroom stalls, column spine & green nodes
    // -------------------------------------------------------------------------
    const eksWhiteFloor = new THREE.Mesh(
      new THREE.BoxGeometry(eksW - 0.4, 0.12, eksD - 0.4),
      whiteFloorMat
    );
    eksWhiteFloor.position.set(eksX, 4.82, eksZ);
    eksWhiteFloor.receiveShadow = true;
    eksistingGroup.add(eksWhiteFloor);
    this.lantai2Meshes.push(eksWhiteFloor);

    // Dark Charcoal Floor in Central Recessed Rear Bay (X: 10 to 36, Z: -6.5 to +1)
    const eksRearDarkFloor = new THREE.Mesh(
      new THREE.BoxGeometry(25.8, 0.14, 7.2),
      darkFloorMat
    );
    eksRearDarkFloor.position.set(23, 4.83, -2.8);
    eksRearDarkFloor.receiveShadow = true;
    eksistingGroup.add(eksRearDarkFloor);
    this.lantai2Meshes.push(eksRearDarkFloor);

    // Perimeter 3D White Walls of Terminal Eksisting Lantai 2
    addL2Wall(eksistingGroup, 59.8, 7.0, 0.42, 18.0, 2.45); // Far left (+X=60) end wall
    addL2Wall(eksistingGroup, 24.0, 15.8, 72.0, 0.38, 2.45); // Airside front wall (Z = +15.8)
    addL2Wall(eksistingGroup, 55.5, -1.8, 9.0, 0.38, 2.45);  // Rear wall left of Bridge 1
    addL2Wall(eksistingGroup, 23.0, -6.4, 26.0, 0.38, 2.45); // Recessed bay rear wall
    addL2Wall(eksistingGroup, 10.0, -4.1, 0.38, 4.6, 2.45);  // Recessed bay right side wall
    addL2Wall(eksistingGroup, 36.0, -4.1, 0.38, 4.6, 2.45);  // Recessed bay left side wall
    addL2Wall(eksistingGroup, -8.5, -1.8, 7.0, 0.38, 2.45);  // Rear wall right of Bridge 2

    // Row of 10 Landside Commercial / Retail / Restroom Partition Rooms (Z: -1.8 to +4.2)
    addL2Wall(eksistingGroup, 24.0, 4.2, 66.0, 0.32, 2.35); // Corridor wall along Z = +4.2
    for (let rx = -8; rx <= 56; rx += 6.4) {
      addL2Wall(eksistingGroup, rx, 1.2, 0.3, 6.0, 2.35);
    }
    // Recessed bay internal partition rooms (X: 12 to 34, Z: -6.4 to -1.8)
    for (let bx = 15; bx <= 31; bx += 5.2) {
      addL2Wall(eksistingGroup, bx, -4.1, 0.3, 4.4, 2.35);
    }

    // Airside Gate Holdroom Divider Partitions, Boarding Desks & Yellow Gate Badges (Gates 07 to 12)
    // Matches the dashed red box ("Terminal Eksisting") in Page 2 of PDF
    const eksGates = [
      { gx: -5.5, gateNum: '07', label: 'GATE 07' },
      { gx: 6.5,  gateNum: '08', label: 'GATE 08' },
      { gx: 18.5, gateNum: '09', label: 'GATE 09' },
      { gx: 30.5, gateNum: '10', label: 'GATE 10' },
      { gx: 42.5, gateNum: '11', label: 'GATE 11' },
      { gx: 54.5, gateNum: '12', label: 'GATE 12' },
    ];

    eksGates.forEach((g) => {
      // Partition walls framing gate holdroom
      addL2Wall(eksistingGroup, g.gx - 3.2, 13.5, 0.3, 4.4, 2.2);
      addL2Wall(eksistingGroup, g.gx + 2.8, 12.2, 3.4, 0.3, 2.2);

      // Yellow Gate Badge Plaque (matching prominent yellow badges on PDF Page 2)
      const gateBadge = this.createPlaqueMesh(
        g.label,
        '#facc15',
        '#0f172a',
        3.8,
        1.25,
        44,
        'DOMESTIC BOARDING'
      );
      gateBadge.position.set(g.gx, 5.25, 14.8);
      eksistingGroup.add(gateBadge);
      this.lantai2Meshes.push(gateBadge);

      // Boarding Gate Counter Desk
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.05, 0.9),
        partitionWallMat
      );
      desk.position.set(g.gx - 0.8, 4.82 + 0.52, 13.5);
      desk.castShadow = true;
      eksistingGroup.add(desk);
      this.lantai2Meshes.push(desk);

      // Tandem passenger waiting chairs (3 rows per gate)
      for (let cr = 0; cr < 2; cr++) {
        const chairRow = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.55, 0.65),
          darkFloorMat
        );
        chairRow.position.set(g.gx, 4.82 + 0.28, 9.8 + cr * 1.5);
        eksistingGroup.add(chairRow);
        this.lantai2Meshes.push(chairRow);
      }
    });

    // Room / Commercial Booth Circular Number Plaques matching PDF Page 2 (10, 31, 32, 33, 34, 35, 39)
    const eksRoomBadges = [
      { x: -7.5, num: '10' },
      { x: 3.5,  num: '31' },
      { x: 13.5, num: '32' },
      { x: 23.5, num: '33' },
      { x: 33.5, num: '34' },
      { x: 43.5, num: '35' },
      { x: 53.5, num: '39' },
    ];
    eksRoomBadges.forEach((rb) => {
      const roomPlaque = this.createCircularPlaqueMesh(rb.num, '#0f172a', '#38bdf8', 0.8, 48);
      roomPlaque.position.set(rb.x, 5.25, 1.8);
      eksistingGroup.add(roomPlaque);
      this.lantai2Meshes.push(roomPlaque);
    });

    // Terminal Eksisting Lantai 2 Concourse Header Plaque
    const eksHeaderPlaque = this.createPlaqueMesh(
      'TERMINAL EKSISTING • LANTAI 2',
      '#eab308',
      '#0f172a',
      8.5,
      1.2,
      36,
      'BOARDING GATES 07 - 12 & COMMERCIAL'
    );
    eksHeaderPlaque.position.set(24.0, 5.25, 6.8);
    eksistingGroup.add(eksHeaderPlaque);
    this.lantai2Meshes.push(eksHeaderPlaque);

    // Central Spine of 14 White Cylindrical Structural Columns along Terminal Eksisting Lantai 2
    for (let cx = -9; cx <= 57; cx += 5.0) {
      addL2Column(eksistingGroup, cx, 7.8, 2.65);
      addL2Column(eksistingGroup, cx, 12.8, 2.65);
    }

    // PA Speaker Indicator Nodes along Terminal Eksisting Lantai 2 (matching reference diagram)
    [-8, -1, 7, 15, 23, 31, 39, 47, 55].forEach((gx) => {
      addL2GreenNode(eksistingGroup, gx, 5.5);
      addL2GreenNode(eksistingGroup, gx, 13.8);

      const spk1 = this.createCircularPlaqueMesh('SPK', '#1e293b', '#22c55e', 0.5, 34);
      spk1.position.set(gx, 5.22, 5.5);
      eksistingGroup.add(spk1);
      this.lantai2Meshes.push(spk1);

      const spk2 = this.createCircularPlaqueMesh('SPK', '#1e293b', '#22c55e', 0.5, 34);
      spk2.position.set(gx, 5.22, 13.8);
      eksistingGroup.add(spk2);
      this.lantai2Meshes.push(spk2);
    });

    // Interactive Volume for Terminal Eksisting (2 Lantai) [macro-2]
    const eksZoneGeo = new THREE.BoxGeometry(eksW - 0.8, eksH - 0.6, eksD - 0.8);
    const eksZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.65,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const eksZoneMesh = new THREE.Mesh(eksZoneGeo, eksZoneMat);
    eksZoneMesh.position.set(eksX, eksH / 2 + 0.4, eksZ);
    eksZoneMesh.castShadow = true;
    eksZoneMesh.receiveShadow = true;
    eksistingGroup.add(eksZoneMesh);
    this.addZoneMesh('macro-2', eksZoneMesh);

    // Repeating 6 Vaulted Phinisi Wave Roof Bays over Gates 07 - 12 (Opaque metallic shells matching image_bf82482f.png)
    for (let i = 0; i < 6; i++) {
      const bayW = eksW / 6;
      const bx = -12 + bayW * (i + 0.5);
      const vaultShape = new THREE.Shape();
      vaultShape.moveTo(-bayW / 2, 0);
      vaultShape.quadraticCurveTo(0, 2.6, bayW / 2, 0);
      vaultShape.lineTo(bayW / 2, -0.55);
      vaultShape.quadraticCurveTo(0, 2.0, -bayW / 2, -0.55);
      vaultShape.closePath();

      const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: eksD + 2.4,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.15,
        bevelThickness: 0.15,
      });
      const vault = new THREE.Mesh(vaultGeo, roofShellMat);
      vault.position.set(bx, eksH + 0.4, eksZ - (eksD + 2.4) / 2);
      vault.castShadow = true;
      vault.receiveShadow = true;
      eksistingGroup.add(vault);
      this.upperRoofMeshes.push(vault);

      // Front & Rear Dark Bronze/Slate Arch Fascia Bands on each Vaulted Roof Bay
      const archTrimGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: 0.42,
        bevelEnabled: false,
      });
      const frontArchTrim = new THREE.Mesh(archTrimGeo, roofBronzeFasciaMat);
      frontArchTrim.position.set(bx, eksH + 0.36, eksZ + (eksD + 2.4) / 2 - 0.2);
      eksistingGroup.add(frontArchTrim);
      this.upperRoofMeshes.push(frontArchTrim);
    }

    terminalGroup.add(eksistingGroup);

    // =========================================================================
    // 3. TERMINAL SELATAN (2 LANTAI · GATE 01–06) — Macro Zone 3
    // Matches the exact Lantai 2 & Lantai 1 architectural plans + Opaque Fan Rotunda Roof
    // =========================================================================
    const selatanGroup = new THREE.Group();
    const selStraightX = -27; // Center of X: -42 to -12
    const selStraightW = 30;  // X: -42 to -12
    const selD = 18;          // Z: -2 to +16
    const selH = 8.2;         // 2 floors
    const curveCenterX = -42;
    const curveCenterZ = -16;
    const innerR = 14.0;      // -16 + 14 = -2 (matches Z = -2 inner wall!)
    const midR = 23.0;        // Divider between inner white rooms and outer dark carpet walkway
    const outerR = 32.0;      // -16 + 32 = +16 (matches Z = +16 outer airside wall!)
    const curveStartAngle = Math.PI * 0.5;
    const curveEndAngle = Math.PI * 1.02;

    const createCurvedSlabMesh = (
      rIn: number,
      rOut: number,
      thickness: number,
      yPos: number,
      mat: THREE.Material,
      aStart: number = curveStartAngle,
      aEnd: number = curveEndAngle,
      segs: number = 36
    ) => {
      const shape = this.createArcSectorShape(rIn, rOut, aStart, aEnd, segs);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(curveCenterX, yPos, curveCenterZ);
      mesh.receiveShadow = true;
      return mesh;
    };
    const arcAStart = -Math.PI * 1.02;
    const arcAEnd = -Math.PI * 0.5;

    // 1. Lantai 1 & Lantai 2 Base Structural Slabs for Straight Section, Curved Pier & Circular Rotunda Core
    [0.4, 4.6].forEach((flY) => {
      // Straight Concourse Slab (X: -42 to -12, Z: -2 to +16)
      const stSlab = new THREE.Mesh(new THREE.BoxGeometry(selStraightW, 0.38, selD), slabMat);
      stSlab.position.set(selStraightX, flY, 7);
      stSlab.receiveShadow = true;
      selatanGroup.add(stSlab);

      // Curved Quarter-Circle Finger Pier Slab (Inner R=14 to Outer R=32)
      const curvedSlab = createCurvedSlabMesh(innerR, outerR, 0.38, flY - 0.19, slabMat, arcAStart, arcAEnd, 40);
      selatanGroup.add(curvedSlab);

      // Inner Landside Circular Rotunda Core / Atrium Drum Slab at (X = -41, Z = -5.8, R = 5.6m)
      const drumSlab = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.38, 28), slabMat);
      drumSlab.position.set(-41, flY, -5.8);
      drumSlab.receiveShadow = true;
      selatanGroup.add(drumSlab);

      if (flY > 2.0) {
        this.lantai2Meshes.push(stSlab, curvedSlab, drumSlab);
      }
    });

    // Lantai 1 Curved Pier Tile Floor & Structural Columns (visible in Lantai 1 view)
    const selL1CurvedFloor = createCurvedSlabMesh(
      innerR + 0.2,
      outerR - 0.2,
      0.14,
      0.55,
      l1TileFloorMat,
      arcAStart,
      arcAEnd,
      40
    );
    selatanGroup.add(selL1CurvedFloor);

    // -------------------------------------------------------------------------
    // LANTAI 2 (Y = 4.6m) ARCHITECTURAL MOCKUP — TERMINAL SELATAN
    // -------------------------------------------------------------------------
    const selStWhiteFloor = new THREE.Mesh(
      new THREE.BoxGeometry(selStraightW, 0.12, 9.0),
      whiteFloorMat
    );
    selStWhiteFloor.position.set(selStraightX, 4.82, 2.5);
    selStWhiteFloor.receiveShadow = true;
    selatanGroup.add(selStWhiteFloor);
    this.lantai2Meshes.push(selStWhiteFloor);

    const selStDarkFloor = new THREE.Mesh(
      new THREE.BoxGeometry(selStraightW, 0.14, 9.0),
      selatanCarpetMat
    );
    selStDarkFloor.position.set(selStraightX, 4.83, 11.5);
    selStDarkFloor.receiveShadow = true;
    selatanGroup.add(selStDarkFloor);
    this.lantai2Meshes.push(selStDarkFloor);

    const selCurvedWhiteFloor = createCurvedSlabMesh(
      innerR + 0.1,
      midR,
      0.12,
      4.79,
      whiteFloorMat,
      arcAStart,
      arcAEnd,
      40
    );
    selatanGroup.add(selCurvedWhiteFloor);
    this.lantai2Meshes.push(selCurvedWhiteFloor);

    const selCurvedDarkFloor = createCurvedSlabMesh(
      midR,
      outerR - 0.1,
      0.14,
      4.80,
      selatanCarpetMat,
      arcAStart,
      arcAEnd,
      40
    );
    selatanGroup.add(selCurvedDarkFloor);
    this.lantai2Meshes.push(selCurvedDarkFloor);

    const drumDarkFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.4, 0.15, 28),
      darkFloorMat
    );
    drumDarkFloor.position.set(-41, 4.84, -5.8);
    selatanGroup.add(drumDarkFloor);
    this.lantai2Meshes.push(drumDarkFloor);

    const drumOuterWall = createCurvedSlabMesh(4.9, 5.5, 2.45, 4.65, partitionWallMat, -Math.PI * 0.15, Math.PI * 1.15, 28);
    drumOuterWall.position.set(-41, 4.65, -5.8);
    selatanGroup.add(drumOuterWall);
    this.lantai2Meshes.push(drumOuterWall);

    const drumInnerRing = createCurvedSlabMesh(2.1, 2.5, 2.45, 4.65, partitionWallMat, 0, Math.PI * 2, 24);
    drumInnerRing.position.set(-41, 4.65, -5.8);
    selatanGroup.add(drumInnerRing);
    this.lantai2Meshes.push(drumInnerRing);

    const curvedInnerWall = createCurvedSlabMesh(innerR, innerR + 0.42, 2.45, 4.65, partitionWallMat, arcAStart, arcAEnd, 40);
    selatanGroup.add(curvedInnerWall);
    this.lantai2Meshes.push(curvedInnerWall);

    const curvedMidWall = createCurvedSlabMesh(midR - 0.18, midR + 0.18, 2.35, 4.65, partitionWallMat, arcAStart + 0.05, arcAEnd - 0.04, 36);
    selatanGroup.add(curvedMidWall);
    this.lantai2Meshes.push(curvedMidWall);

    const curvedOuterWall = createCurvedSlabMesh(outerR - 0.42, outerR, 2.45, 4.65, partitionWallMat, arcAStart, arcAEnd, 40);
    selatanGroup.add(curvedOuterWall);
    this.lantai2Meshes.push(curvedOuterWall);

    addL2Wall(selatanGroup, -65.0, -16.5, 18.0, 0.45, 2.45, 0.04);
    addL2Wall(selatanGroup, -26.0, -1.8, 28.0, 0.38, 2.45);
    addL2Wall(selatanGroup, -27.0, 15.8, 30.0, 0.38, 2.45);
    addL2Wall(selatanGroup, -27.0, 6.8, 29.0, 0.35, 2.35);
    addL2Wall(selatanGroup, -12.0, 3.5, 0.38, 11.0, 2.45);

    for (let sx = -38; sx <= -16; sx += 5.5) {
      addL2Wall(selatanGroup, sx, 2.5, 0.3, 8.6, 2.35);
    }

    for (let s = 1; s <= 7; s++) {
      const theta = (s / 8) * (Math.PI * 0.5);
      const midRad = (innerR + midR) / 2;
      const wx = curveCenterX - Math.sin(theta) * midRad;
      const wz = curveCenterZ + Math.cos(theta) * midRad;
      addL2Wall(selatanGroup, wx, wz, 0.32, midR - innerR - 0.4, 2.35, -theta);
    }

    for (let s = 0; s <= 8; s++) {
      const theta = (s / 8) * (Math.PI * 0.48);
      const colRad = 27.5;
      const cx = curveCenterX - Math.sin(theta) * colRad;
      const cz = curveCenterZ + Math.cos(theta) * colRad;
      addL2Column(selatanGroup, cx, cz, 2.65);

      if (s % 2 === 1) {
        const gx = curveCenterX - Math.sin(theta) * 29.8;
        const gz = curveCenterZ + Math.cos(theta) * 29.8;
        addL2Wall(selatanGroup, gx, gz, 3.2, 0.32, 2.2, -theta);
      }
    }

    for (let cx = -38; cx <= -16; cx += 5.5) {
      addL2Column(selatanGroup, cx, 11.5, 2.65);
    }

    [
      [-16, 4.5], [-24, 4.5], [-32, 4.5], [-39, 4.5],
      [-18, 13.5], [-28, 13.5], [-37, 13.5], [-41, -5.8]
    ].forEach(([gx, gz]) => addL2GreenNode(selatanGroup, gx, gz));

    for (let s = 1; s <= 6; s++) {
      const theta = (s / 6.5) * (Math.PI * 0.48);
      addL2GreenNode(
        selatanGroup,
        curveCenterX - Math.sin(theta) * 20.0,
        curveCenterZ + Math.cos(theta) * 20.0
      );
      addL2GreenNode(
        selatanGroup,
        curveCenterX - Math.sin(theta) * 28.5,
        curveCenterZ + Math.cos(theta) * 28.5
      );
    }

    // Interactive Volumes for Terminal Selatan [macro-3]
    const selZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.65,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });

    const selStraightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(selStraightW - 0.5, selH - 0.6, selD - 0.8),
      selZoneMat
    );
    selStraightMesh.position.set(selStraightX, selH / 2 + 0.4, 7);
    selStraightMesh.castShadow = true;
    selStraightMesh.receiveShadow = true;
    selatanGroup.add(selStraightMesh);
    this.addZoneMesh('macro-3', selStraightMesh);

    const curvedZoneMesh = createCurvedSlabMesh(
      innerR + 0.3,
      outerR - 0.3,
      selH - 0.6,
      0.7,
      selZoneMat.clone(),
      arcAStart,
      arcAEnd,
      36
    );
    selatanGroup.add(curvedZoneMesh);
    this.addZoneMesh('macro-3', curvedZoneMesh);

    // Upper Opaque Metallic Roofs over Terminal Selatan (matching image_bf82482f.png)
    const curvedPierRoof = createCurvedSlabMesh(
      innerR - 0.8,
      outerR + 0.8,
      0.75,
      selH + 0.4,
      roofShellMat,
      arcAStart,
      arcAEnd,
      44
    );
    curvedPierRoof.castShadow = true;
    selatanGroup.add(curvedPierRoof);
    this.upperRoofMeshes.push(curvedPierRoof);

    // Outer Eave Fascia Band around the Curved Fan Roof of Terminal Selatan
    const curvedRoofFascia = createCurvedSlabMesh(
      outerR + 0.4,
      outerR + 1.0,
      0.92,
      selH + 0.32,
      roofBronzeFasciaMat,
      arcAStart,
      arcAEnd,
      44
    );
    selatanGroup.add(curvedRoofFascia);
    this.upperRoofMeshes.push(curvedRoofFascia);

    const drumRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(6.0, 6.0, 0.75, 32),
      roofShellMat
    );
    drumRoof.position.set(-41, selH + 0.6, -5.8);
    drumRoof.castShadow = true;
    selatanGroup.add(drumRoof);
    this.upperRoofMeshes.push(drumRoof);

    for (let i = 0; i < 3; i++) {
      const bayW = selStraightW / 3;
      const bx = -42 + bayW * (i + 0.5);
      const vaultShape = new THREE.Shape();
      vaultShape.moveTo(-bayW / 2, 0);
      vaultShape.quadraticCurveTo(0, 2.6, bayW / 2, 0);
      vaultShape.lineTo(bayW / 2, -0.55);
      vaultShape.quadraticCurveTo(0, 2.0, -bayW / 2, -0.55);
      vaultShape.closePath();

      const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: selD + 2.4,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.15,
        bevelThickness: 0.15,
      });
      const vault = new THREE.Mesh(vaultGeo, roofShellMat);
      vault.position.set(bx, selH + 0.4, 7 - (selD + 2.4) / 2);
      vault.castShadow = true;
      vault.receiveShadow = true;
      selatanGroup.add(vault);
      this.upperRoofMeshes.push(vault);

      const archTrimGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: 0.42,
        bevelEnabled: false,
      });
      const frontArchTrim = new THREE.Mesh(archTrimGeo, roofBronzeFasciaMat);
      frontArchTrim.position.set(bx, selH + 0.36, 7 + (selD + 2.4) / 2 - 0.2);
      selatanGroup.add(frontArchTrim);
      this.upperRoofMeshes.push(frontArchTrim);
    }

    terminalGroup.add(selatanGroup);

    // =========================================================================
    // 4. APRON & 12 GARBARATA (JET BRIDGES GATE 01 – GATE 12) — Macro Zone 4
    // Clean single-arm Garbarata 01 (image_9639f757.png) with flush docking cab head
    // =========================================================================
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.25,
      roughness: 0.3,
    });
    const jetGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa78bfa,
      transmission: 0.65,
      transparent: true,
      opacity: 0.38,
      roughness: 0.2,
      metalness: 0.2,
      depthWrite: false,
    });
    const bellowsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.15,
    });

    const buildJetBridgeArm = (
      parent: THREE.Group,
      length: number,
      offsetX: number = 0,
      extraAngle: number = 0
    ) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(offsetX, 0, 0);
      armGroup.rotation.y = extraAngle;

      // Dark Charcoal Lantai 2 Walkway Floor inside Garbarata
      const floorWalkway = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.28, length),
        darkFloorMat
      );
      floorWalkway.position.set(0, 4.65, length / 2);
      floorWalkway.receiveShadow = true;
      armGroup.add(floorWalkway);

      // Left & Right White 3D Side Parapet Walls on Garbarata
      const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 1.85, length),
        partitionWallMat
      );
      leftWall.position.set(-1.05, 5.55, length / 2);
      leftWall.castShadow = true;
      armGroup.add(leftWall);

      const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 1.85, length),
        partitionWallMat
      );
      rightWall.position.set(1.05, 5.55, length / 2);
      rightWall.castShadow = true;
      armGroup.add(rightWall);

      // Interactive Garbarata Tunnel Volume [macro-4]
      const tunnelGeo = new THREE.BoxGeometry(2.3, 2.2, length);
      const tunnelMesh = new THREE.Mesh(tunnelGeo, jetGlassMat.clone());
      tunnelMesh.position.set(0, 5.5, length / 2);
      tunnelMesh.castShadow = true;
      armGroup.add(tunnelMesh);
      this.addZoneMesh('macro-4', tunnelMesh);

      // Upper Roof Cap (registered in upperRoofMeshes so open-top Lantai 2 view shows the dark walkway inside)
      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.24, length + 0.4), roofShellMat);
      roofCap.position.set(0, 6.55, length / 2);
      armGroup.add(roofCap);
      this.upperRoofMeshes.push(roofCap);

      // Hydraulic Wheel Bogie Pylon + Twin Tires at end of Garbarata
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 4.6, 12), roofAccentMat);
      pylon.position.set(0, 2.3, length - 0.8);
      armGroup.add(pylon);

      [-0.55, 0.55].forEach((wx) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), bellowsMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.38, length - 0.8);
        armGroup.add(wheel);
      });

      // Streamlined Flush Aircraft Docking Cab Head at end of Garbarata (cleanly aligned with tunnel width)
      const cabHead = new THREE.Mesh(new THREE.BoxGeometry(2.34, 1.9, 1.35), jetMat);
      cabHead.position.set(0, 5.55, length + 0.2);
      cabHead.castShadow = true;
      armGroup.add(cabHead);

      // Dark Accordion Rubber Bellows Canopy Bumper at the tip of the Docking Cab
      const bellows = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.08, 1.85, 16, 1, false, -Math.PI / 2, Math.PI),
        bellowsMat
      );
      bellows.position.set(0, 5.55, length + 0.72);
      armGroup.add(bellows);

      parent.add(armGroup);
    };

    SULTAN_HASANUDDIN_GATES.forEach((gate) => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(gate.rootX, 0, gate.rootZ);
      bridgeGroup.rotation.y = gate.angleRad;

      // Fixed Rotunda Node at terminal facade (with dark floor & white wall)
      const rootFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.35, 16), darkFloorMat);
      rootFloor.position.set(0, 4.65, 0);
      bridgeGroup.add(rootFloor);

      const rootNode = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.3, 16), jetMat);
      rootNode.position.set(0, 4.4, 0);
      rootNode.castShadow = true;
      bridgeGroup.add(rootNode);

      // Single Clean Articulated Garbarata Arm (Gate 01 twin arm removed as requested)
      buildJetBridgeArm(bridgeGroup, gate.length, 0, 0);

      // Gate Number Sign Badge above each Garbarata
      const gateBadge = this.createLabelSprite(
        `G${gate.gateNumber}`,
        '#0f172a',
        '#38bdf8',
        6.5,
        2.2
      );
      gateBadge.position.set(0, 7.8, gate.length * 0.45);
      bridgeGroup.add(gateBadge);

      terminalGroup.add(bridgeGroup);
    });

    // Subtle interactive Apron surface volume so clicking the Apron selects Macro Zone 4
    const apronZoneGeo = new THREE.BoxGeometry(130, 0.6, 26);
    const apronZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.18,
      roughness: 0.4,
      depthWrite: false,
    });
    const apronZoneMesh = new THREE.Mesh(apronZoneGeo, apronZoneMat);
    apronZoneMesh.position.set(-2, 0.5, 29);
    terminalGroup.add(apronZoneMesh);
    this.addZoneMesh('macro-4', apronZoneMesh);

    this.scene.add(terminalGroup);
  }

  /**
   * Creates a crisp 3D Canvas Sprite Label for Buildings & Gates
   */
  private createLabelSprite(
    text: string,
    bgColor: string,
    borderColor: string,
    scaleW: number = 22,
    scaleH: number = 4.8
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Rounded pill background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 104, 24);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scaleW, scaleH, 1);
    return sprite;
  }

  /**
   * Floating 3D Architectural Labels for the Sultan Hasanuddin Complex
   */
  private buildBuildingLabels() {
    const labelsGroup = new THREE.Group();

    const utamaLabel = this.createLabelSprite(
      'TERMINAL UTAMA',
      'rgba(15, 23, 42, 0.88)',
      '#38bdf8',
      24,
      5.2
    );
    utamaLabel.position.set(24, 22.2, -25);
    labelsGroup.add(utamaLabel);

    const eksistingLabel = this.createLabelSprite(
      'TERMINAL EKSISTING',
      'rgba(15, 23, 42, 0.88)',
      '#34d399',
      25,
      5.2
    );
    eksistingLabel.position.set(24, 15.0, 7);
    labelsGroup.add(eksistingLabel);

    const selatanLabel = this.createLabelSprite(
      'TERMINAL SELATAN',
      'rgba(15, 23, 42, 0.88)',
      '#818cf8',
      25,
      5.2
    );
    selatanLabel.position.set(-42, 15.0, 7);
    labelsGroup.add(selatanLabel);

    const parkirLabel = this.createLabelSprite(
      'GEDUNG PARKIR',
      'rgba(15, 23, 42, 0.88)',
      '#fbbf24',
      23,
      5.0
    );
    parkirLabel.position.set(42, 16.5, -68);
    labelsGroup.add(parkirLabel);

    const tuguLabel = this.createLabelSprite(
      'PATUNG SULTAN HASANUDDIN',
      'rgba(15, 23, 42, 0.88)',
      '#10b981',
      26,
      4.5
    );
    tuguLabel.position.set(6.5, 15.8, -71.5);
    labelsGroup.add(tuguLabel);

    const apronLabel = this.createLabelSprite(
      'APRON & 12 GARBARATA',
      'rgba(15, 23, 42, 0.88)',
      '#a78bfa',
      24,
      4.8
    );
    apronLabel.position.set(0, 12.5, 42);
    labelsGroup.add(apronLabel);

    this.scene.add(labelsGroup);
  }

  /**
   * Airport Control Tower (ATC WAAA Makassar) — Positioned on the Right Side (Samping Kanan)
   */
  private buildControlTower() {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(78, 0, -22);

    const baseGeo = new THREE.CylinderGeometry(5, 6, 4, 16);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.5,
      metalness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, towerMat);
    base.position.y = 2;
    towerGroup.add(base);

    const shaftGeo = new THREE.CylinderGeometry(2.8, 3.8, 38, 16);
    const shaft = new THREE.Mesh(shaftGeo, towerMat);
    shaft.position.y = 23;
    shaft.castShadow = true;
    towerGroup.add(shaft);

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

    const cabRoofGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.8, 12);
    const cabRoof = new THREE.Mesh(cabRoofGeo, towerMat);
    cabRoof.position.y = 45.8;
    towerGroup.add(cabRoof);

    const domeGeo = new THREE.SphereGeometry(1.4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    this.radarDome = new THREE.Mesh(domeGeo, domeMat);
    this.radarDome.position.y = 46.5;
    towerGroup.add(this.radarDome);

    this.scene.add(towerGroup);
  }

  /**
   * Pesawat Parkir (Parked Commercial Airliners Docked at the Garbarata Stands)
   */
  private buildParkedAircraft() {
    const planesGroup = new THREE.Group();

    SULTAN_HASANUDDIN_GATES.forEach((gate) => {
      if (!gate.hasAircraft) return;

      const dirX = Math.sin(gate.angleRad);
      const dirZ = Math.cos(gate.angleRad);
      const distFromRoot = gate.length + (gate.isWideBody ? 13.5 : 11.2);

      const px = gate.rootX + dirX * distFromRoot;
      const pz = gate.rootZ + dirZ * distFromRoot;

      const plane = this.createProceduralAirliner(
        gate.liveryColor || 0x2563eb,
        gate.tailColor || 0x1d4ed8,
        !!gate.isWideBody
      );
      plane.position.set(px, 0.4, pz);
      // Point aircraft nose (+Z in local airliner space) toward the terminal gate (-dirX, -dirZ)
      plane.rotation.y = gate.angleRad + Math.PI;
      planesGroup.add(plane);
    });

    this.scene.add(planesGroup);
  }

  /**
   * Helper: Draws the Iconic Lion Air Winged-Lion Sunburst Emblem on a 2D Canvas Context
   * (Used on the Vertical Tailfin, Red CFM LEAP-1B Engine Cowlings, and Rear Fuselage)
   */
  private drawLionSunburstEmblem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
    facingRight: boolean
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    if (facingRight) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // 1. Central Lion Head Silhouette (facing left in local coords)
    ctx.beginPath();
    ctx.arc(-radius * 0.14, 0, radius * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // Fierce roaring snout & jaw profile on the front (-X) side
    ctx.beginPath();
    ctx.moveTo(-radius * 0.42, -radius * 0.22);
    ctx.lineTo(-radius * 0.62, -radius * 0.08);
    ctx.lineTo(-radius * 0.48, radius * 0.04);
    ctx.lineTo(-radius * 0.58, radius * 0.18);
    ctx.lineTo(-radius * 0.34, radius * 0.28);
    ctx.closePath();
    ctx.fill();

    // 2. Radiating Curved Winged-Mane Feathers (11 swept sunburst blades around top, back & bottom)
    const featherCount = 11;
    for (let i = 0; i < featherCount; i++) {
      const t = i / (featherCount - 1);
      // Angles from top-front (-115 deg) around back (0 deg) to bottom (+115 deg)
      const angle = (-112 + t * 224) * (Math.PI / 180);
      const innerR = radius * 0.43;
      const outerR = radius * (i < 4 ? 1.12 - i * 0.04 : 0.96 - Math.abs(t - 0.5) * 0.22);

      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(innerR, -radius * 0.055);
      ctx.quadraticCurveTo(
        (innerR + outerR) * 0.55,
        -radius * 0.14,
        outerR,
        -radius * 0.02
      );
      ctx.quadraticCurveTo(
        (innerR + outerR) * 0.58,
        radius * 0.09,
        innerR,
        radius * 0.055
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Creates the Full UV-Mapped Vertical Stabilizer (Sirip Atas Pesawat) Texture
   * mapped 1:1 onto the exact finShape coordinates (sX: 0..7.05, sY: 0..5.45):
   * - Crisp White Stabilizer Surface
   * - Silver/Grey Swept Leading-Edge De-Icing Strip
   * - Bold Red Rudder Trailing-Edge Stripe following the exact trailing-edge angle
   * - Subtle Rudder Hinge Seam Line
   * - Iconic Red Winged-Lion Sunburst Emblem positioned in the lower-center fin area
   * matching ref_plane_2.jpg (Side Profile) and image_bc171a6b.png
   */
  private createLionTailFinFullTexture(isRightSide: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const W = 1024;
    const H = 1024;
    const maxSX = 7.05;
    const maxSY = 5.45;

    // Map finShape (sX, sY) -> Canvas (px, py)
    // UV mapping sets u = sX / maxSX, v = sY / maxSY (where v=0 is bottom, v=1 is top -> canvas Y = H * (1 - v))
    const toX = (sX: number) => (sX / maxSX) * W;
    const toY = (sY: number) => H - (sY / maxSY) * H;

    // 1. Base Glossy White Fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 2. Silver-Grey Swept Leading-Edge Strip along (2.75, 0.95) -> (5.75, 5.35)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 24;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(toX(2.75), toY(0.95));
    ctx.lineTo(toX(5.75), toY(5.35));
    ctx.stroke();

    // 3. Subtle Rudder Hinge Seam Line parallel to the trailing edge
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toX(5.35), toY(0.0));
    ctx.lineTo(toX(6.35), toY(5.4));
    ctx.stroke();

    // 4. Iconic Red Winged-Lion Sunburst Emblem on the Vertical Tailfin
    // Positioned at sX = 4.95, sY = 2.15 (matches exact placement in ref_plane_2.jpg)
    // Note: In finShape UV space, -sX is toward the aircraft nose (+Z).
    // Since drawLionSunburstEmblem faces left (-X) when facingRight=false, passing facingRight=false
    // makes the Lion face toward -sX (the aircraft nose) on BOTH left and right sides!
    void isRightSide;
    this.drawLionSunburstEmblem(ctx, toX(4.92), toY(2.18), 215, '#dc2626', false);

    // 5. Bold Red Rudder Trailing-Edge Stripe along the exact angled back edge (6.15, 0.0) -> (7.05, 5.42)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(toX(5.90), toY(0.0));
    ctx.lineTo(toX(6.30), toY(0.0));
    ctx.lineTo(toX(7.05), toY(5.45));
    ctx.lineTo(toX(6.82), toY(5.45));
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Builds a Continuous, Watertight Multi-Station Lofted 3D Fuselage BufferGeometry
   * for the Boeing 737 MAX 8 (matching ref_plane_1.jpg and ref_plane_2.jpg):
   * - Pointed Lower Radome Nose Tip (Z = +10.85, Y = 2.16)
   * - Angled Cockpit Windscreen Step & Forehead Brow (Z = +6.6 to +9.2)
   * - Constant-Section Ovoid Cabin Barrel (Z = -3.6 to +6.6, Y_top = 3.94, Y_bot = 1.12)
   * - Authentic Boeing 737 Asymmetric Upswept Rear Tail Cone (Z = -11.45 to -3.6):
   *   Top crown line stays high and nearly horizontal under the vertical tailfin while the
   *   lower belly sweeps smoothly upward to meet the high-mounted APU tail tip!
   */
  private buildBoeing737FuselageGeometry(): THREE.BufferGeometry {
    // Stations from rear tailcone tip (z = -11.45) to pointed nose radome tip (z = +10.85)
    const stations: { z: number; yTop: number; yBot: number; rX: number }[] = [
      { z: -11.45, yTop: 3.46, yBot: 2.86, rX: 0.30 }, // Rear tail cone joint to APU nozzle
      { z: -10.50, yTop: 3.60, yBot: 2.52, rX: 0.54 }, // Under rudder trailing edge
      { z: -9.20,  yTop: 3.74, yBot: 2.10, rX: 0.84 }, // Under horizontal stabilizers
      { z: -7.60,  yTop: 3.85, yBot: 1.66, rX: 1.12 }, // Under mid vertical tailfin
      { z: -5.60,  yTop: 3.92, yBot: 1.28, rX: 1.32 }, // Under dorsal fin fillet
      { z: -3.60,  yTop: 3.94, yBot: 1.12, rX: 1.38 }, // Rear end of constant cabin barrel
      { z: 0.00,   yTop: 3.94, yBot: 1.12, rX: 1.38 }, // Mid cabin over wings
      { z: 6.50,   yTop: 3.94, yBot: 1.12, rX: 1.38 }, // Forward cabin ("Lion" billboard area)
      { z: 7.55,   yTop: 3.76, yBot: 1.22, rX: 1.28 }, // Cockpit forehead brow
      { z: 8.30,   yTop: 3.36, yBot: 1.38, rX: 1.12 }, // Top of cockpit V-windscreen
      { z: 8.95,   yTop: 2.82, yBot: 1.56, rX: 0.92 }, // Base of cockpit V-windscreen / radome step
      { z: 9.65,   yTop: 2.58, yBot: 1.78, rX: 0.66 }, // Mid pointed nose radome
      { z: 10.35,  yTop: 2.36, yBot: 1.98, rX: 0.34 }, // Forward nose radome
      { z: 10.85,  yTop: 2.18, yBot: 2.14, rX: 0.02 }, // Pointed nose tip
    ];

    const radialSegments = 36;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let s = 0; s < stations.length; s++) {
      const st = stations[s];
      const yCenter = (st.yTop + st.yBot) * 0.5;
      const rY = Math.max(0.01, (st.yTop - st.yBot) * 0.5);
      const rX = Math.max(0.01, st.rX);

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const x = Math.sin(theta) * rX;
        const y = yCenter + Math.cos(theta) * rY;
        positions.push(x, y, st.z);
      }
    }

    const ringStride = radialSegments + 1;
    for (let s = 0; s < stations.length - 1; s++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = s * ringStride + j;
        const b = (s + 1) * ringStride + j;
        const c = (s + 1) * ringStride + (j + 1);
        const d = s * ringStride + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Creates the White Lion Emblem Texture for the Red CFM LEAP-1B Engine Cowlings
   */
  private createLionEngineLogoTexture(facingRight: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);
    this.drawLionSunburstEmblem(ctx, 128, 128, 86, '#ffffff', facingRight);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Creates the Front Turbofan Intake Texture (Dark Radial Fan Blades + White Spiral Spinner Cone)
   * matching the head-on view in /public/assets/aistudio/image_14d13454.png
   */
  private createTurbofanIntakeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const cx = 128;
    const cy = 128;

    // Dark engine core background
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 124, 0, Math.PI * 2);
    ctx.fill();

    // 18 Sculpted Metallic Titanium Fan Blades
    const blades = 18;
    for (let b = 0; b < blades; b++) {
      const ang = (b / blades) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = b % 2 === 0 ? '#1e293b' : '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, -4);
      ctx.quadraticCurveTo(72, -16, 118, -8);
      ctx.lineTo(118, 6);
      ctx.quadraticCurveTo(72, 2, 22, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center Dark Spinner Hub
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    // White G-Spiral Swirl on the Spinner Cone (visible in image_14d13454.png)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 3.2; t += 0.15) {
      const r = (t / (Math.PI * 3.2)) * 16;
      const sx = cx + Math.cos(t) * r;
      const sy = cy + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Creates a High-Resolution Lion Air Boeing 737 MAX 8 Fuselage Side Livery Texture
   * matching /public/assets/aistudio/image_424a4258.png & /public/assets/aistudio/image_bc171a6b.png:
   * - Indonesian Red-White Flag near Nose
   * - Forward & Rear Passenger Doors + 2 Overwing Emergency Exit Doors
   * - Giant Red "Lion" Billboard Title across Forward Fuselage
   * - Full Row of Dark Cabin Windows
   * - Rear "BOEING 737 MAX 8", "Lion Group" & "PK-L..." Markings
   */
  private createLionAirSideTexture(isRightSide: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 1024, 256);

    const mapX = (xFromNose: number, width: number = 0) =>
      isRightSide ? 1024 - xFromNose - width : xFromNose;

    // 1. Indonesian Red & White Flag (Bendera Merah Putih) ahead of Forward Door
    const flagX = mapX(46, 26);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(flagX, 110, 26, 9);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(flagX, 119, 26, 9);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(flagX, 110, 26, 18);

    // 2. Giant Bold Red "Lion" Billboard Title on Forward Fuselage (matching image_424a4258.png)
    ctx.save();
    const lionCenterX = isRightSide ? 1024 - 275 : 275;
    ctx.translate(lionCenterX, 134);
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 118px "Arial Black", "Plus Jakarta Sans", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lion', 0, 0);
    ctx.restore();

    // 3. Forward (L1/R1) & Rear (L2/R2) Passenger Boarding Doors
    const drawCabinDoor = (xFromNose: number) => {
      const dx = mapX(xFromNose, 42);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(dx, 82, 42, 92, 10);
      ctx.stroke();

      // Door upper window & handle line
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(dx + 13, 98, 16, 20, 4);
      ctx.fill();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx + 10, 132);
      ctx.lineTo(dx + 32, 132);
      ctx.stroke();
    };

    drawCabinDoor(90);  // Forward L1/R1 Door
    drawCabinDoor(905); // Rear L2/R2 Door

    // 4. Two Overwing Emergency Exit Hatch Outlines in Mid-Fuselage (matching image_424a4258.png)
    [492, 534].forEach((exitX) => {
      const ex = mapX(exitX, 28);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(ex, 96, 28, 56, 6);
      ctx.stroke();
    });

    // 5. Full Row of Dark Rounded-Rectangle Cabin Windows along the Fuselage
    for (let wx = 152; wx <= 872; wx += 22) {
      const rx = mapX(wx, 12);
      // Crisp white window rim halo where windows overlap the red "Lion" billboard letters
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(rx, 112, 12, 19, 4);
      ctx.stroke();
      ctx.fill();
    }

    // 6. Rear Fuselage Markings ("BOEING 737 MAX 8", "Lion Group", "PK-L...")
    ctx.save();
    const rearTextX = isRightSide ? 1024 - 775 : 775;
    ctx.translate(rearTextX, 94);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'italic bold 16px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOEING 737 MAX 8', 0, 0);
    ctx.restore();

    ctx.save();
    const groupTextX = isRightSide ? 1024 - 745 : 745;
    ctx.translate(groupTextX, 168);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 17px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lion Group', 0, 0);
    ctx.restore();

    ctx.save();
    const regTextX = isRightSide ? 1024 - 848 : 848;
    ctx.translate(regTextX, 154);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PK-LMAX', 0, 0);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * 3D Lion Air Boeing 737 MAX 8 Commercial Jetliner Model
   * Faithfully modeled after the 4 uploaded reference images:
   * - /public/assets/aistudio/image_bc171a6b.png (Rear-Quarter View)
   * - /public/assets/aistudio/image_2fc6fca2.png (Top-Down Plan View)
   * - /public/assets/aistudio/image_424a4258.png (Side Profile View)
   * - /public/assets/aistudio/image_14d13454.png (Front Head-On View)
   *
   * Architectural Features:
   * - Glossy All-White Boeing 737 Fuselage with Pointed Radome Nose & Metallic APU Tail Cone
   * - Bold Red "Lion" Forward Billboard Livery, Indonesian Flag, Cabin Windows & Overwing Exit Hatches
   * - Multi-Pane Dark Cockpit V-Windscreen with White Window Frames
   * - Swept Narrow-Body Wings with 3 Underwing Flap-Track Fairings per Wing & Overwing Exit Walkways
   * - Iconic Red Boeing 737 MAX Split-Tip Scimitar Winglets (Upper Winglet Blade + Lower Ventral Strake)
   * - Twin Underwing CFM LEAP-1B High-Bypass Turbofan Engines in Glossy Red Cowlings with White Lion Emblem,
   *   Polished Chrome Intake Rings, Dark Radial Fan Blades with White Spiral Spinner, and Exhaust Cones
   * - Tall Swept White Vertical Stabilizer with Dorsal Fillet, Red Rudder Trailing Edge & Red Lion Sunburst Emblem
   */
  private createProceduralAirliner(
    _accentColorHex: number,
    _tailColorHex: number,
    isWideBody: boolean
  ): THREE.Group {
    const plane = new THREE.Group();

    const whiteBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.12,
      roughness: 0.2,
      clearcoat: 0.78,
      clearcoatRoughness: 0.12,
    });
    const lionRedMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626, // Lion Air signature crimson red (engines, split winglets, rudder edge)
      metalness: 0.22,
      roughness: 0.22,
      clearcoat: 0.75,
      clearcoatRoughness: 0.14,
    });
    const wingGreyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Light aviation grey wing-box & belly fairing
      metalness: 0.22,
      roughness: 0.3,
    });
    const chromeMetalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Polished chrome/silver leading-edge slats & engine intake lip ring
      metalness: 0.82,
      roughness: 0.2,
    });
    const apuTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Metallic titanium APU tail cone & exhaust nozzle
      metalness: 0.68,
      roughness: 0.32,
    });
    const darkTireMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.82,
      metalness: 0.15,
    });
    const cockpitGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
    });

    // 1. Continuous Lofted Boeing 737 MAX 8 Fuselage (Pointed Nose Radome + Cabin Barrel + Upswept Tail Cone)
    const fuseRadius = 1.38;
    const fuselageGeo = this.buildBoeing737FuselageGeometry();
    const mainFuse = new THREE.Mesh(fuselageGeo, whiteBodyMat);
    mainFuse.castShadow = true;
    mainFuse.receiveShadow = true;
    plane.add(mainFuse);

    // Subtle Sculpted Wing-to-Body Belly Fairing under the Mid-Fuselage (matching ref_plane_2.jpg)
    const bellyFairingGeo = new THREE.BoxGeometry(2.6, 0.42, 6.4);
    const bellyFairing = new THREE.Mesh(bellyFairingGeo, wingGreyMat);
    bellyFairing.position.set(0, 1.24, 0.6);
    plane.add(bellyFairing);

    // Dorsal VHF Antenna Fins on Top of Fuselage (matching ref_plane_2.jpg)
    [2.2, -1.8].forEach((az) => {
      const topAntenna = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.48), whiteBodyMat);
      topAntenna.position.set(0, 4.04, az);
      topAntenna.rotation.x = -0.25;
      plane.add(topAntenna);
    });

    // 2. High-Mounted Metallic Titanium APU Exhaust Tail Cone Tip (at Z = -11.45 to -12.15, Y = 3.16)
    const apuTipGeo = new THREE.CylinderGeometry(0.14, 0.30, 0.72, 24);
    const apuTip = new THREE.Mesh(apuTipGeo, apuTitaniumMat);
    apuTip.rotation.x = -Math.PI / 2;
    apuTip.position.set(0, 3.17, -11.80);
    plane.add(apuTip);

    const apuHole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), darkTireMat);
    apuHole.rotation.y = Math.PI;
    apuHole.position.set(0, 3.17, -12.17);
    plane.add(apuHole);

    // 3. Multi-Pane Dark Cockpit V-Windscreen along the Angled Cockpit Step (matching ref_plane_1.jpg & ref_plane_2.jpg)
    const cockpitVisor = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.94,
        1.14,
        0.54,
        24,
        1,
        false,
        -Math.PI * 0.38,
        Math.PI * 0.76
      ),
      cockpitGlassMat
    );
    cockpitVisor.position.set(0, 2.98, 8.58);
    cockpitVisor.rotation.x = 0.36;
    plane.add(cockpitVisor);

    // White Center & Side Cockpit Window Mullion Struts (creating the 6-pane 737 V-window look in ref_plane_1.jpg)
    [-0.48, 0, 0.48].forEach((ang) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.54, 0.08), whiteBodyMat);
      post.position.set(
        Math.sin(ang) * 1.05,
        2.98,
        8.58 + Math.cos(ang) * 1.05 - 1.04
      );
      post.rotation.y = ang;
      post.rotation.x = 0.34;
      plane.add(post);
    });

    // 4. Lion Air Fuselage Side Livery Decals (Left +X and Right -X)
    const leftLiveryMat = new THREE.MeshBasicMaterial({
      map: this.createLionAirSideTexture(false),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const rightLiveryMat = new THREE.MeshBasicMaterial({
      map: this.createLionAirSideTexture(true),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    const sideDecalGeo = new THREE.PlaneGeometry(14.0, 2.15);
    const leftDecal = new THREE.Mesh(sideDecalGeo, leftLiveryMat);
    leftDecal.position.set(fuseRadius + 0.025, 2.66, 0.65);
    leftDecal.rotation.y = Math.PI / 2;
    plane.add(leftDecal);

    const rightDecal = new THREE.Mesh(sideDecalGeo, rightLiveryMat);
    rightDecal.position.set(-(fuseRadius + 0.025), 2.66, 0.65);
    rightDecal.rotation.y = -Math.PI / 2;
    plane.add(rightDecal);

    // 5. Dihedral Swept-Back Narrow-Body Wings with Flap-Track Fairings & Sculpted Red Split-Tip Scimitar Winglets
    [-1, 1].forEach((side) => {
      // Wing Group pivoted at wing root with authentic 5.5-deg upward dihedral (matching ref_plane_1.jpg)
      const wingGroup = new THREE.Group();
      wingGroup.position.set(side * 0.95, 1.78, 0.75);
      wingGroup.rotation.z = side * 0.085;

      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 2.75);                 // Wing root leading edge
      wingShape.lineTo(side * 10.4, -1.75);      // Wingtip leading edge
      wingShape.lineTo(side * 10.4, -2.65);      // Wingtip trailing edge
      wingShape.lineTo(0, -1.15);                // Wing root trailing edge
      wingShape.closePath();

      const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.19,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.032,
      });
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, whiteBodyMat);
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;
      wingGroup.add(wingMesh);

      // Grey Upper Wing-Box Panel & Overwing Emergency Exit Walkway Markings
      const wingBoxPanel = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 0.03, 1.02),
        wingGreyMat
      );
      wingBoxPanel.position.set(side * 4.5, 0.22, -1.0);
      wingBoxPanel.rotation.y = side * 0.39;
      wingGroup.add(wingBoxPanel);

      // Chrome/Silver Leading-Edge Slats Strip along the Wing
      const slatLen = 10.8;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(slatLen, 0.11, 0.20), chromeMetalMat);
      slat.position.set(side * 4.85, 0.08, 0.68);
      slat.rotation.y = side * 0.405;
      wingGroup.add(slat);

      // 3 Underwing Flap-Track Fairings (Canoes) per Wing (matching ref_plane_1.jpg & ref_plane_2.jpg)
      [
        { fx: 2.5, fz: -1.40, len: 1.45 },
        { fx: 4.9, fz: -2.10, len: 1.25 },
        { fx: 7.2, fz: -2.80, len: 1.05 },
      ].forEach((canoe) => {
        const canoeMesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.13, canoe.len, 10),
          whiteBodyMat
        );
        canoeMesh.rotation.x = -Math.PI / 2;
        canoeMesh.position.set(side * canoe.fx, -0.10, canoe.fz);
        wingGroup.add(canoeMesh);
      });

      // ICONIC BOEING 737 MAX RED SPLIT-TIP SCIMITAR WINGLET (Sculpted Swept Airfoil Blades)
      // Tip of wing in wingGroup local space is at x = side * 10.35, y = 0.10, z = -2.20
      const wTipGroup = new THREE.Group();
      wTipGroup.position.set(side * 10.32, 0.10, -1.75);

      // Upper Swept-Back Tapered Scimitar Winglet Blade
      const upBladeShape = new THREE.Shape();
      upBladeShape.moveTo(0, 0);               // Root leading edge
      upBladeShape.lineTo(0.85, 1.92);         // Swept top leading edge
      upBladeShape.lineTo(1.22, 1.95);         // Narrow swept top tip
      upBladeShape.lineTo(0.92, 0);            // Root trailing edge
      upBladeShape.closePath();

      const upBladeGeo = new THREE.ExtrudeGeometry(upBladeShape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      upBladeGeo.rotateY(Math.PI / 2); // Maps shape +X -> -Z (backward sweep), +Y -> +Y
      const upperScimitar = new THREE.Mesh(upBladeGeo, lionRedMat);
      upperScimitar.position.set(-0.035, -0.02, 0);
      upperScimitar.rotation.z = -side * 0.22; // Canted outward ~13 deg
      upperScimitar.castShadow = true;
      wTipGroup.add(upperScimitar);

      // Lower Swept-Back Ventral Scimitar Strake (canted downward & outward as in ref_plane_1.jpg & ref_plane_2.jpg)
      const lowBladeShape = new THREE.Shape();
      lowBladeShape.moveTo(0.10, 0);
      lowBladeShape.lineTo(0.68, -0.78);
      lowBladeShape.lineTo(0.92, -0.76);
      lowBladeShape.lineTo(0.85, 0);
      lowBladeShape.closePath();

      const lowBladeGeo = new THREE.ExtrudeGeometry(lowBladeShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      lowBladeGeo.rotateY(Math.PI / 2);
      const lowerScimitar = new THREE.Mesh(lowBladeGeo, lionRedMat);
      lowerScimitar.position.set(-0.03, 0.02, 0);
      lowerScimitar.rotation.z = side * 0.46; // Canted outward & downward
      wTipGroup.add(lowerScimitar);

      wingGroup.add(wTipGroup);
      plane.add(wingGroup);
    });

    // 6. TWIN Underwing CFM LEAP-1B High-Bypass Turbofan Engines (1 per Wing in Bright Red Lion Livery)
    const fanIntakeMat = new THREE.MeshBasicMaterial({
      map: this.createTurbofanIntakeTexture(),
    });
    const engLogoLeftMat = new THREE.MeshBasicMaterial({
      map: this.createLionEngineLogoTexture(false),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const engLogoRightMat = new THREE.MeshBasicMaterial({
      map: this.createLionEngineLogoTexture(true),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    [-1, 1].forEach((side) => {
      const engGroup = new THREE.Group();
      // Positioned forward & under the inner wing (matching ref_plane_1.jpg & ref_plane_2.jpg)
      engGroup.position.set(side * 3.65, 1.34, 2.05);

      // Aerodynamic Pylon Strut connecting Engine Nacelle to Wing Leading Edge
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.82, 2.05), whiteBodyMat);
      pylon.position.set(0, 0.64, -0.38);
      engGroup.add(pylon);

      // Large Sculpted Glossy Red CFM LEAP-1B Engine Cowling Barrel
      const cowling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.86, 0.78, 2.25, 28),
        lionRedMat
      );
      cowling.rotation.x = Math.PI / 2;
      cowling.position.set(0, 0, 0.25);
      cowling.castShadow = true;
      engGroup.add(cowling);

      // White Winged-Lion Emblem Decals on the Outer Sides of the Red Engine Cowling
      const cowlingLogoGeo = new THREE.PlaneGeometry(1.15, 1.15);
      const outerLogo = new THREE.Mesh(
        cowlingLogoGeo,
        side === 1 ? engLogoLeftMat : engLogoRightMat
      );
      outerLogo.position.set(side * 0.87, 0.04, 0.32);
      outerLogo.rotation.y = side * (Math.PI / 2);
      engGroup.add(outerLogo);

      // Polished Chrome/Silver Engine Intake Lip Ring at the Front of the Nacelle
      const intakeLip = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.1, 16, 28),
        chromeMetalMat
      );
      intakeLip.position.set(0, 0, 1.38);
      engGroup.add(intakeLip);

      // Recessed Front Turbofan Blades Disc with White Spiral Spinner (matching ref_plane_1.jpg)
      const fanDisc = new THREE.Mesh(new THREE.CircleGeometry(0.74, 24), fanIntakeMat);
      fanDisc.position.set(0, 0, 1.32);
      engGroup.add(fanDisc);

      // Metallic Titanium Rear Exhaust Core & Nozzle Cone (matching ref_plane_2.jpg)
      const exhaustSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.66, 0.52, 0.72, 20),
        apuTitaniumMat
      );
      exhaustSleeve.rotation.x = -Math.PI / 2;
      exhaustSleeve.position.set(0, 0, -1.12);
      engGroup.add(exhaustSleeve);

      const exhaustPlug = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.75, 16),
        apuTitaniumMat
      );
      exhaustPlug.rotation.x = -Math.PI / 2;
      exhaustPlug.position.set(0, 0, -1.58);
      engGroup.add(exhaustPlug);

      plane.add(engGroup);
    });

    // 7. SIRIP ATAS PESAWAT (Vertical Stabilizer / Tailfin) with Curved Dorsal Fillet,
    // Swept Leading Edge, Angled Red Rudder Trailing Edge & 1:1 UV-Mapped Lion Sunburst Logo
    // Embedded seamlessly into the horizontal rear fuselage crown at Y = 3.55, Z = -4.20
    const finMaxSX = 7.05;
    const finMaxSY = 5.45;
    const finShape = new THREE.Shape();
    finShape.moveTo(0.0, 0.0);                                   // Front base embedded inside fuselage crown (Z = -4.20, Y = 3.55)
    finShape.lineTo(0.0, 0.34);                                  // Front tip of low dorsal fillet on top of fuselage (Y = 3.89)
    finShape.quadraticCurveTo(1.75, 0.44, 2.75, 0.95);           // Smooth concave dorsal fillet curve into main fin root
    finShape.lineTo(5.75, 5.35);                                 // Straight swept-back leading edge up to top-front corner (Y = 8.90)
    finShape.quadraticCurveTo(6.35, 5.45, finMaxSX, 5.42);       // Aerodynamic top tailfin cap to top-rear corner (Z = -11.25)
    finShape.lineTo(6.18, 0.0);                                  // Angled rudder trailing edge down into upswept tailcone (Z = -10.38)
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    finGeo.rotateY(Math.PI / 2); // Maps shape +X -> -Z (toward tail), shape +Y -> +Y (upward)
    const tailFin = new THREE.Mesh(finGeo, whiteBodyMat);
    tailFin.position.set(-0.08, 3.55, -4.20);
    tailFin.castShadow = true;
    plane.add(tailFin);

    // Build a 1:1 Custom UV-Mapped ShapeGeometry Decal matching finShape so the Red Rudder Edge,
    // Silver Leading Edge, and Iconic Red Winged-Lion Sunburst Logo fit the exact tailfin silhouette!
    const buildFinDecalGeo = () => {
      const decalGeo = new THREE.ShapeGeometry(finShape, 24);
      const posAttr = decalGeo.attributes.position;
      const uvs: number[] = [];
      for (let i = 0; i < posAttr.count; i++) {
        const sx = posAttr.getX(i);
        const sy = posAttr.getY(i);
        uvs.push(sx / finMaxSX, sy / finMaxSY);
      }
      decalGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      decalGeo.rotateY(Math.PI / 2); // Maps shape +X -> -Z, +Y -> +Y, normal -> +X
      return decalGeo;
    };

    const finDecalGeo = buildFinDecalGeo();
    const finSideMat = new THREE.MeshBasicMaterial({
      map: this.createLionTailFinFullTexture(false),
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    const leftFinFace = new THREE.Mesh(finDecalGeo, finSideMat);
    leftFinFace.position.set(0.115, 3.55, -4.20);
    plane.add(leftFinFace);

    const rightFinFace = new THREE.Mesh(finDecalGeo, finSideMat);
    rightFinFace.position.set(-0.115, 3.55, -4.20);
    plane.add(rightFinFace);

    // 8. High-Mounted Swept Horizontal Stabilizers (Tailplanes) with 7-deg Upward Dihedral
    // Mounted on the upswept rear tail cone at Y = 3.24, Z = -9.45 (matching ref_plane_1.jpg & ref_plane_2.jpg)
    [-1, 1].forEach((side) => {
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(side * 0.42, 3.24, -9.45);
      hStabGroup.rotation.z = side * 0.12; // 7-deg upward dihedral visible in front view (ref_plane_1.jpg)

      const hStabShape = new THREE.Shape();
      hStabShape.moveTo(0, 1.25);
      hStabShape.lineTo(side * 4.2, -0.85);
      hStabShape.lineTo(side * 4.2, -1.55);
      hStabShape.lineTo(0, -0.55);
      hStabShape.closePath();

      const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.025,
        bevelThickness: 0.02,
      });
      hStabGeo.rotateX(-Math.PI / 2);
      const hStabMesh = new THREE.Mesh(hStabGeo, whiteBodyMat);
      hStabMesh.castShadow = true;
      hStabGroup.add(hStabMesh);

      plane.add(hStabGroup);
    });

    // 9. Nose & Main Tricycle Landing Gear (Struts, Gear Doors & Twin Tires matching ref_plane_1.jpg & ref_plane_2.jpg)
    const noseStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.35, 10),
      chromeMetalMat
    );
    noseStrut.position.set(0, 0.98, 7.85);
    plane.add(noseStrut);

    // Sculpted Nose Gear Doors (visible under nose in ref_plane_1.jpg & ref_plane_2.jpg)
    [-0.24, 0.24].forEach((dx) => {
      const nDoor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.92), whiteBodyMat);
      nDoor.position.set(dx, 1.42, 7.85);
      plane.add(nDoor);
    });

    [-0.2, 0.2].forEach((wx) => {
      const nWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.15, 16),
        darkTireMat
      );
      nWheel.rotation.z = Math.PI / 2;
      nWheel.position.set(wx, 0.3, 7.85);
      plane.add(nWheel);
    });

    // Left & Right Main Landing Gear Assemblies under Inner Wings
    [-1.95, 1.95].forEach((gx) => {
      const mStrut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 1.48, 12),
        chromeMetalMat
      );
      mStrut.position.set(gx, 1.05, 0.15);
      plane.add(mStrut);

      [-0.28, 0.28].forEach((wx) => {
        const mWheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16),
          darkTireMat
        );
        mWheel.rotation.z = Math.PI / 2;
        mWheel.position.set(gx + wx, 0.38, 0.15);
        plane.add(mWheel);
      });
    });

    const s = isWideBody ? 1.12 : 0.92;
    plane.scale.set(s, s, s);
    return plane;
  }

  /**
   * Helper: Creates a Realistic 3D Automobile Mockup (Sedan / SUV) with
   * Sculpted Chassis, Cabin Greenhouse, Tinted Windows, 4 Rotating Wheels + Alloy Spokes,
   * Front Grille, LED Headlights & Red Taillights (Oriented with front towards +Z)
   */
  private createRealisticCar(
    colorHex: number,
    isSUV: boolean = false,
    withHeadlightBeams: boolean = false
  ): THREE.Group {
    const car = new THREE.Group();

    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.22,
      metalness: 0.55,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const windowGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.1,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.85,
    });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 1. Lower Sculpted Chassis Body
    const chassisH = isSUV ? 0.58 : 0.48;
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.78, chassisH, 4.05), bodyPaintMat);
    chassis.position.set(0, 0.32 + chassisH / 2, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Front & Rear Bumper Skirts + Front Radiator Grille
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.24, 0.25), darkTrimMat);
    frontBumper.position.set(0, 0.34, 1.98);
    car.add(frontBumper);

    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.26, 0.25), darkTrimMat);
    rearBumper.position.set(0, 0.35, -1.98);
    car.add(rearBumper);

    const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.08), darkTrimMat);
    frontGrille.position.set(0, 0.52, 2.01);
    car.add(frontGrille);

    // 2. Cabin Greenhouse (Roof, Pillars & Tinted Windows)
    const cabinLen = isSUV ? 2.55 : 2.05;
    const cabinH = isSUV ? 0.56 : 0.46;
    const cabinZ = isSUV ? -0.32 : -0.15;
    const cabinY = 0.32 + chassisH + cabinH / 2 - 0.04;

    // Glass Greenhouse Core
    const glassCore = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, cabinH - 0.04, cabinLen),
      windowGlassMat
    );
    glassCore.position.set(0, cabinY, cabinZ);
    car.add(glassCore);

    // Painted Roof Panel on top of Cabin
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.09, cabinLen - 0.25),
      bodyPaintMat
    );
    roofPanel.position.set(0, cabinY + cabinH / 2, cabinZ);
    roofPanel.castShadow = true;
    car.add(roofPanel);

    // Sloped Front Windshield & Hood Transition Wedge
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.46, 0.08, 0.72),
      windowGlassMat
    );
    windshield.position.set(0, cabinY + 0.02, cabinZ + cabinLen / 2 + 0.14);
    windshield.rotation.x = Math.PI / 3.4;
    car.add(windshield);

    // 3. Four 3D Rotating Wheels with Tires, Silver Alloy Rims & Cross Spokes
    const wheels: THREE.Object3D[] = [];
    const wheelPositions = [
      [-0.86, 0.33, 1.24],
      [0.86, 0.33, 1.24],
      [-0.86, 0.33, -1.24],
      [0.86, 0.33, -1.24],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      wheelPivot.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelPivot.add(rim);

      // Alloy cross-bar spoke so wheel rotation is visibly crisp
      const spokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.07), darkTrimMat);
      wheelPivot.add(spokeBar);

      car.add(wheelPivot);
      wheels.push(wheelPivot);
    });
    car.userData.wheels = wheels;

    // 4. Front LED Headlights, Optional Ground Light Beams & Rear Red Taillights
    [-0.62, 0.62].forEach((lx) => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), headlightMat);
      headlight.position.set(lx, 0.58, 2.01);
      car.add(headlight);

      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.08), taillightMat);
      taillight.position.set(lx, 0.62, -2.01);
      car.add(taillight);
    });

    if (withHeadlightBeams) {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      [-0.58, 0.58].forEach((lx) => {
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.8), beamMat);
        beam.rotation.x = -Math.PI / 2;
        beam.position.set(lx, 0.03, 3.35);
        car.add(beam);
      });
    }

    return car;
  }

  /**
   * Helper: Builds a Continuous Watertight 3D Swept Box Ribbon BufferGeometry
   * along a 3D spline with horizontal cross-sections (zero roll/twist) for
   * realistic curved & inclined highway viaducts, ramps, guardrails, and lane lines.
   */
  private buildSweptBoxRibbon(
    centerPts: THREE.Vector3[],
    normals: { nx: number; nz: number }[],
    lateralOffset: number,
    width: number,
    height: number,
    yBaseOffset: number,
    closed: boolean = false
  ): THREE.BufferGeometry {
    const count = centerPts.length;
    const halfW = width / 2;
    const positions: number[] = [];
    const indices: number[] = [];

    // For each station i, store 4 corner vertices:
    // 0: Inner Top, 1: Outer Top, 2: Outer Bottom, 3: Inner Bottom
    for (let i = 0; i < count; i++) {
      const p = centerPts[i];
      const { nx, nz } = normals[i];
      const innerDist = lateralOffset - halfW;
      const outerDist = lateralOffset + halfW;

      const ix = p.x + nx * innerDist;
      const iz = p.z + nz * innerDist;
      const ox = p.x + nx * outerDist;
      const oz = p.z + nz * outerDist;

      const yTop = p.y + yBaseOffset + height;
      const yBot = p.y + yBaseOffset;

      // v0: Inner Top
      positions.push(ix, yTop, iz);
      // v1: Outer Top
      positions.push(ox, yTop, oz);
      // v2: Outer Bottom
      positions.push(ox, yBot, oz);
      // v3: Inner Bottom
      positions.push(ix, yBot, iz);
    }

    const segCount = closed ? count : count - 1;
    for (let i = 0; i < segCount; i++) {
      const next = (i + 1) % count;
      const a0 = i * 4 + 0;
      const a1 = i * 4 + 1;
      const a2 = i * 4 + 2;
      const a3 = i * 4 + 3;

      const b0 = next * 4 + 0;
      const b1 = next * 4 + 1;
      const b2 = next * 4 + 2;
      const b3 = next * 4 + 3;

      // Top face (upward normal)
      indices.push(a0, b0, b1, a0, b1, a1);
      // Bottom face (downward normal)
      indices.push(a3, a2, b2, a3, b2, b3);
      // Outer side wall
      indices.push(a1, b1, b2, a1, b2, a2);
      // Inner side wall
      indices.push(a0, a3, b3, a0, b3, b0);
    }

    if (!closed && count >= 2) {
      // Start cap
      indices.push(0, 1, 2, 0, 2, 3);
      // End cap
      const last = (count - 1) * 4;
      indices.push(last + 0, last + 3, last + 2, last + 0, last + 2, last + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Helper: Creates a Tall Curved Highway Streetlight Pole (Tiang Lampu Jalan Melengkung)
   */
  private createCurvedStreetlight(
    poleX: number,
    poleY: number,
    poleZ: number,
    armAngleY: number,
    poleMat: THREE.Material,
    lampMat: THREE.Material
  ): THREE.Group {
    const lightPole = new THREE.Group();
    lightPole.position.set(poleX, poleY, poleZ);
    lightPole.rotation.y = armAngleY;

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.8, 8), poleMat);
    shaft.position.y = 3.4;
    lightPole.add(shaft);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.2, 8), poleMat);
    arm.position.set(0, 6.9, 1.2);
    arm.rotation.x = Math.PI / 3;
    lightPole.add(arm);

    const luminaire = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.95), lampMat);
    luminaire.position.set(0, 7.55, 2.45);
    lightPole.add(luminaire);

    return lightPole;
  }

  /**
   * Gedung Parkir (Tapered Rounded-Wedge Building: Lantai Basement, 1, 2, dan 3),
   * Jembatan Penghubung ke Lantai 2 Terminal Utama,
   * Jalanan Sejajar & Terhubung dengan Lt. 3 Terminal Utama + Tanjakan Jalan Layang Asli (U-Loop),
   * & Tugu Sultan Hasanuddin Roundabout (Macro Zone 5)
   */
  private buildCarParkComplex() {
    const landsideGroup = new THREE.Group();

    // =========================================================================
    // 1. GEDUNG PARKIR (Tapered Rounded-Wedge Shape inside Left Half of U-Loop)
    // Centered at World X = 42, Z = -68 (left side when viewed from Landside -Z)
    // Consists of 4 Levels: Lantai Basement, Lantai 1, Lantai 2, Lantai 3
    // =========================================================================
    const parkGroup = new THREE.Group();
    const parkX = 42;
    const parkZ = -68;
    parkGroup.position.set(parkX, 0.2, parkZ);

    const basementMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.65,
      metalness: 0.18,
    });
    const darkConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.72,
      metalness: 0.2,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.5,
    });
    const carColors = [0x38bdf8, 0xf8fafc, 0xef4444, 0x94a3b8, 0xfbbf24, 0x10b981];

    // Create the Horizontal Tapered Teardrop Footprint matching satellite & map reference:
    // - Narrow rounded tip at -X (pointing toward the Triangular Splitter Island & Circular Roundabout at X = 10)
    // - Wide semicircular head at +X (nested inside the northeast loop turnaround at X = 60..73)
    const createWedgeShape = (scale: number = 1.0) => {
      const s = new THREE.Shape();
      const leftX = -15.5 * scale;  // World X ≈ 26.5 (narrow tip facing Splitter Island / Roundabout)
      const rightX = 16.5 * scale;  // World X ≈ 58.5 (wide rounded head inside +X loop curve)
      const frontY = -10.8 * scale; // World Z ≈ -57.2 (facing Terminal Utama & Jembatan Penghubung)
      const backRightY = 12.2 * scale; // World Z ≈ -80.2 at wide +X end
      const backLeftY = 4.2 * scale;   // World Z ≈ -72.2 at narrow -X tip

      s.moveTo(leftX + 2.5 * scale, frontY + 1.8 * scale);
      // Long front edge facing Terminal Utama (+Z)
      s.lineTo(rightX - 4.0 * scale, frontY);
      // Wide semicircular rounded northeast (+X) head
      s.quadraticCurveTo(rightX + 2.2 * scale, frontY, rightX + 2.2 * scale, 0.5 * scale);
      s.quadraticCurveTo(rightX + 2.2 * scale, backRightY, rightX - 4.5 * scale, backRightY);
      // Tapered back edge facing Outer Loop Road (-Z)
      s.lineTo(leftX + 2.5 * scale, backLeftY);
      // Narrow rounded southwest (-X) tip pointing toward Roundabout
      s.quadraticCurveTo(leftX - 2.2 * scale, (frontY + backLeftY) * 0.5, leftX + 2.5 * scale, frontY + 1.8 * scale);
      s.closePath();
      return s;
    };

    const wedgeSlabGeo = new THREE.ExtrudeGeometry(createWedgeShape(1.0), {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.08,
    });

    const parapetOuter = createWedgeShape(1.01);
    const parapetInner = createWedgeShape(0.93);
    parapetOuter.holes.push(parapetInner);
    const wedgeParapetGeo = new THREE.ExtrudeGeometry(parapetOuter, {
      depth: 0.82,
      bevelEnabled: false,
    });

    const levelNames = ['BASEMENT', 'LT. 1', 'LT. 2', 'LT. 3'];

    for (let lvl = 0; lvl < 4; lvl++) {
      const yPos = lvl * 2.8;

      const slab = new THREE.Mesh(
        wedgeSlabGeo,
        lvl === 0 ? basementMat : lvl === 3 ? concreteMat : darkConcreteMat
      );
      slab.rotation.x = -Math.PI / 2;
      slab.position.y = yPos;
      slab.receiveShadow = true;
      slab.castShadow = true;
      parkGroup.add(slab);

      const parapet = new THREE.Mesh(
        wedgeParapetGeo,
        lvl === 0 ? basementMat : lvl === 3 ? concreteMat : barrierMat
      );
      parapet.rotation.x = -Math.PI / 2;
      parapet.position.y = yPos + 0.35;
      parkGroup.add(parapet);

      const lvlBadge = this.createLabelSprite(
        levelNames[lvl],
        '#0f172a',
        lvl === 0 ? '#94a3b8' : '#fbbf24',
        7.5,
        1.9
      );
      lvlBadge.position.set(18.5, yPos + 1.0, 5.5 - lvl * 1.4);
      parkGroup.add(lvlBadge);

      if (lvl < 3) {
        const colRows = [
          { lx: -9, minZ: -2.5, maxZ: 7.5 },
          { lx: 0, minZ: -6.5, maxZ: 8.0 },
          { lx: 9, minZ: -9.5, maxZ: 8.5 },
        ];
        colRows.forEach((row) => {
          for (const cz of [row.minZ, (row.minZ + row.maxZ) * 0.5, row.maxZ]) {
            const col = new THREE.Mesh(
              new THREE.CylinderGeometry(0.36, 0.36, 2.8, 10),
              darkConcreteMat
            );
            col.position.set(row.lx, yPos + 1.4, cz);
            col.castShadow = true;
            parkGroup.add(col);
          }
        });
      }

      // Parked Realistic 3D Cars on Basement, Lantai 1, Lantai 2, and Lantai 3 inside Teardrop Footprint
      const carZRows = [
        { cz: 6.8, minX: -10.5, maxX: 11.5 },
        { cz: 0.5, minX: -9.5, maxX: 12.0 },
        { cz: -6.2, minX: -2.0, maxX: 11.5 },
      ];
      carZRows.forEach((row, rIdx) => {
        for (let cx = row.minX; cx <= row.maxX; cx += 5.2) {
          if ((Math.abs(Math.round(cx)) + lvl + rIdx) % 2 === 0) continue;
          const colorHex = carColors[Math.abs(Math.round(cx + lvl + rIdx)) % carColors.length];
          const carModel = this.createRealisticCar(colorHex, (lvl + rIdx) % 2 === 0);
          carModel.position.set(cx, yPos + 0.4, row.cz);
          parkGroup.add(carModel);
        }
      });
    }

    // Central Rooftop Atrium Skylight Void on Lantai 3 (aligned with teardrop wide section)
    const skylightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.65, 7.5),
      darkConcreteMat
    );
    skylightFrame.position.set(3.5, 3 * 2.8 + 0.55, 0.5);
    parkGroup.add(skylightFrame);

    const skylightGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.3,
    });
    const skylightGlass = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.75, 5.8),
      skylightGlassMat
    );
    skylightGlass.position.set(3.5, 3 * 2.8 + 0.62, 0.5);
    parkGroup.add(skylightGlass);

    // Circular Helical Access Ramp on the Wide Northeast (+X) Head of Gedung Parkir
    const helixGeo = new THREE.CylinderGeometry(4.8, 4.8, 9.2, 24, 1, true);
    const helixRamp = new THREE.Mesh(helixGeo, darkConcreteMat);
    helixRamp.position.set(13.2, 4.6, -0.5);
    parkGroup.add(helixRamp);

    const helixCore = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 9.6, 16), barrierMat);
    helixCore.position.set(13.2, 4.8, -0.5);
    parkGroup.add(helixCore);

    // Interactive Zone 5 Volume Mesh shaped around Gedung Parkir
    const parkZoneGeo = new THREE.ExtrudeGeometry(createWedgeShape(1.04), {
      depth: 10.2,
      bevelEnabled: false,
    });
    const parkZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      transmission: 0.52,
      transparent: true,
      opacity: 0.48,
      roughness: 0.3,
      metalness: 0.1,
      depthWrite: false,
    });
    const parkMesh = new THREE.Mesh(parkZoneGeo, parkZoneMat);
    parkMesh.rotation.x = -Math.PI / 2;
    parkMesh.position.set(0, 0, 0);
    parkGroup.add(parkMesh);
    this.addZoneMesh('macro-5', parkMesh);

    landsideGroup.add(parkGroup);

    // =========================================================================
    // 2. JEMBATAN PENGHUBUNG KE LANTAI 2 TERMINAL UTAMA
    // Spans from Gedung Parkir Front (Z = -57.2) to Terminal Utama Lantai 2 (Z = -38.0)
    // At elevation Y = 4.6m (Lantai 2), passing UNDER the Elevated Jalanan (Y = 9.6m)
    // =========================================================================
    const bridgeWorldX = 38;
    const bridgeStartZ = -57.2;
    const bridgeEndZ = -38.0;
    const bridgeSpanD = bridgeEndZ - bridgeStartZ; // 19.2m
    const bridgeMidZ = (bridgeStartZ + bridgeEndZ) / 2; // -47.6

    const skybridgeGroup = new THREE.Group();
    const skybridgeFloor = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.38, bridgeSpanD),
      concreteMat
    );
    skybridgeFloor.position.set(bridgeWorldX, 4.6, bridgeMidZ);
    skybridgeFloor.castShadow = true;
    skybridgeGroup.add(skybridgeFloor);

    const skybridgeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.68,
      transparent: true,
      opacity: 0.8,
      roughness: 0.15,
      metalness: 0.2,
    });
    const skybridgeEnclosure = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 2.2, bridgeSpanD),
      skybridgeGlassMat
    );
    skybridgeEnclosure.position.set(bridgeWorldX, 5.85, bridgeMidZ);
    skybridgeEnclosure.castShadow = true;
    skybridgeGroup.add(skybridgeEnclosure);
    this.addZoneMesh('macro-5', skybridgeEnclosure);

    const skybridgeRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.3, bridgeSpanD),
      concreteMat
    );
    skybridgeRoof.position.set(bridgeWorldX, 7.05, bridgeMidZ);
    skybridgeGroup.add(skybridgeRoof);

    for (const sz of [-53.5, -40.5]) {
      const sbCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 4.6, 12),
        darkConcreteMat
      );
      sbCol.position.set(bridgeWorldX, 2.3, sz);
      skybridgeGroup.add(sbCol);
    }

    landsideGroup.add(skybridgeGroup);

    // =========================================================================
    // 3. SISTEM JALAN MENUJU TERMINAL BANDARA & ARAH LAJU KENDARAAN SEARAH (ONE-WAY)
    // Matching Google Maps Road & Satellite Reference (Bandara Internasional Sultan Hasanuddin):
    // - Main Outer Loop & Elevated Lantai 3 Viaduct (Y = 9.6m at Z = -47.6):
    //   1) Approaches from Roundabout / Tollgate along Outer Back Road (Z = -97, moving +X: ↗, →)
    //   2) Curves around wide +X head of Teardrop Gedung Parkir (X = +73) & ASCENDS Tanjakan Ramp (→, ↘)
    //   3) Cruises ONE-WAY across BOTH LANES in front of Terminal Utama / Cordia Hotel (+X to -X: ↙, ↙)
    //   4) DESCENDS -X Turunan Ramp at southwest end of Terminal (X = -25: ←, ↖) and returns north (↑)
    // - Parallel Ground-Level Inner Loop Road (Y = 0.25m) wrapping around Gedung Parkir & Lantai 1 Arrival
    // - Triangular Green Splitter Island (X = 22.5, Z = -70) & Circular Roundabout (X = 10, Z = -76)
    // - Tollgate Bandara Internasional Sultan Hasanuddin Dual-Carriageway Highway & Masjid Al-Mukhlisin
    // =========================================================================
    const roadSystemGroup = new THREE.Group();

    const roadAsphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.86,
      metalness: 0.1,
    });
    const roadGuardMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.5,
      metalness: 0.35,
    });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteDashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const arrowPaintMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
    });
    const poleMetalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.75,
      roughness: 0.25,
    });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Helper to place crisp on-pavement directional arrow markings (→) matching Google Maps reference
    const addRoadDirectionalArrow = (
      x: number,
      y: number,
      z: number,
      targetX: number,
      targetY: number,
      targetZ: number,
      scale: number = 1.0
    ) => {
      const arrowGroup = new THREE.Group();
      arrowGroup.position.set(x, y + 0.04, z);
      arrowGroup.lookAt(targetX, targetY + 0.04, targetZ);

      const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.32 * scale, 0.02, 1.55 * scale),
        whiteDashMat
      );
      shaft.position.z = -0.35 * scale;
      arrowGroup.add(shaft);

      const headShape = new THREE.Shape();
      headShape.moveTo(0, 0.95 * scale);
      headShape.lineTo(-0.68 * scale, -0.15 * scale);
      headShape.lineTo(0.68 * scale, -0.15 * scale);
      headShape.closePath();
      const headGeo = new THREE.ShapeGeometry(headShape);
      const headMesh = new THREE.Mesh(headGeo, arrowPaintMat);
      headMesh.rotation.x = -Math.PI / 2;
      headMesh.position.set(0, 0.01, 0.45 * scale);
      arrowGroup.add(headMesh);

      roadSystemGroup.add(arrowGroup);
    };

    const lt3RoadY = 9.6;   // Flush with Lantai 3 Terminal Utama (Y = 9.6m)
    const groundRoadY = 0.25;
    const roadWidth = 8.4;  // Z: -43.4 to -51.8 along the front boulevard (Z center = -47.6)
    const deckThick = 0.55;

    // Define 3D Control Points for the Continuous Main Loop
    // Note: Vehicles move with direction = -1 along this closed loop so that traffic flows:
    // Outer Back Road (+X: 0 -> 65) -> +X Ascending Ramp around Gedung Parkir (73) ->
    // Front Boulevard one-way (-X: +56 -> -8) -> -X Descending Ramp (-25) -> Roundabout/Tollgate (-17 -> 0)
    const loopControlPts = [
      // Front Boulevard along Lt. 3 Terminal Utama (Z = -47.6, Y = 9.6m)
      new THREE.Vector3(-8,  lt3RoadY, -47.6),
      new THREE.Vector3(8,   lt3RoadY, -47.6),
      new THREE.Vector3(24,  lt3RoadY, -47.6),
      new THREE.Vector3(40,  lt3RoadY, -47.6),
      new THREE.Vector3(56,  lt3RoadY, -47.6),
      // Northeast (+X) Curved & Inclined Tanjakan Ramp ascending from Y = 0.25m to Y = 9.6m around Gedung Parkir
      new THREE.Vector3(67,  lt3RoadY * 0.82, -51.0),
      new THREE.Vector3(73,  lt3RoadY * 0.52, -62.0),
      new THREE.Vector3(73,  lt3RoadY * 0.20, -77.0),
      new THREE.Vector3(65,  groundRoadY,     -92.0),
      // Outer Back Road at ground level (Y = 0.25m, flowing +X from Roundabout to +X Ramp)
      new THREE.Vector3(48,  groundRoadY,     -102.5),
      new THREE.Vector3(24,  groundRoadY,     -103.5),
      new THREE.Vector3(0,   groundRoadY,     -102.5),
      // Southwest (-X) Curved & Inclined Turunan Ramp descending from Y = 9.6m to Y = 0.25m
      new THREE.Vector3(-17, groundRoadY,     -92.0),
      new THREE.Vector3(-25, lt3RoadY * 0.20, -77.0),
      new THREE.Vector3(-25, lt3RoadY * 0.52, -62.0),
      new THREE.Vector3(-19, lt3RoadY * 0.82, -51.0),
    ];

    const roadSpline = new THREE.CatmullRomCurve3(loopControlPts, true, 'centripetal', 0.45);
    const totalSamples = 220;
    const sampledPts: THREE.Vector3[] = [];
    const sampledNormals: { nx: number; nz: number }[] = [];
    const sampledTangents: THREE.Vector3[] = [];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / totalSamples;
      const pt = roadSpline.getPointAt(t);

      // Enforce exact flat Y = 9.6m along the Terminal Utama front facade (X: -8 to +56, Z > -49.5)
      // and smooth S-curve ramp elevation along the side curves
      if (pt.z > -49.2 && pt.x >= -8 && pt.x <= 56) {
        pt.y = lt3RoadY;
        pt.z = -47.6;
      } else if (pt.z <= -90.0) {
        pt.y = groundRoadY;
      } else {
        const u = THREE.MathUtils.clamp((-47.6 - pt.z) / (-47.6 - -90.0), 0, 1);
        const smoothU = 0.5 * (1 - Math.cos(Math.PI * u));
        pt.y = THREE.MathUtils.lerp(lt3RoadY, groundRoadY, smoothU);
      }

      sampledPts.push(pt);
    }

    for (let i = 0; i < totalSamples; i++) {
      const prev = sampledPts[(i - 1 + totalSamples) % totalSamples];
      const next = sampledPts[(i + 1) % totalSamples];
      const tang = next.clone().sub(prev).normalize();
      sampledTangents.push(tang);

      const hLen = Math.hypot(tang.x, tang.z) || 1;
      const tx = tang.x / hLen;
      const tz = tang.z / hLen;
      sampledNormals.push({ nx: tz, nz: -tx });
    }

    // 3A. Build Continuous 3D Swept Asphalt Roadway Viaduct & Tanjakan/Turunan Ramp Deck
    const roadDeckGeo = this.buildSweptBoxRibbon(
      sampledPts,
      sampledNormals,
      0,
      roadWidth,
      deckThick,
      -deckThick,
      true
    );
    const roadDeckMesh = new THREE.Mesh(roadDeckGeo, roadAsphaltMat);
    roadDeckMesh.castShadow = true;
    roadDeckMesh.receiveShadow = true;
    roadSystemGroup.add(roadDeckMesh);

    // 3B. Continuous Outer Concrete Parapet Guardrail around the entire Viaduct & Ramps
    const outerGuardGeo = this.buildSweptBoxRibbon(
      sampledPts,
      sampledNormals,
      roadWidth / 2 - 0.18,
      0.36,
      0.68,
      0,
      true
    );
    const outerGuardMesh = new THREE.Mesh(outerGuardGeo, roadGuardMat);
    outerGuardMesh.castShadow = true;
    roadSystemGroup.add(outerGuardMesh);

    // 3C. Continuous Inner Concrete Parapet Guardrail along the Inclined Ramps & Loop
    const innerRampPts: THREE.Vector3[] = [];
    const innerRampNormals: { nx: number; nz: number }[] = [];
    const isFrontOpen = (pt: THREE.Vector3) => pt.z > -49.0 && pt.x >= -6 && pt.x <= 54;
    let startIdx = 0;
    for (let i = 0; i < totalSamples; i++) {
      const prev = sampledPts[(i - 1 + totalSamples) % totalSamples];
      const curr = sampledPts[i];
      if (isFrontOpen(prev) && !isFrontOpen(curr)) {
        startIdx = i;
        break;
      }
    }
    for (let k = 0; k < totalSamples; k++) {
      const idx = (startIdx + k) % totalSamples;
      const pt = sampledPts[idx];
      if (isFrontOpen(pt)) break;
      innerRampPts.push(pt);
      innerRampNormals.push(sampledNormals[idx]);
    }
    if (innerRampPts.length > 2) {
      const innerGuardGeo = this.buildSweptBoxRibbon(
        innerRampPts,
        innerRampNormals,
        -(roadWidth / 2 - 0.18),
        0.36,
        0.68,
        0,
        false
      );
      const innerGuardMesh = new THREE.Mesh(innerGuardGeo, roadGuardMat);
      innerGuardMesh.castShadow = true;
      roadSystemGroup.add(innerGuardMesh);
    }

    // 3D. Continuous Yellow Left & Right Road Edge Lines following the 3D Slope & Curve
    [-roadWidth / 2 + 0.68, roadWidth / 2 - 0.68].forEach((lineOffset) => {
      const yellowEdgeGeo = this.buildSweptBoxRibbon(
        sampledPts,
        sampledNormals,
        lineOffset,
        0.24,
        0.03,
        0.01,
        true
      );
      const yellowEdgeMesh = new THREE.Mesh(yellowEdgeGeo, yellowLineMat);
      roadSystemGroup.add(yellowEdgeMesh);
    });

    // 3E. White Dashed Lane Divider, One-Way Directional Arrows (→), Streetlights & Viaduct Piers
    for (let i = 0; i < totalSamples; i++) {
      const pt = sampledPts[i];
      const nextPt = sampledPts[(i + 1) % totalSamples];
      const prevPt = sampledPts[(i - 1 + totalSamples) % totalSamples]; // Direction of one-way travel (dir = -1)
      const norm = sampledNormals[i];
      const tang = sampledTangents[i];
      const angleY = Math.atan2(tang.x, tang.z);

      // White Dashed Centerline pitched along the exact 3D road slope
      if (i % 3 === 0) {
        const dashGroup = new THREE.Group();
        dashGroup.position.set(pt.x, pt.y + 0.03, pt.z);
        dashGroup.lookAt(nextPt.x, nextPt.y + 0.03, nextPt.z);
        const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 2.2), whiteDashMat);
        dashGroup.add(dashMesh);
        roadSystemGroup.add(dashGroup);
      }

      // One-Way Directional Arrows painted on BOTH lanes (pointing toward prevPt, i.e. direction = -1)
      if (i % 18 === 4) {
        for (const laneOff of [-1.85, 1.85]) {
          const ax = pt.x + norm.nx * laneOff;
          const az = pt.z + norm.nz * laneOff;
          const tx = prevPt.x + norm.nx * laneOff;
          const tz = prevPt.z + norm.nz * laneOff;
          addRoadDirectionalArrow(ax, pt.y, az, tx, prevPt.y, tz, 0.95);
        }
      }

      // Graduated Concrete Viaduct Piers & Crosshead Beams under Elevated Boulevard & Inclined Ramps
      if (pt.y > 1.2 && i % 10 === 0) {
        if (Math.abs(pt.x - bridgeWorldX) > 4.2 || pt.z < -51.0) {
          const pierH = pt.y - deckThick;
          const pier = new THREE.Mesh(
            new THREE.CylinderGeometry(0.58, 0.7, pierH, 12),
            darkConcreteMat
          );
          pier.position.set(pt.x, pierH / 2, pt.z);
          pier.castShadow = true;
          roadSystemGroup.add(pier);

          const crossBeam = new THREE.Mesh(
            new THREE.BoxGeometry(roadWidth - 1.0, 0.55, 1.4),
            darkConcreteMat
          );
          crossBeam.position.set(pt.x, pierH - 0.25, pt.z);
          crossBeam.rotation.y = angleY;
          roadSystemGroup.add(crossBeam);
        }
      }

      // Tall Curved Highway Streetlights along the Outer Edge of the Boulevard & Ramps
      if (i % 14 === 2) {
        const lightX = pt.x + norm.nx * (roadWidth / 2 + 0.25);
        const lightZ = pt.z + norm.nz * (roadWidth / 2 + 0.25);
        const lookAngle = Math.atan2(-norm.nx, -norm.nz);
        roadSystemGroup.add(
          this.createCurvedStreetlight(
            lightX,
            pt.y,
            lightZ,
            lookAngle,
            poleMetalMat,
            lampGlowMat
          )
        );
      }
    }

    // Portal Frame Piers straddling Jembatan Penghubung at X = 38
    for (const pz of [-47.6 - roadWidth / 2 - 0.35, -47.6 + roadWidth / 2 + 0.35]) {
      const pCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.54, lt3RoadY - deckThick, 12),
        darkConcreteMat
      );
      pCol.position.set(bridgeWorldX, (lt3RoadY - deckThick) / 2, pz);
      roadSystemGroup.add(pCol);
    }

    // Yellow Transverse Speed-Calming Rumble Strips across the Lt. 3 Boulevard
    [8, 24, 42].forEach((stripGroupX) => {
      for (let s = 0; s < 4; s++) {
        const strip = new THREE.Mesh(
          new THREE.PlaneGeometry(0.28, roadWidth - 1.5),
          yellowLineMat
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(stripGroupX + s * 0.62, lt3RoadY + 0.03, -47.6);
        roadSystemGroup.add(strip);
      }
    });

    // Pedestrian Zebra Crosswalks connecting Jalanan directly to Lantai 3 Terminal Utama Sidewalk
    [6, 24, 42].forEach((zx) => {
      for (let zBar = -1.4; zBar <= 1.4; zBar += 0.55) {
        const zebra = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.2), whiteDashMat);
        zebra.rotation.x = -Math.PI / 2;
        zebra.position.set(zx + zBar, lt3RoadY + 0.04, -44.6);
        roadSystemGroup.add(zebra);
      }
    });

    // =========================================================================
    // 3F. PARALLEL GROUND-LEVEL INNER LOOP ROAD (Matching Yellow Annotations in Reference Image)
    // - Bottom Yellow Segment: Runs from bottom-right (X = 2, Z = -95.5) to bottom-left (X = 54, Z = -88.5)
    //   along the front/outer side of Gedung Parkir with one-way arrows pointing LEFT (+X)
    // - Left Curve: Wraps around the wide +X head of Gedung Parkir (X = 65.2)
    // - Top Segment: Runs parallel to Lantai 3 Boulevard (Z = -52.6) from Left (+X) to Right (-X)
    // - Right Yellow Curved Segment: Curves wide around the right (-X = -18.2) side of Patung Sultan Hasanuddin
    //   with one-way arrows pointing DOWNWARD
    // - Sweeping Southwest Curve: Seamlessly merges Right Curve directly into Bottom Road at X = 2, Z = -95.5,
    //   completely eliminating the road segment directly under Patung Sultan Hasanuddin (marked with Red X #1)
    // =========================================================================
    const groundLoopControlPts = [
      // Bottom Yellow Road (flowing Right-to-Left: -X -> +X, matching the long yellow arrow)
      new THREE.Vector3(2,     groundRoadY, -95.5),
      new THREE.Vector3(20,    groundRoadY, -95.5),
      new THREE.Vector3(38,    groundRoadY, -94.0),
      new THREE.Vector3(54,    groundRoadY, -88.5),
      // Left Curve around wide +X head of Gedung Parkir (flowing Bottom-to-Top: -Z -> +Z)
      new THREE.Vector3(65.2,  groundRoadY, -78.0),
      new THREE.Vector3(65.2,  groundRoadY, -62.5),
      // Top Inner Road along Lantai 1 Arrival / Gedung Parkir (flowing Left-to-Right: +X -> -X)
      new THREE.Vector3(56,    groundRoadY, -53.2),
      new THREE.Vector3(40,    groundRoadY, -52.6),
      new THREE.Vector3(22,    groundRoadY, -52.6),
      new THREE.Vector3(4,     groundRoadY, -52.8),
      new THREE.Vector3(-8,    groundRoadY, -54.2),
      // Right Yellow Curved Road (wide curve at X = -18.2 parallel to outer ramp, flowing Top-to-Bottom)
      new THREE.Vector3(-16.5, groundRoadY, -61.0),
      new THREE.Vector3(-18.2, groundRoadY, -71.5),
      new THREE.Vector3(-17.5, groundRoadY, -81.0),
      // Sweeping Southwest Connector (eliminating the segment under Patung Sultan Hasanuddin)
      new THREE.Vector3(-13.5, groundRoadY, -89.0),
      new THREE.Vector3(-6.5,  groundRoadY, -94.5),
    ];
    const groundLoopSpline = new THREE.CatmullRomCurve3(groundLoopControlPts, true, 'centripetal', 0.45);
    const groundSamplesCount = 180;
    const groundPts: THREE.Vector3[] = [];
    const groundNormals: { nx: number; nz: number }[] = [];

    for (let i = 0; i < groundSamplesCount; i++) {
      const pt = groundLoopSpline.getPointAt(i / groundSamplesCount);
      pt.y = groundRoadY - 0.02;
      groundPts.push(pt);
    }
    for (let i = 0; i < groundSamplesCount; i++) {
      const prev = groundPts[(i - 1 + groundSamplesCount) % groundSamplesCount];
      const next = groundPts[(i + 1) % groundSamplesCount];
      const tang = next.clone().sub(prev).normalize();
      const hLen = Math.hypot(tang.x, tang.z) || 1;
      const tx = tang.x / hLen;
      const tz = tang.z / hLen;
      groundNormals.push({ nx: tz, nz: -tx });
    }

    const groundLoopWidth = 6.2;
    const groundLoopGeo = this.buildSweptBoxRibbon(
      groundPts,
      groundNormals,
      0,
      groundLoopWidth,
      0.22,
      -0.20,
      true
    );
    const groundLoopMesh = new THREE.Mesh(groundLoopGeo, roadAsphaltMat);
    groundLoopMesh.receiveShadow = true;
    roadSystemGroup.add(groundLoopMesh);

    // Yellow Edge Lines & White Dashed Centerline + One-Way Arrows on Both Lanes of Ground Inner Loop
    [-groundLoopWidth / 2 + 0.45, groundLoopWidth / 2 - 0.45].forEach((offset) => {
      const edgeGeo = this.buildSweptBoxRibbon(groundPts, groundNormals, offset, 0.20, 0.02, 0.01, true);
      roadSystemGroup.add(new THREE.Mesh(edgeGeo, yellowLineMat));
    });

    for (let i = 0; i < groundSamplesCount; i++) {
      const pt = groundPts[i];
      const nextPt = groundPts[(i + 1) % groundSamplesCount];
      const norm = groundNormals[i];
      if (i % 3 === 0) {
        const dashGroup = new THREE.Group();
        dashGroup.position.set(pt.x, pt.y + 0.03, pt.z);
        dashGroup.lookAt(nextPt.x, nextPt.y + 0.03, nextPt.z);
        dashGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.9), whiteDashMat));
        roadSystemGroup.add(dashGroup);
      }
      if (i % 16 === 4) {
        for (const laneOff of [-1.35, 1.35]) {
          addRoadDirectionalArrow(
            pt.x + norm.nx * laneOff,
            pt.y,
            pt.z + norm.nz * laneOff,
            nextPt.x + norm.nx * laneOff,
            nextPt.y,
            nextPt.z + norm.nz * laneOff,
            0.85
          );
        }
      }
    }

    const splitterLawnMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
    });

    // =========================================================================
    // 3H. TOLLGATE BANDARA INTERNASIONAL SULTAN HASANUDDIN & DUAL-CARRIAGEWAY APPROACH HIGHWAY
    // Matches the top-left of image_9b8efaa8.png & image_f6973e36.png:
    // - Divided Inbound (↘) & Outbound (↖) Carriageways connecting Tollgate to Loop
    // =========================================================================
    const tollInboundCtrl = [
      new THREE.Vector3(-34, groundRoadY, -142),
      new THREE.Vector3(-22, groundRoadY, -125),
      new THREE.Vector3(-11, groundRoadY, -110),
      new THREE.Vector3(-1,  groundRoadY, -102.5),
      new THREE.Vector3(14,  groundRoadY, -102.5),
    ];
    const tollOutboundCtrl = [
      new THREE.Vector3(-12, groundRoadY, -94.0),
      new THREE.Vector3(-19, groundRoadY, -108),
      new THREE.Vector3(-28, groundRoadY, -123),
      new THREE.Vector3(-41, groundRoadY, -140),
    ];

    const buildHighwayBranch = (
      ctrlPts: THREE.Vector3[],
      width: number,
      sampleOut: THREE.Vector3[]
    ) => {
      const curve = new THREE.CatmullRomCurve3(ctrlPts, false, 'centripetal', 0.45);
      const count = 64;
      const pts: THREE.Vector3[] = [];
      const norms: { nx: number; nz: number }[] = [];
      for (let i = 0; i <= count; i++) {
        const p = curve.getPointAt(i / count);
        p.y = groundRoadY - 0.01;
        pts.push(p);
        sampleOut.push(p);
      }
      for (let i = 0; i <= count; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(count, i + 1)];
        const tang = next.clone().sub(prev).normalize();
        const hLen = Math.hypot(tang.x, tang.z) || 1;
        norms.push({ nx: tang.z / hLen, nz: -tang.x / hLen });
      }
      const geo = this.buildSweptBoxRibbon(pts, norms, 0, width, 0.24, -0.22, false);
      const mesh = new THREE.Mesh(geo, roadAsphaltMat);
      mesh.receiveShadow = true;
      roadSystemGroup.add(mesh);

      [-width / 2 + 0.45, width / 2 - 0.45].forEach((off) => {
        const eGeo = this.buildSweptBoxRibbon(pts, norms, off, 0.18, 0.02, 0.01, false);
        roadSystemGroup.add(new THREE.Mesh(eGeo, yellowLineMat));
      });

      for (let i = 2; i < count - 2; i++) {
        const p = pts[i];
        const np = pts[i + 1];
        if (i % 3 === 0) {
          const dg = new THREE.Group();
          dg.position.set(p.x, p.y + 0.03, p.z);
          dg.lookAt(np.x, np.y + 0.03, np.z);
          dg.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 1.8), whiteDashMat));
          roadSystemGroup.add(dg);
        }
        if (i % 14 === 5) {
          addRoadDirectionalArrow(p.x, p.y, p.z, np.x, np.y, np.z, 0.9);
        }
      }
    };

    buildHighwayBranch(tollInboundCtrl, 6.4, this.tollInboundSamples);
    buildHighwayBranch(tollOutboundCtrl, 6.4, this.tollOutboundSamples);

    // Green Median Strip between Inbound & Outbound Tollgate Carriageways
    const medianGroup = new THREE.Group();
    medianGroup.position.set(-23.5, 0.22, -120.5);
    medianGroup.rotation.y = Math.atan2(22, 32);
    const medianCurb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 36), concreteMat);
    const medianGrass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 35.2), splitterLawnMat);
    medianGroup.add(medianCurb, medianGrass);
    roadSystemGroup.add(medianGroup);

    // 3D Realistic Sultan Hasanuddin Airport Tollgate Plaza (Matching Reference Photo)
    // Undulating wave canopy, central gold signboard, "Livin' by Mandiri" videotron, ACP panels & 6 GTO lanes
    const tollgateGroup = this.createRealisticSultanHasanuddinTollgate(concreteMat, darkConcreteMat, barrierMat);
    roadSystemGroup.add(tollgateGroup);

    // 3D Masjid Al-Mukhlisin Bandar Udara (West side of approach road, matching image_9b8efaa8.png)
    const masjidGroup = new THREE.Group();
    masjidGroup.position.set(-37.5, 0.2, -91.0);
    const masjidWallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 });
    const masjidDomeMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.3,
      metalness: 0.35,
    });
    const masjidBase = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.6, 10.5), masjidWallMat);
    masjidBase.position.y = 2.3;
    masjidBase.castShadow = true;
    masjidBase.receiveShadow = true;
    masjidGroup.add(masjidBase);

    const masjidRoof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.45, 11.4), concreteMat);
    masjidRoof.position.y = 4.75;
    masjidGroup.add(masjidRoof);

    const masjidDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      masjidDomeMat
    );
    masjidDome.position.y = 4.85;
    masjidDome.castShadow = true;
    masjidGroup.add(masjidDome);

    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 11.5, 12), masjidWallMat);
    minaret.position.set(4.8, 5.75, 4.8);
    minaret.castShadow = true;
    masjidGroup.add(minaret);

    const minaretCap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.0, 12), masjidDomeMat);
    minaretCap.position.set(4.8, 12.2, 4.8);
    masjidGroup.add(minaretCap);

    const masjidLabel = this.createLabelSprite(
      'MASJID AL-MUKHLISIN BANDAR UDARA',
      '#064e3b',
      '#34d399',
      13.5,
      2.3
    );
    masjidLabel.position.set(0, 10.6, 0);
    masjidGroup.add(masjidLabel);
    roadSystemGroup.add(masjidGroup);

    // Store road loop samples and normals for real-time 60 FPS vehicle animation
    this.roadLoopSamples = sampledPts;
    this.roadLoopNormals = sampledNormals;
    this.groundLoopSamples = groundPts;
    this.groundLoopNormals = groundNormals;

    // =========================================================================
    // 3I. ANIMATED REALISTIC 3D CARS (ALL FOLLOWING ONE-WAY TRAFFIC ARROWS IN REFERENCE MAP)
    // - Main Elevated Viaduct & Outer Loop: BOTH lanes (laneOffset = -1.85 and +1.85) travel
    //   ONE-WAY (direction = -1): ascending +X ramp around Gedung Parkir (→, ↘), driving +X to -X
    //   in front of Terminal Utama / Cordia Hotel (↙), descending -X ramp (←, ↖), and returning (↑, ↗)
    // - Ground Inner Loop: 8 cars across 2 lanes travelling ONE-WAY (direction = +1) along the
    //   yellow-marked inner road around Gedung Parkir, Lantai 1 Arrival, and right-side curve
    // - Tollgate Highway: 4 Inbound cars (↘) & 4 Outbound cars (↖)
    // =========================================================================
    const innerLaneCount = 7;
    for (let c = 0; c < innerLaneCount; c++) {
      const progress = (c / innerLaneCount + 0.03) % 1.0;
      const colorHex = carColors[c % carColors.length];
      const carModel = this.createRealisticCar(colorHex, c % 2 === 0, true);
      roadSystemGroup.add(carModel);
      this.animatedVehicles.push({
        mesh: carModel,
        wheels: (carModel.userData.wheels as THREE.Object3D[]) || [],
        mode: 'viaduct_loop',
        progress,
        speed: 0.038 + (c % 3) * 0.004,
        direction: -1, // One-way Searah: +X to -X along Terminal Utama frontage (↙)
        laneOffset: -1.85,
        loopLength: 265,
      });
    }

    const outerLaneCount = 7;
    for (let c = 0; c < outerLaneCount; c++) {
      const progress = (c / outerLaneCount + 0.08) % 1.0;
      const colorHex = carColors[(c + 2) % carColors.length];
      const carModel = this.createRealisticCar(colorHex, c % 2 === 1, true);
      roadSystemGroup.add(carModel);
      this.animatedVehicles.push({
        mesh: carModel,
        wheels: (carModel.userData.wheels as THREE.Object3D[]) || [],
        mode: 'viaduct_loop',
        progress,
        speed: 0.034 + (c % 3) * 0.004,
        direction: -1, // One-way Searah: parallel lane moving in the exact same direction (↙)
        laneOffset: 1.85,
        loopLength: 265,
      });
    }

    // Animated Cars on the Yellow-Marked Parallel Ground-Level Inner Loop (2 lanes, one-way dir = +1)
    const groundLoopCarCount = 8;
    for (let g = 0; g < groundLoopCarCount; g++) {
      const progress = (g / groundLoopCarCount + 0.04) % 1.0;
      const colorHex = carColors[(g + 1) % carColors.length];
      const carModel = this.createRealisticCar(colorHex, g % 2 === 0, true);
      roadSystemGroup.add(carModel);
      this.animatedVehicles.push({
        mesh: carModel,
        wheels: (carModel.userData.wheels as THREE.Object3D[]) || [],
        mode: 'ground_loop',
        progress,
        speed: 0.042 + (g % 2) * 0.004,
        direction: 1, // Follows yellow arrows: Right-to-Left (+X) at bottom, Top-to-Bottom on right curve
        laneOffset: (g % 2 === 0 ? -1.35 : 1.35),
        loopLength: 240,
      });
    }

    // Animated Cars on Tollgate Bandara Inbound & Outbound Dual-Carriageway
    for (let t = 0; t < 4; t++) {
      const inCar = this.createRealisticCar(carColors[t % carColors.length], t % 2 === 0, true);
      roadSystemGroup.add(inCar);
      this.animatedVehicles.push({
        mesh: inCar,
        wheels: (inCar.userData.wheels as THREE.Object3D[]) || [],
        mode: 'tollgate_in',
        progress: (t / 4 + 0.1) % 1.0,
        speed: 0.085,
        direction: 1,
        laneOffset: (t % 2 === 0 ? -1.2 : 1.2),
        loopLength: 75,
      });

      const outCar = this.createRealisticCar(carColors[(t + 3) % carColors.length], t % 2 === 1, true);
      roadSystemGroup.add(outCar);
      this.animatedVehicles.push({
        mesh: outCar,
        wheels: (outCar.userData.wheels as THREE.Object3D[]) || [],
        mode: 'tollgate_out',
        progress: (t / 4 + 0.22) % 1.0,
        speed: 0.085,
        direction: 1,
        laneOffset: (t % 2 === 0 ? -1.2 : 1.2),
        loopLength: 75,
      });
    }

    // Position all animated vehicles at their initial t=0 frame before first render
    this.updateAnimatedVehicles(0);

    landsideGroup.add(roadSystemGroup);

    // =========================================================================
    // 4. PATUNG SULTAN HASANUDDIN MONUMENT & PARK (Matching Reference Photo)
    // Positioned at World X = 6.5, Z = -71.5 (cleanly framed inside the Inner Ground Loop)
    // Features:
    // - Grey Architectural Concrete Pedestal with vertical panel grooves
    // - Dark Bronze Statue of Sultan Hasanuddin in Bugis-Makassar Royal Attire:
    //   Billowing Lipa' Sabbe sarong, Baju Bodo/Jas Tutup, hands clasping Badik/Keris,
    //   shoulder-length hair, and iconic upward-sweeping Passapu (Patonro) headgear
    // - 2-Row 3D Cutout Monumental Lettering Sign on Black Steel Support Poles:
    //   Row 1 (Red-Orange): "BANDAR UDARA INTERNASIONAL"
    //   Row 2 (Bold White): "SULTAN HASANUDDIN"
    // - Surrounding Tropical Palm Trees & Ornamental Shrubs on Lush Green Lawn
    // =========================================================================
    const tuguGroup = new THREE.Group();
    tuguGroup.position.set(6.5, 0.2, -71.5);

    const parkCurbGeo = new THREE.CylinderGeometry(11.2, 11.5, 0.26, 40);
    const parkCurb = new THREE.Mesh(parkCurbGeo, concreteMat);
    parkCurb.position.y = 0.12;
    parkCurb.receiveShadow = true;
    tuguGroup.add(parkCurb);

    const parkLawnMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
    });
    const lawnGeo = new THREE.CylinderGeometry(10.6, 10.9, 0.38, 40);
    const lawn = new THREE.Mesh(lawnGeo, parkLawnMat);
    lawn.position.y = 0.19;
    lawn.receiveShadow = true;
    tuguGroup.add(lawn);

    // Concrete Pedestal (Tumpuan Beton Abu-abu Bertingkat sesuai Gambar)
    const pedestalConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.65,
      metalness: 0.12,
    });
    const pedestalGrooveMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.75,
    });

    // Lower Stepped Plinth Base
    const baseStep1 = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.55, 4.2),
      pedestalConcreteMat
    );
    baseStep1.position.set(0, 0.58, 0);
    baseStep1.castShadow = true;
    baseStep1.receiveShadow = true;
    tuguGroup.add(baseStep1);

    // Tapered Grey Concrete Pedestal Body with Vertical Panel Grooves
    const mainPedestalGeo = new THREE.CylinderGeometry(1.85, 2.25, 3.6, 4);
    const mainPedestal = new THREE.Mesh(mainPedestalGeo, pedestalConcreteMat);
    mainPedestal.rotation.y = Math.PI / 4;
    mainPedestal.scale.set(1.18, 1.0, 0.95);
    mainPedestal.position.set(0, 2.65, 0);
    mainPedestal.castShadow = true;
    mainPedestal.receiveShadow = true;
    tuguGroup.add(mainPedestal);

    // Vertical Panel Seam Lines on Pedestal Front & Back (matching reference photo)
    [-0.75, 0, 0.75].forEach((gx) => {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 3.45, 2.92),
        pedestalGrooveMat
      );
      seam.position.set(gx, 2.65, 0);
      tuguGroup.add(seam);
    });

    // Upper Pedestal Cap Slab
    const pedestalCap = new THREE.Mesh(
      new THREE.BoxGeometry(3.15, 0.32, 2.65),
      pedestalGrooveMat
    );
    pedestalCap.position.set(0, 4.55, 0);
    pedestalCap.castShadow = true;
    tuguGroup.add(pedestalCap);

    // Sculpted 3D Dark Bronze Statue of Sultan Hasanuddin atop the Pedestal
    const statueGroup = this.createSultanHasanuddinStatue();
    statueGroup.position.set(0, 4.71, 0);
    tuguGroup.add(statueGroup);

    // Iconic 2-Row 3D Lettering Sign ("BANDAR UDARA INTERNASIONAL / SULTAN HASANUDDIN")
    // Front sign facing -Z (Landside view with Terminal Utama behind the statue, exact match to photo)
    const frontSign = this.createSultanHasanuddinMonumentSign();
    frontSign.position.set(0, 0.36, -5.2);
    tuguGroup.add(frontSign);

    // Second sign on +Z side facing Terminal Utama so it is also readable from overview angle
    const backSign = this.createSultanHasanuddinMonumentSign();
    backSign.position.set(0, 0.36, 5.2);
    backSign.rotation.y = Math.PI;
    tuguGroup.add(backSign);

    // Surrounding Tropical Palm Trees & Greenery framing the Statue (as in Reference Photo)
    const palmPlacements: { x: number; z: number; scale: number; rotY: number }[] = [
      { x: -7.8, z: -2.2, scale: 0.92, rotY: 0.4 },
      { x: -6.2, z: 1.8, scale: 1.08, rotY: 1.2 },
      { x: -3.6, z: 3.4, scale: 1.15, rotY: 2.1 },
      { x: -1.4, z: 4.0, scale: 1.02, rotY: 0.8 },
      { x: 2.2, z: 3.8, scale: 1.05, rotY: 1.7 },
      { x: 5.4, z: 2.2, scale: 1.18, rotY: 2.6 },
      { x: 7.6, z: -1.4, scale: 0.96, rotY: 0.3 },
      { x: 8.5, z: 1.2, scale: 0.88, rotY: 1.9 },
    ];
    palmPlacements.forEach((p) => {
      const palm = this.createTropicalPalmTree(p.scale);
      palm.position.set(p.x, 0.35, p.z);
      palm.rotation.y = p.rotY;
      tuguGroup.add(palm);
    });

    // Low Tropical Bushes / Shrubs around the Lawn Edge
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.85,
    });
    const redBushMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.8,
    });
    for (let b = 0; b < 14; b++) {
      const angle = (b / 14) * Math.PI * 2;
      const r = 8.4 + (b % 2) * 0.7;
      const bx = Math.cos(angle) * r;
      const bz = Math.sin(angle) * r;
      if (Math.abs(bz) > 4.6 && Math.abs(bx) < 6.5) continue; // Keep sign view clear
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.75 + (b % 3) * 0.2, 1),
        b % 4 === 0 ? redBushMat : bushMat
      );
      bush.scale.set(1.2, 0.75, 1.1);
      bush.position.set(bx, 0.65, bz);
      bush.castShadow = true;
      tuguGroup.add(bush);
    }

    landsideGroup.add(tuguGroup);

    this.scene.add(landsideGroup);
  }

  /**
   * Sculpted 3D Dark Bronze Statue of Sultan Hasanuddin ("Ayam Jantan dari Timur")
   * Faithfully modeled after the Bandara Internasional Sultan Hasanuddin monument photo:
   * - Weathered dark olive-charcoal bronze patina
   * - Planted legs & feet on bronze plinth
   * - Billowing Lipa' Sabbe (Bugis-Makassar traditional sarong) with sculpted vertical/diagonal folds
   * - Baju Bodo / Jas Tutup Bangsawan tunic with broad shoulders
   * - Both forearms bent inward across the waist, hands clasping the traditional Badik / Keris
   * - Detailed head, facial features, shoulder-length hair locks, and iconic upward-sweeping
   *   triangular Passapu (Patonro) Makassar royal headgear
   */
  private createSultanHasanuddinStatue(): THREE.Group {
    const statue = new THREE.Group();

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x3b4138, // Weathered dark olive-charcoal bronze patina
      metalness: 0.58,
      roughness: 0.42,
    });
    const bronzeHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x4b5346, // Slightly lighter bronze for sculpted folds, Badik & Passapu crest
      metalness: 0.62,
      roughness: 0.36,
    });
    const bronzeDarkCreaseMat = new THREE.MeshStandardMaterial({
      color: 0x262b24,
      metalness: 0.5,
      roughness: 0.5,
    });

    // 1. Bronze Statue Plinth Base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 1.85), bronzeDarkCreaseMat);
    plinth.position.set(0, 0.17, 0);
    plinth.castShadow = true;
    statue.add(plinth);

    // 2. Planted Lower Legs & Feet (Visible below the Lipa' Sabbe sarong hem as in Photo)
    [-0.46, 0.46].forEach((lx, idx) => {
      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.21, 1.45, 14),
        bronzeMat
      );
      calf.position.set(lx, 0.95, 0);
      calf.rotation.z = idx === 0 ? 0.05 : -0.05;
      calf.castShadow = true;
      statue.add(calf);

      // Trouser cuff / ankle wrap
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.25, 0.28, 12),
        bronzeHighlightMat
      );
      cuff.position.set(lx, 0.65, 0);
      statue.add(cuff);

      // Planted Foot pointing slightly outward toward -Z
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.68), bronzeMat);
      foot.position.set(lx, 0.38, -0.14);
      foot.rotation.y = idx === 0 ? 0.15 : -0.15;
      statue.add(foot);
    });

    // 3. Billowing Lipa' Sabbe (Traditional Bugis-Makassar Royal Sarong)
    // Lower main draped sarong cylinder
    const sarongLower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 0.94, 2.45, 20),
      bronzeMat
    );
    sarongLower.scale.set(1.18, 1.0, 0.76);
    sarongLower.position.set(0, 2.55, 0);
    sarongLower.castShadow = true;
    statue.add(sarongLower);

    // Upper wide puffed hip drapery (characteristic wide silhouette in the photo)
    const sarongHips = new THREE.Mesh(
      new THREE.SphereGeometry(1.24, 20, 16),
      bronzeMat
    );
    sarongHips.scale.set(1.16, 0.88, 0.74);
    sarongHips.position.set(0, 3.25, 0);
    sarongHips.castShadow = true;
    statue.add(sarongHips);

    // Central overlapping front sarong panel & vertical drapery folds
    const centerPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 2.65, 0.28),
      bronzeHighlightMat
    );
    centerPanel.position.set(0.04, 2.58, -0.82);
    centerPanel.rotation.z = -0.04;
    centerPanel.castShadow = true;
    statue.add(centerPanel);

    // Sculpted vertical & diagonal drapery fold ridges across the sarong
    const foldConfigs = [
      { x: -0.95, y: 2.55, z: -0.52, rotZ: 0.12, h: 2.35 },
      { x: -0.58, y: 2.52, z: -0.76, rotZ: 0.08, h: 2.42 },
      { x: 0.56, y: 2.52, z: -0.76, rotZ: -0.09, h: 2.42 },
      { x: 0.95, y: 2.55, z: -0.52, rotZ: -0.14, h: 2.35 },
      { x: -0.45, y: 3.35, z: -0.82, rotZ: 0.52, h: 1.25 },
      { x: 0.45, y: 3.35, z: -0.82, rotZ: -0.48, h: 1.25 },
    ];
    foldConfigs.forEach((fc) => {
      const fold = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.08, fc.h, 10),
        bronzeHighlightMat
      );
      fold.position.set(fc.x, fc.y, fc.z);
      fold.rotation.z = fc.rotZ;
      fold.castShadow = true;
      statue.add(fold);
    });

    // Royal Waist Sash / Belt (Pabekkeng)
    const waistSash = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.18, 12, 24),
      bronzeHighlightMat
    );
    waistSash.rotation.x = Math.PI / 2;
    waistSash.scale.set(1.16, 0.78, 1.0);
    waistSash.position.set(0, 3.88, 0);
    statue.add(waistSash);

    // 4. Torso — Baju Bodo / Jas Tutup Bangsawan
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 0.86, 1.95, 16),
      bronzeMat
    );
    torso.scale.set(1.18, 1.0, 0.74);
    torso.position.set(0, 4.78, 0);
    torso.castShadow = true;
    statue.add(torso);

    // Chest armor / tunic lapel relief
    const chestRelief = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 1.35, 0.25),
      bronzeHighlightMat
    );
    chestRelief.position.set(0, 4.92, -0.64);
    statue.add(chestRelief);

    // High Royal Collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.54, 0.34, 14),
      bronzeHighlightMat
    );
    collar.position.set(0, 5.82, 0);
    statue.add(collar);

    // 5. Shoulders, Arms, and Hands Clasping the Traditional Badik / Keris at the Front
    [-1, 1].forEach((side) => {
      // Rounded Shoulder Cap
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.40, 14, 14),
        bronzeMat
      );
      shoulder.position.set(side * 1.12, 5.42, 0);
      shoulder.castShadow = true;
      statue.add(shoulder);

      // Upper Arm (going down to elbow)
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.26, 1.28, 12),
        bronzeMat
      );
      upperArm.position.set(side * 1.22, 4.82, -0.14);
      upperArm.rotation.z = side * -0.14;
      upperArm.rotation.x = 0.18;
      upperArm.castShadow = true;
      statue.add(upperArm);

      // Elbow Joint
      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 12, 12),
        bronzeMat
      );
      elbow.position.set(side * 1.28, 4.22, -0.26);
      statue.add(elbow);

      // Forearm (bent horizontally inward across the front of the torso to clasp the Badik)
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.21, 1.22, 12),
        bronzeHighlightMat
      );
      forearm.position.set(side * 0.72, 4.18, -0.62);
      forearm.rotation.z = side * (Math.PI / 2 - 0.12);
      forearm.rotation.y = side * 0.52;
      forearm.castShadow = true;
      statue.add(forearm);

      // Sculpted Hand Clasping Badik Hilt/Scabbard at Center
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 12, 12),
        bronzeHighlightMat
      );
      hand.scale.set(1.1, 0.9, 0.85);
      hand.position.set(side * 0.20, 4.18 + (side < 0 ? 0.08 : -0.06), -0.88);
      statue.add(hand);
    });

    // 6. Traditional Badik / Keris Makassar Held Vertically/Diagonally at the Center
    const badikGroup = new THREE.Group();
    badikGroup.position.set(0, 4.18, -0.92);

    // Badik Scabbard (Warangka / Sarung Badik) extending downward across the waist sash
    const scabbard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.35, 0.12),
      bronzeDarkCreaseMat
    );
    scabbard.position.set(-0.08, -0.42, 0);
    scabbard.rotation.z = 0.28;
    badikGroup.add(scabbard);

    // Badik Hilt (Hulu Badik) rising above the clasped hands
    const hiltShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.52, 10),
      bronzeHighlightMat
    );
    hiltShaft.position.set(0.04, 0.34, 0.02);
    hiltShaft.rotation.z = -0.18;
    badikGroup.add(hiltShaft);

    // Characteristic curved pistol-grip pommel of Makassar Badik
    const hiltPommel = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.14, 0.14),
      bronzeHighlightMat
    );
    hiltPommel.position.set(0.14, 0.56, 0.04);
    hiltPommel.rotation.z = 0.35;
    badikGroup.add(hiltPommel);

    statue.add(badikGroup);

    // 7. Neck, Sculpted Head, Facial Features & Flowing Shoulder-Length Hair
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 0.42, 12),
      bronzeMat
    );
    neck.position.set(0, 6.02, 0);
    statue.add(neck);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.50, 18, 18),
      bronzeMat
    );
    head.scale.set(0.92, 1.12, 0.96);
    head.position.set(0, 6.52, 0);
    head.castShadow = true;
    statue.add(head);

    // Facial Relief (facing -Z): Brow Ridge, Nose Bridge, Mustache & Chin
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.10, 0.18),
      bronzeHighlightMat
    );
    brow.position.set(0, 6.66, -0.44);
    statue.add(brow);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.10, 0.28, 6),
      bronzeHighlightMat
    );
    nose.position.set(0, 6.52, -0.50);
    nose.rotation.x = -0.25;
    statue.add(nose);

    const chin = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      bronzeMat
    );
    chin.scale.set(1.1, 0.8, 0.9);
    chin.position.set(0, 6.18, -0.32);
    statue.add(chin);

    // Shoulder-length Wavy Hair Locks (Rambut Sebahu Khas Sultan Hasanuddin)
    [-0.45, 0.45].forEach((hx) => {
      const hairSide = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.92, 10),
        bronzeDarkCreaseMat
      );
      hairSide.position.set(hx, 6.18, 0.06);
      hairSide.rotation.z = hx < 0 ? 0.16 : -0.16;
      statue.add(hairSide);
    });
    const hairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.95, 0.28),
      bronzeDarkCreaseMat
    );
    hairBack.position.set(0, 6.20, 0.36);
    statue.add(hairBack);

    // 8. Iconic Passapu / Patonro (Traditional Makassar Royal Headgear)
    // Headband wrapped around forehead
    const passapuBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.47, 0.11, 10, 22),
      bronzeHighlightMat
    );
    passapuBand.rotation.x = Math.PI / 2 - 0.12;
    passapuBand.rotation.y = -0.15;
    passapuBand.position.set(0, 6.80, -0.02);
    statue.add(passapuBand);

    // Dramatic Upward-Sweeping Triangular Fan Crest of the Passapu (pointing up & toward viewer's right / -X)
    const crestShape = new THREE.Shape();
    crestShape.moveTo(-0.35, 0);
    crestShape.lineTo(0.45, 0.08);
    crestShape.quadraticCurveTo(0.15, 0.42, -0.92, 0.82);
    crestShape.lineTo(-0.78, 0.18);
    crestShape.closePath();

    const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    const passapuCrest = new THREE.Mesh(crestGeo, bronzeHighlightMat);
    passapuCrest.position.set(-0.08, 6.82, -0.12);
    passapuCrest.rotation.y = 0.18;
    passapuCrest.castShadow = true;
    statue.add(passapuCrest);

    return statue;
  }

  /**
   * 2-Row 3D Cutout Monumental Lettering Sign in Front of Patung Sultan Hasanuddin:
   * - Top Row (Red-Orange): "BANDAR UDARA INTERNASIONAL"
   * - Bottom Row (Large Bold White): "SULTAN HASANUDDIN"
   * Mounted on Vertical Black Steel Support Poles (Tiang Penyangga Hitam)
   */
  private createSultanHasanuddinMonumentSign(): THREE.Group {
    const signGroup = new THREE.Group();
    const signWidth = 17.6;

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.6,
    });

    // Vertical Black Steel Support Posts planted in the lawn across the width of the sign
    for (let px = -8.2; px <= 8.2; px += 1.025) {
      const poleH = Math.abs(px) < 6.8 ? 2.45 : 1.55;
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, poleH, 0.08),
        poleMat
      );
      pole.position.set(px, poleH / 2, 0.08);
      pole.castShadow = true;
      signGroup.add(pole);
    }

    // Horizontal Steel Mounting Rails behind top & bottom text rows
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.07, 0.07), poleMat);
    topRail.position.set(0, 2.08, 0.06);
    signGroup.add(topRail);

    const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.09, 0.09), poleMat);
    bottomRail.position.set(0, 0.92, 0.06);
    signGroup.add(bottomRail);

    // High-Resolution Cutout 3D Lettering Texture (Transparent background so pedestal & statue legs show through!)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Row 1: "BANDAR UDARA INTERNASIONAL" (Red-Orange 3D Block Letters)
    ctx.font = '900 94px "Arial Black", Impact, system-ui, sans-serif';
    // 3D Dark Extrusion Shadow
    ctx.fillStyle = '#450a0a';
    for (let d = 8; d >= 1; d--) {
      ctx.fillText('BANDAR UDARA INTERNASIONAL', 1024 + d * 1.5, 138 + d * 1.5);
    }
    // Main Red-Orange Face
    ctx.fillStyle = '#ef4444';
    ctx.fillText('BANDAR UDARA INTERNASIONAL', 1024, 138);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.strokeText('BANDAR UDARA INTERNASIONAL', 1024, 138);

    // Row 2: "SULTAN HASANUDDIN" (Larger Bold White 3D Block Letters)
    ctx.font = '900 162px "Arial Black", Impact, system-ui, sans-serif';
    // 3D Slate Extrusion Shadow
    ctx.fillStyle = '#334155';
    for (let d = 11; d >= 1; d--) {
      ctx.fillText('SULTAN HASANUDDIN', 1024 + d * 1.6, 345 + d * 1.6);
    }
    // Main Crisp White Face
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('SULTAN HASANUDDIN', 1024, 345);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeText('SULTAN HASANUDDIN', 1024, 345);

    const signTex = new THREE.CanvasTexture(canvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    signTex.anisotropy = 8;

    const signMat = new THREE.MeshBasicMaterial({
      map: signTex,
      transparent: true,
      alphaTest: 0.08,
      side: THREE.DoubleSide,
    });

    // Multi-layered planes for genuine 3D letter thickness when viewed at an angle
    const signH = 2.75;
    for (let layer = 0; layer < 4; layer++) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(signWidth, signH),
        signMat
      );
      plane.position.set(0, 1.48, -layer * 0.045);
      plane.rotation.y = Math.PI; // Face outward toward -Z
      signGroup.add(plane);
    }

    return signGroup;
  }

  /**
   * 3D Tollgate Bandara Internasional Sultan Hasanuddin (Pintu Gerbang Tol Masuk Bandara)
   * Faithfully modelled after the reference photo (detikSulsel / Bandara Sultan Hasanuddin Makassar):
   * - Undulating / curved wave canopy roof (atap melengkung bergelombang khas modern)
   * - Central roof signboard on steel truss frame: "BANDAR UDARA INTERNASIONAL / SULTAN HASANUDDIN" in gold lettering
   * - Left upper fascia: Massive illuminated digital videotron billboard with "Livin' by Mandiri" magenta branding
   * - Right upper fascia: Sleek architectural silver-grey ACP composite cladding panels with vertical panel seams
   * - 6 Active Toll Lanes with overhead green illuminated LED arrow lane indicators (↓) & red (X)
   * - Concrete islands with yellow-black hazard curb stripes & protective crash bollards
   * - Modern dark metallic toll cabins with tinted glass windows, automated e-toll contactless reader kiosks
   * - Automatic barrier gate arms with red-and-white diagonal warning stripes
   * - Realistic queueing cars matching the photo (red hatchback, black SUV, silver MPV, red compact)
   */
  private createRealisticSultanHasanuddinTollgate(
    concreteMat: THREE.Material,
    darkConcreteMat: THREE.Material,
    barrierMat: THREE.Material
  ): THREE.Group {
    const tollgateGroup = new THREE.Group();
    tollgateGroup.position.set(-24.5, 0.2, -122.5);
    tollgateGroup.rotation.y = Math.atan2(22, 32);

    const spanW = 27.0;
    const depth = 8.8;
    const halfW = spanW / 2;
    const halfD = depth / 2;
    const roofThick = 0.48;

    // 1. Parametric 3D Solid Undulating Wave Canopy (Atap Lengkung Bergelombang Sesuai Foto)
    // Rises at center (x = 0), dips at x = ±7m, curves upward gracefully at outer wings (x = ±13.5m)
    const waveY = (x: number) => 7.35 + 0.95 * Math.cos((2 * Math.PI * x) / 13.5);

    const segX = 48;
    const segZ = 12;
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Top surface vertices
    for (let iz = 0; iz <= segZ; iz++) {
      const z = -halfD + (iz / segZ) * depth;
      for (let ix = 0; ix <= segX; ix++) {
        const x = -halfW + (ix / segX) * spanW;
        const y = waveY(x) + roofThick / 2;
        positions.push(x, y, z);
        uvs.push(ix / segX, iz / segZ);
      }
    }
    const topOffset = 0;
    const rowVertices = segX + 1;

    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = topOffset + iz * rowVertices + ix;
        const b = topOffset + (iz + 1) * rowVertices + ix;
        const c = topOffset + (iz + 1) * rowVertices + (ix + 1);
        const d = topOffset + iz * rowVertices + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Bottom surface vertices
    const botOffset = positions.length / 3;
    for (let iz = 0; iz <= segZ; iz++) {
      const z = -halfD + (iz / segZ) * depth;
      for (let ix = 0; ix <= segX; ix++) {
        const x = -halfW + (ix / segX) * spanW;
        const y = waveY(x) - roofThick / 2;
        positions.push(x, y, z);
        uvs.push(ix / segX, iz / segZ);
      }
    }
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = botOffset + iz * rowVertices + ix;
        const b = botOffset + (iz + 1) * rowVertices + ix;
        const c = botOffset + (iz + 1) * rowVertices + (ix + 1);
        const d = botOffset + iz * rowVertices + (ix + 1);
        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    // Front edge wall (iz = segZ, z = halfD)
    for (let ix = 0; ix < segX; ix++) {
      const tA = topOffset + segZ * rowVertices + ix;
      const tB = topOffset + segZ * rowVertices + (ix + 1);
      const bA = botOffset + segZ * rowVertices + ix;
      const bB = botOffset + segZ * rowVertices + (ix + 1);
      indices.push(tA, bA, tB);
      indices.push(tB, bA, bB);
    }

    // Back edge wall (iz = 0, z = -halfD)
    for (let ix = 0; ix < segX; ix++) {
      const tA = topOffset + 0 * rowVertices + ix;
      const tB = topOffset + 0 * rowVertices + (ix + 1);
      const bA = botOffset + 0 * rowVertices + ix;
      const bB = botOffset + 0 * rowVertices + (ix + 1);
      indices.push(tA, tB, bA);
      indices.push(tB, bB, bA);
    }

    // Left edge cap (ix = 0)
    for (let iz = 0; iz < segZ; iz++) {
      const tA = topOffset + iz * rowVertices;
      const tB = topOffset + (iz + 1) * rowVertices;
      const bA = botOffset + iz * rowVertices;
      const bB = botOffset + (iz + 1) * rowVertices;
      indices.push(tA, tB, bA);
      indices.push(tB, bB, bA);
    }

    // Right edge cap (ix = segX)
    for (let iz = 0; iz < segZ; iz++) {
      const tA = topOffset + iz * rowVertices + segX;
      const tB = topOffset + (iz + 1) * rowVertices + segX;
      const bA = botOffset + iz * rowVertices + segX;
      const bB = botOffset + (iz + 1) * rowVertices + segX;
      indices.push(tA, bA, tB);
      indices.push(tB, bA, bB);
    }

    const waveGeo = new THREE.BufferGeometry();
    waveGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    waveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    waveGeo.setIndex(indices);
    waveGeo.computeVertexNormals();

    const waveRoofMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate metallic roof sheet
      roughness: 0.45,
      metalness: 0.55,
      side: THREE.DoubleSide,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveRoofMat);
    waveMesh.castShadow = true;
    waveMesh.receiveShadow = true;
    tollgateGroup.add(waveMesh);

    // Cantilevered Eaves Trim & Outrigger Brackets along front & rear
    const steelBeamMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.65,
    });
    [-halfD + 0.1, halfD - 0.1].forEach((bz) => {
      for (let bx = -halfW + 1.2; bx <= halfW - 1.2; bx += 2.8) {
        const bracketH = 0.55;
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, bracketH, 0.95),
          steelBeamMat
        );
        bracket.position.set(bx, waveY(bx) - roofThick / 2 - bracketH / 2, bz);
        tollgateGroup.add(bracket);
      }
    });

    // 2. High-Resolution Digital Videotron Billboard ("Livin' by Mandiri" - Left Upper Fascia)
    const vCanvas = document.createElement('canvas');
    vCanvas.width = 1024;
    vCanvas.height = 256;
    const vCtx = vCanvas.getContext('2d')!;

    // Rich Magenta-Purple Gradient Background matching photo
    const vGrad = vCtx.createLinearGradient(0, 0, 1024, 0);
    vGrad.addColorStop(0, '#2e0249');
    vGrad.addColorStop(0.25, '#570a57');
    vGrad.addColorStop(0.65, '#79155b');
    vGrad.addColorStop(1, '#a81c7e');
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 1024, 256);

    // Glowing golden ambient sparkle bursts
    for (let s = 0; s < 35; s++) {
      const sx = 180 + ((s * 47) % 640);
      const sy = 25 + ((s * 31) % 200);
      const sr = 1 + (s % 4) * 0.9;
      vCtx.fillStyle = 'rgba(254, 240, 138, 0.45)';
      vCtx.beginPath();
      vCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      vCtx.fill();
    }

    // Stylized "livin'" Cursive Script Face
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    vCtx.font = 'italic bold 112px "Brush Script MT", "Segoe Script", cursive, sans-serif';
    // Warm drop shadow
    vCtx.fillStyle = '#78350f';
    vCtx.fillText("livin'", 520 + 4, 108 + 4);
    // Main bright golden face
    vCtx.fillStyle = '#facc15';
    vCtx.fillText("livin'", 520, 108);
    vCtx.strokeStyle = '#fef08a';
    vCtx.lineWidth = 2.5;
    vCtx.strokeText("livin'", 520, 108);

    // Mandiri Icon Knot / Crest beside "livin'"
    vCtx.fillStyle = '#f59e0b';
    vCtx.beginPath();
    vCtx.arc(340, 108, 28, 0, Math.PI * 2);
    vCtx.fill();
    vCtx.fillStyle = '#2e0249';
    vCtx.beginPath();
    vCtx.arc(340, 108, 14, 0, Math.PI * 2);
    vCtx.fill();

    // "by mandiri" text
    vCtx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    vCtx.fillStyle = '#ffffff';
    vCtx.fillText('by mandiri', 520, 188);

    // Subtle LED Display Matrix Grid & Screen Border
    vCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    vCtx.lineWidth = 1;
    for (let gy = 0; gy < 256; gy += 10) {
      vCtx.beginPath();
      vCtx.moveTo(0, gy);
      vCtx.lineTo(1024, gy);
      vCtx.stroke();
    }
    vCtx.strokeStyle = '#facc15';
    vCtx.lineWidth = 6;
    vCtx.strokeRect(3, 3, 1018, 250);

    const vTex = new THREE.CanvasTexture(vCanvas);
    vTex.colorSpace = THREE.SRGBColorSpace;
    const videotronMat = new THREE.MeshBasicMaterial({ map: vTex });

    const videotronScreen = new THREE.Mesh(
      new THREE.BoxGeometry(13.6, 2.35, 0.22),
      videotronMat
    );
    videotronScreen.position.set(-6.6, 5.55, 3.65);
    tollgateGroup.add(videotronScreen);

    // 3. Right Upper Fascia: Architectural Silver-Grey ACP Composite Panels
    const acpMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.28,
    });
    const acpPanel = new THREE.Mesh(
      new THREE.BoxGeometry(13.0, 2.35, 0.20),
      acpMat
    );
    acpPanel.position.set(6.8, 5.55, 3.64);
    tollgateGroup.add(acpPanel);

    // Vertical panel reveal joint seams across the ACP fascia
    for (let px = 1.6; px <= 12.8; px += 2.2) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 2.35, 0.24),
        steelBeamMat
      );
      seam.position.set(px, 5.55, 3.65);
      tollgateGroup.add(seam);
    }

    // 4. Central Roof Gantry Signboard ("BANDAR UDARA INTERNASIONAL / SULTAN HASANUDDIN")
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 2048;
    sCanvas.height = 512;
    const sCtx = sCanvas.getContext('2d')!;

    // Dark charcoal metal louver backing
    sCtx.fillStyle = '#090d16';
    sCtx.fillRect(0, 0, 2048, 512);

    // Horizontal Louver Slats
    sCtx.fillStyle = '#1e293b';
    for (let ly = 12; ly < 500; ly += 24) {
      sCtx.fillRect(16, ly, 2016, 10);
    }

    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';

    // Top Row: "BANDAR UDARA INTERNASIONAL"
    sCtx.font = '900 86px "Arial Black", Impact, sans-serif';
    sCtx.fillStyle = '#78350f';
    for (let d = 6; d >= 1; d--) {
      sCtx.fillText('BANDAR UDARA INTERNASIONAL', 1024 + d * 1.5, 145 + d * 1.5);
    }
    sCtx.fillStyle = '#facc15';
    sCtx.fillText('BANDAR UDARA INTERNASIONAL', 1024, 145);
    sCtx.strokeStyle = '#fef08a';
    sCtx.lineWidth = 2.5;
    sCtx.strokeText('BANDAR UDARA INTERNASIONAL', 1024, 145);

    // Bottom Row: "SULTAN HASANUDDIN"
    sCtx.font = '900 155px "Arial Black", Impact, sans-serif';
    sCtx.fillStyle = '#78350f';
    for (let d = 8; d >= 1; d--) {
      sCtx.fillText('SULTAN HASANUDDIN', 1024 + d * 1.8, 350 + d * 1.8);
    }
    sCtx.fillStyle = '#fbbf24';
    sCtx.fillText('SULTAN HASANUDDIN', 1024, 350);
    sCtx.strokeStyle = '#fef08a';
    sCtx.lineWidth = 3.5;
    sCtx.strokeText('SULTAN HASANUDDIN', 1024, 350);

    // Gantry Outer Border
    sCtx.strokeStyle = '#475569';
    sCtx.lineWidth = 8;
    sCtx.strokeRect(6, 6, 2036, 500);

    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.colorSpace = THREE.SRGBColorSpace;
    const signBoardMat = new THREE.MeshBasicMaterial({ map: sTex, side: THREE.DoubleSide });

    // Signboard Frame atop the central roof crest (Y = 8.35m at x = 0)
    const signBoardH = 2.65;
    const signBoardW = 14.5;
    const signboardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(signBoardW, signBoardH, 0.35),
      signBoardMat
    );
    signboardMesh.position.set(0, 8.54 + signBoardH / 2 + 0.3, 0);
    tollgateGroup.add(signboardMesh);

    // Steel Gantry Support Legs connecting Signboard down through the Wave Canopy
    [-6.2, -2.1, 2.1, 6.2].forEach((sx) => {
      const legH = 2.8;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, legH, 10),
        steelBeamMat
      );
      leg.position.set(sx, 8.54, 0);
      tollgateGroup.add(leg);
    });

    // 5. Overhead LED Lane Status Indicators (Lampu Indikator Lajur Tol & GTO Numbering)
    const greenLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const redLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ledHousingMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.6 });

    const laneCentersX = [-10.15, -6.05, -1.95, 2.15, 6.25, 10.35];
    laneCentersX.forEach((lx, lIdx) => {
      const signalGroup = new THREE.Group();
      signalGroup.position.set(lx, 4.15, 3.8);

      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 0.22), ledHousingMat);
      signalGroup.add(housing);

      if (lIdx < 5) {
        // Glowing Green Downward Arrow (↓) indicating Active Open Lane
        const arrowMesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.26, 6),
          greenLedMat
        );
        arrowMesh.rotation.z = Math.PI;
        arrowMesh.position.set(0, -0.04, 0.12);
        signalGroup.add(arrowMesh);

        const arrowStem = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.16, 0.05),
          greenLedMat
        );
        arrowStem.position.set(0, 0.10, 0.12);
        signalGroup.add(arrowStem);
      } else {
        // Glowing Red 'X' indicating Closed/Standby Lane
        [-1, 1].forEach((sign) => {
          const crossBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.06, 0.05),
            redLedMat
          );
          crossBar.rotation.z = sign * Math.PI / 4;
          crossBar.position.set(0, 0, 0.12);
          signalGroup.add(crossBar);
        });
      }

      tollgateGroup.add(signalGroup);
    });

    // 6. Toll Booth Islands, Modern GTO Cabins, and Automatic Barrier Gates
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.6,
    });
    const darkBoothMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.45,
    });
    const boothGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.72,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
    });
    const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const tapReaderMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const warningYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });

    const islandXPositions = [-12.2, -8.1, -4.0, 0.1, 4.2, 8.3, 12.4];
    islandXPositions.forEach((ix, iIdx) => {
      // Concrete Island with Hazard Striping
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 8.2), concreteMat);
      island.position.set(ix, 0.19, 0);
      island.receiveShadow = true;
      tollgateGroup.add(island);

      // Yellow & Black Hazard Stripes along Island Curb
      [-0.60, 0.60].forEach((sideX) => {
        for (let sz = -3.8; sz <= 3.8; sz += 0.85) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.32, 0.40),
            warningYellowMat
          );
          stripe.position.set(ix + sideX, 0.20, sz);
          tollgateGroup.add(stripe);
        }
      });

      // Protective Steel Crash Bollard on Island Nose
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 1.15, 12),
        warningYellowMat
      );
      bollard.position.set(ix, 0.65, 4.15);
      bollard.castShadow = true;
      tollgateGroup.add(bollard);

      // Structural Steel Column supporting the Wave Roof
      const targetRoofY = waveY(ix) - roofThick / 2;
      const colH = targetRoofY - 0.38;
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, colH, 14),
        darkSteelMat
      );
      column.position.set(ix, 0.38 + colH / 2, 0);
      column.castShadow = true;
      tollgateGroup.add(column);

      // Modern Dark Metallic Toll Booth Cabins (on active islands 1 through 6)
      if (iIdx < 6) {
        const booth = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 2.45, 3.2),
          darkBoothMat
        );
        booth.position.set(ix, 0.38 + 1.22, 0.2);
        booth.castShadow = true;
        tollgateGroup.add(booth);

        // Tinted Glass Wrap-Around Window
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(1.08, 1.05, 2.75),
          boothGlassMat
        );
        glass.position.set(ix, 0.38 + 1.62, 0.2);
        tollgateGroup.add(glass);

        // Roof-Mounted AC Condenser Unit
        const ac = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.35, 0.55),
          acMat
        );
        ac.position.set(ix, 0.38 + 2.45 + 0.18, 0.1);
        tollgateGroup.add(ac);

        // Automated E-Toll Card Reader Tap Pedestal (GTO Terminal)
        const tapKiosk = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 1.25, 0.32),
          darkSteelMat
        );
        tapKiosk.position.set(ix + 0.68, 0.38 + 0.62, 1.65);
        tollgateGroup.add(tapKiosk);

        const tapSensor = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.22, 0.05),
          tapReaderMat
        );
        tapSensor.position.set(ix + 0.68, 0.38 + 0.95, 1.82);
        tollgateGroup.add(tapSensor);

        // Automatic Toll Barrier Gate Arm (Red-and-White warning stripes)
        const pivotMotor = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.95, 0.36),
          warningYellowMat
        );
        pivotMotor.position.set(ix + 0.68, 0.38 + 0.48, 2.45);
        tollgateGroup.add(pivotMotor);

        const isOpen = iIdx === 1 || iIdx === 3;
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(2.35, 0.10, 0.08),
          barrierMat
        );
        arm.position.set(ix + 1.85, 0.38 + 0.95 + (isOpen ? 0.65 : 0), 2.45);
        arm.rotation.z = isOpen ? 0.65 : 0.06;
        tollgateGroup.add(arm);
      }
    });

    // 7. Realistic Queueing Cars at Toll Plaza matching reference photo
    // Red hatchback in Lane 2
    const redCar = this.createRealisticCar(0xef4444, false, true);
    redCar.position.set(-6.05, 0.4, 4.8);
    redCar.rotation.y = Math.PI;
    tollgateGroup.add(redCar);

    // Black SUV in Lane 3
    const blackSuv = this.createRealisticCar(0x0f172a, true, true);
    blackSuv.position.set(-1.95, 0.4, 7.4);
    blackSuv.rotation.y = Math.PI;
    tollgateGroup.add(blackSuv);

    // Silver MPV in Lane 4
    const silverCar = this.createRealisticCar(0xd1d5db, true, true);
    silverCar.position.set(2.15, 0.4, 2.9);
    silverCar.rotation.y = Math.PI;
    tollgateGroup.add(silverCar);

    // Red compact car driving past Lane 6
    const redPassCar = this.createRealisticCar(0xdc2626, false, true);
    redPassCar.position.set(10.35, 0.4, 8.8);
    redPassCar.rotation.y = Math.PI;
    tollgateGroup.add(redPassCar);

    return tollgateGroup;
  }

  /**
   * Realistic 3D Tropical Palm Tree (Pohon Palem) framing the Sultan Hasanuddin Monument
   */
  private createTropicalPalmTree(scale: number = 1.0): THREE.Group {

    const tree = new THREE.Group();

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    // Slightly curved segmented palm trunk
    const segments = 6;
    const segH = 0.85;
    for (let s = 0; s < segments; s++) {
      const rBottom = 0.28 - s * 0.018;
      const rTop = 0.26 - s * 0.018;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, segH, 8),
        trunkMat
      );
      seg.position.set(Math.sin(s * 0.18) * 0.18, s * (segH - 0.05) + segH / 2, 0);
      seg.rotation.z = -Math.cos(s * 0.18) * 0.05;
      seg.castShadow = true;
      tree.add(seg);
    }

    const crownY = segments * (segH - 0.05) + 0.1;
    const crownX = Math.sin((segments - 1) * 0.18) * 0.18;

    // 9 Arching Tropical Palm Fronds
    const frondCount = 9;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(crownX, crownY, 0);
      frondGroup.rotation.y = angle;

      // Arching leaf blade made of 3 angled segments
      const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 1.35), frondMat);
      leaf1.position.set(0, 0.22, 0.65);
      leaf1.rotation.x = -0.32;
      frondGroup.add(leaf1);

      const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 1.45), frondMat);
      leaf2.position.set(0, 0.28, 1.92);
      leaf2.rotation.x = 0.12;
      frondGroup.add(leaf2);

      const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.15, 4), frondMat);
      leaf3.scale.set(1.0, 1.0, 0.18);
      leaf3.position.set(0, -0.08, 3.05);
      leaf3.rotation.x = Math.PI / 2 + 0.48;
      frondGroup.add(leaf3);

      tree.add(frondGroup);
    }

    tree.scale.set(scale, scale, scale);
    return tree;
  }

  /**
   * 3D Pixar Animation IP Speaker Nodes across Every Zone:
   * - Ceiling Speaker ('ceiling'): Dipasang di plafon terminal (Ruang Tunggu, Check-in, Bagasi)
   * - Column Speaker ('column'): Dipasang di dinding pilar / koridor panjang dengan jangkauan suara horizontal jauh
   * - Horn Speaker ('horn'): Dipasang di area bising & terbuka luar ruangan (Apron, Garbarata, Drop-off, Parkir)
   */
  private buildSpeakerNodes() {
    const speakerGroup = new THREE.Group();

    this.speakers.forEach((speaker) => {
      const category: SpeakerCategory =
        speaker.category ||
        (speaker.macroZoneId === 'macro-4' || speaker.macroZoneId === 'macro-5'
          ? 'horn'
          : 'ceiling');

      const node = new THREE.Group();
      node.position.set(...speaker.position);
      node.userData = {
        type: 'speaker',
        speakerId: speaker.id,
        category,
      };

      // Rotate directional speakers (Column & Horn) around Y axis
      const rotY = speaker.rotationY ?? 0;
      const modelGroup = new THREE.Group();
      modelGroup.rotation.y = rotY;
      node.add(modelGroup);

      const ledColor = this.getSpeakerColor(speaker.status);

      if (category === 'ceiling') {
        this.createPixarCeilingSpeaker(modelGroup, ledColor, speaker.id);
      } else if (category === 'column') {
        this.createPixarColumnSpeaker(modelGroup, ledColor, speaker.id);
      } else {
        this.createPixarHornSpeaker(modelGroup, ledColor, speaker.id);
      }

      // Floating 3D Pixar Category Pill Sprite above speaker for instant visual identification
      const badgeTex = this.getSpeakerBadgeTexture(category);
      const badgeMat = new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthTest: false,
      });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.scale.set(3.2, 0.92, 1);
      badgeSprite.position.set(0, category === 'column' ? 2.15 : 1.65, 0);
      badgeSprite.renderOrder = 25;
      node.add(badgeSprite);

      // Generous invisible raycast hit proxy for effortless clicking
      const proxyGeo = new THREE.SphereGeometry(2.1, 10, 10);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxy = new THREE.Mesh(proxyGeo, proxyMat);
      proxy.userData = { type: 'speaker', speakerId: speaker.id, category };
      node.add(proxy);

      this.speakerMeshes.set(speaker.id, node);
      this.interactableObjects.push(proxy);
      speakerGroup.add(node);
    });

    this.scene.add(speakerGroup);
  }

  /**
   * 1. CEILING SPEAKER (3D Pixar Animation Style — Matches Left Card in Reference Image):
   * - Soft contoured glossy pearl-white circular flush-mount bezel ring
   * - Perforated charcoal acoustic mesh grille & sculpted woofer cone with silver center dome
   * - Side Red & Black spring terminal clip block (khas gambar referensi Ceiling Speaker)
   * - Top ceiling plafon mount plate & glowing status LED halo
   */
  private createPixarCeilingSpeaker(
    parent: THREE.Group,
    ledColor: number,
    speakerId: string
  ) {
    const whiteBezelMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
    });
    const softGreyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.35,
      metalness: 0.25,
    });
    const darkGrilleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.3,
    });
    const wooferConeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.35,
    });
    const silverCapMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Plafon ceiling tile disc halo (shows it is mounted flush on the terminal ceiling)
    const ceilingTile = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.38, 0.08, 28),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.18,
      })
    );
    ceilingTile.position.set(0, 0.22, 0);
    parent.add(ceilingTile);

    // Main Contoured Pixar White Outer Body Cylinder
    const bodyCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.42, 28),
      whiteBezelMat
    );
    bodyCyl.castShadow = true;
    parent.add(bodyCyl);

    // Plump Rounded Pixar White Bezel Rim (Torus) — top & bottom so it looks great from both below & cutaway top view
    [-0.14, 0.14].forEach((ry) => {
      const bezelRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.86, 0.22, 16, 32),
        whiteBezelMat
      );
      bezelRim.rotation.x = Math.PI / 2;
      bezelRim.position.y = ry;
      bezelRim.castShadow = true;
      parent.add(bezelRim);
    });

    // Inner Recessed Acoustic Baffle & Perforated Mesh Grille (Top & Bottom faces)
    const baffleDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 0.46, 24),
      darkGrilleMat
    );
    parent.add(baffleDisc);

    // Sculpted Woofer Cone & Silver Dustcap Dome (visible from both top cutaway & bottom interior)
    [-0.24, 0.24].forEach((wy) => {
      const wooferRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.50, 0.06, 12, 24),
        softGreyMat
      );
      wooferRing.rotation.x = Math.PI / 2;
      wooferRing.position.y = wy;
      parent.add(wooferRing);

      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.20, 0.14, 20),
        wooferConeMat
      );
      cone.position.y = wy;
      parent.add(cone);

      const dustCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        silverCapMat
      );
      dustCap.scale.set(1, 0.45, 1);
      dustCap.position.y = wy + (wy > 0 ? 0.05 : -0.05);
      parent.add(dustCap);
    });

    // Signature Side Terminal Clip Block with Red & Black Push-Terminals (as in Reference Image)
    const clipHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.34, 0.48),
      whiteBezelMat
    );
    clipHousing.position.set(1.06, 0.04, 0);
    parent.add(clipHousing);

    const redClip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    redClip.rotation.z = -0.35;
    redClip.position.set(1.22, 0.14, 0.11);
    parent.add(redClip);

    const blackClip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    blackClip.rotation.z = -0.35;
    blackClip.position.set(1.22, 0.14, -0.11);
    parent.add(blackClip);

    // Status LED Halo Ring around the Ceiling Speaker Bezel
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.14, 0.07, 10, 28),
      ledMat
    );
    ledRing.rotation.x = Math.PI / 2;
    ledRing.userData = { isStatusLed: true };
    parent.add(ledRing);

    // 2 Concentric Downward/Radial Acoustic Wave Rings
    [0, 0.5].forEach((phaseOffset, idx) => {
      const pulseGeo = new THREE.RingGeometry(1.05, 1.32, 32);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.rotation.x = Math.PI / 2;
      pulse.position.y = -0.25 - idx * 0.35;
      pulse.userData = {
        isWaveRing: true,
        speakerId,
        category: 'ceiling',
        phaseOffset,
        baseY: -0.25,
      };
      parent.add(pulse);
      this.soundWaveRings.push(pulse);
    });
  }

  /**
   * 2. COLUMN SPEAKER (3D Pixar Animation Style — Matches Center Card in Reference Image):
   * - Tall vertical rectangular enclosure with rounded Pixar metallic silver-white side rails & end-caps
   * - Dark recessed front baffle with 5 vertically stacked circular driver cones + silver trim rings
   * - Mounted on a structural pillar / wall bracket with horizontal long-throw sound dispersion
   */
  private createPixarColumnSpeaker(
    parent: THREE.Group,
    ledColor: number,
    speakerId: string
  ) {
    const bodySilverMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      roughness: 0.24,
      metalness: 0.35,
      clearcoat: 0.55,
    });
    const trimChromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.2,
      metalness: 0.78,
    });
    const baffleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.25,
    });
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.4,
    });
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.65,
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.5,
      metalness: 0.2,
    });

    const colHeight = 2.45;
    const colWidth = 0.82;
    const colDepth = 0.58;

    // Reference Structural Pillar / Wall Column behind the speaker so it is visibly pillar-mounted
    const miniPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 3.1, 16),
      pillarMat
    );
    miniPillar.position.set(0, 0, -0.78);
    parent.add(miniPillar);

    // Upper & Lower Heavy-Duty Wall/Pillar Mounting Brackets
    [-0.75, 0.75].forEach((by) => {
      const bracketArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.22, 0.55),
        bracketMat
      );
      bracketArm.position.set(0, by, -0.42);
      parent.add(bracketArm);
    });

    // Main Vertical Column Enclosure Core
    const mainBox = new THREE.Mesh(
      new THREE.BoxGeometry(colWidth, colHeight, colDepth),
      bodySilverMat
    );
    mainBox.castShadow = true;
    parent.add(mainBox);

    // Pixar Rounded Vertical Side Rails (Left & Right Cylinders)
    [-colWidth / 2, colWidth / 2].forEach((rx) => {
      const sideRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, colHeight + 0.08, 16),
        bodySilverMat
      );
      sideRail.position.set(rx, 0, 0.05);
      sideRail.castShadow = true;
      parent.add(sideRail);
    });

    // Rounded Top & Bottom Pixar End-Caps
    [-colHeight / 2 - 0.06, colHeight / 2 + 0.06].forEach((cy) => {
      const endCap = new THREE.Mesh(
        new THREE.BoxGeometry(colWidth + 0.22, 0.18, colDepth + 0.12),
        trimChromeMat
      );
      endCap.position.set(0, cy, 0.02);
      parent.add(endCap);
    });

    // Dark Recessed Front Acoustic Baffle (Front +Z and Back -Z so drivers are visible from any angle)
    const frontBaffle = new THREE.Mesh(
      new THREE.BoxGeometry(colWidth - 0.08, colHeight - 0.16, colDepth + 0.06),
      baffleMat
    );
    parent.add(frontBaffle);

    // 5 Vertically Stacked Circular Woofer / Tweeter Cones (Characteristic Column Speaker Array)
    const driverOffsetsY = [-0.84, -0.42, 0.0, 0.42, 0.84];
    driverOffsetsY.forEach((dy, idx) => {
      const isCenterTweeter = idx === 2;
      const radius = isCenterTweeter ? 0.17 : 0.20;

      // Chrome Trim Bezel around each driver cone
      const driverRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.032, 10, 20),
        trimChromeMat
      );
      driverRing.position.set(0, dy, colDepth / 2 + 0.04);
      parent.add(driverRing);

      // Sculpted Dark Woofer Cone
      const driverCone = new THREE.Mesh(
        new THREE.CylinderGeometry(radius - 0.01, radius * 0.45, 0.08, 18),
        coneMat
      );
      driverCone.rotation.x = Math.PI / 2;
      driverCone.position.set(0, dy, colDepth / 2 + 0.02);
      parent.add(driverCone);

      // Center Phase Dome Dustcap
      const centerDome = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.42, 12, 12),
        isCenterTweeter ? trimChromeMat : coneMat
      );
      centerDome.scale.set(1, 1, 0.55);
      centerDome.position.set(0, dy, colDepth / 2 + 0.05);
      parent.add(centerDome);
    });

    // Glowing Status LED Ring around the base/top of the Column Speaker
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.065, 10, 24),
      ledMat
    );
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.set(0, colHeight / 2 + 0.22, 0);
    ledRing.userData = { isStatusLed: true };
    parent.add(ledRing);

    // 2 Horizontal Forward-Propagating Acoustic Wave Rings (+Z direction)
    [0, 0.5].forEach((phaseOffset) => {
      const pulseGeo = new THREE.RingGeometry(0.65, 0.92, 28);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.set(0, 0, colDepth / 2 + 0.35);
      pulse.userData = {
        isWaveRing: true,
        speakerId,
        category: 'column',
        phaseOffset,
        baseZ: colDepth / 2 + 0.35,
      };
      parent.add(pulse);
      this.soundWaveRings.push(pulse);
    });
  }

  /**
   * 3. HORN SPEAKER (3D Pixar Animation Style — Matches Right Card in Reference Image):
   * - Weatherproof flared conical reflex horn with thick rounded Pixar bell rim
   * - Dark acoustic inner horn throat with prominent central cylindrical reflex phase plug
   * - Rear cylindrical compression driver housing with cooling ribs & heavy-duty U-bracket mount
   */
  private createPixarHornSpeaker(
    parent: THREE.Group,
    ledColor: number,
    speakerId: string
  ) {
    const hornOuterMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.26,
      metalness: 0.22,
      clearcoat: 0.5,
    });
    const hornInnerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.48,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const driverHousingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.55,
    });
    const bracketSteelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.7,
    });
    const chromeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.18,
      metalness: 0.85,
    });

    // Rear Cylindrical Compression Driver Unit (along Z axis, at back Z = -0.75)
    const driverCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.42, 0.68, 22),
      driverHousingMat
    );
    driverCyl.rotation.x = Math.PI / 2;
    driverCyl.position.set(0, 0, -0.72);
    driverCyl.castShadow = true;
    parent.add(driverCyl);

    // Rear rounded cap of compression driver
    const driverBackCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 12),
      bracketSteelMat
    );
    driverBackCap.scale.set(1, 1, 0.45);
    driverBackCap.position.set(0, 0, -1.06);
    parent.add(driverBackCap);

    // Flared Conical Megaphone Horn Bell (expanding from Z = -0.38 to Z = +0.68)
    const hornBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.42, 1.12, 28, 1, true),
      hornOuterMat
    );
    hornBell.rotation.x = Math.PI / 2;
    hornBell.position.set(0, 0, 0.16);
    hornBell.castShadow = true;
    parent.add(hornBell);

    // Dark Inner Acoustic Horn Throat Cone
    const hornInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.93, 0.38, 1.08, 28),
      hornInnerMat
    );
    hornInner.rotation.x = Math.PI / 2;
    hornInner.position.set(0, 0, 0.14);
    parent.add(hornInner);

    // Thick Rounded Pixar Bell Rim Lip at the front mouth (Z = +0.72)
    const bellRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.13, 16, 32),
      hornOuterMat
    );
    bellRim.position.set(0, 0, 0.72);
    bellRim.castShadow = true;
    parent.add(bellRim);

    // Central Cylindrical Acoustic Reflex Core / Phase Plug inside the Horn Mouth (as in Reference Image)
    const reflexCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.78, 20),
      driverHousingMat
    );
    reflexCore.rotation.x = Math.PI / 2;
    reflexCore.position.set(0, 0, 0.34);
    parent.add(reflexCore);

    const reflexTipRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.04, 10, 20),
      chromeAccentMat
    );
    reflexTipRing.position.set(0, 0, 0.72);
    parent.add(reflexTipRing);

    const reflexCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 12),
      bracketSteelMat
    );
    reflexCap.scale.set(1, 1, 0.45);
    reflexCap.position.set(0, 0, 0.73);
    parent.add(reflexCap);

    // Heavy-Duty Pivoting U-Bracket Yoke & Support Post (khas Horn Speaker Outdoor)
    const uBracketBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.14, 0.22),
      bracketSteelMat
    );
    uBracketBase.position.set(0, -0.78, -0.45);
    parent.add(uBracketBase);

    [-0.64, 0.64].forEach((bx) => {
      const uArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.82, 0.22),
        bracketSteelMat
      );
      uArm.position.set(bx, -0.38, -0.45);
      parent.add(uArm);

      // Chrome Pivot Bolt on each side of the horn body
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12),
        chromeAccentMat
      );
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(bx > 0 ? bx + 0.05 : bx - 0.05, 0, -0.45);
      parent.add(bolt);
    });

    // Vertical Mounting Post under the U-Bracket
    const mountPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.85, 12),
      bracketSteelMat
    );
    mountPost.position.set(0, -1.22, -0.45);
    parent.add(mountPost);

    // Status LED Halo Collar around the Horn Neck
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.075, 10, 24),
      ledMat
    );
    ledRing.position.set(0, 0, -0.32);
    ledRing.userData = { isStatusLed: true };
    parent.add(ledRing);

    // 2 Directional High-SPL Acoustic Wave Rings blasting forward (+Z direction)
    [0, 0.5].forEach((phaseOffset) => {
      const pulseGeo = new THREE.RingGeometry(0.85, 1.18, 32);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.set(0, 0, 0.95);
      pulse.userData = {
        isWaveRing: true,
        speakerId,
        category: 'horn',
        phaseOffset,
        baseZ: 0.95,
      };
      parent.add(pulse);
      this.soundWaveRings.push(pulse);
    });
  }

  /**
   * Generates a cached high-contrast 3D billboard badge texture for each speaker category
   */
  private getSpeakerBadgeTexture(category: SpeakerCategory): THREE.CanvasTexture {
    const existing = this.speakerBadgeTextures.get(category);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 148;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cfg =
      category === 'ceiling'
        ? {
            label: 'CEILING SPEAKER',
            sub: 'PLAFON TERMINAL',
            bg: 'rgba(15, 23, 42, 0.92)',
            border: '#38bdf8',
            accent: '#38bdf8',
          }
        : category === 'column'
        ? {
            label: 'COLUMN SPEAKER',
            sub: 'PILAR & KORIDOR',
            bg: 'rgba(15, 23, 42, 0.92)',
            border: '#10b981',
            accent: '#34d399',
          }
        : {
            label: 'HORN SPEAKER',
            sub: 'APRON / DROP-OFF',
            bg: 'rgba(15, 23, 42, 0.92)',
            border: '#f59e0b',
            accent: '#fbbf24',
          };

    // Rounded pill background
    const r = 36;
    ctx.fillStyle = cfg.bg;
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(12, 12, canvas.width - 24, canvas.height - 24, r);
    ctx.fill();
    ctx.stroke();

    // Left category icon illustration inside badge
    ctx.save();
    ctx.translate(78, 74);
    if (category === 'ceiling') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (category === 'column') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-20, -38, 40, 76, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      [-22, -7, 8, 23].forEach((cy) => {
        ctx.beginPath();
        ctx.arc(0, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-28, -14);
      ctx.lineTo(24, -34);
      ctx.lineTo(24, 34);
      ctx.lineTo(-28, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(24, 0, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Text labels
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Inter", "Arial Black", sans-serif';
    ctx.fillText(cfg.label, 134, 56);

    ctx.fillStyle = cfg.accent;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(cfg.sub, 134, 98);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.speakerBadgeTextures.set(category, tex);
    return tex;
  }

  /**
   * Filter / Highlight speakers in 3D space by acoustic category ('all' | 'ceiling' | 'column' | 'horn')
   */
  public setSpeakerCategoryFilter(category: SpeakerCategory | 'all') {
    this.activeCategoryFilter = category;
    this.speakerMeshes.forEach((group) => {
      const spkCat = group.userData.category as SpeakerCategory;
      if (category === 'all') {
        group.visible = true;
        group.scale.set(1, 1, 1);
      } else if (spkCat === category) {
        group.visible = true;
        group.scale.set(1.38, 1.38, 1.38);
      } else {
        group.visible = true;
        group.scale.set(0.55, 0.55, 0.55);
      }
    });
  }

  private getSpeakerColor(status: IPSpeaker['status']): number {
    switch (status) {
      case 'broadcasting':
        return 0x38bdf8;
      case 'emergency':
        return 0xef4444;
      case 'pilot_fault':
        return 0xf59e0b;
      case 'offline':
        return 0x64748b;
      case 'online':
      default:
        return 0x10b981;
    }
  }

  /**
   * Redundant RSTP 20kHz Cable Network Topology (FR-TEL-01)
   */
  private buildCableRoutes() {
    this.cableLinesGroup = new THREE.Group();

    const switchGeo = new THREE.BoxGeometry(3.2, 2.2, 2.2);
    const switchMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.3,
      metalness: 0.7,
    });
    const coreSwitch = new THREE.Mesh(switchGeo, switchMat);
    coreSwitch.position.set(24, 2.5, -25);
    this.cableLinesGroup.add(coreSwitch);

    const trunkPoints = [
      // Core Switch (Terminal Utama) to Terminal Eksisting
      [new THREE.Vector3(24, 2.5, -25), new THREE.Vector3(24, 6.5, 7)],
      // Terminal Eksisting to Terminal Selatan Rotunda
      [new THREE.Vector3(24, 6.5, 7), new THREE.Vector3(-52, 6.5, 7)],
      // Core Switch to Gedung Parkir via Jembatan Penghubung Lt.2
      [new THREE.Vector3(24, 2.5, -25), new THREE.Vector3(36, 4.8, -46)],
      [new THREE.Vector3(36, 4.8, -46), new THREE.Vector3(42, 5.0, -66)],
      // Terminal Eksisting to Apron Garbarata Loop
      [new THREE.Vector3(24, 6.5, 7), new THREE.Vector3(18, 4.5, 25)],
      [new THREE.Vector3(-52, 6.5, 7), new THREE.Vector3(-56, 4.5, 25)],
      // Redundant RSTP Ring Loop closure
      [new THREE.Vector3(-52, 6.5, 7), new THREE.Vector3(42, 5.0, -66)],
    ];

    trunkPoints.forEach(([start, end]) => {
      const curve = new THREE.LineCurve3(start, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.22, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.88,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.cableLinesGroup.add(tube);
    });

    this.cableLinesGroup.visible = false;
    this.scene.add(this.cableLinesGroup);
  }

  /**
   * STI-PA Acoustic Intelligibility Heatmap Mesh
   */
  private buildHeatmapMesh() {
    const geo = new THREE.PlaneGeometry(165, 130, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.35, '#06b6d4');
    grad.addColorStop(0.7, '#3b82f6');
    grad.addColorStop(0.9, '#f59e0b');
    grad.addColorStop(1.0, '#ef4444');
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
    this.heatmapMesh.position.set(-4, 0.55, -8);
    this.heatmapMesh.visible = false;
    this.scene.add(this.heatmapMesh);
  }

  /**
   * Phased Evacuation Path Visualizer (EN 54-16)
   */
  private buildEvacuationPaths() {
    this.evacuationPathGroup = new THREE.Group();

    const paths = [
      // Terminal Selatan Rotunda -> Landside Assembly
      [[-52, 0.5, 7], [-35, 0.5, -18], [-10, 0.5, -42]],
      // Terminal Eksisting -> Connector Bridge -> Landside Assembly
      [[24, 0.5, 7], [24, 0.5, -25], [10, 0.5, -42]],
      // Gedung Parkir -> Open Assembly Point
      [[42, 0.5, -66], [10, 0.5, -52]],
    ];

    paths.forEach((ptSet) => {
      const points = ptSet.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.45, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
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
    if (event.button !== 0) return;

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

      while (hitObj && !hitObj.userData.type && hitObj.parent) {
        hitObj = hitObj.parent;
      }

      if (hitObj && hitObj.userData) {
        if (hitObj.userData.type === 'eksisting_room_complex') {
          const roomCode = (hitObj.userData.roomCode as number | null) ?? null;
          this.focusEksistingRoom(roomCode);
          if (this.callbacks.onSelectEksistingRoomComplex) {
            this.callbacks.onSelectEksistingRoomComplex(roomCode);
          }
          return;
        } else if (hitObj.userData.type === 'speaker') {
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

    this.selectZone(null, false, true);
    this.selectSpeaker(null);
  }

  public selectZone(
    zoneId: ZoneId | null,
    moveCamera: boolean = true,
    notifyCallback: boolean = true
  ) {
    // Always restore full airport roofs & Lantai 2 when selecting "Semua Terminal" (null) or any zone
    if (this.isLantai1Cutaway || this.isLantai2Cutaway) {
      this.setCutawayMode('none');
    }

    this.selectedZoneId = zoneId;
    if (notifyCallback) {
      this.callbacks.onSelectZone(zoneId);
    }

    if (moveCamera) {
      if (zoneId === null) {
        // Return to All-Terminal Sultan Hasanuddin Overview (with full Phinisi & Vaulted Roofs visible)
        this.targetCameraPos = new THREE.Vector3(0, 82, 118);
        this.targetControlsTarget = new THREE.Vector3(-2, 2, -4);
      } else {
        switch (zoneId) {
          case 'macro-1': // Terminal Utama (3 Lantai)
            this.targetControlsTarget = new THREE.Vector3(24, 5, -24);
            this.targetCameraPos = new THREE.Vector3(24, 48, -74);
            break;
          case 'macro-2': // Terminal Eksisting (2 Lantai · Gate 07-12)
            this.targetControlsTarget = new THREE.Vector3(24, 5, 6);
            this.targetCameraPos = new THREE.Vector3(24, 46, -42);
            break;
          case 'macro-3': // Terminal Selatan (2 Lantai · Gate 01-06)
            this.targetControlsTarget = new THREE.Vector3(-42, 5, 0);
            this.targetCameraPos = new THREE.Vector3(-42, 48, -52);
            break;
          case 'macro-4': // Apron, 12 Garbarata & Pesawat Parkir
            this.targetControlsTarget = new THREE.Vector3(-4, 4, 26);
            this.targetCameraPos = new THREE.Vector3(-4, 46, 88);
            break;
          case 'macro-5': // Gedung Parkir, Jalanan U-Loop & Depan Terminal Utama
            this.targetControlsTarget = new THREE.Vector3(24, 4, -55);
            this.targetCameraPos = new THREE.Vector3(24, 68, -126);
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
      this.scene.background = new THREE.Color(0xdbeafe);
      this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.0038);
      if (this.tarmacMat) this.tarmacMat.color.setHex(0x64748b);
      if (this.apronConcreteMat) this.apronConcreteMat.color.setHex(0x94a3b8);
      if (this.plinthMat) this.plinthMat.color.setHex(0xcbd5e1);
      if (this.keyLight) this.keyLight.intensity = 2.2;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x94a3b8);
        this.hemiLight.intensity = 1.25;
      }
      this.renderer.toneMappingExposure = 1.25;
    } else {
      this.scene.background = new THREE.Color(0x0a0f1d);
      this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0052);
      if (this.tarmacMat) this.tarmacMat.color.setHex(0x0f172a);
      if (this.apronConcreteMat) this.apronConcreteMat.color.setHex(0x1e293b);
      if (this.plinthMat) this.plinthMat.color.setHex(0x1f2937);
      if (this.keyLight) this.keyLight.intensity = 1.55;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0x38bdf8);
        this.hemiLight.groundColor.setHex(0x0f172a);
        this.hemiLight.intensity = 0.75;
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
            mat.opacity = 0.72;
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

    spkGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.isStatusLed) {
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

    if (isEvacuating) {
      const egressPoints = [
        new THREE.Vector3(ix, 0.45, iz),
        new THREE.Vector3(ix, 0.45, iz > 0 ? iz - 18 : iz + 15),
        new THREE.Vector3(0, 0.45, -42),
        new THREE.Vector3(24, 0.45, -50),
      ];
      const curve = new THREE.CatmullRomCurve3(egressPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.45, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.9,
      });
      this.simEgressRoute = new THREE.Mesh(tubeGeo, tubeMat);
      this.simulationIncidentGroup.add(this.simEgressRoute);
    }

    this.targetControlsTarget = new THREE.Vector3(ix, iy, iz);
    this.targetCameraPos = new THREE.Vector3(ix + 16, iy + 32, iz + 42);

    this.updateHighlightMaterials();
  }

  public clearSimulationIncident() {
    this.setSimulationIncident(null, [], false);
  }

  public setCutawayMode(mode: 'none' | 'lantai1' | 'lantai2') {
    this.isLantai1Cutaway = mode === 'lantai1';
    this.isLantai2Cutaway = mode === 'lantai2';

    const showRoofs = mode === 'none';
    const showLantai2 = mode !== 'lantai1';

    this.upperRoofMeshes.forEach((mesh) => {
      mesh.visible = showRoofs;
    });
    this.lantai2Meshes.forEach((mesh) => {
      mesh.visible = showLantai2;
    });

    this.updateHighlightMaterials();
  }

  public setLantai2Cutaway(enabled: boolean) {
    this.setCutawayMode(enabled ? 'lantai2' : 'none');
  }

  private updateHighlightMaterials() {
    const isAnyCutaway = this.isLantai1Cutaway || this.isLantai2Cutaway;
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
            mat.color.setHex(0xef4444);
            mat.opacity = 0.88;
            mat.roughness = 0.15;
          } else if (this.activeSimZoneIds.has(zone.id)) {
            mat.color.setHex(0xf59e0b);
            mat.opacity = 0.8;
            mat.roughness = 0.25;
          } else {
            mat.color.setHex(0x10b981);
            mat.opacity = 0.45;
            mat.roughness = 0.35;
          }
        } else if (isSelected) {
          mat.color.setHex(0x38bdf8);
          mat.opacity = isAnyCutaway ? 0.22 : 0.42;
          mat.roughness = 0.15;
        } else {
          mat.color.set(zone.color);
          if (this.isLantai1Cutaway) {
            mat.opacity = 0.06;
          } else if (this.isLantai2Cutaway) {
            mat.opacity = zone.id === 'macro-4' ? 0.12 : 0.14;
          } else {
            mat.opacity = zone.id === 'macro-4' ? 0.22 : 0.28;
          }
          mat.roughness = 0.3;
        }
      });
    });
  }

  /**
   * Camera Presets for Sultan Hasanuddin Makassar (WAAA):
   * Semua Terminal (with full roofs), Mockup Lantai 1, Mockup Lantai 2, Terminal Utama,
   * Depan Terminal & Jalanan, Terminal Eksisting, Terminal Selatan, Apron & Garbarata, Gedung Parkir, ATC Tower
   */
  public setCameraPreset(preset: CameraPresetType) {
    switch (preset) {
      case 'overview':
        this.setCutawayMode('none');
        this.selectZone(null, true, true);
        break;
      case 'lantai1':
        // Matches Reference Cutaway Image: Lantai 1 Terminal Utama, Eksisting & Selatan
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.setCutawayMode('lantai1');
        this.targetControlsTarget = new THREE.Vector3(16, 1.2, -10);
        this.targetCameraPos = new THREE.Vector3(16, 68, -74);
        break;
      case 'lantai1_eksisting':
        // Dedicated Top-Down Cutaway View of Terminal Eksisting Lantai 1 (Tanpa-judul-920-x-197-mm-5.png)
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.setCutawayMode('lantai1');
        this.highlightEksistingRoomCode(null);
        this.targetControlsTarget = new THREE.Vector3(24.5, 1.2, 5.5);
        this.targetCameraPos = new THREE.Vector3(24.5, 52, -25);
        break;
      case 'lantai1_eksisting_ruangan':
        // Dedicated Zoomed-In Top-Down Cutaway View of the Red-Marked Room Complex (Rooms 1-6) on Lt. 1 Eksisting
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.setCutawayMode('lantai1');
        this.targetControlsTarget = new THREE.Vector3(6.4, 1.2, 15.1);
        this.targetCameraPos = new THREE.Vector3(6.4, 15.2, 8.8);
        break;
      case 'lantai2':
        // Matches Reference Cutaway Image: Lantai 2 Terminal Utama, Eksisting & Selatan
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.setCutawayMode('lantai2');
        this.targetControlsTarget = new THREE.Vector3(-6, 4.8, -6);
        this.targetCameraPos = new THREE.Vector3(-6, 84, -96);
        break;
      case 'utama':
      case 'dom_dep':
        this.setCutawayMode('none');
        this.selectZone('macro-1', true, true);
        break;
      case 'curbside':
        // Matches Top Photo: "Tampilan di depan terminal Utama dan Jalanan" (Lantai 3 Drop-Off Y = 9.6m)
        this.setCutawayMode('none');
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(18, 11.2, -38);
        this.targetCameraPos = new THREE.Vector3(50, 14.5, -62);
        break;
      case 'eksisting':
      case 'dom_arr':
        this.setCutawayMode('none');
        this.selectZone('macro-2', true, true);
        break;
      case 'selatan':
      case 'intl_dep':
        this.setCutawayMode('none');
        this.selectZone('macro-3', true, true);
        break;
      case 'apron':
      case 'intl_arr':
        this.setCutawayMode('none');
        this.selectZone('macro-4', true, true);
        break;
      case 'parking':
        this.setCutawayMode('none');
        this.selectZone('macro-5', true, true);
        break;
      case 'dom_all':
        this.setCutawayMode('none');
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(24, 5, -10);
        this.targetCameraPos = new THREE.Vector3(24, 56, 65);
        break;
      case 'intl_all':
        this.setCutawayMode('none');
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(-42, 5, 10);
        this.targetCameraPos = new THREE.Vector3(-45, 50, 72);
        break;
      case 'tower':
        this.setCutawayMode('none');
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(78, 34, -22);
        this.targetCameraPos = new THREE.Vector3(44, 48, 14);
        break;
      case 'tollgate':
        this.setCutawayMode('none');
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(-24.5, 4.8, -122.5);
        this.targetCameraPos = new THREE.Vector3(-8.0, 15.0, -150.0);
        break;
    }
  }

  /**
   * Highlights a specific room code (1-6) inside the Red-Marked Lt. 1 Eksisting Room Complex
   */
  public highlightEksistingRoomCode(roomCode: number | null) {
    this.highlightedEksistingRoomCode = roomCode;
    this.eksistingRoomHighlightMeshes.forEach((meshes, code) => {
      const isMatch = roomCode !== null && code === roomCode;
      meshes.forEach((m) => {
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = isMatch ? 0.38 : 0.0;
      });
    });
  }

  /**
   * Focuses the 3D camera onto the Red-Marked Room Complex on Lt. 1 Eksisting (or a specific room 1-6)
   */
  public focusEksistingRoom(roomCode: number | null = null) {
    this.selectedZoneId = null;
    this.callbacks.onSelectZone(null);
    this.setCutawayMode('lantai1');
    this.highlightEksistingRoomCode(roomCode);

    const roomTargets: Record<number, { x: number; z: number; h: number; dz: number }> = {
      1: { x: 7.98, z: 12.80, h: 6.2,  dz: 2.2 },  // R. Standby (Green-marked room bottom-center)
      2: { x: 2.3,  z: 15.2,  h: 9.2,  dz: 4.2 },  // Storage
      3: { x: 4.8,  z: 16.7,  h: 11.2, dz: 5.0 },  // Restroom
      4: { x: 7.6,  z: 14.9,  h: 9.5,  dz: 4.2 },  // Control Room
      5: { x: 10.1, z: 14.9,  h: 9.8,  dz: 4.4 },  // Data Center Lama
      6: { x: 5.05, z: 14.65, h: 10.2, dz: 4.6 },  // Data Center Baru
    };

    if (roomCode && roomTargets[roomCode]) {
      const rt = roomTargets[roomCode];
      this.targetControlsTarget = new THREE.Vector3(rt.x, 1.2, rt.z);
      this.targetCameraPos = new THREE.Vector3(rt.x, rt.h, rt.z - rt.dz);
    } else {
      this.targetControlsTarget = new THREE.Vector3(6.4, 1.2, 15.1);
      this.targetCameraPos = new THREE.Vector3(6.4, 15.2, 8.8);
    }
  }

  /**
   * Moves the 3D camera inside/above the Green-Marked Room 1 (R. Standby)
   * matching each directional view: 'top' | 'depan' | 'belakang' | 'kanan' | 'kiri'
   */
  public focusRoom1Direction(direction: 'top' | 'depan' | 'belakang' | 'kanan' | 'kiri') {
    this.selectedZoneId = null;
    this.callbacks.onSelectZone(null);
    this.setCutawayMode('lantai1');

    // Keep floor tile natural (un-tinted) during interior eye-level 3D views
    this.highlightEksistingRoomCode(direction === 'top' ? 1 : null);

    // If camera is currently far away, pre-position near Room 1 so it glides smoothly inside
    if (this.camera.position.distanceTo(new THREE.Vector3(7.98, 1.5, 12.8)) > 8.0) {
      this.camera.position.set(7.98, 3.8, 11.5);
      this.controls.target.set(7.98, 1.2, 12.8);
    }

    switch (direction) {
      case 'depan':
        // Looking towards Sisi Depan (+X wall at X = 8.70: PC desk, tilted blue CCTV TV, water dispenser, black floral fridge, 8 blue water gallons, stainless bin)
        this.targetCameraPos = new THREE.Vector3(7.38, 1.48, 12.78);
        this.targetControlsTarget = new THREE.Vector3(8.56, 1.26, 12.78);
        break;
      case 'belakang':
        // Looking towards Sisi Belakang (-X side at X = 7.25: 4-seater green/teal waiting bench on right, open hallway with black standing TV totem & red APAR on left)
        this.targetCameraPos = new THREE.Vector3(8.54, 1.48, 12.82);
        this.targetControlsTarget = new THREE.Vector3(7.12, 1.24, 12.78);
        break;
      case 'kanan':
        // Looking towards Sisi Kanan (+Z wall at Z = 13.60: open glass door to Room 4 Control Room on left, black 3-tier cabinet in middle, 3-pane dark window on right)
        this.targetCameraPos = new THREE.Vector3(7.96, 1.48, 12.14);
        this.targetControlsTarget = new THREE.Vector3(7.92, 1.28, 13.62);
        break;
      case 'kiri':
        // Looking towards Sisi Kiri (-Z wall at Z = 12.00: whiteboard, black wall TV, grey 2-seater sofa, black slatted coffee table with box/bottles, 2 blue swivel chairs)
        this.targetCameraPos = new THREE.Vector3(7.96, 1.48, 13.44);
        this.targetControlsTarget = new THREE.Vector3(7.98, 1.24, 12.05);
        break;
      case 'top':
      default:
        // Overhead 3D view of the Green-Marked Room 1 with "depan", "belakang", "kanan", "Kiri" labels
        this.targetCameraPos = new THREE.Vector3(7.98, 5.8, 10.8);
        this.targetControlsTarget = new THREE.Vector3(7.98, 1.15, 12.80);
        break;
    }
  }

  /**
   * Samples a smoothly interpolated 3D position and normal along a closed road loop
   */
  private sampleClosedLoopPoint(
    samples: THREE.Vector3[],
    normals: { nx: number; nz: number }[],
    progress: number,
    laneOffset: number,
    outPos: { x: number; y: number; z: number }
  ) {
    const N = samples.length;
    if (N === 0) return;

    const wrapped = ((progress % 1.0) + 1.0) % 1.0;
    const fIdx = wrapped * N;
    const i0 = Math.floor(fIdx) % N;
    const i1 = (i0 + 1) % N;
    const alpha = fIdx - Math.floor(fIdx);

    const p0 = samples[i0];
    const p1 = samples[i1];
    const n0 = normals[i0];
    const n1 = normals[i1];

    const px = p0.x + (p1.x - p0.x) * alpha;
    const py = p0.y + (p1.y - p0.y) * alpha;
    const pz = p0.z + (p1.z - p0.z) * alpha;

    const nx = n0.nx + (n1.nx - n0.nx) * alpha;
    const nz = n0.nz + (n1.nz - n0.nz) * alpha;
    const nLen = Math.hypot(nx, nz) || 1;

    outPos.x = px + (nx / nLen) * laneOffset;
    outPos.y = py + 0.02;
    outPos.z = pz + (nz / nLen) * laneOffset;
  }

  /**
   * Samples an open highway branch with lateral lane offset
   */
  private sampleOpenBranchPoint(
    samples: THREE.Vector3[],
    progress: number,
    laneOffset: number,
    outPos: { x: number; y: number; z: number }
  ) {
    const N = samples.length;
    if (N < 2) return;

    const clamped = Math.max(0, Math.min(0.9999, ((progress % 1.0) + 1.0) % 1.0));
    const fIdx = clamped * (N - 1);
    const i0 = Math.floor(fIdx);
    const i1 = Math.min(N - 1, i0 + 1);
    const alpha = fIdx - i0;

    const p0 = samples[i0];
    const p1 = samples[i1];
    const tx = p1.x - p0.x;
    const tz = p1.z - p0.z;
    const hLen = Math.hypot(tx, tz) || 1;
    const nx = tz / hLen;
    const nz = -tx / hLen;

    outPos.x = p0.x + (p1.x - p0.x) * alpha + nx * laneOffset;
    outPos.y = p0.y + (p1.y - p0.y) * alpha + 0.03;
    outPos.z = p0.z + (p1.z - p0.z) * alpha + nz * laneOffset;
  }

  /**
   * Advances all animated road vehicles along the Elevated Lt. 3 Boulevard,
   * Inclined Tanjakan/Turunan Ramps, Ground Inner Loop, Tollgate Highway, and Monument Roundabout
   */
  private updateAnimatedVehicles(delta: number) {
    const currPos = { x: 0, y: 0, z: 0 };
    const lookPos = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < this.animatedVehicles.length; i++) {
      const v = this.animatedVehicles[i];
      const deltaProgress = v.speed * delta;
      v.progress = ((v.progress + v.direction * deltaProgress) % 1.0 + 1.0) % 1.0;

      if (v.mode === 'viaduct_loop') {
        this.sampleClosedLoopPoint(
          this.roadLoopSamples,
          this.roadLoopNormals,
          v.progress,
          v.laneOffset,
          currPos
        );
        const lookAhead = v.progress + v.direction * 0.008;
        this.sampleClosedLoopPoint(
          this.roadLoopSamples,
          this.roadLoopNormals,
          lookAhead,
          v.laneOffset,
          lookPos
        );

        v.mesh.position.set(currPos.x, currPos.y, currPos.z);
        v.mesh.lookAt(lookPos.x, lookPos.y, lookPos.z);
      } else if (v.mode === 'ground_loop') {
        this.sampleClosedLoopPoint(
          this.groundLoopSamples,
          this.groundLoopNormals,
          v.progress,
          v.laneOffset,
          currPos
        );
        const lookAhead = v.progress + v.direction * 0.009;
        this.sampleClosedLoopPoint(
          this.groundLoopSamples,
          this.groundLoopNormals,
          lookAhead,
          v.laneOffset,
          lookPos
        );

        v.mesh.position.set(currPos.x, currPos.y, currPos.z);
        v.mesh.lookAt(lookPos.x, lookPos.y, lookPos.z);
      } else if (v.mode === 'tollgate_in' || v.mode === 'tollgate_out') {
        const branchSamples =
          v.mode === 'tollgate_in' ? this.tollInboundSamples : this.tollOutboundSamples;
        this.sampleOpenBranchPoint(branchSamples, v.progress, v.laneOffset, currPos);
        const lookAhead = Math.min(0.999, v.progress + 0.018);
        this.sampleOpenBranchPoint(branchSamples, lookAhead, v.laneOffset, lookPos);

        v.mesh.position.set(currPos.x, currPos.y, currPos.z);
        v.mesh.lookAt(lookPos.x, lookPos.y, lookPos.z);
      } else {
        // Roundabout ring road around Patung Sultan Hasanuddin (Center X = 10, Z = -76, Y = 0.28)
        const angle = v.progress * Math.PI * 2;
        const lookAngle = angle + v.direction * 0.08;
        const r = v.laneOffset;

        const cx = 10 + Math.cos(angle) * r;
        const cz = -76 + Math.sin(angle) * r;
        const lx = 10 + Math.cos(lookAngle) * r;
        const lz = -76 + Math.sin(lookAngle) * r;

        v.mesh.position.set(cx, 0.28, cz);
        v.mesh.lookAt(lx, 0.28, lz);
      }

      // Spin all 4 wheels proportional to linear distance traveled (wheel radius = 0.33m)
      if (delta > 0) {
        const linearDist = deltaProgress * v.loopLength;
        const wheelSpin = linearDist / 0.33;
        for (let w = 0; w < v.wheels.length; w++) {
          v.wheels[w].rotation.x += wheelSpin;
        }
      }
    }
  }

  /**
   * Main Animation Loop (60 FPS)
   */
  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.radarDome) {
      this.radarDome.rotation.y += delta * 1.8;
    }

    // Animate all cars driving along the road viaduct, ramps & roundabout
    this.updateAnimatedVehicles(delta);

    if (this.targetCameraPos) {
      this.camera.position.lerp(this.targetCameraPos, 0.11);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.015) {
        this.camera.position.copy(this.targetCameraPos);
        this.targetCameraPos = null;
      }
    }
    if (this.targetControlsTarget) {
      this.controls.target.lerp(this.targetControlsTarget, 0.11);
      if (this.controls.target.distanceTo(this.targetControlsTarget) < 0.015) {
        this.controls.target.copy(this.targetControlsTarget);
        this.targetControlsTarget = null;
      }
    }

    this.soundWaveRings.forEach((ring) => {
      const spkId = ring.userData?.speakerId;
      const ringCat = ring.userData?.category as SpeakerCategory | undefined;
      const phaseOffset = ring.userData?.phaseOffset ?? 0;
      const wavePhase = (elapsedTime * 2.2 + phaseOffset) % 1.0;
      const speaker = this.speakers.find((s) => s.id === spkId);

      const isCategoryHighlighted =
        this.activeCategoryFilter !== 'all' && ringCat === this.activeCategoryFilter;
      const isSelectedSpeaker = speaker && this.selectedSpeakerId === speaker.id;

      const isBroadcasting =
        speaker &&
        (this.activeBroadcastingZones.has(speaker.macroZoneId) ||
          this.isEmergencyActive ||
          speaker.status === 'broadcasting' ||
          isCategoryHighlighted ||
          isSelectedSpeaker);

      if (isBroadcasting) {
        ring.visible = true;
        const scale = 1.0 + wavePhase * 3.2;
        ring.scale.set(scale, scale, scale);

        if (ringCat === 'column' || ringCat === 'horn') {
          const baseZ = ring.userData.baseZ ?? 0.6;
          ring.position.z = baseZ + wavePhase * (ringCat === 'column' ? 4.8 : 4.2);
        } else {
          const baseY = ring.userData.baseY ?? -0.25;
          ring.position.y = baseY - wavePhase * 2.2;
        }

        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.78 * (1.0 - wavePhase));
        if (this.isEmergencyActive) {
          mat.color.setHex(0xef4444);
        } else if (ringCat === 'column') {
          mat.color.setHex(0x10b981);
        } else if (ringCat === 'horn') {
          mat.color.setHex(0xf59e0b);
        } else {
          mat.color.setHex(0x38bdf8);
        }
      } else {
        ring.visible = false;
      }
    });

    if (this.isEmergencyActive && this.evacuationPathGroup.visible) {
      const pulseGreen = 0.5 + 0.5 * Math.sin(elapsedTime * 6.0);
      this.evacuationPathGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.4 + 0.6 * pulseGreen;
        }
      });
    }

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

    // Project Red-Marked Room Complex Hotspot to 2D Canvas Screen Coordinates when Lantai 1 Cutaway is active
    if (this.callbacks.onUpdateHotspotScreenPos) {
      if (this.isLantai1Cutaway && this.container) {
        const proj = this.eksistingHotspotWorldPos.clone().project(this.camera);
        const isInFront = proj.z >= -1 && proj.z <= 1;
        const sx = ((proj.x + 1) / 2) * this.container.clientWidth;
        const sy = (-(proj.y - 1) / 2) * this.container.clientHeight;
        const inBounds =
          isInFront &&
          sx >= -40 &&
          sx <= this.container.clientWidth + 40 &&
          sy >= -40 &&
          sy <= this.container.clientHeight + 40;

        if (
          Math.abs(sx - this.lastHotspotScreen.x) > 0.5 ||
          Math.abs(sy - this.lastHotspotScreen.y) > 0.5 ||
          inBounds !== this.lastHotspotScreen.visible
        ) {
          this.lastHotspotScreen = { x: sx, y: sy, visible: inBounds };
          this.callbacks.onUpdateHotspotScreenPos(this.lastHotspotScreen);
        }
      } else if (this.lastHotspotScreen.visible) {
        this.lastHotspotScreen = { x: -999, y: -999, visible: false };
        this.callbacks.onUpdateHotspotScreenPos(this.lastHotspotScreen);
      }
    }

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
