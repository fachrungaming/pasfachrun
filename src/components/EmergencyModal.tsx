import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  Volume2,
  VolumeX,
  CheckCircle,
  Radio,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { MacroZone, ZoneId } from '../types/pa-system';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  macroZones: MacroZone[];
  onTriggerEvacZone: (zoneId: ZoneId) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  macroZones,
  onTriggerEvacZone,
}) => {
  const [phasedStage, setPhasedStage] = useState<'phase1' | 'phase2' | 'all'>('phase1');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-950 border-2 border-red-500 shadow-2xl overflow-hidden text-slate-100">
        {/* Red Warning Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-black/20 text-white">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase text-white">
                EN 54-16 Emergency Evacuation Active
              </h2>
              <p className="text-xs text-red-100">
                Prioritas 1 Mutlak &bull; Override Seluruh Audio & Sirine ISO 8201
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-black/40 text-xs font-mono font-bold tracking-widest text-red-200 border border-red-300">
            ARFF / FACP INTERLOCK
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Skenario Evakuasi Bertahap (Phased Evacuation) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Skenario Evakuasi Bertahap (Mencegah Kepanikan Terminal):
            </h3>
            <p className="text-xs text-slate-400">
              Sesuai standar keselamatan bandara, hanya zona dengan indikasi asap/kebakaran (Gedung Parkir) yang dievakuasi segera. Terminal internasional tetap dalam status aman terkendali.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  phasedStage === 'phase1'
                    ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500'
                    : 'bg-slate-900 border-slate-800'
                }`}
                onClick={() => setPhasedStage('phase1')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-red-400">
                  <span>FASE 1: Parkir</span>
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Gedung Parkir & Curbside
                </div>
                <div className="text-[10px] text-red-300 mt-2 font-mono">
                  Evakuasi Segera (Level 1)
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  phasedStage === 'phase2'
                    ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
                    : 'bg-slate-900 border-slate-800'
                }`}
                onClick={() => setPhasedStage('phase2')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>FASE 2: Domestik</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Terminal Kedatangan
                </div>
                <div className="text-[10px] text-amber-300 mt-2 font-mono">
                  Siaga Terkendali (Standby)
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  phasedStage === 'all'
                    ? 'bg-red-950/80 border-red-600 ring-2 ring-red-600'
                    : 'bg-slate-900 border-slate-800'
                }`}
                onClick={() => setPhasedStage('all')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-red-300">
                  <span>FASE TOTAL: All-Call</span>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Seluruh 5 Zona Terminal
                </div>
                <div className="text-[10px] text-red-300 mt-2 font-mono">
                  Evakuasi Menyeluruh
                </div>
              </div>
            </div>
          </div>

          {/* Safe Route Direction visual */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400">
                Jalur Aman & Pintu Darurat (Visualisasi 3D Hijau):
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Pintu Keluar Egress 1 - 4 Bebas Asap
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <div className="flex-1 bg-slate-950 p-2 rounded-lg text-center font-mono">
                Gedung Parkir L1 &rarr; Area Terbuka Barat
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 bg-slate-950 p-2 rounded-lg text-center font-mono text-emerald-300">
                Assembly Point Lapangan Parkir
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Sirine evakuasi terus berbunyi sampai direset oleh petugas AOC/ARFF.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg transition-all cursor-pointer border border-emerald-400"
          >
            Pulihkan Kondisi Normal (Reset)
          </button>
        </div>
      </div>
    </div>
  );
};
