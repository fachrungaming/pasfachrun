import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Radio,
  Flame,
  Volume2,
  VolumeX,
  Activity,
  FileAudio,
  Sun,
  Moon,
} from 'lucide-react';
import { PRIORITY_MATRIX, SystemTelemetry } from '../types/pa-system';

interface HeaderBarProps {
  telemetry: SystemTelemetry;
  onTriggerEmergency: () => void;
  onCancelEmergency: () => void;
  onToggleBgm: () => void;
  isBgmActive: boolean;
  onToggleSimulation: () => void;
  isSimulationActive: boolean;
  activeScenarioTitle?: string;
  onOpenAudioUploadModal?: () => void;
  customTracksCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  telemetry,
  onTriggerEmergency,
  onCancelEmergency,
  onToggleBgm,
  isBgmActive,
  onToggleSimulation,
  isSimulationActive,
  activeScenarioTitle,
  onOpenAudioUploadModal,
  customTracksCount,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeWita, setTimeWita] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC'
      );
      setTimeWita(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activePriority = PRIORITY_MATRIX[telemetry.activePriorityLevel];
  const isEmergency = telemetry.activePriorityLevel === 1;

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-white select-none transition-colors duration-300">
      {/* Brand & Terminal Code: SULTAN HASANUDDIN / WAAA (MKS) */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-400 font-mono font-black text-sm tracking-wider">
          MKS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-slate-100 uppercase">
              Airport IP PA Digital Twin
            </h1>
            <span className="text-slate-500" aria-hidden="true">
              &middot;
            </span>
            <span className="text-xs font-mono font-semibold text-sky-400 tracking-wide">
              SULTAN HASANUDDIN / WAAA (MKS)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Makassar Decentralized IP Audio &middot; EN 54-16 / EN 54-24 Compliance
          </p>
        </div>
      </div>

      {/* Center: Active Priority Matrix Banner & Telemetry */}
      <div className="hidden xl:flex items-center space-x-3">
        {isSimulationActive ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-amber-500 bg-amber-950/60 text-xs font-mono text-amber-300 shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold uppercase tracking-wider text-amber-200">
              SIMULASI DRILL:
            </span>
            <span className="truncate max-w-[200px] text-white font-semibold">
              {activeScenarioTitle || 'Skenario Aktif'}
            </span>
            <span className="text-[10px] text-amber-300">
              &middot; Dry-Run
            </span>
          </div>
        ) : (
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              isEmergency
                ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                : 'bg-slate-900 border-slate-700/80 text-slate-200'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activePriority.color }}
            />
            <span className="font-bold">PRIORITY {activePriority.level}:</span>
            <span className="truncate max-w-[180px] text-slate-300">
              {activePriority.name}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              &middot;
            </span>
            <span className="text-[11px] text-cyan-400">
              {activePriority.duckingDb} dB Duck
            </span>
          </div>
        )}

        {/* Inline Unboxed Telemetry Metadata */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 px-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>RSTP Dual-LAN:</span>
          <span className="text-emerald-400 font-semibold">
            {telemetry.rstpRingStatus}
          </span>
          <span className="text-slate-500">({telemetry.networkLatencyMs}ms)</span>
          <span className="text-slate-600">&middot;</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300">EN 54-16 OK</span>
        </div>
      </div>

      {/* Right: Theme Switcher, Clock & Master Actions */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Dark / Light Theme Mode Selector */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer transition-all"
            title={
              theme === 'dark'
                ? 'Ubah ke Mode Tampilan Terang (Light Mode)'
                : 'Ubah ke Mode Tampilan Gelap (Dark Mode)'
            }
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}

        {/* Simulation Drill Toggle Button */}
        <button
          onClick={onToggleSimulation}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            isSimulationActive
              ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-900/40'
              : 'bg-slate-900 border-amber-500/50 text-amber-300 hover:bg-amber-950/40'
          }`}
          title="Buka Konsol Simulasi Skenario Darurat Bebas Risiko"
        >
          <Radio className={`w-3.5 h-3.5 ${isSimulationActive ? 'text-black' : 'text-amber-400'}`} />
          <span className="hidden sm:inline">{isSimulationActive ? 'DRILL AKTIF' : 'SIMULASI'}</span>
        </button>

        {/* Audio Manager (Upload BGM, Indonesia Raya, Adzan) */}
        {onOpenAudioUploadModal && (
          <button
            onClick={onOpenAudioUploadModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-purple-500/50 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 text-xs font-semibold cursor-pointer transition-all shadow-sm"
            title="Kelola & Unggah Berkas Audio (BGM, Lagu Kebangsaan, Adzan)"
          >
            <FileAudio className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Upload Audio</span>
            {customTracksCount !== undefined && customTracksCount > 0 && (
              <span className="font-mono text-[10px] text-purple-200">
                ({customTracksCount})
              </span>
            )}
          </button>
        )}

        {/* Clocks (WITA Makassar & UTC) */}
        <div className="hidden lg:flex flex-col text-right font-mono text-xs px-1">
          <div className="text-slate-200 font-semibold">{timeWita}</div>
          <div className="text-[10px] text-slate-400">{timeUtc}</div>
        </div>

        {/* BGM Toggle Button */}
        <button
          onClick={onToggleBgm}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            isBgmActive
              ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 hover:bg-purple-900/60'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
          title="Toggle Background Music (BGM)"
        >
          {isBgmActive ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>BGM On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>BGM Off</span>
            </>
          )}
        </button>

        {/* Emergency Evacuation Button */}
        {isEmergency ? (
          <button
            onClick={onCancelEmergency}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-900/40 transition-all border border-emerald-400 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>RESET NORMAL</span>
          </button>
        ) : (
          <button
            onClick={onTriggerEmergency}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs tracking-wider shadow-lg shadow-red-950/60 transition-all border border-red-400 active:scale-95 cursor-pointer"
            title="EN 54-16 Phased Evacuation Override"
          >
            <Flame className="w-4 h-4 text-white" />
            <span>EMERGENCY OVERRIDE</span>
          </button>
        )}
      </div>
    </header>
  );
};
