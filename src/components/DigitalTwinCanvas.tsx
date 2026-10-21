import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Layers,
  Compass,
  Wifi,
  RotateCcw,
  Building2,
  Focus,
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
          if (zid === 'macro-1') setActivePreset('dom_dep');
          else if (zid === 'macro-2') setActivePreset('dom_arr');
          else if (zid === 'macro-3') setActivePreset('intl_dep');
          else if (zid === 'macro-4') setActivePreset('intl_arr');
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
      setActivePreset('dom_dep');
      managerRef.current.selectZone('macro-1', true, false);
    } else if (selectedZoneId === 'macro-2') {
      setActivePreset('dom_arr');
      managerRef.current.selectZone('macro-2', true, false);
    } else if (selectedZoneId === 'macro-3') {
      setActivePreset('intl_dep');
      managerRef.current.selectZone('macro-3', true, false);
    } else if (selectedZoneId === 'macro-4') {
      setActivePreset('intl_arr');
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
            <Compass className="w-3.5 h-3.5 text-sky-400" /> Fokus Terminal:
          </span>

          <button
            onClick={() => handleSelectPreset('overview')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activePreset === 'overview' && !selectedZoneId
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilkan Seluruh Kompleks Terminal Bandara Sultan Hasanuddin (WAAA)"
          >
            <Building2 className="w-3 h-3" />
            <span>Semua Terminal</span>
          </button>

          <button
            onClick={() => handleSelectPreset('dom_all')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activePreset === 'dom_all'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Seluruh Sayap Terminal Domestik"
          >
            Domestik (All)
          </button>

          <button
            onClick={() => handleSelectPreset('dom_dep')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-1' || activePreset === 'dom_dep'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 1: Terminal Keberangkatan Domestik (Gate 1-6)"
          >
            Dom-Dep
          </button>

          <button
            onClick={() => handleSelectPreset('dom_arr')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-2' || activePreset === 'dom_arr'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 2: Terminal Kedatangan Domestik (Baggage Claim)"
          >
            Dom-Arr
          </button>

          <button
            onClick={() => handleSelectPreset('intl_all')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activePreset === 'intl_all'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Seluruh Sayap Terminal Internasional"
          >
            Internasional (All)
          </button>

          <button
            onClick={() => handleSelectPreset('intl_dep')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-3' || activePreset === 'intl_dep'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 3: Terminal Keberangkatan Internasional (Gate 7-12)"
          >
            Intl-Dep
          </button>

          <button
            onClick={() => handleSelectPreset('intl_arr')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-4' || activePreset === 'intl_arr'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 4: Terminal Kedatangan Internasional (Imigrasi & Karantina)"
          >
            Intl-Arr
          </button>

          <button
            onClick={() => handleSelectPreset('parking')}
            className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              selectedZoneId === 'macro-5' || activePreset === 'parking'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus Zona 5: Gedung Parkir & Drop-Off Curbside"
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
                  : activePreset === 'dom_all'
                  ? 'Seluruh Sayap Terminal Domestik'
                  : activePreset === 'intl_all'
                  ? 'Seluruh Sayap Terminal Internasional'
                  : 'Menara ATC Sultan Hasanuddin (WAAA)'}
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
          Status IP Speaker (WAAA)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Online / Normal</span>
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
