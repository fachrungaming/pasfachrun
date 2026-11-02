import React, { useState, useEffect } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Plane,
  Layers,
  Activity,
  Sliders,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  Clock,
  Send,
  AlertOctagon,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  MacroZone,
  IPSpeaker,
  ZoneId,
  FlightAnnouncement,
  PriorityLevel,
  PRIORITY_MATRIX,
  SystemTelemetry,
} from '../types/pa-system';
import { AudioTrackType, CustomAudioTrack } from '../types/custom-audio';
import { audioEngine } from '../audio/audio-engine';

interface DockControlsProps {
  macroZones: MacroZone[];
  speakers: IPSpeaker[];
  selectedZoneId: ZoneId | null;
  onSelectZone: (zoneId: ZoneId | null) => void;
  flights: FlightAnnouncement[];
  telemetry: SystemTelemetry;
  onBroadcastToZones: (zoneIds: ZoneId[], textId: string, textEn?: string) => Promise<void>;
  onTriggerFault: (speakerId: string, isFaulty: boolean) => void;
  onUpdateZoneVolume: (zoneId: ZoneId, volume: number) => void;
  onOpenSimulation?: () => void;
  customTracks?: Record<AudioTrackType, CustomAudioTrack>;
  onOpenAudioUploadModal?: () => void;
  onUploadTrack?: (type: AudioTrackType, file: File) => Promise<void>;
}

type TabKey = 'zones' | 'paging' | 'fids' | 'priority' | 'telemetry';

