import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Layers,
  Compass,
  Wifi,
  RotateCcw,
  Building2,
  Focus,
  Map as MapIcon,
  Volume2,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Monitor,
  Package,
  UserCheck,
  Bath,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Eye,
} from 'lucide-react';
import {
  AirportSceneManager,
  VisualizerMode,
  CameraPresetType,
} from '../three/AirportSceneManager';
import { MacroZone, IPSpeaker, ZoneId, SpeakerCategory } from '../types/pa-system';

interface EksistingRoomCodeInfo {
  code: number;
  label: string;
  title: string;
  location: string;
  description: string;
  equipment: string[];
  badgeColor: string;
  pins: { top: string; left: string }[];
}

const EKSISTING_RED_BOX_ROOMS: EksistingRoomCodeInfo[] = [
  {
    code: 1,
    label: '1. R. Standby (Area Hijau)',
    title: 'Ruang Standby Teknisi — 3D 4 Sisi (Depan, Belakang, Kanan, Kiri)',
    location: 'Blok Bawah Tengah (Kotak Hijau) & Sayap Kanan',
    description:
      'Ruang Standby teknisi (ditandai kotak hijau) dengan pemodelan 3D lengkap 4 arah sesuai referensi foto: Tampilan Depan, Tampilan Belakang, Tampilan Kanan, dan Tampilan Kiri.',
    equipment: [
      'Depan: Meja PC Kayu, TV Monitoring Biru, Dispenser, Kulkas Hitam, 8 Galon & Tempat Sampah Stainless',
      'Belakang: Kursi Tunggu 4 Dudukan Hijau-Biru, Bukaan Lorong, Standing TV Hitam & Tabung APAR Merah',
      'Kanan: Pintu Kaca Aluminium Terbuka ke Control Room (4), Kabinet Hitam 3 Susun & Jendela Kaca Gelap',
      'Kiri: Papan Tulis Putih, TV Dinding Hitam, Sofa Abu-abu, Meja Tamu Hitam & 2 Kursi Putar Biru',
    ],
    badgeColor: 'bg-emerald-500 text-white border-emerald-300',
    pins: [
      { top: '79%', left: '34%' },
      { top: '59%', left: '88%' },
    ],
  },
  {
    code: 2,
    label: '2. Storage',
    title: 'Storage / Ruang Penyimpanan Logistik',
    location: 'Sayap Vertikal Kanan (Tengah)',
    description:
      'Ruang penyimpanan suku cadang server, modul amplifier PoE+, kabel serat optik RSTP, dan peralatan maintenance.',
    equipment: ['Rak Logistik Bertingkat', 'Kotak Suku Cadang IP PAS', 'Inventaris Kabel & Modul'],
    badgeColor: 'bg-amber-500 text-slate-950 border-amber-300',
    pins: [{ top: '44%', left: '84%' }],
  },
  {
    code: 3,
    label: '3. restroom',
    title: 'Restroom / Fasilitas Sanitasi Staf',
    location: 'Sayap Vertikal Kanan Atas & Blok Atas Tengah',
    description:
      'Fasilitas toilet dan ruang sanitasi khusus personel ruang kontrol dan teknisi gedung Terminal Eksisting Lantai 1.',
    equipment: ['4 Bilik Sanitasi Tengah', 'Restroom Staf Sayap Kanan', 'Wastafel & Exhaust'],
    badgeColor: 'bg-teal-500 text-white border-teal-300',
    pins: [{ top: '28%', left: '88%' }],
  },
  {
    code: 4,
    label: '4. control room',
    title: 'Control Room (NOC & Master Monitoring)',
    location: 'Blok Utama Tengah (Antara Data Center 5 & 6)',
    description:
      'Ruang kendali utama (Control Room) dengan meja konsol operator 6 kursi dan layar pemantauan terpusat untuk Data Center Lama & Baru.',
    equipment: ['Meja Konsol Operator 6 Kursi', 'Multi-Monitor Wall NOC', 'Workstation Pengendali DSP'],
    badgeColor: 'bg-indigo-500 text-white border-indigo-300',
    pins: [{ top: '46%', left: '37%' }],
  },
  {
    code: 5,
    label: '5. data center lama',
    title: 'Data Center Lama (Server & Rak Eksisting)',
    location: 'Blok Kiri Tengah',
    description:
      'Ruang Data Center eksisting dengan 2 baris paralel rak server 42U warna hitam beserta jalur cable tray overhead.',
    equipment: ['2 Baris Rak Server 42U Hitam (12 Rak)', 'Overhead Cable Tray', 'Core Switch & Patch Panel'],
    badgeColor: 'bg-rose-600 text-white border-rose-300',
    pins: [{ top: '46%', left: '19%' }],
  },
  {
    code: 6,
    label: '6. data center baru',
    title: 'Data Center Baru (High-Density Server Hall)',
    location: 'Blok Kanan-Tengah Utama',
    description:
      'Ruang Data Center baru berkapasitas tinggi dengan 4 baris paralel rak server high-density, pendingin presisi CRAC, dan panel distribusi UPS.',
    equipment: ['4 Baris Rak Server High-Density (32 Rak)', '3 Unit Pendingin Presisi CRAC', 'Panel Distribusi Daya & UPS'],
    badgeColor: 'bg-emerald-600 text-white border-emerald-300',
    pins: [{ top: '47%', left: '61%' }],
  },
];

export type Room1DirectionType = 'top' | 'depan' | 'belakang' | 'kanan' | 'kiri';

interface Room1DirectionalViewInfo {
  id: Room1DirectionType;
  label: string;
  shortLabel: string;
  fileName: string;
  imgSrc: string;
  wallSide: string;
  description: string;
}

const ROOM1_DIRECTIONAL_VIEWS: Room1DirectionalViewInfo[] = [
  {
    id: 'top',
    label: 'Denah Kotak Hijau (3D Atas)',
    shortLabel: '3D Denah Hijau',
    fileName: 'Tanpa_judul__920_x_197_mm___7__94ceae72.png',
    imgSrc: '/assets/aistudio/Tanpa_judul__920_x_197_mm___7__94ceae72.png',
    wallSide: 'Kotak Hijau (depan, belakang, kanan, Kiri)',
    description:
      'Tampilan atas 3D Ruangan 1 (R. Standby) yang ditandai garis hijau beserta penamaan 4 sisi: depan (kiri), belakang (kanan), kanan (atas), dan Kiri (bawah).',
  },
  {
    id: 'depan',
    label: 'Tampilan Depan',
    shortLabel: 'Tampilan Depan',
    fileName: 'Tampilan-Depan.jpg',
    imgSrc: '/assets/aistudio/Tampilan-Depan.jpg',
    wallSide: 'Sisi Depan (+X / Dinding Kiri Denah)',
    description:
      'Menghadap dinding depan: plafon akustik T-bar + lampu TL & smoke detector, meja kerja PC kayu coklat 3 laci + monitor, TV monitoring miring + jam digital, dispenser silver, kulkas hitam motif bunga emas (kaleng Fox\'s & mangkok di atas), 8 galon air biru berlabel + tripod gooseneck, dan tempat sampah stainless bulat.',
  },
  {
    id: 'belakang',
    label: 'Tampilan Belakang',
    shortLabel: 'Tampilan Belakang',
    fileName: 'Tampilan-Belakang.jpg',
    imgSrc: '/assets/aistudio/Tampilan-Belakang.jpg',
    wallSide: 'Sisi Belakang (-X / Dinding Kanan Denah)',
    description:
      'Menghadap sisi belakang: kursi tunggu bandara 4 dudukan besi warna hijau & biru-hijau (tanda X & tas hitam di kolong), meja tamu besi garis hitam, serta bukaan lorong berlantai keramik krem dengan standing bracket TV hitam 2 tiang, panel listrik, dan tabung APAR merah + rambu segitiga.',
  },
  {
    id: 'kanan',
    label: 'Tampilan Kanan',
    shortLabel: 'Tampilan Kanan',
    fileName: 'Tampilan-Kanan.jpg',
    imgSrc: '/assets/aistudio/Tampilan-Kanan.jpg',
    wallSide: 'Sisi Kanan (+Z / Dinding Atas ke Control Room)',
    description:
      'Menghadap dinding kanan: pintu kaca gelap kusen aluminium terbuka menuju Ruangan 4 (Control Room) lengkap dengan undakan keset WELCOME & sepatu, lemari kabinet rendah 3 susun hitam di tengah, dan jendela kaca gelap 3 panel di kanan.',
  },
  {
    id: 'kiri',
    label: 'Tampilan Kiri',
    shortLabel: 'Tampilan Kiri',
    fileName: 'Tampilan-kiri.jpg',
    imgSrc: '/assets/aistudio/Tampilan-kiri.jpg',
    wallSide: 'Sisi Kiri (-Z / Dinding Bawah Denah)',
    description:
      'Menghadap dinding kiri: papan tulis (whiteboard) bergambar skema & stiker di kiri atas, TV layar datar hitam di kanan atas, sofa kain abu-abu 2 dudukan + tas ransel hitam, meja tamu garis hitam (kardus, gelas, botol air, laptop & tumbler hitam), serta 2 kursi kerja putar biru beroda 5 (1 dengan rompi kuning).',
  },
];

