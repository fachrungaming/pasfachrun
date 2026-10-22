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
  X,
} from 'lucide-react';
import {
  AirportSceneManager,
  VisualizerMode,
  CameraPresetType,
} from '../three/AirportSceneManager';
import { MacroZone, IPSpeaker, ZoneId } from '../types/pa-system';

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
  onSceneManagerReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<AirportSceneManager | null>(null);
  const isPresetChangeRef = useRef<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPresetType>('overview');
  const [showMasterplanPip, setShowMasterplanPip] = useState<boolean>(false);
  const [pipTab, setPipTab] = useState<'parkir' | 'masterplan'>('parkir');

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
      }
    );

    manager.setTheme(theme);
    managerRef.current = manager;
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
      managerRef.current.selectZone('macro-1', true, false);
    } else if (selectedZoneId === 'macro-2') {
      setActivePreset('eksisting');
      managerRef.current.selectZone('macro-2', true, false);
    } else if (selectedZoneId === 'macro-3') {
      setActivePreset('selatan');
      managerRef.current.selectZone('macro-3', true, false);
    } else if (selectedZoneId === 'macro-4') {
      setActivePreset('apron');
      managerRef.current.selectZone('macro-4', true, false);
    } else if (selectedZoneId === 'macro-5') {
      setActivePreset('parking');
      managerRef.current.selectZone('macro-5', true, false);
    } else if (selectedZoneId === null) {
      setActivePreset('overview');
      managerRef.current.selectZone(null, true, false);
    }
  }, [selectedZoneId]);

  const handleSelectPreset = (preset: CameraPresetType) => {
    isPresetChangeRef.current = true;
    setActivePreset(preset);
    managerRef.current?.setCameraPreset(preset);
    setTimeout(() => {
      isPresetChangeRef.current = false;
    }, 50);
  };

  const activeZoneObj = selectedZoneId
    ? macroZones.find((z) => z.id === selectedZoneId)
    : null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden transition-colors duration-300 ${
        theme === 'light' ? 'bg-sky-100' : 'bg-slate-950'
      }`}
    >
      {/* Isolated Three.js WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

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
            title="Tampilkan Seluruh Kompleks Terminal Bandara Sultan Hasanuddin Makassar (WAAA)"
          >
            <Building2 className="w-3 h-3" />
            <span>Semua Terminal</span>
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
            onClick={() => handleSelectPreset('eksisting')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-2' || activePreset === 'eksisting'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 2: Terminal Eksisting (Gate 07–12)"
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
            title="Tampilkan / Sembunyikan Referensi Layout Masterplan Sultan Hasanuddin Makassar"
          >
            <MapIcon className="w-3 h-3" />
            <span>Denah WAAA</span>
          </button>
        </div>

        {/* Active Focus Banner with Quick Return to All Terminals */}
        {(activeZoneObj || activePreset !== 'overview') && (
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-sky-500/40 shadow-lg text-xs text-slate-100 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <Focus className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-[11px] text-slate-400">Fokus Kamera:</span>
              <span className="font-bold text-sky-300">
                {activeZoneObj
                  ? `${activeZoneObj.code} — ${activeZoneObj.name}`
                  : activePreset === 'curbside'
                  ? 'Tampilan Depan Terminal Utama & Jalanan'
                  : activePreset === 'tower'
                  ? 'Menara ATC Sultan Hasanuddin (WAAA)'
                  : 'Kompleks Terminal Sultan Hasanuddin'}
              </span>
            </div>
            <button
              onClick={() => handleSelectPreset('overview')}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Kembali ke Semua Terminal</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Reference Masterplan Picture-in-Picture Card */}
      {showMasterplanPip && (
        <div className="absolute top-20 right-4 z-30 w-80 sm:w-96 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Referensi Visual WAAA</span>
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
              onClick={() => setPipTab('parkir')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'parkir'
                  ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gedung Parkir & Jalanan
            </button>
            <button
              onClick={() => setPipTab('masterplan')}
              className={`flex-1 py-1.5 text-center transition-colors cursor-pointer ${
                pipTab === 'masterplan'
                  ? 'bg-sky-500/20 text-sky-300 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Masterplan Terminal
            </button>
          </div>
          <div className="p-2 bg-slate-950">
            <img
              src={
                pipTab === 'parkir'
                  ? '/assets/aistudio/Terminal_Selatan__1__b9bc7e87.png'
                  : '/assets/aistudio/1_47a27264.png'
              }
              alt="Referensi Bandara Sultan Hasanuddin Makassar"
              className="w-full h-auto max-h-72 rounded-lg border border-slate-800 object-contain bg-slate-900"
            />
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-sky-400 font-bold">●</span> Terminal Utama
              </div>
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-emerald-400 font-bold">●</span> Terminal Eksisting
              </div>
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 font-bold">●</span> Terminal Selatan
              </div>
              <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                <span className="text-amber-400 font-bold">●</span> Gedung Parkir
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

      {/* Floating Legend for Speaker Status */}
      <div className="absolute bottom-28 left-4 z-20 hidden md:flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-900/85 border border-slate-800 text-[11px] font-mono text-slate-300 select-none">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
          Status IP Speaker (WAAA / MKS)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Online / Normal (52 Unit)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <span>Menyiarkan Audio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Pilot Tone Fault</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Evakuasi Darurat (EN54)</span>
        </div>
      </div>
    </div>
  );
};