export const DockControls: React.FC<DockControlsProps> = ({
  macroZones,
  speakers,
  selectedZoneId,
  onSelectZone,
  flights,
  telemetry,
  onBroadcastToZones,
  onTriggerFault,
  onUpdateZoneVolume,
  onOpenSimulation,
  customTracks,
  onOpenAudioUploadModal,
  onUploadTrack,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('zones');

  // Multi-zone selection
  const [selectedZoneIds, setSelectedZoneIds] = useState<ZoneId[]>([
    'macro-1',
    'macro-2',
    'macro-3',
    'macro-4',
    'macro-5',
  ]);

  // Live Paging PTT state
  const [isPagingActive, setIsPagingActive] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [useRealMic, setUseRealMic] = useState(false);

  // SIP Dialpad state
  const [sipNumber, setSipNumber] = useState('#101');
  const [isSipCalling, setIsSipCalling] = useState(false);

  // Custom TTS builder
  const [customAnnounceText, setCustomAnnounceText] = useState(
    'Panggilan kepada seluruh penumpang pesawat Garuda Indonesia nomor penerbangan GA-601 tujuan Jakarta, dipersilakan naik ke pesawat melalui Pintu Gate 02 Terminal Selatan.'
  );
  const [customEnglishText, setCustomEnglishText] = useState(
    'Attention passengers of Garuda Indonesia flight GA-601 to Jakarta, please proceed to Gate 02 South Terminal for boarding.'
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Fault simulation state
  const [simulatedFaultSpeakerId, setSimulatedFaultSpeakerId] = useState<string>('SPK-P501');

  // Subscribe to VU meter
  useEffect(() => {
    const unsub = audioEngine.subscribeVuMeter((lvl) => {
      setVuLevel(lvl);
    });
    return () => unsub();
  }, []);

  const toggleZoneCheckbox = (id: ZoneId) => {
    setSelectedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]
    );
  };

  const selectAllZones = () => {
    setSelectedZoneIds(['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5']);
  };

  // Push-To-Talk Microphone handler
  const handleStartPaging = async () => {
    setIsPagingActive(true);
    await audioEngine.startLivePaging(useRealMic);
  };

  const handleStopPaging = () => {
    setIsPagingActive(false);
    audioEngine.stopLivePaging();
  };

  // SIP Dialpad Action
  const handleSipCall = async () => {
    setIsSipCalling(true);
    // Find zone matching extension
    const matchedZone = macroZones.find((z) => z.sipExtension === sipNumber);
    const targetZones = matchedZone
      ? [matchedZone.id]
      : (['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5'] as ZoneId[]);

    const text = matchedZone
      ? `Panggilan SIP melalui nomor ${sipNumber} tersambung ke ${matchedZone.name}. Silakan berbicara setelah nada dering.`
      : `Panggilan All-Call SIP ${sipNumber} tersambung ke seluruh terminal.`;

    await onBroadcastToZones(targetZones, text);
    setIsSipCalling(false);
  };

  // Flight announcement trigger
  const handleBroadcastFlight = async (flight: FlightAnnouncement) => {
    setIsBroadcasting(true);
    let idText = '';
    let enText = '';

    if (flight.status === 'Boarding') {
      idText = `Panggilan kepada penumpang maskapai ${flight.airline} dengan nomor penerbangan ${flight.flightNumber} tujuan ${flight.destination}, dimohon segera menuju ${flight.gate} untuk boarding.`;
      enText = `Attention passengers of ${flight.airline}, flight ${flight.flightNumber} to ${flight.destination}, please proceed immediately to ${flight.gate} for boarding.`;
    } else if (flight.status === 'Final Call') {
      idText = `Panggilan terakhir untuk penumpang pesawat ${flight.airline} nomor ${flight.flightNumber} tujuan ${flight.destination}, pintu ${flight.gate} akan segera ditutup.`;
      enText = `This is the final boarding call for ${flight.airline} flight ${flight.flightNumber} to ${flight.destination}. Gate ${flight.gate} is now closing.`;
    } else if (flight.status === 'Gate Change') {
      idText = `Pemberitahuan perubahan gerbang untuk penerbangan ${flight.airline} nomor ${flight.flightNumber} tujuan ${flight.destination}, pintu keberangkatan dipindahkan ke ${flight.gate}.`;
      enText = `Gate change announcement for ${flight.airline} flight ${flight.flightNumber} to ${flight.destination}. Departure gate is now moved to ${flight.gate}.`;
    } else {
      idText = `Informasi penerbangan ${flight.airline} ${flight.flightNumber} tujuan ${flight.destination} dijadwalkan pukul ${flight.scheduledTime} di ${flight.gate}.`;
      enText = `Flight information for ${flight.airline} ${flight.flightNumber} to ${flight.destination} is scheduled at ${flight.scheduledTime} at ${flight.gate}.`;
    }

    await onBroadcastToZones([flight.zoneId], idText, enText);
    setIsBroadcasting(false);
  };

  // Custom announcement broadcast
  const handleBroadcastCustom = async () => {
    if (!customAnnounceText.trim() || selectedZoneIds.length === 0) return;
    setIsBroadcasting(true);
    await onBroadcastToZones(selectedZoneIds, customAnnounceText, customEnglishText);
    setIsBroadcasting(false);
  };

  return (
    <div
      style={{
        fontFamily: "'Violet Sans', 'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
      }}
      className={`font-violet-sans fixed z-30 transition-all duration-300 ease-out select-none ${
        isCollapsed
          ? 'bottom-3 left-1/2 -translate-x-1/2 w-auto'
          : 'bottom-4 left-1/2 -translate-x-1/2 w-[96%] max-w-[980px]'
      }`}
    >
      {/* Skeuomorphic Hardware Minimize / Expand Toggle Handle */}
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center space-x-2.5 px-5 py-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
            isCollapsed ? 'skeuo-btn-amber' : 'skeuo-btn'
          }`}
        >
          {isCollapsed ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-900 shadow-[0_0_6px_#f59e0b,inset_0_1px_1px_#fff]" />
              <Maximize2 className="w-3.5 h-3.5 text-slate-900 stroke-[2.5]" />
              <span>Buka Operasi Bandara (Expand)</span>
              <ChevronUp className="w-4 h-4 text-slate-900 stroke-[2.5]" />
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-900 shadow-[0_0_6px_#0ea5e9,inset_0_1px_1px_#fff]" />
              <Minimize2 className="w-3.5 h-3.5 text-slate-800 stroke-[2.5]" />
              <span>Minimize (Mode Sinema)</span>
              <ChevronDown className="w-4 h-4 text-slate-800 stroke-[2.5]" />
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="skeuo-chassis rounded-2xl overflow-hidden text-slate-900">
          {/* Dock Tab Header (Skeuomorphic Brushed Aluminum Control Deck) */}
          <div className="skeuo-header-deck flex items-center justify-between px-3.5 py-2.5 overflow-x-auto scrollbar-none gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('zones')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                  activeTab === 'zones'
                    ? 'skeuo-btn-sky skeuo-btn-pressed font-extrabold'
                    : 'skeuo-btn'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${
                    activeTab === 'zones'
                      ? 'bg-sky-400 border-sky-900 shadow-[0_0_8px_#38bdf8,inset_0_1px_1px_#fff]'
                      : 'bg-slate-400 border-slate-600 shadow-inner'
                  }`}
                />
                <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Zonasi & Siaran ({selectedZoneIds.length}/5)</span>
              </button>

              <button
                onClick={() => setActiveTab('paging')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                  activeTab === 'paging'
                    ? 'skeuo-btn-amber skeuo-btn-pressed font-extrabold'
                    : 'skeuo-btn'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${
                    activeTab === 'paging'
                      ? 'bg-amber-400 border-amber-900 shadow-[0_0_8px_#facc15,inset_0_1px_1px_#fff]'
                      : 'bg-slate-400 border-slate-600 shadow-inner'
                  }`}
                />
                <Mic className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Live Paging & SIP</span>
              </button>

              <button
                onClick={() => setActiveTab('fids')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                  activeTab === 'fids'
                    ? 'skeuo-btn-sky skeuo-btn-pressed font-extrabold'
                    : 'skeuo-btn'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${
                    activeTab === 'fids'
                      ? 'bg-sky-400 border-sky-900 shadow-[0_0_8px_#38bdf8,inset_0_1px_1px_#fff]'
                      : 'bg-slate-400 border-slate-600 shadow-inner'
                  }`}
                />
                <Plane className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>FIDS & AI Voice</span>
              </button>

              <button
                onClick={() => setActiveTab('priority')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                  activeTab === 'priority'
                    ? 'skeuo-btn-violet skeuo-btn-pressed font-extrabold'
                    : 'skeuo-btn'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${
                    activeTab === 'priority'
                      ? 'bg-purple-400 border-purple-900 shadow-[0_0_8px_#c084fc,inset_0_1px_1px_#fff]'
                      : 'bg-slate-400 border-slate-600 shadow-inner'
                  }`}
                />
                <Sliders className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Matriks Prioritas & Terjadwal</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer ${
                  activeTab === 'telemetry'
                    ? 'skeuo-btn-emerald skeuo-btn-pressed font-extrabold'
                    : 'skeuo-btn'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border ${
                    activeTab === 'telemetry'
                      ? 'bg-emerald-400 border-emerald-900 shadow-[0_0_8px_#34d399,inset_0_1px_1px_#fff]'
                      : 'bg-slate-400 border-slate-600 shadow-inner'
                  }`}
                />
                <Activity className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Telemetri EN 54-16</span>
              </button>
            </div>

            {/* Right Status Recessed LCD + Dedicated Tactile Minimize Button */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 skeuo-lcd text-[11px] font-bold tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-900 shadow-[0_0_8px_#10b981,inset_0_1px_1px_#fff]" />
                <span className="text-emerald-300">DSP: AEC/AGC ACTIVE</span>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="skeuo-btn-crimson flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold uppercase cursor-pointer"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Minimize</span>
              </button>
            </div>
          </div>

          {/* Dock Content Body (Recessed Skeuomorphic Console Well) */}
          <div className="skeuo-well p-4 max-h-[340px] overflow-y-auto">
            {/* ================= TAB 1: ZONES & BROADCAST ================= */}
            {activeTab === 'zones' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="skeuo-lcd font-bold uppercase text-amber-300 px-3 py-1 text-[11px] tracking-wide">
                      5 Zona Bandara Sultan Hasanuddin (WAAA)
                    </span>
                    <button
                      onClick={selectAllZones}
                      className="skeuo-btn text-[11px] px-3 py-1 font-bold cursor-pointer"
                    >
                      Pilih Semua Siaran (All-Call)
                    </button>
                    <button
                      onClick={() => onSelectZone(null)}
                      className={`text-[11px] px-3 py-1 font-bold cursor-pointer ${
                        selectedZoneId === null
                          ? 'skeuo-btn-sky skeuo-btn-pressed'
                          : 'skeuo-btn'
                      }`}
                    >
                      Fokus Kamera: Semua Terminal
                    </button>
                  </div>
                  <span className="skeuo-lcd text-[11px] text-emerald-300 font-bold px-3 py-1">
                    Standar Akustik STI-PA Min: 0.45
                  </span>
                </div>

                {/* 5 Macro Zone Cards Grid (Skeuomorphism Hardware Modules) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {macroZones.map((zone) => {
                    const isSelected = selectedZoneIds.includes(zone.id);
                    const isFocus = selectedZoneId === zone.id;

                    return (
                      <div
                        key={zone.id}
                        className={`p-3 transition-all ${
                          isFocus
                            ? 'skeuo-card-active -translate-y-0.5'
                            : isSelected
                            ? 'skeuo-card'
                            : 'skeuo-card opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleZoneCheckbox(zone.id)}
                              className="w-4 h-4 rounded border border-slate-500 accent-sky-600 cursor-pointer shadow-inner"
                            />
                            <span className="text-xs font-extrabold text-slate-900 uppercase">
                              {zone.code}
                            </span>
                          </label>

                          <button
                            onClick={() => onSelectZone(isFocus ? null : zone.id)}
                            className={`text-[10px] font-bold px-2.5 py-0.5 cursor-pointer ${
                              isFocus ? 'skeuo-btn-amber' : 'skeuo-btn'
                            }`}
                            title="Fokus Kamera 3D ke bagian terminal ini"
                          >
                            {isFocus ? 'Semua' : 'Fokus 3D'}
                          </button>
                        </div>

                        <div className="mt-1.5 text-[11px] font-bold text-slate-800 line-clamp-1">
                          {zone.name}
                        </div>

                        {/* Recessed Digital LCD Telemetry Readout */}
                        <div className="mt-2 space-y-1 text-[10px] skeuo-lcd p-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">SIP Ext:</span>
                            <span className="font-bold text-amber-300">{zone.sipExtension}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">STI-PA:</span>
                            <span
                              className={
                                zone.currentStipa >= 0.45
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-rose-400 font-bold'
                              }
                            >
                              {zone.currentStipa.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Noise / SPL:</span>
                            <span className="font-bold text-slate-100">
                              {zone.ambientNoiseDba} / {zone.currentSplDba} dBA
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Speakers:</span>
                            <span className="font-bold text-sky-300">
                              {zone.speakerCount} ({zone.ipRating})
                            </span>
                          </div>
                        </div>

                        {/* Physical Fader Volume Slider */}
                        <div className="mt-2.5 flex items-center space-x-2">
                          <Volume2 className="w-3.5 h-3.5 text-slate-700 shrink-0 stroke-[2.2]" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={zone.volume}
                            onChange={(e) =>
                              onUpdateZoneVolume(zone.id, parseInt(e.target.value))
                            }
                            className="w-full h-2 rounded-lg bg-slate-300 border border-slate-500 shadow-inner appearance-none cursor-pointer accent-sky-600"
                          />
                          <span className="text-[10px] font-bold text-slate-800 w-8 text-right">
                            {zone.volume}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Broadcast Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2.5 border-t border-slate-400/80">
                  <input
                    type="text"
                    value={customAnnounceText}
                    onChange={(e) => setCustomAnnounceText(e.target.value)}
                    placeholder="Ketik teks siaran manual..."
                    className="skeuo-input w-full sm:flex-1 px-3.5 py-2 text-xs font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                  <button
                    onClick={handleBroadcastCustom}
                    disabled={isBroadcasting || selectedZoneIds.length === 0}
                    className="skeuo-btn-emerald w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2 disabled:opacity-50 font-bold uppercase text-xs shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>
                      {isBroadcasting
                        ? 'Menyiarkan Chime + Audio...'
                        : `Siarkan ke ${selectedZoneIds.length} Zona`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 2: LIVE PAGING & SIP ================= */}
            {activeTab === 'paging' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Virtual Gooseneck Mic & PTT */}
                <div className="skeuo-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-slate-800 stroke-[2.2]" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase">
                        AOC Master Gooseneck PTT Station
                      </span>
                    </div>
                    <span className="skeuo-lcd text-[10px] font-bold px-2.5 py-0.5 text-amber-300">
                      Priority 2 (Care Call)
                    </span>
                  </div>

                  {/* Recessed VU Meter & Waveform */}
                  <div className="space-y-1.5 skeuo-lcd p-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-300">
                      <span>Audio Input Level (VU Meter):</span>
                      <span className="text-emerald-400 font-extrabold">
                        {(vuLevel * 100).toFixed(0)} %
                      </span>
                    </div>
                    <div className="h-3.5 w-full bg-slate-950 rounded-full border border-slate-700 shadow-inner overflow-hidden flex p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                        style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Real mic toggle */}
                  <div className="flex items-center justify-between text-xs text-slate-800 font-semibold">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRealMic}
                        onChange={(e) => setUseRealMic(e.target.checked)}
                        className="w-4 h-4 rounded border border-slate-500 accent-amber-500"
                      />
                      <span className="text-[11px]">
                        Gunakan Mikrofon Fisik Operator (Browser Mic)
                      </span>
                    </label>
                  </div>

                  {/* Big Tactile Hardware PTT Button */}
                  <button
                    onMouseDown={handleStartPaging}
                    onMouseUp={handleStopPaging}
                    onTouchStart={handleStartPaging}
                    onTouchEnd={handleStopPaging}
                    className={`w-full py-4 flex items-center justify-center space-x-2 font-extrabold text-sm tracking-wider uppercase cursor-pointer ${
                      isPagingActive
                        ? 'skeuo-btn-crimson skeuo-btn-pressed animate-pulse'
                        : 'skeuo-btn-amber'
                    }`}
                  >
                    {isPagingActive ? (
                      <>
                        <Mic className="w-5 h-5 text-white stroke-[2.2]" />
                        <span>ON-AIR: Tahan Untuk Siaran Langsung</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-5 h-5 text-slate-900 stroke-[2.2]" />
                        <span>Tekan & Tahan (PTT) Untuk Berbicara</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-700 font-semibold text-center">
                    *Memicu nada 4-chime otomatis, me-redam BGM sebesar -24 dB, dan menyalurkan audio waktu-nyata ke zona aktif.
                  </p>
                </div>

                {/* SIP v2 Telephony Dialpad */}
                <div className="skeuo-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4 text-slate-800 stroke-[2.2]" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase">
                        IP-PBX SIP Paging Gateway
                      </span>
                    </div>
                    <span className="skeuo-lcd text-[10px] font-bold px-2.5 py-0.5 text-sky-300">
                      SIP v2 / G.722 HD
                    </span>
                  </div>

                  {/* Recessed LCD Number Display */}
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="text"
                      value={sipNumber}
                      onChange={(e) => setSipNumber(e.target.value)}
                      placeholder="Contoh: #101"
                      className="skeuo-lcd w-full px-3 py-2 text-center font-extrabold text-emerald-300 tracking-widest text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleSipCall}
                      disabled={isSipCalling}
                      className="skeuo-btn-sky px-4 py-2 disabled:opacity-50 font-extrabold uppercase text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>{isSipCalling ? 'Menghubungkan...' : 'Dial SIP'}</span>
                    </button>
                  </div>

                  {/* Quick Tactile Keypad Extension Presets */}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <button
                      onClick={() => setSipNumber('#101')}
                      className="skeuo-btn p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-slate-900">#101</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">Trm Utama</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#102')}
                      className="skeuo-btn p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-slate-900">#102</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">Trm Eksisting</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#103')}
                      className="skeuo-btn p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-slate-900">#103</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">Trm Selatan</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#104')}
                      className="skeuo-btn p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-slate-900">#104</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">Apron & Garbarata</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#105')}
                      className="skeuo-btn p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-slate-900">#105</div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">Gedung Parkir</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#999')}
                      className="skeuo-btn-crimson p-2 text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-white">#999</div>
                      <div className="text-[10px] font-bold text-rose-100 truncate">All-Call WAAA</div>
                    </button>
                  </div>

                  {/* DSP Status */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 border-t border-slate-300 pt-2">
                    <span>AEC: Echo Canceller (30dB)</span>
                    <span className="text-emerald-700 font-extrabold">QoS Latency: 16ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: FIDS & AI VOICE ================= */}
            {activeTab === 'fids' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="skeuo-lcd flex items-center space-x-2 px-3 py-1 text-sky-300">
                    <Plane className="w-4 h-4 text-sky-400 stroke-[2.2]" />
                    <span className="font-bold uppercase">
                      FIDS Schedule & AI Text-to-Speech (Multi-Bahasa)
                    </span>
                  </div>
                  <span className="skeuo-lcd text-[11px] font-bold text-amber-300 px-3 py-1">
                    Otomatisasi Chime + ID-ID & EN-US
                  </span>
                </div>

                {/* Flights List Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {flights.map((flight) => (
                    <div
                      key={flight.id}
                      className="skeuo-card p-3 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900">
                            {flight.flightNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 ml-2">
                            {flight.airline}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shadow-inner ${
                            flight.status === 'Boarding'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : flight.status === 'Final Call'
                              ? 'bg-rose-600 text-white border-rose-900'
                              : flight.status === 'Gate Change'
                              ? 'bg-amber-200 text-amber-950 border-amber-500'
                              : 'bg-slate-200 text-slate-800 border-slate-400'
                          }`}
                        >
                          {flight.status}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-800">
                        Ke: <span className="font-extrabold text-slate-950">{flight.destination}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-t border-slate-300 pt-2">
                        <span>{flight.gate} &bull; {flight.scheduledTime}</span>
                        <button
                          onClick={() => handleBroadcastFlight(flight)}
                          disabled={isBroadcasting}
                          className="skeuo-btn-sky flex items-center space-x-1 px-3 py-1 font-bold text-[10px] uppercase cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Siarkan Chime</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multilingual custom speech builder */}
                <div className="skeuo-card p-3.5 space-y-2">
                  <div className="text-xs font-extrabold uppercase text-slate-800">
                    Template Pengumuman Cepat Bandara Sultan Hasanuddin (WAAA):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Panggilan kepada penumpang pesawat Garuda Indonesia nomor penerbangan GA-601 tujuan Jakarta, dipersilakan naik ke pesawat melalui Pintu Gate 02 Terminal Selatan.'
                        );
                        setCustomEnglishText(
                          'Attention passengers of Garuda Indonesia flight GA-601 to Jakarta, please proceed to Gate 02 South Terminal for boarding.'
                        );
                      }}
                      className="skeuo-btn px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                    >
                      Boarding Gate 02 (Terminal Selatan)
                    </button>
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Panggilan terakhir untuk penumpang pesawat Batik Air nomor ID-6181 tujuan Kendari, pintu keberangkatan Gate 08 Terminal Eksisting akan segera ditutup.'
                        );
                        setCustomEnglishText(
                          'This is the final boarding call for Batik Air flight ID-6181 to Kendari. Gate 08 at Existing Terminal is closing now.'
                        );
                      }}
                      className="skeuo-btn px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                    >
                      Final Call Gate 08 (Terminal Eksisting)
                    </button>
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Perhatian kepada pengguna jasa Bandara Internasional Sultan Hasanuddin Makassar, mohon untuk tidak meninggalkan barang bawaan Anda tanpa pengawasan di area Terminal Utama, Eksisting, maupun Terminal Selatan.'
                        );
                        setCustomEnglishText(
                          'Attention passengers at Sultan Hasanuddin International Airport Makassar, please do not leave your baggage unattended at any time.'
                        );
                      }}
                      className="skeuo-btn px-3 py-1.5 text-[11px] font-bold cursor-pointer"
                    >
                      Peringatan Bagasi WAAA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: PRIORITY MATRIX & SCHEDULER ================= */}
            {activeTab === 'priority' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="skeuo-lcd font-bold uppercase text-purple-300 px-3 py-1">
                    Matriks Prioritas Mutlak (6 Tingkat EN 54-16)
                  </span>
                  <span className="skeuo-lcd text-[11px] font-bold text-slate-300 px-3 py-1">
                    Hardware & Software Rules-Engine Override
                  </span>
                </div>

                {/* Priority Table */}
                <div className="space-y-2 text-xs">
                  {([1, 2, 3, 4, 5, 6] as PriorityLevel[]).map((lvl) => {
                    const item = PRIORITY_MATRIX[lvl];
                    const isCurrent = telemetry.activePriorityLevel === lvl;

                    return (
                      <div
                        key={lvl}
                        className={`flex items-center justify-between p-2.5 transition-all ${
                          isCurrent ? 'skeuo-card-active' : 'skeuo-card'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-inner"
                            style={{
                              backgroundColor: item.color,
                              boxShadow: `0 0 6px ${item.color}`,
                            }}
                          />
                          <span className="font-extrabold text-slate-900 w-16">
                            LEVEL {item.level}
                          </span>
                          <span className="text-slate-800 font-bold">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-[11px] text-slate-600 font-semibold hidden md:inline">
                            {item.description}
                          </span>
                          <span className="skeuo-lcd text-[11px] px-2.5 py-0.5 font-bold text-amber-300">
                            {item.duckingDb === -90
                              ? 'MUTE ALL'
                              : `${item.duckingDb} dB`}
                          </span>

                          {/* Quick manual simulation triggers */}
                          {lvl === 4 && (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => audioEngine.playScheduledAdzan(false)}
                                className="skeuo-btn-emerald px-2.5 py-1 text-[10px] cursor-pointer font-bold"
                                title="Siarkan Adzan Biasa (Dzuhur, Ashar, Maghrib, Isya)"
                              >
                                Test Adzan Biasa
                              </button>
                              <button
                                onClick={() => audioEngine.playScheduledAdzan(true)}
                                className="skeuo-btn-sky px-2.5 py-1 text-[10px] cursor-pointer font-bold"
                                title="Siarkan Adzan Subuh dengan lafaz Ash-shalatu khairum minan naum"
                              >
                                Test Adzan Subuh
                              </button>
                            </div>
                          )}
                          {lvl === 5 && (
                            <button
                              onClick={() => audioEngine.playIndonesiaRaya()}
                              className="skeuo-btn-crimson px-2.5 py-1 text-[10px] cursor-pointer font-bold"
                              title="Siarkan Lagu Kebangsaan Indonesia Raya (Terjadwal 10:00 WIB)"
                            >
                              Test Lagu Kebangsaan
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="skeuo-card p-3 text-[11px] font-semibold text-slate-800">
                  <span className="font-extrabold uppercase underline">Logika Pe-redaman (Audio Ducking):</span> Ketika prioritas lebih tinggi aktif (misal Level 3 FIDS, Level 4 Adzan, atau Level 5 Indonesia Raya), BGM di Level 6 secara otomatis mengalami pelemahan volume (*ducking*) secara mulus, dan akan kembali normal (*fade-in*) setelah siaran selesai.
                </div>

                {/* Upload & Audio Assets Management Section */}
                <div className="skeuo-card p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-slate-800 stroke-[2.2]" />
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        Unggah & Kelola Berkas Audio Siaran (MP3/WAV/AAC)
                      </span>
                    </div>
                    {onOpenAudioUploadModal && (
                      <button
                        onClick={onOpenAudioUploadModal}
                        className="skeuo-btn-violet px-3 py-1 text-[10px] font-bold tracking-wide uppercase cursor-pointer"
                      >
                        Buka Manajer Audio Lengkap
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    {/* BGM Upload Card */}
                    <div className="skeuo-card p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-slate-900">BGM Terminal</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            customTracks?.bgm.hasCustomFile
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : 'bg-slate-200 text-slate-700 border-slate-400'
                          }`}
                        >
                          {customTracks?.bgm.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">
                        {customTracks?.bgm.fileName || 'Prosedural Ambient'}
                      </div>
                      <div className="flex space-x-1.5 pt-1">
                        <label className="skeuo-btn flex-1 py-1 font-bold text-[10px] text-center cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f && onUploadTrack) onUploadTrack('bgm', f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => {
                            if (audioEngine.isBgmActive()) audioEngine.stopBgm();
                            else audioEngine.startBgm();
                          }}
                          className="skeuo-btn-violet px-2.5 py-1 font-bold text-[10px] cursor-pointer"
                        >
                          {audioEngine.isBgmActive() ? 'Stop' : 'Putar'}
                        </button>
                      </div>
                    </div>

                    {/* Indonesia Raya Upload Card */}
                    <div className="skeuo-card p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-slate-900">Indonesia Raya</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            customTracks?.indonesiaRaya.hasCustomFile
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : 'bg-slate-200 text-slate-700 border-slate-400'
                          }`}
                        >
                          {customTracks?.indonesiaRaya.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">
                        {customTracks?.indonesiaRaya.fileName || 'Prosedural Orkestra'}
                      </div>
                      <div className="flex space-x-1.5 pt-1">
                        <label className="skeuo-btn flex-1 py-1 font-bold text-[10px] text-center cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f && onUploadTrack) onUploadTrack('indonesiaRaya', f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => audioEngine.playIndonesiaRaya()}
                          className="skeuo-btn-crimson px-2.5 py-1 font-bold text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>

                    {/* Adzan Biasa Upload Card */}
                    <div className="skeuo-card p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-slate-900">Adzan Biasa</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            customTracks?.adzanRegular.hasCustomFile
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : 'bg-slate-200 text-slate-700 border-slate-400'
                          }`}
                        >
                          {customTracks?.adzanRegular.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">
                        {customTracks?.adzanRegular.fileName || 'Prosedural Hijaz'}
                      </div>
                      <div className="flex space-x-1.5 pt-1">
                        <label className="skeuo-btn flex-1 py-1 font-bold text-[10px] text-center cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f && onUploadTrack) onUploadTrack('adzanRegular', f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => audioEngine.playScheduledAdzan(false)}
                          className="skeuo-btn-emerald px-2.5 py-1 font-bold text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>

                    {/* Adzan Subuh Upload Card */}
                    <div className="skeuo-card p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-slate-900">Adzan Subuh</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            customTracks?.adzanSubuh.hasCustomFile
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                              : 'bg-slate-200 text-slate-700 border-slate-400'
                          }`}
                        >
                          {customTracks?.adzanSubuh.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 truncate">
                        {customTracks?.adzanSubuh.fileName || 'Prosedural Fajar'}
                      </div>
                      <div className="flex space-x-1.5 pt-1">
                        <label className="skeuo-btn flex-1 py-1 font-bold text-[10px] text-center cursor-pointer">
                          Upload
                          <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f && onUploadTrack) onUploadTrack('adzanSubuh', f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => audioEngine.playScheduledAdzan(true)}
                          className="skeuo-btn-sky px-2.5 py-1 font-bold text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drill Simulation Callout */}
                <div className="skeuo-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold text-slate-900 uppercase flex items-center space-x-1.5">
                      <Radio className="w-4 h-4 text-amber-600 stroke-[2.2]" />
                      <span>Uji Coba Latihan: Simulasi Skenario Darurat Interaktif (Sandbox)</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-600">
                      Pilih dari 5 skenario (Kebakaran L2, Koper Mencurigakan, Serangan Jantung, Hazmat Apron, Gempa All-Call) tanpa mengganggu operasional sistem PA nyata.
                    </p>
                  </div>
                  {onOpenSimulation && (
                    <button
                      onClick={onOpenSimulation}
                      className="skeuo-btn-amber px-4 py-1.5 font-extrabold text-xs tracking-wider uppercase cursor-pointer shrink-0"
                    >
                      Buka Konsol Simulasi
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 5: TELEMETRY & EN 54-16 ================= */}
            {activeTab === 'telemetry' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="skeuo-lcd flex items-center space-x-2 px-3 py-1 text-emerald-300">
                    <Activity className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
                    <span className="font-bold uppercase">
                      Surveilans Jalur Kabel 20 kHz & Sertifikasi EN 54-16
                    </span>
                  </div>
                  <span className="skeuo-lcd text-[11px] font-bold text-amber-300 px-3 py-1">
                    Pilot Tone Scan Rate: 20,000 Hz
                  </span>
                </div>

                {/* Metrics Cards (Recessed Digital Gauges) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="skeuo-card p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Total Speaker IP</div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {telemetry.totalSpeakers} Unit
                    </div>
                    <div className="text-[10px] font-extrabold text-emerald-700">
                      {telemetry.onlineSpeakers} Online / Normal
                    </div>
                  </div>

                  <div className="skeuo-card p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Impedansi Jalur Nominal</div>
                    <div className="text-lg font-extrabold text-slate-900">8.20 &Omega;</div>
                    <div className="text-[10px] font-semibold text-slate-700">Toleransi EN54: &plusmn;10%</div>
                  </div>

                  <div className="skeuo-card p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">RSTP Ring Failover</div>
                    <div className="text-lg font-extrabold text-slate-900">&lt; 18 ms</div>
                    <div className="text-[10px] font-semibold text-slate-700">IGMP Snooping v3 Active</div>
                  </div>

                  <div className="skeuo-card p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Sekering Termal 150&deg;C</div>
                    <div className="text-lg font-extrabold text-slate-900">100% Intact</div>
                    <div className="text-[10px] font-semibold text-slate-700">EN 54-24 Fire Dome</div>
                  </div>
                </div>

                {/* Fault Injection Simulator (FR-TEL-01 Testing) */}
                <div className="skeuo-card p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold uppercase text-slate-900">
                      Simulator Uji Coba Kegagalan Jalur (Fault Injection Test):
                    </span>
                    <span className="skeuo-lcd text-[10px] font-bold text-amber-300 px-2.5 py-0.5">
                      Uji Deteksi &lt; 2 Detik Sesuai FR-TEL-01
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <select
                      value={simulatedFaultSpeakerId}
                      onChange={(e) => setSimulatedFaultSpeakerId(e.target.value)}
                      className="skeuo-input w-full sm:w-auto px-3 py-1.5 text-xs font-bold focus:outline-none"
                    >
                      {speakers.map((spk) => (
                        <option key={spk.id} value={spk.id}>
                          {spk.name} ({spk.ipAddress})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => onTriggerFault(simulatedFaultSpeakerId, true)}
                      className="skeuo-btn-amber flex-1 px-3.5 py-1.5 font-extrabold uppercase text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Simulasikan Putus Kabel (Line Break)</span>
                    </button>

                    <button
                      onClick={() => onTriggerFault(simulatedFaultSpeakerId, false)}
                      className="skeuo-btn-emerald px-3.5 py-1.5 font-extrabold uppercase text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Pulihkan Normal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
