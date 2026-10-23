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
    fileName: 'Tampilan Depan (Tampilan_Depan_a8f44f77.jpeg)',
    imgSrc: '/assets/aistudio/Tampilan_Depan_a8f44f77.jpeg',
    wallSide: 'Sisi Depan (+X / Dinding Kiri Denah)',
    description:
      'Menghadap dinding depan: meja kerja PC kayu coklat + monitor putih, TV monitoring biru di dinding atas, dispenser silver, kulkas hitam motif emas, 8 galon air biru + tripod, dan tempat sampah stainless bulat.',
  },
  {
    id: 'belakang',
    label: 'Tampilan Belakang',
    shortLabel: 'Tampilan Belakang',
    fileName: 'Tampilan Belakang (Tampilan_Belakang_2314ea8a.jpeg)',
    imgSrc: '/assets/aistudio/Tampilan_Belakang_2314ea8a.jpeg',
    wallSide: 'Sisi Belakang (-X / Dinding Kanan Denah)',
    description:
      'Menghadap sisi belakang: kursi tunggu bandara 4 dudukan warna hijau & biru-hijau di kanan, serta bukaan lorong di kiri dengan standing bracket TV hitam 2 tiang dan tabung APAR merah + rambu segitiga.',
  },
  {
    id: 'kanan',
    label: 'Tampilan Kanan',
    shortLabel: 'Tampilan Kanan',
    fileName: 'Tampilan Kanan (Tampilan_Kanan_7e5f03f3.jpeg)',
    imgSrc: '/assets/aistudio/Tampilan_Kanan_7e5f03f3.jpeg',
    wallSide: 'Sisi Kanan (+Z / Dinding Atas ke Control Room)',
    description:
      'Menghadap dinding kanan: pintu kaca kusen aluminium terbuka langsung menuju Ruangan 4 (Control Room), lemari kabinet rendah 3 susun hitam di tengah, dan jendela kaca gelap 3 panel di kanan.',
  },
  {
    id: 'kiri',
    label: 'Tampilan Kiri',
    shortLabel: 'Tampilan Kiri',
    fileName: 'Tampilan Kiri (Tampilan_kiri_634fbe9b.jpeg)',
    imgSrc: '/assets/aistudio/Tampilan_kiri_634fbe9b.jpeg',
    wallSide: 'Sisi Kiri (-Z / Dinding Bawah Denah)',
    description:
      'Menghadap dinding kiri: papan tulis (whiteboard) di kiri atas, TV layar datar hitam di kanan atas, sofa kain abu-abu 2 dudukan + tas ransel, meja tamu hitam (kardus & tumbler), serta 2 kursi kerja putar biru.',
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
  const [pipTab, setPipTab] = useState<'speaker' | 'lantai1' | 'lantai2' | 'parkir' | 'masterplan'>('speaker');
  const [speakerCategoryFilter, setSpeakerCategoryFilter] = useState<SpeakerCategory | 'all'>('all');
  const [isSpeakerLegendMinimized, setIsSpeakerLegendMinimized] = useState<boolean>(false);

  // Red-Marked Room Complex on Lt. 1 Eksisting state
  const [hotspotScreenPos, setHotspotScreenPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: -999,
    y: -999,
    visible: false,
  });
  const [showEksistingRoomPanel, setShowEksistingRoomPanel] = useState<boolean>(false);
  const [selectedEksistingRoomCode, setSelectedEksistingRoomCode] = useState<number | null>(null);
  const [room1DirectionView, setRoom1DirectionView] = useState<Room1DirectionType>('top');

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

      {/* Top Floating Camera Focus & Visualizer Mode Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 w-max max-w-[96vw]">
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl text-xs select-none backdrop-blur-md">
          {/* Camera Focus Presets */}
          <span className="text-[10px] uppercase font-mono text-slate-400 mr-1 flex items-center gap-1 font-semibold">
            <Compass className="w-3.5 h-3.5 text-sky-400" /> Fokus WAAA:
          </span>

          <button
            onClick={() => handleSelectPreset('overview')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'overview' && !selectedZoneId
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilkan Seluruh Kompleks Terminal Bandara Sultan Hasanuddin Makassar (WAAA) beserta Atap Bandara"
          >
            <Building2 className="w-3 h-3" />
            <span>Semua Terminal</span>
          </button>

          <button
            onClick={() => handleSelectPreset('lantai1')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'lantai1'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-300 hover:bg-slate-800 border border-amber-500/30'
            }`}
            title="Tampilan Mockup Lantai 1 (Cutaway Area Klaim Bagasi, BHS Hall, Terminal Utama, Eksisting & Selatan)"
          >
            <Layers className="w-3 h-3" />
            <span>Mockup Lantai 1</span>
          </button>

          <button
            onClick={() => handleSelectPreset('lantai1_eksisting')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'lantai1_eksisting' || activePreset === 'lantai1_eksisting_ruangan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-200 hover:bg-slate-800 border border-amber-400/40 bg-amber-950/30'
            }`}
            title="Tampilan Khusus Mockup Lantai 1 — Terminal Eksisting (Sesuai Referensi Denah 3D Lantai 1 Terminal Eksisting)"
          >
            <Layers className="w-3 h-3" />
            <span>Lt. 1 Eksisting</span>
          </button>

          <button
            onClick={() => handleOpenRedMarkedRoomComplex(null)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border border-dashed ${
              activePreset === 'lantai1_eksisting_ruangan' && showEksistingRoomPanel
                ? 'bg-red-600 text-white border-red-200 shadow-sm'
                : 'text-red-300 hover:bg-red-950/60 border-red-500/60 bg-red-950/30'
            }`}
            title="Buka Ruangan Garis Merah pada Lt. 1 Eksisting (1. R. Standby, 2. Storage, 3. Restroom, 4. Control Room, 5. Data Center Lama, 6. Data Center Baru)"
          >
            <Server className="w-3 h-3 text-red-400" />
            <span>AIRPORT TECHNOLOGY</span>
          </button>

          <button
            onClick={() => handleSelectPreset('lantai2')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'lantai2'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
            }`}
            title="Tampilan Mockup Lantai 2 (Cutaway Terminal Utama, Terminal Eksisting & Terminal Selatan)"
          >
            <Layers className="w-3 h-3" />
            <span>Mockup Lantai 2</span>
          </button>

          <button
            onClick={() => handleSelectPreset('utama')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-1' || activePreset === 'utama'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 1: Terminal Utama"
          >
            Terminal Utama
          </button>

          <button
            onClick={() => handleSelectPreset('curbside')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activePreset === 'curbside'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilan di Depan Terminal Utama & Jalanan"
          >
            Depan Terminal & Jalanan
          </button>

          <button
            onClick={() => {
              if (activePreset === 'lantai1' || activePreset === 'lantai1_eksisting' || activePreset === 'lantai1_eksisting_ruangan') {
                handleSelectPreset('lantai1_eksisting');
              } else {
                handleSelectPreset('eksisting');
              }
            }}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-2' || activePreset === 'eksisting' || activePreset === 'lantai1_eksisting'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 2: Terminal Eksisting (Gate 07–12 / Mockup Lantai 1 Eksisting)"
          >
            Terminal Eksisting
          </button>

          <button
            onClick={() => handleSelectPreset('selatan')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-3' || activePreset === 'selatan'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 3: Terminal Selatan (Rotunda Gate 01–06)"
          >
            Terminal Selatan
          </button>

          <button
            onClick={() => handleSelectPreset('apron')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-4' || activePreset === 'apron'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 4: Apron, 12 Garbarata & Pesawat Parkir"
          >
            Apron & Garbarata
          </button>

          <button
            onClick={() => handleSelectPreset('parking')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-5' || activePreset === 'parking'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 5: Gedung Parkir, Jembatan Penghubung & Jalanan U-Loop"
          >
            Gedung Parkir
          </button>

          <button
            onClick={() => handleSelectPreset('tower')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activePreset === 'tower'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Menara Pengawas Lalu Lintas Udara (ATC Tower WAAA)"
          >
            ATC Tower
          </button>

          <button
            onClick={() => handleSelectPreset('tollgate')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activePreset === 'tollgate'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pintu Gerbang Tol Masuk Bandara Internasional Sultan Hasanuddin"
          >
            Gerbang Tol
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

          {/* Visualizer Mode Toggles */}
          <span className="text-[10px] uppercase font-mono text-slate-400 mr-1 flex items-center gap-1 font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Layer:
          </span>

          <button
            onClick={() => onSetVisualizerMode('bim_normal')}
            className={`px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              visualizerMode === 'bim_normal'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="BIM 3D Architectural View"
          >
            BIM 3D
          </button>

          <button
            onClick={() => onSetVisualizerMode('stipa_heatmap')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              visualizerMode === 'stipa_heatmap'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Speech Transmission Index (STI-PA) Heatmap"
          >
            <Activity className="w-3 h-3" />
            <span>STI-PA</span>
          </button>

          <button
            onClick={() => onSetVisualizerMode('cable_rstp')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              visualizerMode === 'cable_rstp'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="20kHz Pilot Tone Cable Network & Dual RSTP"
          >
            <Wifi className="w-3 h-3" />
            <span>Kabel RSTP</span>
          </button>

          <button
            onClick={() => setShowMasterplanPip(!showMasterplanPip)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              showMasterplanPip
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilkan / Sembunyikan Referensi Speaker 3D Pixar & Denah WAAA"
          >
            <MapIcon className="w-3 h-3" />
            <span>Referensi WAAA</span>
          </button>
        </div>

        {/* Active Focus Banner with Quick Return to All Terminals */}
        {(activeZoneObj || activePreset !== 'overview' || speakerCategoryFilter !== 'all') && (
          <div className="flex flex-wrap items-center justify-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-sky-500/40 shadow-lg text-xs text-slate-100 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <Focus className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-[11px] text-slate-400">Fokus:</span>
              <span className="font-bold text-sky-300">
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
                  : activePreset === 'curbside'
                  ? 'Tampilan Depan Terminal Utama & Jalanan'
                  : activePreset === 'tower'
                  ? 'Menara ATC Sultan Hasanuddin (WAAA)'
                  : activePreset === 'tollgate'
                  ? 'Gerbang Tol Bandara Internasional Sultan Hasanuddin (GTO 6 Lajur)'
                  : 'Kompleks Terminal Sultan Hasanuddin'}
              </span>
              {speakerCategoryFilter !== 'all' && (
                <span className="ml-1 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 font-mono text-[10px]">
                  Filter: {speakerCategoryFilter.toUpperCase()} SPEAKER
                </span>
              )}
            </div>

            {isLantai1Active && (
              <button
                onClick={() => handleOpenRedMarkedRoomComplex(null)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] border border-emerald-400/60 transition-colors cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>AIRPORT TECHNOLOGY / ELBAN UPG</span>
              </button>
            )}

            {activePreset === 'lantai1_eksisting_ruangan' && (
              <button
                onClick={() => handleSelectPreset('lantai1_eksisting')}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Kembali ke Lt. 1 Eksisting</span>
              </button>
            )}

            <button
              onClick={() => {
                handleSelectPreset('overview');
                handleSelectSpeakerCategory('all');
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Tampilan</span>
            </button>
          </div>
        )}
      </div>

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
                  : pipTab === 'parkir'
                  ? '/assets/aistudio/Terminal_Selatan__1__b9bc7e87.png'
                  : '/assets/aistudio/1_47a27264.png'
              }
              alt="Referensi Bandara Sultan Hasanuddin Makassar"
              className="w-full h-auto max-h-72 rounded-lg border border-slate-800 object-contain bg-slate-900"
            />
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

      {/* Left Sidebar Drawer for 3D Pixar Speaker Categories & Status */}
      <div
        className={`absolute top-16 bottom-28 left-0 z-20 hidden md:flex items-start transition-transform duration-300 ease-in-out select-none ${
          isSpeakerLegendMinimized ? '-translate-x-72' : 'translate-x-0'
        }`}
      >
        {/* Drawer Sidebar Panel */}
        <aside className="w-72 h-full max-h-[420px] flex flex-col justify-between gap-2.5 p-3.5 rounded-r-2xl bg-slate-900/95 border-y border-r border-slate-800 shadow-2xl text-[11px] font-mono text-slate-300 backdrop-blur-md overflow-y-auto">
          <div className="flex flex-col gap-2.5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>Kategori Speaker 3D Pixar</span>
              </div>
              <div className="flex items-center gap-1.5">
                {speakerCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleSelectSpeakerCategory('all')}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Semua ({speakers.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSpeakerLegendMinimized(true)}
                  className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Tutup Left Sidebar Drawer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Category Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSelectSpeakerCategory('ceiling')}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  speakerCategoryFilter === 'ceiling'
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-sky-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sky-300">
                  <span>◎ Ceiling Speaker</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-[10px]">
                    {ceilingCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans leading-tight mt-1">
                  Plafon terminal (Ruang Tunggu, Check-in, Bagasi)
                </div>
              </button>

              <button
                onClick={() => handleSelectSpeakerCategory('column')}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  speakerCategoryFilter === 'column'
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-emerald-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-emerald-300">
                  <span>▮ Column Speaker</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px]">
                    {columnCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans leading-tight mt-1">
                  Dinding pilar & koridor (Jangkauan horizontal jauh)
                </div>
              </button>

              <button
                onClick={() => handleSelectSpeakerCategory('horn')}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  speakerCategoryFilter === 'horn'
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-amber-500/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>◁ Horn Speaker</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px]">
                    {hornCount} Unit
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans leading-tight mt-1">
                  Area bising & terbuka luar ruangan (Apron / Drop-off)
                </div>
              </button>
            </div>
          </div>

          {/* Status Indicator Footer */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Online ({speakers.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Menyiarkan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pilot Fault</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Darurat EN54</span>
            </div>
          </div>
        </aside>

        {/* Protruding Left-Edge Drawer Toggle Handle Tab */}
        <button
          type="button"
          onClick={() => setIsSpeakerLegendMinimized((prev) => !prev)}
          className="mt-3 flex items-center gap-1.5 px-2.5 py-2.5 rounded-r-xl bg-slate-900/95 hover:bg-slate-800 border-y border-r border-slate-700 text-sky-400 hover:text-sky-300 shadow-xl backdrop-blur-md transition-colors cursor-pointer"
          title={
            isSpeakerLegendMinimized
              ? 'Buka Left Sidebar Kategori Speaker'
              : 'Sembunyikan Left Sidebar Kategori Speaker'
          }
        >
          {isSpeakerLegendMinimized ? (
            <>
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200 whitespace-nowrap">
                Speaker ({speakers.length})
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </>
          ) : (
            <ChevronLeft className="w-4 h-4 shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
};

