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
  | 'lantai2'
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
  private lantai2Meshes: THREE.Object3D[] = [];
  private isLantai1Cutaway: boolean = false;
  private isLantai2Cutaway: boolean = false;
  private activeCategoryFilter: SpeakerCategory | 'all' = 'all';
  private speakerBadgeTextures: Map<SpeakerCategory, THREE.CanvasTexture> = new Map();

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
   * Builds the 3 Distinct Terminal Buildings of Sultan Hasanuddin Makassar (WAAA)
   * with:
   * - Full Lantai 1 (Y = 0.4m) 3D Architectural Floor Plan Mockup (Baggage Claim 9 Carousels, BHS Hall, Left & Right Wings)
   * - Full Lantai 2 (Y = 4.6m) 3D Architectural Floor Plan Mockup
   * - Solid Opaque Sweeping Phinisi Wave & Vaulted Roofs for "Semua Terminal" view
   * - Clean 12 Garbarata (Jet Bridges) with fixed single-arm Gate 01
   */
  private buildTerminalBuildings() {
    const terminalGroup = new THREE.Group();
    this.upperRoofMeshes = [];
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
    };

    // Helper to add a 3D white square structural column on Lantai 1 (matching square pillars in image_6015f581.png)
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
    };

    // Helper to build a 3D Baggage Claim Carousel (Conveyor Sabuk Bagasi Hitam dengan Lis Putih)
    // matching the 9 carousels in image_6015f581.png
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

    const addL1BaggageCarousel = (
      parent: THREE.Group,
      cx: number,
      variant: 'L_left' | 'T_loop' | 'L_right',
      hasGreenDomeBadge: boolean = false
    ) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, 0.64, 0);

      // Main North-South conveyor leg extending from rear BHS wall (Z = -12.2) to Z = -19.6
      const legLen = 7.4;
      const legZ = -15.9;
      const legRim = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, legLen + 0.3), beltRimMat);
      legRim.position.set(0, 0.18, legZ);
      legRim.castShadow = true;
      legRim.receiveShadow = true;
      cGroup.add(legRim);

      const legBelt = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, legLen - 0.15), beltRubberMat);
      legBelt.position.set(0, 0.21, legZ);
      cGroup.add(legBelt);

      // Rounded Southern Tip of the Carousel at Z = -19.6
      const tipRim = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.36, 20), beltRimMat);
      tipRim.position.set(0, 0.18, -19.6);
      cGroup.add(tipRim);
      const tipBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.59, 0.59, 0.42, 20), beltRubberMat);
      tipBelt.position.set(0, 0.21, -19.6);
      cGroup.add(tipBelt);

      // Upper horizontal bar along the BHS partition wall (Z = -12.6) forming the L or T shape
      const headW = variant === 'T_loop' ? 4.8 : 3.6;
      const headOffsetX =
        variant === 'L_left' ? -1.0 : variant === 'L_right' ? 1.0 : 0;

      const headRim = new THREE.Mesh(new THREE.BoxGeometry(headW, 0.36, 1.45), beltRimMat);
      headRim.position.set(headOffsetX, 0.18, -12.6);
      headRim.castShadow = true;
      cGroup.add(headRim);

      const headBelt = new THREE.Mesh(new THREE.BoxGeometry(headW - 0.45, 0.42, 0.95), beltRubberMat);
      headBelt.position.set(headOffsetX, 0.21, -12.6);
      cGroup.add(headBelt);

      // Pass-through tunnel hatch on the BHS wall at Z = -12.0
      const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.15, 0.52), beltRubberMat);
      hatch.position.set(0, 0.65, -12.0);
      cGroup.add(hatch);

      // Structural square white columns flanking the carousel (as seen in image_6015f581.png)
      addL1SquareColumn(cGroup, 1.65, -16.8, 0.52, 2.5);
      addL1SquareColumn(cGroup, -1.55, -15.2, 0.48, 2.5);

      // Optional Green Circular Dome Camera / Acoustic Sensor Badge (on Carousels 1 & 2 as in image_6015f581.png)
      if (hasGreenDomeBadge) {
        const badgeGroup = new THREE.Group();
        badgeGroup.position.set(2.1, 0.5, -19.2);

        const greenDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(1.35, 1.35, 0.22, 24),
          greenNodeMat
        );
        badgeGroup.add(greenDisc);

        const whiteRing = new THREE.Mesh(
          new THREE.RingGeometry(1.18, 1.35, 24),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        whiteRing.rotation.x = -Math.PI / 2;
        whiteRing.position.y = 0.12;
        badgeGroup.add(whiteRing);

        // 3D White Dome Housing & Dark Lens inside the Green Circle
        const domeBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.85, 0.35, 18),
          beltRimMat
        );
        domeBase.position.y = 0.26;
        badgeGroup.add(domeBase);

        const domeSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.68, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          beltRimMat
        );
        domeSphere.position.y = 0.42;
        badgeGroup.add(domeSphere);

        const darkLens = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 14, 14),
          beltRubberMat
        );
        darkLens.position.set(0, 0.62, -0.35);
        badgeGroup.add(darkLens);

        cGroup.add(badgeGroup);
      }

      parent.add(cGroup);
    };

    // =========================================================================
    // LANTAI 1 (Y = 0.4m) ARCHITECTURAL MOCKUP — TERMINAL UTAMA, EKSISTING & SELATAN
    // Faithfully matches /public/assets/aistudio/image_6015f581.png
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

    // 1D. Middle Baggage Claim Hall (Z: -22.2 to -12.0) — 9 Baggage Claim Carousels (Conveyor Sabuk Bagasi)
    // Full-depth vertical partition wall at X = 36.8 separating Carousels 1 & 2 (Left/Intl) from Carousels 3–9
    addL1Wall(lantai1Group, 36.8, -17.1, 0.38, 10.2, 2.40);
    // Continuous rear BHS partition wall at Z = -12.0
    addL1Wall(lantai1Group, 21.0, -12.0, 64.0, 0.42, 2.45);

    // Build all 9 Baggage Claim Carousels from Left (+X) to Right (-X) matching image_6015f581.png
    const carouselConfigs: { x: number; variant: 'L_left' | 'T_loop' | 'L_right'; greenDome: boolean }[] = [
      { x: 48.6, variant: 'L_left',  greenDome: true },  // Carousel 1 (with green dome badge)
      { x: 41.2, variant: 'L_left',  greenDome: true },  // Carousel 2 (with green dome badge)
      { x: 31.8, variant: 'T_loop',  greenDome: false }, // Carousel 3 (T/U-shaped loop)
      { x: 23.5, variant: 'T_loop',  greenDome: false }, // Carousel 4 (T/U-shaped loop)
      { x: 15.6, variant: 'L_right', greenDome: false }, // Carousel 5
      { x: 9.0,  variant: 'L_right', greenDome: false }, // Carousel 6
      { x: 2.5,  variant: 'L_right', greenDome: false }, // Carousel 7
      { x: -3.6, variant: 'L_right', greenDome: false }, // Carousel 8
      { x: -9.2, variant: 'L_right', greenDome: false }, // Carousel 9
    ];
    carouselConfigs.forEach((cc) => {
      addL1BaggageCarousel(lantai1Group, cc.x, cc.variant, cc.greenDome);
    });

    // Additional row of square white columns along Z = -20.8 in front of the carousels
    for (let cx = -8.0; cx <= 50.0; cx += 5.8) {
      addL1SquareColumn(lantai1Group, cx, -20.8, 0.50, 2.5);
    }

    // 1E. Top/Rear Dark-Grey BHS (Baggage Handling & Make-Up Hall, Z: -12.0 to +3.8)
    // Spans behind the Baggage Claim wall into the ground floor of Terminal Eksisting
    const bhsHallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(63.0, 0.16, 15.8),
      bhsDarkFloorMat
    );
    bhsHallFloor.position.set(21.0, 0.57, -4.1);
    bhsHallFloor.receiveShadow = true;
    lantai1Group.add(bhsHallFloor);

    // Side walls framing the Dark-Grey BHS Hall (Left at X = +52.4, Right at X = -10.4)
    addL1Wall(lantai1Group, 52.4, -4.1, 0.42, 15.8, 2.45);
    addL1Wall(lantai1Group, -10.4, -4.1, 0.42, 15.8, 2.45);

    // Regular 3-Row x 13-Column Grid of White Square Structural Columns inside the Dark-Grey BHS Hall
    // + 4th Perimeter Row of 14 White Square Columns along the rear airside edge (Z = +3.6)
    for (let bx = -7.5; bx <= 49.5; bx += 4.75) {
      addL1SquareColumn(lantai1Group, bx, -9.2, 0.54, 2.55);
      addL1SquareColumn(lantai1Group, bx, -4.8, 0.54, 2.55);
      addL1SquareColumn(lantai1Group, bx, -0.4, 0.54, 2.55);
      addL1SquareColumn(lantai1Group, bx, 3.6, 0.56, 2.55);
    }

    // 5 White-Walled BHS Control & Staging Room Enclosures inside the Dark-Grey Hall (matching image_6015f581.png)
    const addBhsRoomBox = (rx: number, rz: number, rw: number, rd: number, subDivs: number = 1) => {
      addL1Wall(lantai1Group, rx, rz - rd / 2, rw, 0.28, 2.25);
      addL1Wall(lantai1Group, rx, rz + rd / 2, rw, 0.28, 2.25);
      addL1Wall(lantai1Group, rx - rw / 2, rz, 0.28, rd, 2.25);
      addL1Wall(lantai1Group, rx + rw / 2, rz, 0.28, rd, 2.25);
      for (let s = 1; s < subDivs; s++) {
        const divX = rx - rw / 2 + (rw / subDivs) * s;
        addL1Wall(lantai1Group, divX, rz, 0.24, rd, 2.25);
      }
    };
    addBhsRoomBox(46.8, -6.2, 3.2, 3.2, 1);  // 1. Far-left square BHS room
    addBhsRoomBox(31.5, -6.4, 15.2, 3.0, 3); // 2. Left-center elongated multi-compartment BHS room
    addBhsRoomBox(12.2, -6.4, 5.4, 3.2, 2);  // 3. Center-right partitioned BHS room
    addBhsRoomBox(5.2, -6.6, 3.0, 3.6, 1);   // 4. Right-center rectangular BHS room
    addBhsRoomBox(-3.8, -5.8, 3.2, 3.2, 1);  // 5. Far-right square BHS room

    // Two Dark-Grey Airside Driveway Links (at X = +39.5 and X = +2.5, Z: +3.8 to +10.2)
    // + Horizontal Airside Service Road Strip (X: -16 to +58, Z: +10.2 to +11.6)
    // + Bright White Rectangular Courtyard Slab between them (matching top-center of image_6015f581.png)
    [39.5, 2.5].forEach((linkX) => {
      const linkDrive = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.16, 6.6),
        bhsDarkFloorMat
      );
      linkDrive.position.set(linkX, 0.57, 7.0);
      lantai1Group.add(linkDrive);
    });
    const rearServiceStrip = new THREE.Mesh(
      new THREE.BoxGeometry(74.0, 0.16, 1.5),
      bhsDarkFloorMat
    );
    rearServiceStrip.position.set(21.0, 0.57, 10.6);
    lantai1Group.add(rearServiceStrip);

    const centralWhiteCourtyard = new THREE.Mesh(
      new THREE.BoxGeometry(33.8, 0.15, 6.0),
      whiteFloorMat
    );
    centralWhiteCourtyard.position.set(21.0, 0.56, 6.8);
    lantai1Group.add(centralWhiteCourtyard);

    // 1F. Top-Left L-Wing Extension (Terminal Eksisting East Wing Lantai 1, X: +52.5 to +68, Z: -10 to +14.5)
    const leftExtCorridorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.15, 22.0),
      l1TileFloorMat
    );
    leftExtCorridorFloor.position.set(56.2, 0.56, -1.0);
    lantai1Group.add(leftExtCorridorFloor);

    const leftTopLWingFloor = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 0.15, 7.5),
      l1TileFloorMat
    );
    leftTopLWingFloor.position.set(60.2, 0.56, 10.5);
    lantai1Group.add(leftTopLWingFloor);

    addL1Wall(lantai1Group, 59.8, -1.0, 0.38, 22.0, 2.40);
    addL1Wall(lantai1Group, 60.2, 14.2, 15.5, 0.38, 2.40);
    addL1Wall(lantai1Group, 67.8, 10.5, 0.38, 7.5, 2.40);
    addL1Wall(lantai1Group, 60.2, 6.8, 15.5, 0.35, 2.35);
    for (let lx = 55.0; lx <= 65.5; lx += 3.2) {
      addL1Wall(lantai1Group, lx, 10.5, 0.28, 7.2, 2.30);
    }

    // 1G. Top-Right Long L-Shaped Corridor & Terminal Selatan Lantai 1 Extension (X: -10.5 to -64, Z: -10 to +15.5)
    const rightFlankCorridorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.15, 22.0),
      l1TileFloorMat
    );
    rightFlankCorridorFloor.position.set(-13.8, 0.56, -1.0);
    lantai1Group.add(rightFlankCorridorFloor);

    // Protruding Side Room Cluster on the Right Flank (X: -17.2 to -20.8, Z: -3.2 to +2.2)
    const rightSideRoomFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.15, 5.6),
      l1TileFloorMat
    );
    rightSideRoomFloor.position.set(-18.8, 0.56, -0.5);
    lantai1Group.add(rightSideRoomFloor);
    addBhsRoomBox(-18.8, -0.5, 4.0, 5.4, 2);

    // Long Horizontal Walled Corridor extending across Terminal Selatan Lantai 1 (X: -14 to -63, Z: +6.8 to +11.2)
    const rightLongCorridorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(50.0, 0.15, 4.6),
      l1TileFloorMat
    );
    rightLongCorridorFloor.position.set(-38.5, 0.56, 9.0);
    lantai1Group.add(rightLongCorridorFloor);
    addL1Wall(lantai1Group, -38.5, 6.7, 50.0, 0.38, 2.40);
    addL1Wall(lantai1Group, -38.5, 11.3, 50.0, 0.38, 2.40);

    // Upward L-Turn at the Far-Right End of the Corridor (X: -59.5 to -63.8, Z: +6.8 to +15.6)
    const rightTipFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.15, 8.8),
      l1TileFloorMat
    );
    rightTipFloor.position.set(-61.5, 0.56, 11.2);
    lantai1Group.add(rightTipFloor);
    addL1Wall(lantai1Group, -63.8, 11.2, 0.38, 8.8, 2.40);
    addL1Wall(lantai1Group, -59.2, 13.4, 0.38, 4.4, 2.40);
    addL1Wall(lantai1Group, -61.5, 15.6, 4.6, 0.38, 2.40);

    terminalGroup.add(lantai1Group);

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
    [0.4, 4.6].forEach((flY) => {
      const mainSlab = new THREE.Mesh(new THREE.BoxGeometry(utamaW, 0.42, utamaD), slabMat);
      mainSlab.position.set(utamaX, flY, utamaZ);
      mainSlab.receiveShadow = true;
      utamaGroup.add(mainSlab);

      // Left Wing Extension (+X: 54 to 61, Z: -34 to -16) matching T-wing in Lantai 2 diagram
      const leftWingSlab = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 18), slabMat);
      leftWingSlab.position.set(57.5, flY, -25);
      leftWingSlab.receiveShadow = true;
      utamaGroup.add(leftWingSlab);

      // Right Wing Extension (-X: -13 to -6, Z: -34 to -16)
      const rightWingSlab = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 18), slabMat);
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

    // Structural Grid of 36 White Columns across Terminal Utama Lantai 2 (4 rows x 9 cols)
    for (let colX = -2; colX <= 50; colX += 6.5) {
      [-34.2, -29.0, -23.0, -16.8].forEach((colZPos) => {
        addL2Column(utamaGroup, colX, colZPos, 2.65);
      });
    }

    // Green PA Speaker Indicator Nodes on Terminal Utama Lantai 2
    [
      [4, -32], [18, -32], [32, -32], [46, -32],
      [8, -22], [24, -22], [40, -22], [48, -16], [0, -16]
    ].forEach(([gx, gz]) => addL2GreenNode(utamaGroup, gx, gz));

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

    // 2 Floor Slabs (Lantai 1 at Y=0.4m & Lantai 2 at Y=4.6m)
    [0.4, 4.6].forEach((flY) => {
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

    // Airside Gate Holdroom Divider Partitions & Boarding Desks (Gates 07 to 12 along Z: +11.5 to +15.8)
    [-6, 6, 18, 30, 42, 54].forEach((gx) => {
      addL2Wall(eksistingGroup, gx - 3.2, 13.5, 0.3, 4.4, 2.2);
      addL2Wall(eksistingGroup, gx + 2.8, 12.2, 3.4, 0.3, 2.2);
    });

    // Central Spine of 14 White Cylindrical Structural Columns along Terminal Eksisting Lantai 2
    for (let cx = -9; cx <= 57; cx += 5.0) {
      addL2Column(eksistingGroup, cx, 7.8, 2.65);
      addL2Column(eksistingGroup, cx, 12.8, 2.65);
    }

    // Green PA Speaker / Acoustic Nodes along Terminal Eksisting Lantai 2 (matching reference diagram)
    [-8, -1, 7, 15, 23, 31, 39, 47, 55].forEach((gx) => {
      addL2GreenNode(eksistingGroup, gx, 5.5);
      addL2GreenNode(eksistingGroup, gx, 13.8);
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
   * Creates a High-Resolution "Fahrun Air" Side Livery Texture (with Forward & Rear Passenger Doors,
   * Row of Rounded-Rectangle Cabin Windows, and Bold Blue "Fahrun Air" Title Lettering)
   * matching /public/assets/aistudio/image_86f973fd.png
   */
  private createFahrunAirSideTexture(isRightSide: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 1024, 256);

    // Coordinate helper so nose is at the front on both left (+X) and right (-X) fuselage sides
    // On left side (+X normal, plane rotated Y = +PI/2): +U (+X of canvas) maps to -Z (tail), so nose (+Z) is at U=0 (left of canvas)
    // On right side (-X normal, plane rotated Y = -PI/2): +U (+X of canvas) maps to +Z (nose), so nose (+Z) is at U=1024 (right of canvas)
    const mapX = (xFromNose: number, width: number = 0) =>
      isRightSide ? 1024 - xFromNose - width : xFromNose;

    // 1. Forward Passenger Boarding Door (ahead of wing, near "Fahrun Air" title)
    const drawDoor = (xFromNose: number) => {
      const dx = mapX(xFromNose, 48);
      ctx.fillStyle = '#e0e7ff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(dx, 92, 48, 86, 12);
      ctx.fill();
      ctx.stroke();

      // Door window porthole
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(dx + 14, 106, 20, 22, 5);
      ctx.fill();
    };

    drawDoor(220); // Forward cabin door
    drawDoor(760); // Rear cabin door

    // 2. Row of Dark Rounded-Rectangle Cabin Windows (from mid-forward to rear door)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.5;
    for (let wx = 310; wx <= 710; wx += 36) {
      const rx = mapX(wx, 20);
      ctx.beginPath();
      ctx.roundRect(rx, 118, 20, 30, 6);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Bold Blue "Fahrun Air" Livery Title along the Forward Upper Fuselage (matching image_86f973fd.png)
    ctx.save();
    const textCenterX = isRightSide ? 1024 - 265 : 265;
    ctx.translate(textCenterX, 72);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'italic 900 68px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Fahrun Air', 0, 0);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * 3D "Fahrun Air" Commercial Jetliner Mockup (Matching /public/assets/aistudio/image_86f973fd.png):
   * - Crisp White Upper Fuselage + Blue Lower Belly Fairing (#2563eb / #38bdf8)
   * - "Fahrun Air" Blue Livery Lettering, Forward/Rear Doors & Cabin Windows along both sides
   * - Dark Cockpit Windscreen Visor with Blue Trim
   * - Swept Tapered Main Wings with 4 Underwing Turbofan Engines (2 per wing with blue/white cowlings & cream intake rings)
   * - Tall Swept Blue Vertical Stabilizer (Tailfin) + Swept White Horizontal Tailplanes
   * - Nose & Main Landing Gear
   */
  private createProceduralAirliner(
    _accentColorHex: number,
    _tailColorHex: number,
    isWideBody: boolean
  ): THREE.Group {
    const plane = new THREE.Group();

    const whiteBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.15,
      roughness: 0.22,
      clearcoat: 0.65,
      clearcoatRoughness: 0.15,
    });
    const fahrunBlueMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb, // Fahrun Air signature blue belly & tailfin
      metalness: 0.25,
      roughness: 0.25,
      clearcoat: 0.5,
    });
    const skyBlueAccentMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.25,
      roughness: 0.28,
    });
    const wingWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.22,
      roughness: 0.28,
    });
    const wingEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.5,
      roughness: 0.35,
    });
    const intakeCreamMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7, // Warm cream/beige engine intake ring from reference illustration
      roughness: 0.32,
      metalness: 0.18,
    });
    const darkFanMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.6,
    });
    const cockpitGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.85,
      clearcoat: 1.0,
    });

    // 1. Main Cylindrical Upper White Fuselage (Z: -6.8 to +7.8, Length = 14.6m)
    const fuseRadius = 1.42;
    const fuseLen = 14.6;
    const upperFuseGeo = new THREE.CylinderGeometry(fuseRadius, fuseRadius, fuseLen, 28);
    const upperFuse = new THREE.Mesh(upperFuseGeo, whiteBodyMat);
    upperFuse.rotation.x = Math.PI / 2;
    upperFuse.position.set(0, 2.55, 0.5);
    upperFuse.castShadow = true;
    upperFuse.receiveShadow = true;
    plane.add(upperFuse);

    // 2. Blue Lower Belly / Underside Hull Fairing running from Nose to Tail (matching image_86f973fd.png)
    const bellyGeo = new THREE.CylinderGeometry(
      fuseRadius * 1.015,
      fuseRadius * 1.015,
      fuseLen + 0.4,
      28,
      1,
      false,
      Math.PI * 0.62,
      Math.PI * 0.76
    );
    const bellyMesh = new THREE.Mesh(bellyGeo, fahrunBlueMat);
    bellyMesh.rotation.x = Math.PI / 2;
    bellyMesh.position.set(0, 2.48, 0.5);
    bellyMesh.castShadow = true;
    plane.add(bellyMesh);

    // 3. Sculpted Aerodynamic Rounded Nose Cone (White Top + Blue Chin)
    const noseSphereGeo = new THREE.SphereGeometry(fuseRadius, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const noseCone = new THREE.Mesh(noseSphereGeo, whiteBodyMat);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.scale.set(1.0, 2.15, 0.96);
    noseCone.position.set(0, 2.50, 7.8);
    noseCone.castShadow = true;
    plane.add(noseCone);

    const noseBlueChinGeo = new THREE.SphereGeometry(
      fuseRadius * 1.01,
      24,
      16,
      Math.PI * 0.12,
      Math.PI * 0.76,
      0,
      Math.PI * 0.48
    );
    const noseBlueChin = new THREE.Mesh(noseBlueChinGeo, skyBlueAccentMat);
    noseBlueChin.rotation.x = Math.PI / 2;
    noseBlueChin.scale.set(1.0, 2.12, 0.95);
    noseBlueChin.position.set(0, 2.42, 7.8);
    plane.add(noseBlueChin);

    // 4. Tapered Rear Tail Cone (Z: -6.8 to -11.2) with Blue Underside Sweep
    const tailConeGeo = new THREE.CylinderGeometry(0.42, fuseRadius, 4.5, 24);
    const tailCone = new THREE.Mesh(tailConeGeo, whiteBodyMat);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.set(0, 2.68, -9.05);
    tailCone.castShadow = true;
    plane.add(tailCone);

    const tailBellyConeGeo = new THREE.CylinderGeometry(
      0.44,
      fuseRadius * 1.01,
      4.5,
      24,
      1,
      false,
      Math.PI * 0.65,
      Math.PI * 0.7
    );
    const tailBellyCone = new THREE.Mesh(tailBellyConeGeo, fahrunBlueMat);
    tailBellyCone.rotation.x = Math.PI / 2;
    tailBellyCone.position.set(0, 2.64, -9.05);
    plane.add(tailBellyCone);

    // 5. Curved Dark Cockpit Windscreen Visor with Blue Frame Trim
    const visorBorder = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.24, 0.56, 20, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
      skyBlueAccentMat
    );
    visorBorder.position.set(0, 2.86, 8.55);
    visorBorder.rotation.x = 0.24;
    plane.add(visorBorder);

    const cockpitVisor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.10, 1.22, 0.44, 20, 1, false, -Math.PI * 0.35, Math.PI * 0.70),
      cockpitGlassMat
    );
    cockpitVisor.position.set(0, 2.88, 8.62);
    cockpitVisor.rotation.x = 0.24;
    plane.add(cockpitVisor);

    // 6. "Fahrun Air" Livery Decal Panels on Left (+X) & Right (-X) Sides of Fuselage
    const leftLiveryMat = new THREE.MeshBasicMaterial({
      map: this.createFahrunAirSideTexture(false),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const rightLiveryMat = new THREE.MeshBasicMaterial({
      map: this.createFahrunAirSideTexture(true),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });

    const sideDecalGeo = new THREE.PlaneGeometry(14.0, 2.1);
    const leftDecal = new THREE.Mesh(sideDecalGeo, leftLiveryMat);
    leftDecal.position.set(fuseRadius + 0.03, 2.72, 0.8);
    leftDecal.rotation.y = Math.PI / 2;
    plane.add(leftDecal);

    const rightDecal = new THREE.Mesh(sideDecalGeo, rightLiveryMat);
    rightDecal.position.set(-(fuseRadius + 0.03), 2.72, 0.8);
    rightDecal.rotation.y = -Math.PI / 2;
    plane.add(rightDecal);

    // 7. Custom Swept-Back Tapered Main Wings (Left & Right)
    [-1, 1].forEach((side) => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 2.8);                  // Wing root leading edge
      wingShape.lineTo(side * 10.6, -1.6);       // Wingtip leading edge
      wingShape.lineTo(side * 10.6, -2.9);       // Wingtip trailing edge
      wingShape.lineTo(0, -1.2);                 // Wing root trailing edge
      wingShape.closePath();

      const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.04,
      });
      wingGeo.rotateX(-Math.PI / 2);
      const wingMesh = new THREE.Mesh(wingGeo, wingWhiteMat);
      wingMesh.position.set(side * 0.9, 2.05, 0.8);
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;
      plane.add(wingMesh);

      // Leading-Edge Slats Trim Strip (matching textured leading edge in reference illustration)
      const slatLen = 10.9;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(slatLen, 0.14, 0.24), wingEdgeMat);
      slat.position.set(side * 5.8, 2.14, 1.55);
      slat.rotation.y = side * 0.39;
      plane.add(slat);
    });

    // 8. FOUR Underwing Turbofan Engines (2 per Wing — Inner & Outer Nacelles matching image_86f973fd.png)
    const enginePlacements = [
      { x: -3.8, z: 1.55, scale: 1.0 },
      { x: -6.9, z: 0.35, scale: 0.92 },
      { x: 3.8,  z: 1.55, scale: 1.0 },
      { x: 6.9,  z: 0.35, scale: 0.92 },
    ];
    enginePlacements.forEach((ep) => {
      const engGroup = new THREE.Group();
      engGroup.position.set(ep.x, 1.32, ep.z);
      engGroup.scale.setScalar(ep.scale);

      // Aerodynamic Pylon Strut connecting Engine to Wing Underside
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 1.65), wingEdgeMat);
      pylon.position.set(0, 0.55, -0.15);
      engGroup.add(pylon);

      // Rear Blue Engine Nacelle Barrel
      const rearBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.58, 1.45, 20),
        skyBlueAccentMat
      );
      rearBarrel.rotation.x = Math.PI / 2;
      rearBarrel.position.set(0, 0, -0.45);
      rearBarrel.castShadow = true;
      engGroup.add(rearBarrel);

      // Forward Crisp White Engine Cowling Barrel
      const frontCowling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.68, 1.25, 20),
        whiteBodyMat
      );
      frontCowling.rotation.x = Math.PI / 2;
      frontCowling.position.set(0, 0, 0.65);
      frontCowling.castShadow = true;
      engGroup.add(frontCowling);

      // Warm Cream/Beige Intake Lip Ring at Front of Engine (distinctive feature in image_86f973fd.png)
      const intakeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.64, 0.11, 14, 24),
        intakeCreamMat
      );
      intakeRing.position.set(0, 0, 1.28);
      engGroup.add(intakeRing);

      // Dark Recessed Turbofan Blades Core & Exhaust Cone
      const fanDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.25, 18),
        darkFanMat
      );
      fanDisc.rotation.x = Math.PI / 2;
      fanDisc.position.set(0, 0, 1.12);
      engGroup.add(fanDisc);

      const exhaustNozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.32, 0.55, 16),
        darkFanMat
      );
      exhaustNozzle.rotation.x = -Math.PI / 2;
      exhaustNozzle.position.set(0, 0, -1.32);
      engGroup.add(exhaustNozzle);

      plane.add(engGroup);
    });

    // 9. Tall Swept Blue Vertical Stabilizer (Tailfin) with White Dorsal Fillet (matching image_86f973fd.png)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);          // Front dorsal root (Z = -6.2)
    finShape.lineTo(-3.2, 4.8);     // Swept top leading edge
    finShape.lineTo(-4.8, 4.95);    // Top fin cap
    finShape.lineTo(-4.4, 0);       // Rear trailing edge (Z = -10.6)
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.04,
    });
    finGeo.rotateY(Math.PI / 2); // Maps shape +X -> -Z, shape +Y -> +Y
    const tailFin = new THREE.Mesh(finGeo, fahrunBlueMat);
    tailFin.position.set(-0.12, 3.25, -6.2);
    tailFin.castShadow = true;
    plane.add(tailFin);

    // Crisp White Leading-Edge Strip along the Vertical Tailfin
    const finLeadingStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 5.6, 0.32),
      whiteBodyMat
    );
    finLeadingStrip.position.set(0, 5.6, -7.75);
    finLeadingStrip.rotation.x = -0.58;
    plane.add(finLeadingStrip);

    // 10. Swept White Horizontal Stabilizers (Tailplanes) on Left & Right of Tail Cone
    [-1, 1].forEach((side) => {
      const hStabShape = new THREE.Shape();
      hStabShape.moveTo(0, 1.1);
      hStabShape.lineTo(side * 3.8, -0.6);
      hStabShape.lineTo(side * 3.8, -1.4);
      hStabShape.lineTo(0, -0.5);
      hStabShape.closePath();

      const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, {
        depth: 0.14,
        bevelEnabled: false,
      });
      hStabGeo.rotateX(-Math.PI / 2);
      const hStabMesh = new THREE.Mesh(hStabGeo, wingWhiteMat);
      hStabMesh.position.set(side * 0.45, 2.85, -9.2);
      hStabMesh.castShadow = true;
      plane.add(hStabMesh);
    });

    // 11. Nose & Main Landing Gear (Struts & Twin Tires)
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.25, 10), wingEdgeMat);
    noseStrut.position.set(0, 0.95, 7.8);
    plane.add(noseStrut);

    [-0.22, 0.22].forEach((wx) => {
      const nWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 14), darkFanMat);
      nWheel.rotation.z = Math.PI / 2;
      nWheel.position.set(wx, 0.32, 7.8);
      plane.add(nWheel);
    });

    [-2.1, 2.1].forEach((gx) => {
      const mStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.45, 10), wingEdgeMat);
      mStrut.position.set(gx, 1.05, 0.2);
      plane.add(mStrut);

      [-0.32, 0.32].forEach((wz) => {
        const mWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 14), darkFanMat);
        mWheel.rotation.z = Math.PI / 2;
        mWheel.position.set(gx, 0.38, 0.2 + wz);
        plane.add(mWheel);
      });
    });

    const s = isWideBody ? 1.12 : 0.90;
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
        // Matches Reference Cutaway Image: Lantai 1 Terminal Utama, Eksisting & Selatan (image_6015f581.png)
        this.selectedZoneId = null;
        this.callbacks.onSelectZone(null);
        this.setCutawayMode('lantai1');
        this.targetControlsTarget = new THREE.Vector3(12, 1.2, -14);
        this.targetCameraPos = new THREE.Vector3(12, 68, -78);
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
