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
import { MacroZone, IPSpeaker, ZoneId } from '../types/pa-system';
import { EmergencyScenario } from '../types/simulation';

export type VisualizerMode = 'bim_normal' | 'stipa_heatmap' | 'spl_noise' | 'cable_rstp';
export type CameraPresetType =
  | 'overview'
  | 'utama'
  | 'curbside'
  | 'eksisting'
  | 'selatan'
  | 'apron'
  | 'parking'
  | 'tower'
  | 'dom_all'
  | 'dom_dep'
  | 'dom_arr'
  | 'intl_all'
  | 'intl_dep'
  | 'intl_arr';

export interface AirportSceneCallbacks {
  onSelectZone: (zoneId: ZoneId | null) => void;
  onSelectSpeaker: (speaker: IPSpeaker | null) => void;
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
}

const SULTAN_HASANUDDIN_GATES: GateDefinition[] = [
  // Terminal Selatan Curved Fan Rotunda (Gates 01 - 04 radial around center X=-52, Z=7)
  { gateNumber: '01', rootX: -64.5, rootZ: 2.5, angleRad: -Math.PI * 0.62, length: 10.5, hasAircraft: false, isWideBody: true, liveryColor: 0x0284c7, tailColor: 0x0369a1 },
  { gateNumber: '02', rootX: -65.5, rootZ: 8.5, angleRad: -Math.PI * 0.42, length: 10.5, hasAircraft: false, isWideBody: false, liveryColor: 0xef4444, tailColor: 0xdc2626 },
  { gateNumber: '03', rootX: -61.5, rootZ: 15.5, angleRad: -Math.PI * 0.22, length: 10.5, hasAircraft: false, isWideBody: false, liveryColor: 0x10b981, tailColor: 0x059669 },
  { gateNumber: '04', rootX: -52.0, rootZ: 17.5, angleRad: -Math.PI * 0.06, length: 10.0, hasAircraft: false, liveryColor: 0xf59e0b, tailColor: 0xd97706 },
  // Terminal Selatan Straight Concourse (Gates 05 - 06)
  { gateNumber: '05', rootX: -32.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: false, liveryColor: 0xe11d48, tailColor: 0xbe123c },
  { gateNumber: '06', rootX: -20.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: false, liveryColor: 0x0284c7, tailColor: 0x0369a1 },
  // Terminal Eksisting Concourse (Gates 07 - 12)
  { gateNumber: '07', rootX: -6.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: false, liveryColor: 0x6366f1, tailColor: 0x4f46e5 },
  { gateNumber: '08', rootX: 6.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: false, liveryColor: 0x7c3aed, tailColor: 0x6d28d9 },
  { gateNumber: '09', rootX: 18.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: true, liveryColor: 0x0ea5e9, tailColor: 0x0284c7 },
  { gateNumber: '10', rootX: 30.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: false, liveryColor: 0x16a34a, tailColor: 0x15803d },
  { gateNumber: '11', rootX: 42.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: true, isWideBody: true, liveryColor: 0xf59e0b, tailColor: 0xb45309 },
  { gateNumber: '12', rootX: 54.0, rootZ: 16.0, angleRad: 0, length: 10.0, hasAircraft: false, liveryColor: 0xec4899, tailColor: 0xdb2777 },
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
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.5, 700);
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
    this.controls.minDistance = 10;
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
   * Builds the 3 Distinct Terminal Buildings of Sultan Hasanuddin Makassar (WAAA)
   * + 12 Garbarata (Jet Bridges) & Apron Interactive Zone
   */
  private buildTerminalBuildings() {
    const terminalGroup = new THREE.Group();

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.55,
      metalness: 0.2,
    });
    const roofShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0, // Bright metallic white-silver Phinisi roof
      metalness: 0.55,
      roughness: 0.25,
      clearcoat: 0.5,
    });
    const roofAccentMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const curtainGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      transmission: 0.82,
      opacity: 0.38,
      transparent: true,
      roughness: 0.08,
      metalness: 0.15,
      ior: 1.5,
    });

    // =========================================================================
    // 1. TERMINAL UTAMA — Macro Zone 1
    // Located at X: -6 to +54 (W=60), Z: -38 to -12 (D=26), H=14.8m (3 floors)
    // Floor elevations:
    // - Lantai 1: Y = 0.4m (Kedatangan / Ground)
    // - Lantai 2: Y = 4.6m (Terhubung dengan Jembatan Penghubung dari Gedung Parkir)
    // - Lantai 3: Y = 9.6m (Keberangkatan — Sejajar & Terhubung langsung dengan Jalanan)
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

    // 3 Floor Slabs: Lantai 1 (Y=0.4m), Lantai 2 (Y=4.6m), Lantai 3 (Y=9.6m)
    const floorElevations = [0.4, 4.6, 9.6];
    floorElevations.forEach((flY) => {
      const slabGeo = new THREE.BoxGeometry(utamaW, 0.42, utamaD);
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(utamaX, flY, utamaZ);
      slab.receiveShadow = true;
      utamaGroup.add(slab);
    });

    // Interactive Volume for Terminal Utama [macro-1]
    const utamaZoneGeo = new THREE.BoxGeometry(utamaW - 1, utamaH - 0.8, utamaD - 1);
    const utamaZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.55,
      transparent: true,
      opacity: 0.72,
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

    // White Horizontal & Vertical Mullion Grid across the Front Glass Facade
    for (let my = 2.4; my <= utamaH; my += 2.2) {
      const hMullion = new THREE.Mesh(
        new THREE.BoxGeometry(utamaW + 0.2, 0.14, 0.44),
        whiteColumnMat
      );
      hMullion.position.set(utamaX, my, frontWallZ - 0.05);
      utamaGroup.add(hMullion);
    }
    for (let mx = utamaX - utamaW / 2 + 3; mx <= utamaX + utamaW / 2 - 3; mx += 3.0) {
      const vMullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, utamaH, 0.44),
        whiteColumnMat
      );
      vMullion.position.set(mx, utamaH / 2 + 0.4, frontWallZ - 0.05);
      utamaGroup.add(vMullion);
    }

    // 3-Lobe Scalloped Phinisi Wave Roof over Terminal Utama
    const lobeConfigs = [
      { cx: utamaX - 19.5, w: 21, archH: 3.8, frontExtend: 3.2 },
      { cx: utamaX,        w: 22, archH: 5.2, frontExtend: 5.6 },
      { cx: utamaX + 19.5, w: 21, archH: 3.8, frontExtend: 3.2 },
    ];
    lobeConfigs.forEach((lobe) => {
      const archShape = new THREE.Shape();
      archShape.moveTo(-lobe.w / 2, 0);
      archShape.quadraticCurveTo(0, lobe.archH, lobe.w / 2, 0);
      archShape.lineTo(lobe.w / 2, -0.65);
      archShape.quadraticCurveTo(0, lobe.archH - 0.7, -lobe.w / 2, -0.65);
      archShape.closePath();

      const depth = utamaD + lobe.frontExtend + 1.5;
      const archGeo = new THREE.ExtrudeGeometry(archShape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.3,
        bevelThickness: 0.3,
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

    // Lower Structural Support Columns under Lantai 3 Curbside Sidewalk (from Y=0 to Y=9.6m)
    for (let sx = utamaX - utamaW / 2 + 4; sx <= utamaX + utamaW / 2 - 4; sx += 13.0) {
      const subCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.6, lt3Y, 12),
        roofAccentMat
      );
      subCol.position.set(sx, lt3Y / 2, frontWallZ - 3.2);
      subCol.castShadow = true;
      utamaGroup.add(subCol);
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

    // Angled Chamfered Front Lip Plate on Silver Canopy
    const lipPlate = new THREE.Mesh(
      new THREE.BoxGeometry(canopyW, 0.85, 0.45),
      silverCanopyMat
    );
    lipPlate.position.set(utamaX, canopyY + 0.15, frontWallZ - canopyD + 0.2);
    lipPlate.rotation.x = 0.35;
    utamaGroup.add(lipPlate);

    // Row of White Cylindrical Structural Columns on Octagonal Concrete Pedestals ON Lantai 3 Sidewalk
    const colZ = frontWallZ - 4.3; // Z = -42.3 along the Lantai 3 curbside edge
    for (let cx = utamaX - utamaW / 2 + 2; cx <= utamaX + utamaW / 2 - 2; cx += 8.0) {
      // Octagonal Concrete Base Pedestal sitting on Lantai 3 Trotoar (Y = 9.88m)
      const octBaseGeo = new THREE.CylinderGeometry(0.72, 0.84, 1.15, 8);
      const octBase = new THREE.Mesh(octBaseGeo, pedestalMat);
      octBase.position.set(cx, lt3Y + 0.32 + 0.57, colZ);
      octBase.castShadow = true;
      octBase.receiveShadow = true;
      utamaGroup.add(octBase);

      // Dark reveal ring between pedestal and white column
      const collarGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.12, 16);
      const collar = new THREE.Mesh(collarGeo, roofAccentMat);
      collar.position.set(cx, lt3Y + 1.5, colZ);
      utamaGroup.add(collar);

      // White Cylindrical Column rising from Lantai 3 Pedestal up to the Canopy & Phinisi Roof
      const whiteColGeo = new THREE.CylinderGeometry(0.42, 0.46, 4.2, 20);
      const whiteCol = new THREE.Mesh(whiteColGeo, whiteColumnMat);
      whiteCol.position.set(cx, lt3Y + 1.55 + 2.1, colZ);
      whiteCol.castShadow = true;
      utamaGroup.add(whiteCol);

      // Angled V-Strut Capital connecting column to the Scalloped Roof
      const strutGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 12);
      const strut = new THREE.Mesh(strutGeo, silverCanopyMat);
      strut.position.set(cx, canopyY + 0.9, colZ + 0.4);
      strut.rotation.x = 0.25;
      utamaGroup.add(strut);
    }

    // Parked Drop-Off Realistic SUVs / Sedans & Orange Traffic Cones along the Lantai 3 Drop-Off Lane
    const dropOffCars = [
      { x: 0,  color: 0x0f172a, isSUV: true },   // Black SUV
      { x: 11, color: 0xf8fafc, isSUV: true },   // Pearl White MPV/SUV
      { x: 22, color: 0x1e293b, isSUV: false },  // Dark Grey Sedan
      { x: 34, color: 0xe2e8f0, isSUV: false },  // Silver Sedan
      { x: 45, color: 0x0f172a, isSUV: true },   // Black SUV
    ];
    dropOffCars.forEach((car) => {
      const carModel = this.createRealisticCar(car.color, car.isSUV);
      carModel.position.set(car.x, lt3Y + 0.26, frontWallZ - 6.8);
      carModel.rotation.y = Math.PI / 2;
      utamaGroup.add(carModel);
    });

    // Orange Traffic Cones along the Lantai 3 Curbside Edge
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    for (let kx = 5; kx <= 49; kx += 11) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 12), coneMat);
      cone.position.set(kx, lt3Y + 0.6, frontWallZ - 5.3);
      utamaGroup.add(cone);
    }

    // Two 2-Storey Connector Bridges linking Terminal Utama to Terminal Eksisting (framing green courtyard)
    [0, 46].forEach((bridgeX) => {
      const bridgeGeo = new THREE.BoxGeometry(10, 8.2, 10);
      const bridgeMat = utamaZoneMat.clone();
      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.position.set(bridgeX, 4.5, -7);
      bridgeMesh.castShadow = true;
      utamaGroup.add(bridgeMesh);
      this.addZoneMesh('macro-1', bridgeMesh);

      const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.5, 10.6), roofShellMat);
      bridgeRoof.position.set(bridgeX, 8.8, -7);
      utamaGroup.add(bridgeRoof);
    });

    terminalGroup.add(utamaGroup);

    // =========================================================================
    // 2. TERMINAL EKSISTING (2 LANTAI · GATE 07–12) — Macro Zone 2
    // Located at Airside Center-Right: X: -12 to +60 (W=72), Z: -2 to +16 (D=18), H=8.2m (2 floors)
    // =========================================================================
    const eksistingGroup = new THREE.Group();
    const eksX = 24;
    const eksZ = 7;
    const eksW = 72;
    const eksD = 18;
    const eksH = 8.2; // 2 floors of 4.1m

    // 2 Floor Slabs (Lantai 1 & Lantai 2)
    for (let fl = 1; fl <= 2; fl++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(eksW, 0.35, eksD), slabMat);
      slab.position.set(eksX, fl * 4.0 - 3.6, eksZ);
      eksistingGroup.add(slab);
    }

    // Interactive Volume for Terminal Eksisting (2 Lantai) [macro-2]
    const eksZoneGeo = new THREE.BoxGeometry(eksW - 0.8, eksH - 0.6, eksD - 0.8);
    const eksZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.55,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const eksZoneMesh = new THREE.Mesh(eksZoneGeo, eksZoneMat);
    eksZoneMesh.position.set(eksX, eksH / 2 + 0.4, eksZ);
    eksZoneMesh.castShadow = true;
    eksZoneMesh.receiveShadow = true;
    eksistingGroup.add(eksZoneMesh);
    this.addZoneMesh('macro-2', eksZoneMesh);

    // Repeating 6 Vaulted Phinisi Wave Roof Bays over Gates 07 - 12
    for (let i = 0; i < 6; i++) {
      const bayW = eksW / 6;
      const bx = -12 + bayW * (i + 0.5);
      const vaultShape = new THREE.Shape();
      vaultShape.moveTo(-bayW / 2, 0);
      vaultShape.quadraticCurveTo(0, 2.4, bayW / 2, 0);
      vaultShape.lineTo(bayW / 2, -0.45);
      vaultShape.quadraticCurveTo(0, 1.9, -bayW / 2, -0.45);
      vaultShape.closePath();

      const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: eksD + 2,
        bevelEnabled: false,
      });
      const vault = new THREE.Mesh(vaultGeo, roofShellMat);
      vault.position.set(bx, eksH + 0.4, eksZ - (eksD + 2) / 2);
      vault.castShadow = true;
      eksistingGroup.add(vault);
    }

    terminalGroup.add(eksistingGroup);

    // =========================================================================
    // 3. TERMINAL SELATAN (2 LANTAI · GATE 01–06) — Macro Zone 3
    // Features Straight Concourse (X: -48 to -12, Z: -2 to +16) +
    // Iconic Semi-Circular Curved Fan Rotunda at (X: -50, Z: +7, Radius: 15.5m)
    // =========================================================================
    const selatanGroup = new THREE.Group();
    const selStraightX = -30;
    const selStraightW = 36; // X: -48 to -12
    const selD = 18;         // Z: -2 to +16
    const selH = 8.2;        // 2 floors

    // 2 Floor Slabs for Straight Section
    for (let fl = 1; fl <= 2; fl++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(selStraightW, 0.35, selD), slabMat);
      slab.position.set(selStraightX, fl * 4.0 - 3.6, 7);
      selatanGroup.add(slab);

      // Curved Fan Rotunda Floor Slab
      const rotSlab = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, 0.35, 28), slabMat);
      rotSlab.position.set(-50, fl * 4.0 - 3.6, 7);
      selatanGroup.add(rotSlab);
    }

    const selZoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      roughness: 0.25,
      metalness: 0.15,
      transmission: 0.55,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    // Straight Concourse Volume (Gate 05 - 06)
    const selStraightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(selStraightW - 0.5, selH - 0.6, selD - 0.8),
      selZoneMat
    );
    selStraightMesh.position.set(selStraightX, selH / 2 + 0.4, 7);
    selStraightMesh.castShadow = true;
    selStraightMesh.receiveShadow = true;
    selatanGroup.add(selStraightMesh);
    this.addZoneMesh('macro-3', selStraightMesh);

    // Curved Fan Rotunda Volume (Gate 01 - 04)
    const rotundaZoneMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(15.0, 15.0, selH - 0.6, 32),
      selZoneMat.clone()
    );
    rotundaZoneMesh.position.set(-50, selH / 2 + 0.4, 7);
    rotundaZoneMesh.castShadow = true;
    rotundaZoneMesh.receiveShadow = true;
    selatanGroup.add(rotundaZoneMesh);
    this.addZoneMesh('macro-3', rotundaZoneMesh);

    // Rotunda Domed Fan Roof + Central Oculus Skylight (matching reference aerial view)
    const rotundaRoofGeo = new THREE.CylinderGeometry(13.5, 16.2, 1.4, 32);
    const rotundaRoof = new THREE.Mesh(rotundaRoofGeo, roofShellMat);
    rotundaRoof.position.set(-50, selH + 1.0, 7);
    rotundaRoof.castShadow = true;
    selatanGroup.add(rotundaRoof);

    const rotundaSkylight = new THREE.Mesh(
      new THREE.CylinderGeometry(6.0, 7.5, 0.8, 24),
      curtainGlassMat
    );
    rotundaSkylight.position.set(-50, selH + 1.8, 7);
    selatanGroup.add(rotundaSkylight);

    // Radial structural ribs on the curved fan rotunda roof
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const ribGeo = new THREE.BoxGeometry(0.45, 0.5, 15.5);
      const rib = new THREE.Mesh(ribGeo, roofAccentMat);
      rib.position.set(-50 + Math.cos(angle) * 7.2, selH + 1.65, 7 + Math.sin(angle) * 7.2);
      rib.rotation.y = -angle + Math.PI / 2;
      selatanGroup.add(rib);
    }

    // 3 Wave Roof Bays over Straight Section of Terminal Selatan
    for (let i = 0; i < 3; i++) {
      const bayW = selStraightW / 3;
      const bx = -48 + bayW * (i + 0.5);
      const vaultShape = new THREE.Shape();
      vaultShape.moveTo(-bayW / 2, 0);
      vaultShape.quadraticCurveTo(0, 2.4, bayW / 2, 0);
      vaultShape.lineTo(bayW / 2, -0.45);
      vaultShape.quadraticCurveTo(0, 1.9, -bayW / 2, -0.45);
      vaultShape.closePath();

      const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, {
        depth: selD + 2,
        bevelEnabled: false,
      });
      const vault = new THREE.Mesh(vaultGeo, roofShellMat);
      vault.position.set(bx, selH + 0.4, 7 - (selD + 2) / 2);
      vault.castShadow = true;
      selatanGroup.add(vault);
    }

    terminalGroup.add(selatanGroup);

    // =========================================================================
    // 4. APRON & 12 GARBARATA (JET BRIDGES GATE 01 – GATE 12) — Macro Zone 4
    // =========================================================================
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.5,
      roughness: 0.3,
    });
    const jetGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa78bfa,
      transmission: 0.6,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2,
      metalness: 0.2,
    });

    SULTAN_HASANUDDIN_GATES.forEach((gate) => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(gate.rootX, 0, gate.rootZ);
      bridgeGroup.rotation.y = gate.angleRad;

      // Fixed Rotunda Node at terminal facade
      const rootNode = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.2, 16), jetMat);
      rootNode.position.set(0, 4.6, 0);
      rootNode.castShadow = true;
      bridgeGroup.add(rootNode);

      // Telescopic Garbarata Tunnel (Interactive for Macro Zone 4)
      const tunnelGeo = new THREE.BoxGeometry(2.3, 2.6, gate.length);
      const tunnelMesh = new THREE.Mesh(tunnelGeo, jetGlassMat.clone());
      tunnelMesh.position.set(0, 4.6, gate.length / 2);
      tunnelMesh.castShadow = true;
      bridgeGroup.add(tunnelMesh);
      this.addZoneMesh('macro-4', tunnelMesh);

      // Steel Roof & Floor Frame on Garbarata
      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, gate.length), jetMat);
      roofCap.position.set(0, 6.0, gate.length / 2);
      bridgeGroup.add(roofCap);

      // Hydraulic Wheel Bogie Pylon at end of Garbarata
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.6, 10), roofAccentMat);
      pylon.position.set(0, 2.3, gate.length - 1.2);
      bridgeGroup.add(pylon);

      // Aircraft Docking Cab Head
      const cabHead = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.0, 14), jetMat);
      cabHead.position.set(0, 4.5, gate.length);
      cabHead.castShadow = true;
      bridgeGroup.add(cabHead);

      // Gate Number Sign Badge above each Garbarata
      const gateBadge = this.createLabelSprite(
        `G${gate.gateNumber}`,
        '#0f172a',
        '#38bdf8',
        6.5,
        2.2
      );
      gateBadge.position.set(0, 7.6, gate.length * 0.45);
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
    tuguLabel.position.set(10, 15.8, -76);
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
        gate.liveryColor || 0x0284c7,
        gate.tailColor || 0x0369a1,
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
   * Multi-part Procedural Commercial Jetliner (Narrow-body B737/A320 & Wide-body A330/B777)
   */
  private createProceduralAirliner(
    accentColorHex: number,
    tailColorHex: number,
    isWideBody: boolean
  ): THREE.Group {
    const plane = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.35,
      roughness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColorHex,
      metalness: 0.3,
      roughness: 0.3,
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: tailColorHex,
      metalness: 0.35,
      roughness: 0.28,
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

    // Livery cheatline stripe along fuselage
    const stripeGeo = new THREE.BoxGeometry(2.68, 0.32, 16.5);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.set(0, 2.5, 0.4);
    plane.add(stripe);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(1.3, 3.2, 16);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 2.4, 10.6);
    plane.add(nose);

    // Cockpit windows
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.5, 1.2);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 2.9, 9.6);
    cockpit.rotation.x = -0.3;
    plane.add(cockpit);

    // 2. Main Swept Wings
    const wingGeo = new THREE.BoxGeometry(19.5, 0.22, 3.8);
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.set(0, 2.1, 0.5);
    wings.castShadow = true;
    plane.add(wings);

    // Wingtips (Winglets)
    const wingletGeo = new THREE.BoxGeometry(0.18, 1.15, 0.9);
    const leftWinglet = new THREE.Mesh(wingletGeo, accentMat);
    leftWinglet.position.set(-9.75, 2.65, 0.5);
    plane.add(leftWinglet);

    const rightWinglet = new THREE.Mesh(wingletGeo, accentMat);
    rightWinglet.position.set(9.75, 2.65, 0.5);
    plane.add(rightWinglet);

    // 3. Jet Engines (Turbofans under each wing)
    const engineGeo = new THREE.CylinderGeometry(0.72, 0.72, 3.2, 14);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });

    const leftEngine = new THREE.Mesh(engineGeo, engineMat);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.position.set(-4.6, 1.3, 1.2);
    plane.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeo, engineMat);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.position.set(4.6, 1.3, 1.2);
    plane.add(rightEngine);

    // 4. Vertical Stabilizer (Tailfin)
    const tailGeo = new THREE.BoxGeometry(0.24, 4.4, 3.4);
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 4.3, -8.0);
    tail.rotation.x = -0.35;
    plane.add(tail);

    // Horizontal Stabilizers
    const hStabGeo = new THREE.BoxGeometry(6.8, 0.16, 1.9);
    const hStab = new THREE.Mesh(hStabGeo, bodyMat);
    hStab.position.set(0, 2.7, -8.5);
    plane.add(hStab);

    const s = isWideBody ? 1.12 : 0.88;
    plane.scale.set(s, s, s);
    return plane;
  }

  /**
   * Helper: Creates a Realistic 3D Automobile Mockup (Sedan / SUV) with
   * Sculpted Chassis, Cabin Greenhouse, Tinted Windows, 4 Wheels + Alloy Rims,
   * Front Grille, LED Headlights & Red Taillights (Oriented with front towards +Z)
   */
  private createRealisticCar(colorHex: number, isSUV: boolean = false): THREE.Group {
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

    // 3. Four 3D Wheels with Tires & Silver Alloy Rims
    const wheelPositions = [
      [-0.86, 0.33, 1.24],
      [0.86, 0.33, 1.24],
      [-0.86, 0.33, -1.24],
      [0.86, 0.33, -1.24],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, wy, wz);
      car.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      car.add(rim);
    });

    // 4. Front LED Headlights & Rear Red Taillights
    [-0.62, 0.62].forEach((lx) => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), headlightMat);
      headlight.position.set(lx, 0.58, 2.01);
      car.add(headlight);

      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.08), taillightMat);
      taillight.position.set(lx, 0.62, -2.01);
      car.add(taillight);
    });

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

    // Create the Tapered Rounded-Wedge / Teardrop Footprint matching the satellite photo:
    const createWedgeShape = (scale: number = 1.0) => {
      const s = new THREE.Shape();
      const fw = 17.5 * scale;
      const rw = 8.5 * scale;
      const fy = -12.5 * scale;
      const ry = 15.5 * scale;

      s.moveTo(-fw + 3 * scale, fy);
      s.lineTo(fw - 3 * scale, fy);
      s.quadraticCurveTo(fw + 1.5 * scale, fy, fw, fy + 4.5 * scale);
      s.lineTo(rw + 1.5 * scale, ry - 4.0 * scale);
      s.quadraticCurveTo(rw, ry, 0, ry + 1.2 * scale);
      s.quadraticCurveTo(-rw, ry, -rw - 1.5 * scale, ry - 4.0 * scale);
      s.lineTo(-fw, fy + 4.5 * scale);
      s.quadraticCurveTo(-fw - 1.5 * scale, fy, -fw + 3 * scale, fy);
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
      lvlBadge.position.set(19.5, yPos + 1.0, 6 - lvl * 1.5);
      parkGroup.add(lvlBadge);

      if (lvl < 3) {
        const colRows = [
          { lz: 9, halfSpan: 13 },
          { lz: 1, halfSpan: 10.5 },
          { lz: -8, halfSpan: 7.5 },
        ];
        colRows.forEach((row) => {
          for (let cx = -row.halfSpan; cx <= row.halfSpan; cx += row.halfSpan) {
            const col = new THREE.Mesh(
              new THREE.CylinderGeometry(0.36, 0.36, 2.8, 10),
              darkConcreteMat
            );
            col.position.set(cx, yPos + 1.4, row.lz);
            col.castShadow = true;
            parkGroup.add(col);
          }
        });
      }

      // Parked Realistic 3D Cars on Basement, Lantai 1, Lantai 2, and Lantai 3
      const carZRows = [8.2, 1.8, -5.5];
      carZRows.forEach((cz, rIdx) => {
        const maxW = cz > 5 ? 11 : cz > 0 ? 8.5 : 5.5;
        for (let cx = -maxW; cx <= maxW; cx += 5.2) {
          if ((Math.abs(Math.round(cx)) + lvl + rIdx) % 2 === 0) continue;
          const colorHex = carColors[Math.abs(Math.round(cx + lvl + rIdx)) % carColors.length];
          const carModel = this.createRealisticCar(colorHex, (lvl + rIdx) % 2 === 0);
          carModel.position.set(cx, yPos + 0.4, cz);
          parkGroup.add(carModel);
        }
      });
    }

    // Central Rooftop Atrium Skylight Void on Lantai 3
    const skylightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.65, 8.5),
      darkConcreteMat
    );
    skylightFrame.position.set(0, 3 * 2.8 + 0.55, 2.0);
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
      new THREE.BoxGeometry(9.8, 0.75, 6.8),
      skylightGlassMat
    );
    skylightGlass.position.set(0, 3 * 2.8 + 0.62, 2.0);
    parkGroup.add(skylightGlass);

    // Circular Helical Access Ramp on the Left/East Flank of Gedung Parkir
    const helixGeo = new THREE.CylinderGeometry(5.2, 5.2, 9.2, 24, 1, true);
    const helixRamp = new THREE.Mesh(helixGeo, darkConcreteMat);
    helixRamp.position.set(17.5, 4.6, 4.0);
    parkGroup.add(helixRamp);

    const helixCore = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 9.6, 16), barrierMat);
    helixCore.position.set(17.5, 4.8, 4.0);
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
    // Spans from Gedung Parkir Front (Z = -55.5) to Terminal Utama Lantai 2 (Z = -38.0)
    // At elevation Y = 4.6m (Lantai 2), passing UNDER the Elevated Jalanan (Y = 9.6m)
    // =========================================================================
    const bridgeWorldX = 38;
    const bridgeStartZ = -55.5;
    const bridgeEndZ = -38.0;
    const bridgeSpanD = bridgeEndZ - bridgeStartZ; // 17.5m
    const bridgeMidZ = (bridgeStartZ + bridgeEndZ) / 2; // -46.75

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

    for (const sz of [-53.0, -40.5]) {
      const sbCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.42, 4.6, 12),
        darkConcreteMat
      );
      sbCol.position.set(bridgeWorldX, 2.3, sz);
      skybridgeGroup.add(sbCol);
    }

    landsideGroup.add(skybridgeGroup);

    // =========================================================================
    // 3. JALANAN SEJAJAR & TERHUBUNG DENGAN LT. 3 TERMINAL UTAMA (Y = 9.6m)
    // + JALANAN TANJAKAN ASLI (Continuous 3D Swept Curved & Inclined Viaduct Ramps)
    // Passes OVER the Jembatan Penghubung (Y = 7.05m) at Y = 9.6m, flush with Lt. 3
    // Terminal Utama Curbside Sidewalk (Z = -43.6), and smoothly curves & slopes down
    // on both left (+X) and right (-X) sides into the Landside U-Loop.
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
    const poleMetalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.75,
      roughness: 0.25,
    });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const lt3RoadY = 9.6;   // Flush with Lantai 3 Terminal Utama (Y = 9.6m)
    const groundRoadY = 0.25;
    const roadWidth = 8.4;  // Z: -43.4 to -51.8 along the front boulevard (Z center = -47.6)
    const deckThick = 0.55;

    // Define 3D Control Points for the Continuous Loop (Front Lt.3 Boulevard + Left/Right Curved Ramps + Rear Loop)
    const loopControlPts = [
      // Front Boulevard along Lt. 3 Terminal Utama (Z = -47.6, Y = 9.6m)
      new THREE.Vector3(-8,  lt3RoadY, -47.6),
      new THREE.Vector3(8,   lt3RoadY, -47.6),
      new THREE.Vector3(24,  lt3RoadY, -47.6),
      new THREE.Vector3(40,  lt3RoadY, -47.6),
      new THREE.Vector3(56,  lt3RoadY, -47.6),
      // Left (+X) Curved & Inclined Highway Ramp descending smoothly from Y = 9.6m to Y = 0.25m
      new THREE.Vector3(67,  lt3RoadY * 0.82, -51.0),
      new THREE.Vector3(73,  lt3RoadY * 0.52, -62.0),
      new THREE.Vector3(73,  lt3RoadY * 0.20, -77.0),
      new THREE.Vector3(65,  groundRoadY,     -90.0),
      // Rear Landside Horseshoe U-Loop at ground level (Y = 0.25m)
      new THREE.Vector3(48,  groundRoadY,     -97.0),
      new THREE.Vector3(24,  groundRoadY,     -98.0),
      new THREE.Vector3(0,   groundRoadY,     -97.0),
      // Right (-X) Curved & Inclined Highway Ramp ascending smoothly from Y = 0.25m to Y = 9.6m
      new THREE.Vector3(-17, groundRoadY,     -90.0),
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
        // Smooth cosine interpolation based on Z between -47.6 (top of ramp) and -90.0 (bottom of ramp)
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

      // Horizontal normal in X-Z plane (for clockwise loop in X-Z: +nx/+nz points outward away from loop center)
      const hLen = Math.hypot(tang.x, tang.z) || 1;
      const tx = tang.x / hLen;
      const tz = tang.z / hLen;
      // Since loop goes +X along Z=-47.6 (tx=1, tz=0), inward toward Terminal Utama (+Z) is (0, +1) = (-tz, tx)
      // and outward toward Gedung Parkir (-Z) is (0, -1) = (tz, -tx)
      sampledNormals.push({ nx: tz, nz: -tx });
    }

    // 3A. Build Continuous 3D Swept Asphalt Roadway Viaduct & Tanjakan Ramp Deck
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
    // (Leaves the Terminal Utama Lantai 3 Curbside front X: -6..+54 open so Jalanan connects directly to Lt. 3!)
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

    // 3E. White Dashed Centerlines, Transverse Speed Strips, Streetlights & Graduated Viaduct Piers
    for (let i = 0; i < totalSamples; i++) {
      const pt = sampledPts[i];
      const nextPt = sampledPts[(i + 1) % totalSamples];
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

      // Graduated Concrete Viaduct Piers & Crosshead Beams under Elevated Boulevard & Inclined Tanjakan Ramps
      if (pt.y > 1.2 && i % 10 === 0) {
        // Avoid placing a central pier directly inside the Jembatan Penghubung corridor (X = 38, Z = -47.6)
        if (Math.abs(pt.x - bridgeWorldX) > 4.2 || pt.z < -51.0) {
          const pierH = pt.y - deckThick;
          const pier = new THREE.Mesh(
            new THREE.CylinderGeometry(0.58, 0.7, pierH, 12),
            darkConcreteMat
          );
          pier.position.set(pt.x, pierH / 2, pt.z);
          pier.castShadow = true;
          roadSystemGroup.add(pier);

          // Concrete Crosshead Beam supporting the underside of the viaduct/ramp
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

    // Yellow Transverse Speed-Calming Rumble Strips across the Lt. 3 Boulevard (as in Top Photo)
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

    // Realistic 3D Cars driving along the Elevated Lt. 3 Boulevard AND up/down the Inclined Tanjakan Ramps
    const trafficStationIndices = [8, 20, 34, 46, 62, 78, 125, 175, 198];
    trafficStationIndices.forEach((stIdx, idx) => {
      const i = stIdx % totalSamples;
      const pt = sampledPts[i];
      const nextPt = sampledPts[(i + 2) % totalSamples];
      const norm = sampledNormals[i];
      const laneSide = idx % 2 === 0 ? -1.75 : 1.75;

      const carModel = this.createRealisticCar(
        carColors[(idx + 1) % carColors.length],
        idx % 2 === 0
      );
      carModel.position.set(
        pt.x + norm.nx * laneSide,
        pt.y + 0.02,
        pt.z + norm.nz * laneSide
      );
      // Orient car along the exact 3D tangent & pitch slope of the road/ramp
      carModel.lookAt(
        nextPt.x + norm.nx * laneSide,
        nextPt.y + 0.02,
        nextPt.z + norm.nz * laneSide
      );
      roadSystemGroup.add(carModel);
    });

    // Central North-South Divider Road between Gedung Parkir (X=42) and Tugu Sultan Hasanuddin (X=10)
    const centerConnectorRoad = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.24, 42),
      roadAsphaltMat
    );
    centerConnectorRoad.position.set(23.5, 0.14, -74);
    roadSystemGroup.add(centerConnectorRoad);

    landsideGroup.add(roadSystemGroup);

    // =========================================================================
    // 4. PATUNG SULTAN HASANUDDIN MONUMENT & PARK (Matching Reference Photo)
    // Positioned at World X = 10, Z = -76 (with Terminal Utama in the background)
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
    tuguGroup.position.set(10, 0.2, -76);

    const ringRoadGeo = new THREE.CylinderGeometry(14.8, 14.8, 0.22, 40);
    const ringRoad = new THREE.Mesh(ringRoadGeo, roadAsphaltMat);
    ringRoad.position.y = 0.05;
    ringRoad.receiveShadow = true;
    tuguGroup.add(ringRoad);

    const parkLawnMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
    });
    const lawnGeo = new THREE.CylinderGeometry(10.8, 11.2, 0.38, 40);
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
   * IP Speaker Nodes in 3D Space
   */
  private buildSpeakerNodes() {
    const speakerGroup = new THREE.Group();

    this.speakers.forEach((speaker) => {
      const node = new THREE.Group();
      node.position.set(...speaker.position);
      node.userData = { type: 'speaker', speakerId: speaker.id };

      const isHorn = speaker.macroZoneId === 'macro-5' || speaker.macroZoneId === 'macro-4';

      if (isHorn) {
        const hornGeo = new THREE.ConeGeometry(0.7, 1.2, 12);
        const hornMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.6,
          roughness: 0.3,
        });
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.rotation.x = Math.PI / 2;
        node.add(horn);

        const bracketGeo = new THREE.BoxGeometry(0.2, 0.8, 0.4);
        const bracket = new THREE.Mesh(bracketGeo, hornMat);
        bracket.position.set(0, 0.5, -0.4);
        node.add(bracket);
      } else {
        const discGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.15, 16);
        const discMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.1,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        node.add(disc);

        const grilleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16);
        const grilleMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.7,
        });
        const grille = new THREE.Mesh(grilleGeo, grilleMat);
        node.add(grille);
      }

      const ledRingGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 16);
      const ledColor = this.getSpeakerColor(speaker.status);
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const ledRing = new THREE.Mesh(ledRingGeo, ledMat);
      ledRing.rotation.x = Math.PI / 2;
      node.add(ledRing);

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

      const proxyGeo = new THREE.SphereGeometry(1.3, 8, 8);
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
        // Return to All-Terminal Sultan Hasanuddin Overview
        this.targetCameraPos = new THREE.Vector3(0, 82, 118);
        this.targetControlsTarget = new THREE.Vector3(-2, 2, -4);
      } else {
        switch (zoneId) {
          case 'macro-1': // Terminal Utama (3 Lantai)
            this.targetControlsTarget = new THREE.Vector3(24, 6, -25);
            this.targetCameraPos = new THREE.Vector3(24, 42, 24);
            break;
          case 'macro-2': // Terminal Eksisting (2 Lantai · Gate 07-12)
            this.targetControlsTarget = new THREE.Vector3(24, 5, 7);
            this.targetCameraPos = new THREE.Vector3(24, 38, 56);
            break;
          case 'macro-3': // Terminal Selatan (2 Lantai · Gate 01-06)
            this.targetControlsTarget = new THREE.Vector3(-42, 5, 7);
            this.targetCameraPos = new THREE.Vector3(-46, 38, 58);
            break;
          case 'macro-4': // Apron, 12 Garbarata & Pesawat Parkir
            this.targetControlsTarget = new THREE.Vector3(-4, 4, 26);
            this.targetCameraPos = new THREE.Vector3(-4, 46, 88);
            break;
          case 'macro-5': // Gedung Parkir, Jalanan U-Loop & Depan Terminal Utama (Landside Mockup View)
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
            mat.color.setHex(0xef4444);
            mat.opacity = 0.88;
            mat.roughness = 0.15;
          } else if (this.activeSimZoneIds.has(zone.id)) {
            mat.color.setHex(0xf59e0b);
            mat.opacity = 0.8;
            mat.roughness = 0.25;
          } else {
            mat.color.setHex(0x10b981);
            mat.opacity = 0.55;
            mat.roughness = 0.35;
          }
        } else if (isSelected) {
          mat.color.setHex(0x38bdf8);
          mat.opacity = 0.92;
          mat.roughness = 0.15;
        } else {
          mat.color.set(zone.color);
          mat.opacity = zone.id === 'macro-4' ? 0.38 : 0.72;
          mat.roughness = 0.3;
        }
      });
    });
  }

  /**
   * Camera Presets for Sultan Hasanuddin Makassar (WAAA):
   * Semua Terminal, Terminal Utama, Depan Terminal & Jalanan, Terminal Eksisting,
   * Terminal Selatan, Apron & Garbarata, Gedung Parkir, ATC Tower
   */
  public setCameraPreset(preset: CameraPresetType) {
    switch (preset) {
      case 'overview':
        this.selectZone(null, true, true);
        break;
      case 'utama':
      case 'dom_dep':
        this.selectZone('macro-1', true, true);
        break;
      case 'curbside':
        // Matches Top Photo: "Tampilan di depan terminal Utama dan Jalanan" (Lantai 3 Drop-Off Y = 9.6m)
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(18, 11.2, -38);
        this.targetCameraPos = new THREE.Vector3(50, 14.5, -62);
        break;
      case 'eksisting':
      case 'dom_arr':
        this.selectZone('macro-2', true, true);
        break;
      case 'selatan':
      case 'intl_dep':
        this.selectZone('macro-3', true, true);
        break;
      case 'apron':
      case 'intl_arr':
        this.selectZone('macro-4', true, true);
        break;
      case 'parking':
        this.selectZone('macro-5', true, true);
        break;
      case 'dom_all':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(24, 5, -10);
        this.targetCameraPos = new THREE.Vector3(24, 56, 65);
        break;
      case 'intl_all':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(-42, 5, 10);
        this.targetCameraPos = new THREE.Vector3(-45, 50, 72);
        break;
      case 'tower':
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.updateHighlightMaterials();
        this.targetControlsTarget = new THREE.Vector3(78, 34, -22);
        this.targetCameraPos = new THREE.Vector3(44, 48, 14);
        break;
    }
  }

  /**
   * Main Animation Loop (60 FPS)
   */
  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.radarDome) {
      this.radarDome.rotation.y += delta * 1.8;
    }

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