interface DigitalTwinCanvasProps {
  macroZones: MacroZone[];
  speakers: IPSpeaker[];
  selectedZoneId: ZoneId | null;
  onSelectZone: (zoneId: ZoneId | null) => void;
  onSelectSpeaker: (speaker: IPSpeaker | null) => void;
  visualizerMode: VisualizerMode;
  onSetVisualizerMode: (mode: VisualizerMode) => void;
  isEmergencyActive: boolean;
  broadcastingZoneIds: ZoneId[];
  theme?: 'dark' | 'light';
  initialPreset?: CameraPresetType;
  onSceneManagerReady?: (manager: AirportSceneManager) => void;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  macroZones,
  speakers,
  selectedZoneId,
  onSelectZone,
  onSelectSpeaker,
  visualizerMode,
  onSetVisualizerMode,
  isEmergencyActive,
  broadcastingZoneIds,
  theme = 'dark',
  initialPreset = 'overview',
  onSceneManagerReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<AirportSceneManager | null>(null);
  const isPresetChangeRef = useRef<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPresetType>(initialPreset);
  const [showMasterplanPip, setShowMasterplanPip] = useState<boolean>(false);
  const [pipTab, setPipTab] = useState<'speaker' | 'lantai1' | 'lantai2' | 'lantai3' | 'parkir' | 'masterplan'>('speaker');
  const [speakerCategoryFilter, setSpeakerCategoryFilter] = useState<SpeakerCategory | 'all'>('all');
  const [isSpeakerLegendMinimized, setIsSpeakerLegendMinimized] = useState<boolean>(true);
  const [isTopBarMinimized, setIsTopBarMinimized] = useState<boolean>(true);

