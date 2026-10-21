/**
 * Interactive Emergency Scenario Simulation & Drill Console
 * Sandboxed Digital Twin Simulation Engine (EN 54-16)
 * Allows airport operators to trigger and observe realistic emergency drills
 * without affecting live production PA hardware.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Flame,
  ShieldAlert,
  HeartPulse,
  Biohazard,
  Activity,
  AlertTriangle,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  EmergencyScenario,
  EMERGENCY_SCENARIOS,
  SimulationStep,
  ScenarioCategory,
} from '../types/simulation';
import { ZoneId, MacroZone } from '../types/pa-system';

interface SimulationSandboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  macroZones: MacroZone[];
  onStartScenario: (scenario: EmergencyScenario) => void;
  onAdvanceStep: (stepIndex: number) => void;
  onStopSimulation: () => void;
  onToggleSimAudio: () => void;
  onFocusIncident: (coords: [number, number, number]) => void;
  activeScenario: EmergencyScenario | null;
  currentStepIndex: number;
  isSimAudioPlaying: boolean;
  isSimulationActive: boolean;
}

export const SimulationSandboxDrawer: React.FC<SimulationSandboxDrawerProps> = ({
  isOpen,
  onClose,
  macroZones,
  onStartScenario,
  onAdvanceStep,
  onStopSimulation,
  onToggleSimAudio,
  onFocusIncident,
  activeScenario,
  currentStepIndex,
  isSimAudioPlaying,
  isSimulationActive,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    EMERGENCY_SCENARIOS[0].id
  );
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'all' | ScenarioCategory
  >('all');

  const currentScenario =
    activeScenario ||
    EMERGENCY_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
    EMERGENCY_SCENARIOS[0];

  const currentStep: SimulationStep | undefined =
    currentScenario.steps[currentStepIndex];

  const filteredScenarios =
    activeCategoryFilter === 'all'
      ? EMERGENCY_SCENARIOS
      : EMERGENCY_SCENARIOS.filter((s) => s.category === activeCategoryFilter);

  if (!isOpen) return null;

  const getCategoryIcon = (category: ScenarioCategory) => {
    switch (category) {
      case 'fire':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-orange-400" />;
      case 'medical':
        return <HeartPulse className="w-4 h-4 text-cyan-400" />;
      case 'hazmat':
        return <Biohazard className="w-4 h-4 text-amber-400" />;
      case 'earthquake':
        return <Activity className="w-4 h-4 text-purple-400" />;
    }
  };

  const getSeverityBadge = (severity: 'critical' | 'high' | 'medium') => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/40">
            KRITIS
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-950 text-orange-300 border border-orange-500/40">
            TINGGI
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
            SEDANG
          </span>
        );
    }
  };

  return (
    <div className="fixed top-14 right-4 z-40 w-full max-w-lg max-h-[88vh] rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-slate-100 backdrop-blur-md select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Simulation Banner Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-950 border-b border-amber-500/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Simulasi Skenario Darurat Digital Twin
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                DRY-RUN / SANDBOX
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Uji Coba Respon PA, Matriks Prioritas, & Jalur 3D Tanpa Mempengaruhi Sistem Fisik
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Safety Guarantee Notice */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] flex items-start space-x-2.5 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200">
              Isolasi Perangkat Keras Aman (Sandbox):
            </span>{' '}
            Semua perubahan prioritas audio, sirine darurat, dan visualisasi spasial hanya berjalan di browser operator. Speaker fisik di gedung bandara tetap beroperasi normal.
          </div>
        </div>

        {/* Category Filters */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Pilih Kategori Insiden:
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(['all', 'fire', 'security', 'medical', 'hazmat', 'earthquake'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat === 'all'
                    ? 'Semua (5)'
                    : cat === 'fire'
                    ? 'Kebakaran'
                    : cat === 'security'
                    ? 'Keamanan'
                    : cat === 'medical'
                    ? 'Medis'
                    : cat === 'hazmat'
                    ? 'Hazmat'
                    : 'Gempa'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Scenarios Carousel/List */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Daftar Skenario Latihan:
          </label>
          <div className="grid grid-cols-1 gap-2">
            {filteredScenarios.map((scen) => {
              const isSelected =
                (activeScenario ? activeScenario.id : selectedScenarioId) ===
                scen.id;

              return (
                <div
                  key={scen.id}
                  onClick={() => {
                    if (!isSimulationActive) {
                      setSelectedScenarioId(scen.id);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900/90 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded bg-slate-800">
                        {getCategoryIcon(scen.category)}
                      </div>
                      <span className="text-xs font-bold text-slate-100">
                        {scen.title}
                      </span>
                    </div>
                    {getSeverityBadge(scen.severity)}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {scen.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                    <span>
                      Zona: <span className="text-sky-300">{scen.subZoneName}</span>
                    </span>
                    <span className="text-amber-300">
                      Prioritas {scen.priorityLevel}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusIncident(scen.incidentCoordinates);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1"
                      title="Lihat Lokasi di 3D"
                    >
                      <Compass className="w-3 h-3 text-sky-400" />
                      <span>Fokus 3D</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Details & Stepper */}
        {currentScenario && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Rencana Pelaksanaan Simulasi:
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Pemicu: {currentScenario.triggerSource}
              </span>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>
                  Langkah {currentStepIndex + 1} dari{' '}
                  {currentScenario.steps.length}:
                </span>
                <span className="text-amber-300 font-semibold">
                  {currentStep?.title}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {currentScenario.steps.map((st, idx) => (
                  <button
                    key={st.stepNumber}
                    disabled={!isSimulationActive}
                    onClick={() => onAdvanceStep(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx < currentStepIndex
                        ? 'bg-emerald-500'
                        : idx === currentStepIndex
                        ? 'bg-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-800'
                    }`}
                    title={st.title}
                  />
                ))}
              </div>
            </div>

            {/* Step Detail Card */}
            {currentStep && (
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-slate-200 font-semibold">
                  {currentStep.description}
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <div className="flex justify-between">
                    <span>Respon Matriks EN54:</span>
                    <span className="text-cyan-300 font-bold">
                      {currentStep.systemResponse}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aksi Audio Disimulasikan:</span>
                    <span className="text-amber-300">{currentStep.audioAction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Titik Kumpul / Assembly:</span>
                    <span className="text-emerald-400 truncate max-w-[200px]">
                      {currentScenario.assemblyPoint}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Drill disclaimer text */}
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400">Teks Pengumuman Suara (TTS):</div>
              <div className="text-slate-200 italic">
                "{currentScenario.announcementId}"
              </div>
              <div className="text-slate-400 italic text-[10px]">
                "{currentScenario.announcementEn}"
              </div>
            </div>

            {/* Control Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              {!isSimulationActive ? (
                <button
                  onClick={() => onStartScenario(currentScenario)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Simulasi Skenario Ini</span>
                </button>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        onAdvanceStep(Math.max(0, currentStepIndex - 1))
                      }
                      disabled={currentStepIndex === 0}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-mono flex items-center space-x-1 cursor-pointer"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                      <span>Kembali</span>
                    </button>

                    <button
                      onClick={() =>
                        onAdvanceStep(
                          Math.min(
                            currentScenario.steps.length - 1,
                            currentStepIndex + 1
                          )
                        )
                      }
                      disabled={
                        currentStepIndex >= currentScenario.steps.length - 1
                      }
                      className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold tracking-wide flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Langkah Berikutnya</span>
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={onToggleSimAudio}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                        isSimAudioPlaying
                          ? 'bg-purple-950 text-purple-300 border-purple-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title="Audio Simulator"
                    >
                      {isSimAudioPlaying ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Audio On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Audio Off</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={onStopSimulation}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hentikan & Reset Simulasi (All Clear)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
