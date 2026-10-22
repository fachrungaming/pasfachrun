import React, { useState } from 'react';
import {
  X,
  Radio,
  MapPin,
  Volume2,
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
  const [pingResult, setPingResult] = useState<string | null>(null);

  if (!speaker) return null;

  const isFaulty = speaker.status === 'pilot_fault' || speaker.status === 'offline';
  const category = speaker.category || 'ceiling';

  const categoryInfo =
    category === 'ceiling'
      ? {
          title: 'Ceiling Speaker (3D Pixar)',
          badgeClass: 'bg-sky-950 text-sky-300 border-sky-500/40',
          desc: 'Dipasang di plafon terminal. Ideal untuk area tertutup bersuhu stabil (Ruang Tunggu, Area Check-in, Pengambilan Bagasi).',
          defaultMount: 'Plafon Terminal (Ruang Tunggu / Check-in)',
        }
      : category === 'column'
      ? {
          title: 'Column Speaker (3D Pixar)',
          badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
          desc: 'Dipasang di dinding pilar/koridor dengan penyebaran suara fokus arah horizontal untuk jangkauan jauh.',
          defaultMount: 'Dinding Pilar / Koridor Panjang Terminal',
        }
      : {
          title: 'Horn Speaker (3D Pixar)',
          badgeClass: 'bg-amber-950 text-amber-300 border-amber-500/40',
          desc: 'Desain tangguh, tahan cuaca (IP65), mampu menembus area bising dan terbuka luar ruangan (Apron / Drop-off).',
          defaultMount: 'Area Bising & Terbuka (Apron / Drop-off)',
        };

  return (
    <div className="fixed top-16 right-4 z-30 w-80 sm:w-88 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl p-4 text-slate-100 backdrop-blur-md select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 leading-snug">{speaker.name}</h3>
            <span className="text-[10px] font-mono text-slate-400">
              ID: {speaker.id}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Pixar Speaker Category & Acoustic Terrain Card */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-sky-400" /> Kategori Speaker:
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryInfo.badgeClass}`}
          >
            {categoryInfo.title}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-[11px] text-slate-200 font-medium pt-0.5">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{speaker.mountLocation || categoryInfo.defaultMount}</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {categoryInfo.desc}
        </p>
      </div>

      {/* Telemetry Grid */}
      <div className="mt-2.5 space-y-2 text-xs font-mono">
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
            <span className="text-slate-200 truncate max-w-[165px]">
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

      {pingResult && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
          {pingResult}
        </div>
      )}

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
          onClick={() => {
            setPingResult(`Ping ${speaker.ipAddress}: RTT = 3.8ms (IGMP Multicast OK)`);
            setTimeout(() => setPingResult(null), 4000);
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer"
        >
          Ping
        </button>
      </div>
    </div>
  );
};
