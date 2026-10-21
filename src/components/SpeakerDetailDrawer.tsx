import React from 'react';
import {
  X,
  Radio,
  Cpu,
  Wifi,
  Zap,
  Activity,
  Flame,
  ShieldCheck,
  RotateCw,
  Sliders,
} from 'lucide-react';
import { IPSpeaker, MacroZone } from '../types/pa-system';

interface SpeakerDetailDrawerProps {
  speaker: IPSpeaker | null;
  zone: MacroZone | undefined;
  onClose: () => void;
  onToggleFault: (speakerId: string, isFaulty: boolean) => void;
}

export const SpeakerDetailDrawer: React.FC<SpeakerDetailDrawerProps> = ({
  speaker,
  zone,
  onClose,
  onToggleFault,
}) => {
  if (!speaker) return null;

  const isFaulty = speaker.status === 'pilot_fault' || speaker.status === 'offline';

  return (
    <div className="fixed top-16 right-4 z-30 w-80 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl p-4 text-slate-100 backdrop-blur-md select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">{speaker.name}</h3>
            <span className="text-[10px] font-mono text-slate-400">
              ID: {speaker.id}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry Grid */}
      <div className="mt-3 space-y-2.5 text-xs font-mono">
        <div className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-slate-400">Status Titik:</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              speaker.status === 'online'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                : speaker.status === 'broadcasting'
                ? 'bg-sky-950 text-sky-300 border border-sky-500/30'
                : speaker.status === 'emergency'
                ? 'bg-red-950 text-red-300 border border-red-500/30'
                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
            }`}
          >
            {speaker.status}
          </span>
        </div>

        <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Zona Bandara:</span>
            <span className="text-slate-200 truncate max-w-[150px]">
              {zone?.name || speaker.macroZoneId}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">IP Address:</span>
            <span className="text-cyan-400">{speaker.ipAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">MAC Address:</span>
            <span className="text-slate-300">{speaker.macAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">PoE Standard:</span>
            <span className="text-amber-400">{speaker.poeClass}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Daya Operasi:</span>
            <span className="text-slate-200">{speaker.currentWattage.toFixed(1)} Watt</span>
          </div>
        </div>

        {/* Akustik & EN 54-16 Line Diagnostics */}
        <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">20kHz Pilot Tone:</span>
            <span
              className={
                speaker.pilotTone20kHzOk
                  ? 'text-emerald-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {speaker.pilotTone20kHzOk ? 'Lolos (OK)' : 'FAULT / PUTUS'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Impedansi Garis:</span>
            <span className="text-slate-200 font-bold">
              {speaker.impedanceOhm} &Omega; (Nominal 8.2&Omega;)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">STI-PA Intelligibility:</span>
            <span className="text-emerald-400 font-bold">
              {speaker.stipaScore.toFixed(2)} (Target &ge; 0.45)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Output SPL:</span>
            <span className="text-slate-200">{speaker.splDba} dBA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Sekering Termal 150&deg;C:</span>
            <span className="text-emerald-400">Aktif & Normal</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex space-x-2">
        <button
          onClick={() => onToggleFault(speaker.id, !isFaulty)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            isFaulty
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
              : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border-amber-500/40'
          }`}
        >
          {isFaulty ? 'Pulihkan Jalur' : 'Simulasikan Rusak'}
        </button>
        <button
          onClick={() => alert(`Ping IP ${speaker.ipAddress}: RTT = 4ms (IGMP Multicast OK)`)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer"
        >
          Ping
        </button>
      </div>
    </div>
  );
};