  // Red-Marked Room Complex on Lt. 1 Eksisting state
  const [hotspotScreenPos, setHotspotScreenPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: -999,
    y: -999,
    visible: false,
  });
  const [showEksistingRoomPanel, setShowEksistingRoomPanel] = useState<boolean>(false);
  const [selectedEksistingRoomCode, setSelectedEksistingRoomCode] = useState<number | null>(null);
  const [room1DirectionView, setRoom1DirectionView] = useState<Room1DirectionType>('top');
  const [showPaBlockDiagramPanel, setShowPaBlockDiagramPanel] = useState<boolean>(false);
  const [paBlockTab, setPaBlockTab] = useState<'schematic' | 'lt1' | 'lt2' | 'abd_sheets'>('schematic');
  const [selectedAbdSheet, setSelectedAbdSheet] = useState<
    '0001c' | '0002' | '0102' | '0103' | 'jbss_lt1' | 'jbss_lt2'
  >('0001c');
  const [activePaNodeId, setActivePaNodeId] = useState<
    'mdf_ss' | 'jbss_1_3' | 'jbss_1_7' | 'jbss_2_2' | 'jbss_2_4' | 'lt1_overview' | 'lt2_overview'
  >('lt1_overview');

  // Initialize Three.js scene once
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new AirportSceneManager(
      mountRef.current,
      macroZones,
      speakers,
      {
        onSelectZone: (zid) => {
          onSelectZone(zid);
          if (isPresetChangeRef.current) return;
          if (zid === 'macro-1') setActivePreset('utama');
          else if (zid === 'macro-2') setActivePreset('eksisting');
          else if (zid === 'macro-3') setActivePreset('selatan');
          else if (zid === 'macro-4') setActivePreset('apron');
          else if (zid === 'macro-5') setActivePreset('parking');
          else if (zid === null) setActivePreset('overview');
        },
        onSelectSpeaker,
        onSelectEksistingRoomComplex: (roomCode) => {
          isPresetChangeRef.current = true;
          setActivePreset('lantai1_eksisting_ruangan');
          setShowEksistingRoomPanel(true);
          setSelectedEksistingRoomCode(roomCode ?? 1);
          if (roomCode === 1 || roomCode === undefined) {
            setRoom1DirectionView('top');
          }
          setTimeout(() => {
            isPresetChangeRef.current = false;
          }, 60);
        },
        onUpdateHotspotScreenPos: (pos) => {
          setHotspotScreenPos(pos);
        },
      }
    );

    manager.setTheme(theme);
    managerRef.current = manager;
    if (initialPreset && initialPreset !== 'overview') {
      isPresetChangeRef.current = true;
      setActivePreset(initialPreset);
      manager.setCameraPreset(initialPreset);
      setTimeout(() => {
        isPresetChangeRef.current = false;
      }, 60);
    }
    if (onSceneManagerReady) {
      onSceneManagerReady(manager);
    }

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  // Update theme (Dark / Light) in 3D WebGL scene
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setTheme(theme);
    }
  }, [theme]);

  // Update visualizer mode
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setVisualizerMode(visualizerMode);
    }
  }, [visualizerMode]);

  // Update emergency state
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setEmergencyState(isEmergencyActive);
    }
  }, [isEmergencyActive]);

  // Update broadcasting wave rings
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setBroadcastingZones(broadcastingZoneIds);
    }
  }, [broadcastingZoneIds]);

  // Update selected zone camera when changed from external UI (e.g. DockControls or keyboard)
  useEffect(() => {
    if (!managerRef.current || isPresetChangeRef.current) return;
    if (selectedZoneId === 'macro-1') {
      setActivePreset('utama');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone('macro-1', true, false);
    } else if (selectedZoneId === 'macro-2') {
      setActivePreset('eksisting');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone('macro-2', true, false);
    } else if (selectedZoneId === 'macro-3') {
      setActivePreset('selatan');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone('macro-3', true, false);
    } else if (selectedZoneId === 'macro-4') {
      setActivePreset('apron');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone('macro-4', true, false);
    } else if (selectedZoneId === 'macro-5') {
      setActivePreset('parking');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone('macro-5', true, false);
    } else if (selectedZoneId === null) {
      setActivePreset('overview');
      setShowEksistingRoomPanel(false);
      managerRef.current.selectZone(null, true, false);
    }
  }, [selectedZoneId]);

  const handleSelectPreset = (preset: CameraPresetType) => {
    isPresetChangeRef.current = true;
    setActivePreset(preset);
    if (preset !== 'lantai1_eksisting_ruangan' && preset !== 'lantai1_eksisting' && preset !== 'lantai1') {
      setShowEksistingRoomPanel(false);
      setSelectedEksistingRoomCode(null);
    }
    managerRef.current?.setCameraPreset(preset);
    setTimeout(() => {
      isPresetChangeRef.current = false;
    }, 50);
  };

  const handleOpenRedMarkedRoomComplex = (roomCode: number | null = 1) => {
    isPresetChangeRef.current = true;
    setActivePreset('lantai1_eksisting_ruangan');
    setShowEksistingRoomPanel(true);
    setSelectedEksistingRoomCode(roomCode);
    if (roomCode === 1) {
      setRoom1DirectionView('top');
      managerRef.current?.focusRoom1Direction('top');
    } else {
      managerRef.current?.focusEksistingRoom(roomCode);
    }
    setTimeout(() => {
      isPresetChangeRef.current = false;
    }, 60);
  };

  const handleSelectRoom1Direction = (dir: Room1DirectionType) => {
    isPresetChangeRef.current = true;
    setActivePreset('lantai1_eksisting_ruangan');
    setShowEksistingRoomPanel(true);
    setSelectedEksistingRoomCode(1);
    setRoom1DirectionView(dir);
    managerRef.current?.focusRoom1Direction(dir);
    setTimeout(() => {
      isPresetChangeRef.current = false;
    }, 60);
  };

  const handleSelectSpeakerCategory = (cat: SpeakerCategory | 'all') => {
    const nextCat = speakerCategoryFilter === cat && cat !== 'all' ? 'all' : cat;
    setSpeakerCategoryFilter(nextCat);
    managerRef.current?.setSpeakerCategoryFilter(nextCat);
  };

  const handleFocusEksistingPaNode = (
    nodeId: 'mdf_ss' | 'jbss_1_3' | 'jbss_1_7' | 'jbss_2_2' | 'jbss_2_4' | 'lt1_overview' | 'lt2_overview'
  ) => {
    isPresetChangeRef.current = true;
    setActivePaNodeId(nodeId);
    setShowEksistingRoomPanel(false);
    setShowPaBlockDiagramPanel(true);
    if (nodeId === 'jbss_2_2' || nodeId === 'jbss_2_4' || nodeId === 'lt2_overview') {
      setActivePreset('lantai2');
    } else {
      setActivePreset('lantai1_eksisting');
    }
    managerRef.current?.focusEksistingPaNode(nodeId);
    setTimeout(() => {
      isPresetChangeRef.current = false;
    }, 60);
  };

  const ceilingCount = speakers.filter((s) => s.category === 'ceiling').length;
  const columnCount = speakers.filter((s) => s.category === 'column').length;
  const hornCount = speakers.filter((s) => s.category === 'horn').length;

  const activeZoneObj = selectedZoneId
    ? macroZones.find((z) => z.id === selectedZoneId)
    : null;

  const isLantai1Active =
    activePreset === 'lantai1' ||
    activePreset === 'lantai1_eksisting' ||
    activePreset === 'lantai1_eksisting_ruangan';

  const activeRoomDetail =
    selectedEksistingRoomCode !== null
      ? EKSISTING_RED_BOX_ROOMS.find((r) => r.code === selectedEksistingRoomCode) || null
      : null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden transition-colors duration-300 ${
        theme === 'light' ? 'bg-sky-100' : 'bg-slate-950'
      }`}
    >
      {/* Isolated Three.js WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive Floating Button Pinned Directly on the Green-Marked Room on Lt. 1 Eksisting */}
      {isLantai1Active && hotspotScreenPos.visible && (
        <div
          style={{
            left: `${hotspotScreenPos.x}px`,
            top: `${hotspotScreenPos.y}px`,
          }}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-auto select-none flex flex-col items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => handleOpenRedMarkedRoomComplex(1)}
            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xl transition-all duration-200 cursor-pointer border ${
              activePreset === 'lantai1_eksisting_ruangan' && showEksistingRoomPanel
                ? 'bg-emerald-600/95 text-white border-emerald-200 ring-4 ring-emerald-500/40 scale-105'
                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-300/80 ring-4 ring-emerald-500/30 hover:scale-105'
            }`}
            title="Klik untuk menampilkan 3D Ruangan Area Hijau (Tampilan Depan, Tampilan Belakang, Tampilan Kanan, Tampilan Kiri)"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200" />
            </span>
            <Server className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
            <span className="whitespace-nowrap tracking-wide">
              AIRPORT TECHNOLOGY / ELBAN UPG
            </span>
            <Maximize2 className="w-3 h-3 text-emerald-100 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Quick 3D Directional View Switcher (Tampilan Depan, Belakang, Kanan, Kiri) */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-slate-950/90 border border-emerald-500/70 shadow-xl backdrop-blur-md">
            {(
              [
                { id: 'depan', label: 'Tampilan Depan' },
                { id: 'belakang', label: 'Tampilan Belakang' },
                { id: 'kanan', label: 'Tampilan Kanan' },
                { id: 'kiri', label: 'Tampilan Kiri' },
              ] as { id: Room1DirectionType; label: string }[]
            ).map((btn) => {
              const isDirActive =
                showEksistingRoomPanel &&
                selectedEksistingRoomCode === 1 &&
                room1DirectionView === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRoom1Direction(btn.id);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isDirActive
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'bg-slate-800/90 hover:bg-emerald-600/40 text-emerald-200'
                  }`}
                  title={`Buka 3D ${btn.label}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Floating Camera Focus & Visualizer Mode Bar (Skeuomorphism + Violet Sans) */}
      <div
        style={{
          fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
        }}
        className="font-violet-sans absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max max-w-[96vw]"
      >
        <div
          style={{
            fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
          }}
          className="font-violet-sans skeuo-chassis flex flex-wrap items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs text-slate-900 select-none transition-all duration-200"
        >
          {/* Camera Focus Presets Label (Recessed LCD Display) */}
          <span className="skeuo-lcd px-2.5 py-1 text-[10px] uppercase mr-0.5 flex items-center gap-1.5 font-extrabold tracking-wider text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 border border-sky-900 shadow-[0_0_6px_#38bdf8,inset_0_1px_1px_#fff]" />
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Fokus WAAA:</span>
          </span>

          {isTopBarMinimized ? (
            <button
              type="button"
              onClick={() => setIsTopBarMinimized(false)}
              className="skeuo-btn-sky flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold transition-all cursor-pointer"
              title="Tampilkan Kembali Menu Fokus WAAA & Layer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-950" />
              <span>Buka Menu Fokus & Layer</span>
              <ChevronDown className="w-3.5 h-3.5 text-sky-950" />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSelectPreset('overview')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'overview' && !selectedZoneId
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilkan Seluruh Kompleks Terminal Bandara Sultan Hasanuddin Makassar (WAAA) beserta Atap Bandara"
              >
                <Building2 className="w-3.5 h-3.5 text-sky-700" />
                <span>Semua Terminal</span>
              </button>

              <button
                onClick={() => handleSelectPreset('lantai1')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'lantai1'
                    ? 'skeuo-btn-amber skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilan Mockup Lantai 1 (Cutaway Area Klaim Bagasi, BHS Hall, Terminal Utama, Eksisting & Selatan)"
              >
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Mockup Lantai 1</span>
              </button>

              <button
                onClick={() => handleSelectPreset('lantai1_eksisting')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'lantai1_eksisting' || activePreset === 'lantai1_eksisting_ruangan'
                    ? 'skeuo-btn-amber skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilan Khusus Mockup Lantai 1 — Terminal Eksisting (Sesuai Referensi Denah 3D Lantai 1 Terminal Eksisting)"
              >
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Lt. 1 Eksisting</span>
              </button>

              <button
                onClick={() => handleOpenRedMarkedRoomComplex(null)}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'lantai1_eksisting_ruangan' && showEksistingRoomPanel
                    ? 'skeuo-btn-crimson skeuo-btn-pressed'
                    : 'skeuo-btn-crimson'
                }`}
                title="Buka Ruangan Garis Merah pada Lt. 1 Eksisting (1. R. Standby, 2. Storage, 3. Restroom, 4. Control Room, 5. Data Center Lama, 6. Data Center Baru)"
              >
                <Server className="w-3.5 h-3.5 text-white" />
                <span>AIRPORT TECHNOLOGY</span>
              </button>

              <button
                onClick={() => handleSelectPreset('lantai2')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'lantai2'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilan Mockup Lantai 2 (Cutaway Terminal Utama, Terminal Eksisting & Terminal Selatan)"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mockup Lantai 2</span>
              </button>

              <button
                onClick={() => {
                  const nextOpen = !showPaBlockDiagramPanel;
                  setShowPaBlockDiagramPanel(nextOpen);
                  if (nextOpen) {
                    setShowEksistingRoomPanel(false);
                    if (activePreset === 'lantai2') {
                      handleFocusEksistingPaNode('lt2_overview');
                    } else {
                      handleFocusEksistingPaNode('lt1_overview');
                    }
                  }
                }}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showPaBlockDiagramPanel
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-btn-emerald'
                }`}
                title="Blok Diagram Sistem Public Address Terminal Eksisting Lantai 1 & 2 (WIKA-ABD-BSH-ES-TE-0001C-00, 0002-00, 0102-00, 0103-00)"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-950" />
                <span>Blok Diagram PA Eksisting (Lt. 1 & 2)</span>
              </button>

              <button
                onClick={() => handleSelectPreset('lantai3')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePreset === 'lantai3'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilan Mockup Lt. 3 Terminal Utama (Sesuai Referensi 3D Lantai 3 Terminal Utama)"
              >
                <Layers className="w-3.5 h-3.5 text-sky-700" />
                <span>Mockup Lt. 3 Terminal Utama</span>
              </button>

              <button
                onClick={() => handleSelectPreset('utama')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  selectedZoneId === 'macro-1' || activePreset === 'utama'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Zona 1: Terminal Utama"
              >
                Terminal Utama
              </button>

              <button
                onClick={() => handleSelectPreset('curbside')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  activePreset === 'curbside'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilan di Depan Terminal Utama & Jalanan"
              >
                Depan Terminal & Jalanan
              </button>

              <button
                onClick={() => {
                  if (
                    activePreset === 'lantai1' ||
                    activePreset === 'lantai1_eksisting' ||
                    activePreset === 'lantai1_eksisting_ruangan'
                  ) {
                    handleSelectPreset('lantai1_eksisting');
                  } else {
                    handleSelectPreset('eksisting');
                  }
                }}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  selectedZoneId === 'macro-2' ||
                  activePreset === 'eksisting' ||
                  activePreset === 'lantai1_eksisting'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Zona 2: Terminal Eksisting (Gate 07–12 / Mockup Lantai 1 Eksisting)"
              >
                Terminal Eksisting
              </button>

              <button
                onClick={() => handleSelectPreset('selatan')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  selectedZoneId === 'macro-3' || activePreset === 'selatan'
                    ? 'skeuo-btn-violet skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Zona 3: Terminal Selatan (Rotunda Gate 01–06)"
              >
                Terminal Selatan
              </button>

              <button
                onClick={() => handleSelectPreset('apron')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  selectedZoneId === 'macro-4' || activePreset === 'apron'
                    ? 'skeuo-btn-violet skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Zona 4: Apron, 12 Garbarata & Pesawat Parkir"
              >
                Apron & Garbarata
              </button>

              <button
                onClick={() => handleSelectPreset('parking')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  selectedZoneId === 'macro-5' || activePreset === 'parking'
                    ? 'skeuo-btn-amber skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Zona 5: Gedung Parkir, Jembatan Penghubung & Jalanan U-Loop"
              >
                Gedung Parkir
              </button>

              <button
                onClick={() => handleSelectPreset('tower')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  activePreset === 'tower'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Fokus Menara Pengawas Lalu Lintas Udara (ATC Tower WAAA)"
              >
                ATC Tower
              </button>

              <button
                onClick={() => handleSelectPreset('tollgate')}
                className={`px-2.5 py-1 font-bold transition-all cursor-pointer ${
                  activePreset === 'tollgate'
                    ? 'skeuo-btn-crimson skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Pintu Gerbang Tol Masuk Bandara Internasional Sultan Hasanuddin"
              >
                Gerbang Tol
              </button>

              <div className="h-5 w-[2px] bg-slate-500/50 shadow-[1px_0_0_rgba(255,255,255,0.75)] mx-1 hidden sm:block" />

              {/* Visualizer Mode Toggles Label (Recessed LCD Display) */}
              <span className="skeuo-lcd px-2.5 py-1 text-[10px] uppercase mr-0.5 flex items-center gap-1.5 font-extrabold tracking-wider text-cyan-300">
                <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Layer:</span>
              </span>

              <button
                onClick={() => onSetVisualizerMode('bim_normal')}
                className={`px-2.5 py-1 font-extrabold transition-all cursor-pointer ${
                  visualizerMode === 'bim_normal'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="BIM 3D Architectural View"
              >
                BIM 3D
              </button>

              <button
                onClick={() => onSetVisualizerMode('stipa_heatmap')}
                className={`flex items-center gap-1.5 px-2.5 py-1 font-extrabold transition-all cursor-pointer ${
                  visualizerMode === 'stipa_heatmap'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Speech Transmission Index (STI-PA) Heatmap"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-700" />
                <span>STI-PA</span>
              </button>

              <button
                onClick={() => onSetVisualizerMode('cable_rstp')}
                className={`flex items-center gap-1.5 px-2.5 py-1 font-extrabold transition-all cursor-pointer ${
                  visualizerMode === 'cable_rstp'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="20kHz Pilot Tone Cable Network & Dual RSTP"
              >
                <Wifi className="w-3.5 h-3.5 text-sky-700" />
                <span>Kabel RSTP</span>
              </button>

              <button
                onClick={() => setShowMasterplanPip(!showMasterplanPip)}
                className={`flex items-center gap-1.5 px-2.5 py-1 font-extrabold transition-all cursor-pointer ${
                  showMasterplanPip
                    ? 'skeuo-btn-amber skeuo-btn-pressed'
                    : 'skeuo-btn'
                }`}
                title="Tampilkan / Sembunyikan Referensi Speaker 3D Pixar & Denah WAAA"
              >
                <MapIcon className="w-3.5 h-3.5 text-amber-700" />
                <span>Referensi WAAA</span>
              </button>

              <div className="h-5 w-[2px] bg-slate-500/50 shadow-[1px_0_0_rgba(255,255,255,0.75)] mx-0.5 hidden sm:block" />

              {/* Minimize Top Bar Button */}
              <button
                type="button"
                onClick={() => setIsTopBarMinimized(true)}
                className="skeuo-btn flex items-center gap-1 px-2.5 py-1 font-extrabold text-slate-900 cursor-pointer"
                title="Minimize Bar Fokus WAAA & Layer"
              >
                <Minimize2 className="w-3.5 h-3.5 text-sky-700" />
                <span>Minimize</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
              </button>
            </>
          )}
        </div>

        {/* Active Focus Banner with Quick Return to All Terminals */}
        {(activeZoneObj || activePreset !== 'overview' || speakerCategoryFilter !== 'all') && (
          <div className="skeuo-chassis flex flex-wrap items-center justify-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs text-slate-900">
            <div className="skeuo-lcd flex items-center gap-1.5 px-2.5 py-1">
              <Focus className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] text-slate-400 font-bold">Fokus:</span>
              <span className="font-extrabold text-sky-300">
                {activeZoneObj
                  ? `${activeZoneObj.code} — ${activeZoneObj.name}`
                  : activePreset === 'lantai1'
                  ? 'Mockup Lantai 1 (Terminal Utama, Eksisting & Selatan — Klaim Bagasi & BHS)'
                  : activePreset === 'lantai1_eksisting'
                  ? 'AIRPORT TECHNOLOGY / ELBAN UPG'
                  : activePreset === 'lantai1_eksisting_ruangan'
                  ? 'AIRPORT TECHNOLOGY / ELBAN UPG'
                  : activePreset === 'lantai2'
                  ? 'Mockup Lantai 2 (Terminal Utama, Eksisting & Selatan)'
                  : activePreset === 'lantai3'
                  ? 'Mockup Lt. 3 Terminal Utama (3 Void Oval, 5 Bay Depan, Restroom & Concourse)'
                  : activePreset === 'curbside'
                  ? 'Tampilan Depan Terminal Utama & Jalanan'
                  : activePreset === 'tower'
                  ? 'Menara ATC Sultan Hasanuddin (WAAA)'
                  : activePreset === 'tollgate'
                  ? 'Gerbang Tol Bandara Internasional Sultan Hasanuddin (GTO 6 Lajur)'
                  : 'Kompleks Terminal Sultan Hasanuddin'}
              </span>
              {speakerCategoryFilter !== 'all' && (
                <span className="ml-1 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-bold">
                  Filter: {speakerCategoryFilter.toUpperCase()} SPEAKER
                </span>
              )}
            </div>

            {isLantai1Active && (
              <button
                onClick={() => handleOpenRedMarkedRoomComplex(null)}
                className="skeuo-btn-emerald flex items-center gap-1 px-2.5 py-1 font-extrabold text-[11px] cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>AIRPORT TECHNOLOGY / ELBAN UPG</span>
              </button>
            )}

            {activePreset === 'lantai1_eksisting_ruangan' && (
              <button
                onClick={() => handleSelectPreset('lantai1_eksisting')}
                className="skeuo-btn-amber flex items-center gap-1 px-2.5 py-1 font-extrabold text-[11px] cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Kembali ke Lt. 1 Eksisting</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowEksistingRoomPanel(false);
                setShowPaBlockDiagramPanel(true);
                if (activePreset === 'lantai2') {
                  handleFocusEksistingPaNode('lt2_overview');
                } else {
                  handleFocusEksistingPaNode('lt1_overview');
                }
              }}
              className="skeuo-btn-emerald flex items-center gap-1 px-2.5 py-1 font-extrabold text-[11px] cursor-pointer"
              title="Buka Blok Diagram Sistem Public Address Terminal Eksisting Lantai 1 & 2"
            >
              <Volume2 className="w-3 h-3" />
              <span>Blok Diagram PA Eksisting (Lt. 1 & 2)</span>
            </button>

            <button
              onClick={() => {
                handleSelectPreset('overview');
                handleSelectSpeakerCategory('all');
              }}
              className="skeuo-btn-sky flex items-center gap-1 px-2.5 py-1 font-extrabold text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Tampilan</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Panel: Blok Diagram Sistem Public Address Terminal Eksisting Lantai 1 & 2 (097/ABD-MEP/F.DBG-BSH/V/2025) */}
      {showPaBlockDiagramPanel && (
        <div
          style={{
            fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
          }}
          className="font-violet-sans absolute top-20 right-4 bottom-28 z-30 w-[390px] sm:w-[495px] flex flex-col rounded-2xl bg-slate-900/95 border-2 border-emerald-500/85 shadow-2xl overflow-hidden backdrop-blur-md select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30" />
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Blok Diagram PA — Terminal Eksisting (Lt. 1 & 2)
                </h3>
                <p className="text-[10px] text-emerald-300 font-mono">
                  097/ABD-MEP/F.DBG-BSH/V/2025 • WIKA-ABD-BSH-ES-TE-0001C-00
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFocusEksistingPaNode('lt1_overview')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  activePreset === 'lantai1_eksisting' || activePreset === 'lantai1'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                }`}
              >
                3D Lt. 1
              </button>
              <button
                type="button"
                onClick={() => handleFocusEksistingPaNode('lt2_overview')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  activePreset === 'lantai2'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                }`}
              >
                3D Lt. 2
              </button>
              <button
                type="button"
                onClick={() => setShowPaBlockDiagramPanel(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Tutup Panel Blok Diagram PA"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/90 text-[10px] font-extrabold">
            <button
              type="button"
              onClick={() => setPaBlockTab('schematic')}
              className={`py-2 text-center transition-colors cursor-pointer ${
                paBlockTab === 'schematic'
                  ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rack 42U & MDF-SS
            </button>
            <button
              type="button"
              onClick={() => {
                setPaBlockTab('lt1');
                handleFocusEksistingPaNode('lt1_overview');
              }}
              className={`py-2 text-center transition-colors cursor-pointer ${
                paBlockTab === 'lt1'
                  ? 'bg-sky-500/20 text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lantai 1 (JBSS 1.3 & 1.7)
            </button>
            <button
              type="button"
              onClick={() => {
                setPaBlockTab('lt2');
                handleFocusEksistingPaNode('lt2_overview');
              }}
              className={`py-2 text-center transition-colors cursor-pointer ${
                paBlockTab === 'lt2'
                  ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lantai 2 (JBSS 2.2 & 2.4)
            </button>
            <button
              type="button"
              onClick={() => setPaBlockTab('abd_sheets')}
              className={`py-2 text-center transition-colors cursor-pointer ${
                paBlockTab === 'abd_sheets'
                  ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gambar ABD PDF
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {/* Quick 3D Camera Focus Bar for MDF-SS & 4 JBSS Boxes */}
            <div className="rounded-xl border border-emerald-500/50 bg-slate-950 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Focus className="w-3.5 h-3.5" /> Fokus Kamera 3D ke Titik Distribusi PA:
                </span>
                <span className="font-mono text-slate-400">Klik untuk Zoom 3D</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'mdf_ss', label: 'MDF-SS & Rack', sub: 'R. Kontrol Lt.1' },
                  { id: 'jbss_1_3', label: 'JBSS 1.3', sub: 'Lt.1 Timur' },
                  { id: 'jbss_1_7', label: 'JBSS 1.7', sub: 'Lt.1 Barat' },
                  { id: 'jbss_2_2', label: 'JBSS 2.2', sub: 'Lt.2 Intl' },
                  { id: 'jbss_2_4', label: 'JBSS 2.4', sub: 'Lt.2 Dom' },
                ].map((nd) => {
                  const isActive = activePaNodeId === nd.id;
                  return (
                    <button
                      key={nd.id}
                      type="button"
                      onClick={() =>
                        handleFocusEksistingPaNode(
                          nd.id as
                            | 'mdf_ss'
                            | 'jbss_1_3'
                            | 'jbss_1_7'
                            | 'jbss_2_2'
                            | 'jbss_2_4'
                        )
                      }
                      className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600/35 border-emerald-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 text-slate-300'
                      }`}
                    >
                      <div className="font-extrabold text-[10px] truncate">{nd.label}</div>
                      <div className="text-[8px] text-emerald-300/90 font-mono truncate">{nd.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {paBlockTab === 'schematic' && (
              <div className="space-y-3">
                {/* Block 1: Input Sources & Server Room Rack 05 TE */}
                <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-[10px] font-bold">
                      1. INPUT AUDIO, PAGING MIC & R. SERVER (RACK 05 TE)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">UTP Cat.6 & FO OS2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-sky-300">Announcing & Car Call</div>
                      <div className="text-slate-300 mt-0.5">
                        • 1× Paging Mic + PC (Announcing Room)
                        <br />• 1× Paging Mic + PC (Car Call)
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-sky-300">Gate Area Paging Mic</div>
                      <div className="text-slate-300 mt-0.5">
                        • 12× Gate Area Paging Mic
                        <br />• 6× Lt. 1 & 13× Lt. 2 Paging Mic
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-emerald-300">Rack 05 TE & 3× Barix Dante</div>
                      <div className="text-slate-300 mt-0.5">
                        • 3× Barix Audio Encoder/Decoder
                        <br />• JBRD 1.6 (TE) + Music Player BGM
                        <br />• Interkoneksi MCFA TE (FRC 2×1.5mm²)
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-amber-300">Interkoneksi Fiber Optic</div>
                      <div className="text-slate-300 mt-0.5">
                        • 2×24 Core F.O Cable OS2
                        <br />• JBRD 2.3 OTB to TU (Port 13 & 14)
                        <br />• JBRD 2.3 OTB to GP (Port 13 & 14)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block 2: Free Standing Rack 42U (WIKA-ABD-BSH-ES-TE-0002-00) */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold">
                      2. FREE STANDING RACK 42U (2000×600mm) & MDF-SS
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFocusEksistingPaNode('mdf_ss')}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Lihat 3D Rack
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="px-2.5 py-1 rounded bg-sky-950/80 border border-sky-500/40 text-sky-200 flex justify-between">
                      <span>HUB SWITCH 24-PORT GIGABIT</span>
                      <span>UTP CAT.6 / AC 220V</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-sky-950/80 border border-sky-500/40 text-sky-200 flex justify-between">
                      <span>PRAESIDIO NETWORK CONTROLLER (NCO)</span>
                      <span>AUDIO LINK / AC 220V</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex justify-between">
                      <span>PRASENSA NETWORK CONTROLLER (SYSCONT)</span>
                      <span>OMNEO / AC 220V</span>
                    </div>
                    {[
                      { unit: 'AMP #1 (PA)', target: 'JBSS 2.4 LT. 2 (Public Area Z1–Z4)', emergency: false },
                      { unit: 'AMP #2 (DAR)', target: 'JBSS 2.4 LT. 2 (Emergency Z1–Z4)', emergency: true },
                      { unit: 'AMP #3 (PA)', target: 'JBSS 2.2 LT. 2 (Public Area Z1–Z4)', emergency: false },
                      { unit: 'AMP #4 (DAR)', target: 'JBSS 2.2 LT. 2 (Emergency Z1–Z4)', emergency: true },
                      { unit: 'AMP #5 (PA)', target: 'JBSS 1.7 LT. 1 (Public Area Z1–Z4)', emergency: false },
                      { unit: 'AMP #6 (DAR)', target: 'JBSS 1.7 LT. 1 (Emergency Z1–Z4)', emergency: true },
                      { unit: 'AMP #7 (PA)', target: 'JBSS 1.3 LT. 1 (Public Area Z1–Z4)', emergency: false },
                      { unit: 'AMP #8 (DAR)', target: 'JBSS 1.3 LT. 1 (Emergency Z1–Z4)', emergency: true },
                      { unit: 'AMP #9 (DAR)', target: 'JBSS B1.2 LT. BASEMENT (Emergency)', emergency: true },
                    ].map((amp, idx) => (
                      <div
                        key={idx}
                        className={`px-2.5 py-1 rounded border flex items-center justify-between ${
                          amp.emergency
                            ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                            : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span className="font-bold">PRASENSA 600W 4CH — {amp.unit}</span>
                        <span className="text-[9px]">{amp.target}</span>
                      </div>
                    ))}
                    <div className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-200 flex justify-between">
                      <span>PRASENSA MASTER POWER SUPPLY + MUSIC PLAYER</span>
                      <span>48 VAC / 220 VAC</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded bg-amber-500/20 border border-amber-400 text-amber-200 font-bold text-center">
                      MDF-SS → Kabel Tray NYMHY 3×2.5 mm² & Conduit Ø20mm NYMHY 3×1.5 mm²
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paBlockTab === 'lt1' && (
              <div className="space-y-3">
                {/* JBSS 1.3 Card */}
                <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-sky-300">
                        JBSS 1.3 (JBSS-1.3.Z1.2) — Lantai 1 Timur (Grid C-D / 18-21)
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Total: 142 Ceiling 6W (852W) • 11 Column 15W (165W) • 3 Wall 6W (18W) • 3 AVC
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFocusEksistingPaNode('jbss_1_3')}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Fokus 3D JBSS 1.3
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-sky-300 font-bold">JBSS Z3.1.1 (Public Area)</span>
                      <span className="text-slate-200">16 Ceiling 6W • 11 Column 15W • 3 Wall 6W</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-sky-300 font-bold">JBSS Z3.1.2 (Public Area)</span>
                      <span className="text-slate-200">36 bh Ceiling Speaker 6W (216W)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-sky-300 font-bold">JBSS Z3.1.3 (Public / Transit)</span>
                      <span className="text-slate-200">27 bh Ceiling Speaker 6W (162W)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z3.1.4 (Emergency)</span>
                      <span className="text-rose-100">25 Ceiling 6W (Office, R.ME, Tangga Darurat)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z3.1.5 (Emergency)</span>
                      <span className="text-rose-100">38 Ceiling 6W (Kantin, Toilet, AOCC & FLOPS)</span>
                    </div>
                  </div>
                </div>

                {/* JBSS 1.7 Card */}
                <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-sky-300">
                        JBSS 1.7 (JBSS-1.7.Z1.2) — Lantai 1 Barat (Grid C-D / 28-30)
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Total: 200 Ceiling 6W (1200W) • 20 Column 15W (240W) • 3 Wall 6W (18W) • 6 AVC
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFocusEksistingPaNode('jbss_1_7')}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Fokus 3D JBSS 1.7
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-sky-300 font-bold">JBSS Z7.1.1 (Public Domestik)</span>
                      <span className="text-slate-200">40 bh Ceiling Speaker 6W (240W)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-sky-300 font-bold">JBSS Z7.1.2 (Public Domestik)</span>
                      <span className="text-slate-200">42 bh Ceiling 6W (30+12) • 8 bh Column 15W</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z7.1.3 (Emergency)</span>
                      <span className="text-rose-100">89 bh Ceiling Speaker 6W (58+31 • 534W)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z7.1.4 (Emergency)</span>
                      <span className="text-rose-100">28 bh Ceiling Speaker 6W (168W)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z7.1.5 (Emergency)</span>
                      <span className="text-rose-100">13 Ceiling 6W • 12 Column 15W • 3 Wall 6W</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paBlockTab === 'lt2' && (
              <div className="space-y-3">
                {/* JBSS 2.2 Card */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-emerald-300">
                        JBSS 2.2 (JBSS-2.2.Z2.2) — Lantai 2 Timur (Keberangkatan Internasional)
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Total: 71 Ceiling 6W (426W) • 19 Column 15W (285W) • 8 Wall 6W (48W)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFocusEksistingPaNode('jbss_2_2')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Fokus 3D JBSS 2.2
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-emerald-300 font-bold">JBSS Z2.1.1 (Public Intl)</span>
                      <span className="text-slate-200">25 bh Ceiling Speaker 6W (Gate 11–12)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-emerald-300 font-bold">JBSS Z2.1.2 (Public Intl)</span>
                      <span className="text-slate-200">29 bh Ceiling 6W • 8 bh Wall Speaker 6W (Gate 10)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z2.1.3 (Emergency)</span>
                      <span className="text-rose-100">20× Ceiling 6W • 19× Column 15W (Office, Tenant, Mushala)</span>
                    </div>
                  </div>
                </div>

                {/* JBSS 2.4 Card */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-emerald-300">
                        JBSS 2.4 (JBSS-2.4.Z4.2) — Lantai 2 Barat (Keberangkatan Domestik)
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Total: 53 Ceiling 6W (318W) • 20 Column 15W (300W) • 5 Wall 6W • 13 AVC • 6 Mic
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFocusEksistingPaNode('jbss_2_4')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Fokus 3D JBSS 2.4
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-emerald-300 font-bold">JBSS Z4.1.1 (Public Domestik)</span>
                      <span className="text-slate-200">5 bh Wall Speaker 6W (38x Skematik • Koridor Domestik)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-emerald-300 font-bold">JBSS Z4.1.2 (Public Domestik)</span>
                      <span className="text-slate-200">29 bh Ceiling Speaker 6W (174W • Gate 09)</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                      <span className="text-emerald-300 font-bold">JBSS Z4.1.3 (Public Domestik)</span>
                      <span className="text-slate-200">40 bh Ceiling Speaker 6W (240W • Gate 07–08)</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40 flex justify-between">
                      <span className="text-rose-300 font-bold">JBSS Z4.1.4 (Emergency)</span>
                      <span className="text-rose-100">5 Ceiling 6W • 20 Column 15W (Boarding Lounge & Koridor)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paBlockTab === 'abd_sheets' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '0001c', label: '0001C-00: Diagram Skematik PA' },
                    { id: '0002', label: '0002-00: Detail Rack 42U' },
                    { id: '0102', label: '0102-00: Instalasi PA Lt. 1' },
                    { id: '0103', label: '0103-00: Instalasi PA Lt. 2' },
                    { id: 'jbss_lt1', label: 'Kabel Distribusi JBSS Lt. 1' },
                    { id: 'jbss_lt2', label: 'Kabel Distribusi JBSS Lt. 2' },
                  ].map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() =>
                        setSelectedAbdSheet(
                          sh.id as '0001c' | '0002' | '0102' | '0103' | 'jbss_lt1' | 'jbss_lt2'
                        )
                      }
                      className={`p-1.5 rounded-lg border text-left text-[10px] font-bold cursor-pointer ${
                        selectedAbdSheet === sh.id
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/40'
                      }`}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-white p-1">
                  <img
                    src={
                      selectedAbdSheet === '0001c'
                        ? '/assets/aistudio/abd_eksisting/diagram_skematik_pa_te.png'
                        : selectedAbdSheet === '0002'
                        ? '/assets/aistudio/abd_eksisting/detail_rack_amplifier_te.png'
                        : selectedAbdSheet === '0102'
                        ? '/assets/aistudio/abd_eksisting/instalasi_pa_lt1_te.png'
                        : selectedAbdSheet === '0103'
                        ? '/assets/aistudio/abd_eksisting/instalasi_pa_lt2_te.png'
                        : selectedAbdSheet === 'jbss_lt1'
                        ? '/assets/aistudio/abd_eksisting/kabel_distribusi_jbss_lt1_te.png'
                        : '/assets/aistudio/abd_eksisting/kabel_distribusi_jbss_lt2_te.png'
                    }
                    alt="As-Built Drawing Public Address Terminal Eksisting"
                    className="w-full h-auto max-h-64 object-contain mx-auto rotate-180"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="font-mono text-slate-400">
                    Dokumen: 097/ABD-MEP/F.DBG-BSH/V/2025
                  </span>
                  <a
                    href={
                      selectedAbdSheet === '0001c'
                        ? '/assets/aistudio/abd_eksisting/diagram_skematik_pa_te.png'
                        : selectedAbdSheet === '0002'
                        ? '/assets/aistudio/abd_eksisting/detail_rack_amplifier_te.png'
                        : selectedAbdSheet === '0102'
                        ? '/assets/aistudio/abd_eksisting/instalasi_pa_lt1_te.png'
                        : selectedAbdSheet === '0103'
                        ? '/assets/aistudio/abd_eksisting/instalasi_pa_lt2_te.png'
                        : selectedAbdSheet === 'jbss_lt1'
                        ? '/assets/aistudio/abd_eksisting/kabel_distribusi_jbss_lt1_te.png'
                        : '/assets/aistudio/abd_eksisting/kabel_distribusi_jbss_lt2_te.png'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    Buka Gambar Penuh
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Detail Panel for Green-Marked Room 1 (Tampilan Depan, Belakang, Kanan, Kiri) & Rooms 1–6 */}
      {showEksistingRoomPanel && (
        <div className="absolute top-20 right-4 bottom-28 z-30 w-[370px] sm:w-[450px] flex flex-col rounded-2xl bg-slate-900/95 border-2 border-emerald-500/85 shadow-2xl overflow-hidden backdrop-blur-md select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30" />
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  3D Ruangan Area Hijau (Lt. 1 Eksisting)
                </h3>
                <p className="text-[10px] text-emerald-300 font-mono">
                  Tampilan Depan • Belakang • Kanan • Kiri
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSelectPreset('lantai1_eksisting')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-emerald-300 transition-colors cursor-pointer"
                title="Zoom Out ke Denah Penuh Lt. 1 Eksisting"
              >
                Denah Penuh
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEksistingRoomPanel(false);
                  setSelectedEksistingRoomCode(null);
                  managerRef.current?.highlightEksistingRoomCode(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Tutup Panel Detail Ruangan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {/* 3D Directional Camera Selector for Green-Marked Room 1 (Depan, Belakang, Kanan, Kiri, Denah Hijau) */}
            <div className="rounded-xl border-2 border-emerald-500/80 bg-slate-950 p-2.5 shadow-inner space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Kamera 3D & Posisi Tampilan (Area Hijau)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono text-emerald-300">
                  1. R. Standby
                </span>
              </div>

              {/* 5 Directional View Buttons (Denah Hijau + 4 Sisi: Depan, Belakang, Kanan, Kiri) */}
              <div className="grid grid-cols-2 gap-1.5">
                {ROOM1_DIRECTIONAL_VIEWS.map((viewItem, idx) => {
                  const isCurrentView =
                    (selectedEksistingRoomCode === 1 || selectedEksistingRoomCode === null) &&
                    room1DirectionView === viewItem.id;
                  return (
                    <button
                      key={viewItem.id}
                      type="button"
                      onClick={() => handleSelectRoom1Direction(viewItem.id)}
                      className={`${
                        idx === 0 ? 'col-span-2' : ''
                      } flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isCurrentView
                          ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/60'
                          : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Eye className={`w-3.5 h-3.5 shrink-0 ${isCurrentView ? 'text-emerald-300' : 'text-slate-400'}`} />
                        <span className="font-bold text-[11px] truncate">{viewItem.label}</span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-300/90 ml-1 shrink-0">
                        3D View
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Directional Reference Image & Matched File Name */}
              {(() => {
                const activeViewObj =
                  ROOM1_DIRECTIONAL_VIEWS.find((v) => v.id === room1DirectionView) ||
                  ROOM1_DIRECTIONAL_VIEWS[0];
                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                      <span className="font-bold text-emerald-300">{activeViewObj.label}</span>
                      <span className="font-mono text-[9px] text-slate-400 truncate ml-2">
                        File: {activeViewObj.fileName}
                      </span>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 bg-black">
                      <img
                        src={activeViewObj.imgSrc}
                        alt={activeViewObj.label}
                        className="w-full max-h-48 object-contain mx-auto"
                      />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded bg-slate-950/85 border border-emerald-500/40 text-[10px] text-emerald-200 font-mono flex items-center justify-between">
                        <span>{activeViewObj.wallSide}</span>
                        <span className="text-white font-bold">Mode 3D Aktif</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed px-0.5">
                      {activeViewObj.description}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Room Code Legend & Interactive Selector Grid (1. R. Standby .. 6. Data Center Baru) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Daftar Kode Ruangan (1 – 6):
                </span>
                {selectedEksistingRoomCode !== null && (
                  <button
                    type="button"
                    onClick={() => handleOpenRedMarkedRoomComplex(null)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    Overview Semua (1–6)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EKSISTING_RED_BOX_ROOMS.map((room) => {
                  const isSelected = selectedEksistingRoomCode === room.code;
                  return (
                    <button
                      key={room.code}
                      type="button"
                      onClick={() =>
                        handleOpenRedMarkedRoomComplex(isSelected ? null : room.code)
                      }
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/50'
                          : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border ${room.badgeColor}`}
                      >
                        {room.code}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-[11px] truncate text-white">
                          {room.label}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">
                          {room.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Room Technical Inspection Card (or Overview of All 6 Rooms) */}
            {activeRoomDetail ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold">
                    KODE RUANGAN #{activeRoomDetail.code}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activeRoomDetail.location}
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {activeRoomDetail.label} — {activeRoomDetail.title}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeRoomDetail.description}
                </p>
                <div className="pt-1 border-t border-slate-800/80">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Fasilitas & Perangkat 3D di Dalam Ruangan:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeRoomDetail.equipment.map((eq, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-emerald-300 font-medium"
                      >
                        • {eq}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ringkasan Kompleks Ruangan Lt. 1 Eksisting</span>
                </div>
                <ul className="space-y-1 text-[10px] text-slate-300 font-mono">
                  <li>
                    <strong className="text-emerald-400">1. R. Standby (Kotak Hijau):</strong> 3D 4 arah (Tampilan Depan, Belakang, Kanan, Kiri)
                  </li>
                  <li>
                    <strong className="text-amber-400">2. Storage:</strong> Gudang logistik & rak suku cadang (Sayap Kanan)
                  </li>
                  <li>
                    <strong className="text-teal-400">3. restroom:</strong> Fasilitas toilet & sanitasi staf (Sayap Kanan & Blok Atas)
                  </li>
                  <li>
                    <strong className="text-indigo-400">4. control room:</strong> Ruang kontrol NOC & meja operator 6 kursi
                  </li>
                  <li>
                    <strong className="text-rose-400">5. data center lama:</strong> Ruang server eksisting (2 baris rak hitam)
                  </li>
                  <li>
                    <strong className="text-emerald-400">6. data center baru:</strong> Ruang server utama baru (4 baris rak high-density)
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Reference Masterplan & 3D Pixar Speaker Picture-in-Picture Card */}
      {showMasterplanPip && (
        <div className="absolute top-20 right-4 z-30 w-80 sm:w-96 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Referensi Visual & Perangkat Akustik WAAA</span>
            </div>
            <button
              onClick={() => setShowMasterplanPip(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex border-b border-slate-800 bg-slate-900 text-[11px] font-medium">
            <button
              onClick={() => setPipTab('speaker')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'speaker'
                  ? 'bg-sky-500/20 text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Speaker
            </button>
            <button
              onClick={() => setPipTab('lantai1')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'lantai1'
                  ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lantai 1
            </button>
            <button
              onClick={() => setPipTab('lantai2')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'lantai2'
                  ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lantai 2
            </button>
            <button
              onClick={() => setPipTab('lantai3')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'lantai3'
                  ? 'bg-sky-500/20 text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lt. 3 Utama
            </button>
            <button
              onClick={() => setPipTab('parkir')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'parkir'
                  ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Parkir
            </button>
            <button
              onClick={() => setPipTab('masterplan')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'masterplan'
                  ? 'bg-indigo-500/20 text-indigo-300 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Masterplan
            </button>
          </div>
          <div className="p-2 bg-slate-950">
            <img
              src={
                pipTab === 'speaker'
                  ? '/assets/aistudio/image_58915406.png'
                  : pipTab === 'lantai1'
                  ? '/assets/aistudio/lantai1_eksisting_room_ref.png'
                  : pipTab === 'lantai2'
                  ? '/assets/aistudio/Tanpa_judul__920_x_197_mm___1__606ea6fe.png'
                  : pipTab === 'lantai3'
                  ? '/assets/aistudio/lt3_terminal_utama_ref.jpg'
                  : pipTab === 'parkir'
                  ? '/assets/aistudio/Terminal_Selatan__1__b9bc7e87.png'
                  : '/assets/aistudio/1_47a27264.png'
              }
              alt="Referensi Bandara Sultan Hasanuddin Makassar"
              className="w-full h-auto max-h-56 rounded-lg border border-slate-800 object-contain bg-slate-900"
            />
            {pipTab === 'speaker' && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-center">
                  <img
                    src="/assets/aistudio/speaker_tiang_depan.jpg"
                    alt="Bosch Horn Speaker Tampak Depan"
                    className="w-full h-24 object-contain rounded bg-white"
                  />
                  <div className="mt-1 text-[9px] font-mono text-amber-300 font-semibold">
                    Bosch Horn — Tampak Depan
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-center">
                  <img
                    src="/assets/aistudio/speaker_tiang_samping.jpg"
                    alt="Bosch Horn Speaker Tampak Samping"
                    className="w-full h-24 object-contain rounded bg-white"
                  />
                  <div className="mt-1 text-[9px] font-mono text-amber-300 font-semibold">
                    Bosch Horn — Tampak Samping
                  </div>
                </div>
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-300">
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-sky-400 font-bold">●</span> Ceiling ({ceilingCount})
              </div>
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-emerald-400 font-bold">●</span> Column ({columnCount})
              </div>
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-amber-400 font-bold">●</span> Horn ({hornCount})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3D Interaction Hints */}
      <div className="absolute top-3 right-4 z-10 hidden 2xl:flex flex-col gap-1 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 select-none">
        <div className="flex items-center justify-between gap-3">
          <span>Rotate:</span>
          <span className="text-slate-200">Klik Kiri + Geser</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Pan:</span>
          <span className="text-slate-200">Klik Kanan + Geser</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Zoom:</span>
          <span className="text-slate-200">Scroll Roda Mouse</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Fokus Cepat:</span>
          <span className="text-sky-300">Tombol 1–5 / 0 (All)</span>
        </div>
      </div>

      {/* Left Sidebar Drawer for 3D Pixar Speaker Categories & Status (Skeuomorphism + Violet Sans) */}
      <div
        style={{
          fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
        }}
        className={`font-violet-sans absolute top-16 bottom-28 left-0 z-20 hidden md:flex items-start transition-transform duration-300 ease-in-out select-none ${
          isSpeakerLegendMinimized ? '-translate-x-72' : 'translate-x-0'
        }`}
      >
        {/* Drawer Sidebar Panel (Skeuomorphic Brushed Hardware Chassis) */}
        <aside
          style={{
            fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
          }}
          className="font-violet-sans skeuo-chassis w-72 h-full max-h-[445px] flex flex-col justify-between gap-2.5 p-3.5 rounded-r-2xl border-l-0 text-[11px] text-slate-900 overflow-y-auto"
        >
          <div className="flex flex-col gap-2.5">
            {/* Drawer Header (Recessed LCD Display & Tactile Controls) */}
            <div className="flex items-center justify-between border-b border-slate-400/90 pb-2">
              <div className="skeuo-lcd flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 border border-sky-900 shadow-[0_0_6px_#38bdf8,inset_0_1px_1px_#fff]" />
                <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0 stroke-[2.2]" />
                <span>Kategori Speaker 3D Pixar</span>
              </div>
              <div className="flex items-center gap-1.5">
                {speakerCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleSelectSpeakerCategory('all')}
                    className="skeuo-btn px-2 py-0.5 text-[10px] font-bold text-slate-800 cursor-pointer"
                  >
                    Semua ({speakers.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSpeakerLegendMinimized(true)}
                  className="skeuo-btn p-1.5 text-slate-800 cursor-pointer"
                  title="Tutup Left Sidebar Drawer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Interactive Tactile Category Hardware Buttons */}
            <div className="skeuo-well p-2 rounded-xl flex flex-col gap-2">
              <button
                onClick={() => handleSelectSpeakerCategory('ceiling')}
                className={`text-left p-2.5 transition-all cursor-pointer ${
                  speakerCategoryFilter === 'ceiling'
                    ? 'skeuo-btn-sky skeuo-btn-pressed'
                    : 'skeuo-card hover:brightness-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        speakerCategoryFilter === 'ceiling'
                          ? 'bg-sky-300 border-sky-900 shadow-[0_0_8px_#38bdf8,inset_0_1px_1px_#fff]'
                          : 'bg-sky-500 border-sky-900 shadow-[0_0_4px_#0ea5e9]'
                      }`}
                    />
                    <span>Ceiling Speaker</span>
                  </span>
                  <span className="skeuo-lcd px-2 py-0.5 text-[10px] font-bold text-sky-300">
                    {ceilingCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 font-semibold leading-tight mt-1.5">
                  Plafon terminal (Ruang Tunggu, Check-in, Bagasi)
                </div>
              </button>

              <button
                onClick={() => handleSelectSpeakerCategory('column')}
                className={`text-left p-2.5 transition-all cursor-pointer ${
                  speakerCategoryFilter === 'column'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed'
                    : 'skeuo-card hover:brightness-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        speakerCategoryFilter === 'column'
                          ? 'bg-emerald-300 border-emerald-900 shadow-[0_0_8px_#34d399,inset_0_1px_1px_#fff]'
                          : 'bg-emerald-500 border-emerald-900 shadow-[0_0_4px_#10b981]'
                      }`}
                    />
                    <span>Column Speaker</span>
                  </span>
                  <span className="skeuo-lcd px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {columnCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 font-semibold leading-tight mt-1.5">
                  Dinding pilar & koridor (Jangkauan horizontal jauh)
                </div>
              </button>

              <button
                onClick={() => handleSelectSpeakerCategory('horn')}
                className={`text-left p-2.5 transition-all cursor-pointer ${
                  speakerCategoryFilter === 'horn'
                    ? 'skeuo-btn-amber skeuo-btn-pressed'
                    : 'skeuo-card hover:brightness-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between font-extrabold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        speakerCategoryFilter === 'horn'
                          ? 'bg-amber-300 border-amber-900 shadow-[0_0_8px_#facc15,inset_0_1px_1px_#fff]'
                          : 'bg-amber-500 border-amber-900 shadow-[0_0_4px_#f59e0b]'
                      }`}
                    />
                    <span>Horn Speaker</span>
                  </span>
                  <span className="skeuo-lcd px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {hornCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 font-semibold leading-tight mt-1.5">
                  Tiang Gedung Parkir (Basement, Lt. 1–3), Tiang Garbarata & Apron
                </div>
              </button>
            </div>
          </div>

          {/* Recessed Digital LCD Status Indicator Footer */}
          <div className="skeuo-lcd p-2.5 grid grid-cols-2 gap-1.5 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-900 shadow-[0_0_6px_#10b981,inset_0_1px_1px_#fff]" />
              <span>Online ({speakers.length})</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-sky-900 shadow-[0_0_6px_#38bdf8] animate-pulse" />
              <span>Menyiarkan</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-900 shadow-[0_0_6px_#f59e0b,inset_0_1px_1px_#fff]" />
              <span>Pilot Fault</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-950 shadow-[0_0_6px_#f43f5e,inset_0_1px_1px_#fff]" />
              <span>Darurat EN54</span>
            </div>
          </div>
        </aside>

        {/* Protruding Left-Edge Skeuomorphic Drawer Toggle Handle Tab */}
        <button
          type="button"
          onClick={() => setIsSpeakerLegendMinimized((prev) => !prev)}
          className="skeuo-btn mt-3 flex items-center gap-1.5 px-2.5 py-2.5 !rounded-l-none !rounded-r-xl border-l-0 text-slate-900 font-extrabold cursor-pointer"
          title={
            isSpeakerLegendMinimized
              ? 'Buka Left Sidebar Kategori Speaker'
              : 'Sembunyikan Left Sidebar Kategori Speaker'
          }
        >
          {isSpeakerLegendMinimized ? (
            <>
              <span className="w-2 h-2 rounded-full bg-sky-500 border border-sky-900 shadow-[0_0_6px_#0ea5e9]" />
              <PanelLeftOpen className="w-4 h-4 shrink-0 text-slate-800 stroke-[2.2]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 whitespace-nowrap">
                Speaker ({speakers.length})
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-800 stroke-[2.2]" />
            </>
          ) : (
            <ChevronLeft className="w-4 h-4 shrink-0 text-slate-800 stroke-[2.2]" />
          )}
        </button>
      </div>
    </div>
  );
};

