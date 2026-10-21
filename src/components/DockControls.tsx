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
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    'Panggilan kepada seluruh penumpang pesawat Garuda Indonesia nomor penerbangan GA-402 tujuan Bali, dipersilakan naik ke pesawat melalui Pintu 2.'
  );
  const [customEnglishText, setCustomEnglishText] = useState(
    'Attention passengers of Garuda Indonesia flight GA-402 to Bali, please proceed to Gate 2 for boarding.'
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
      className={`fixed z-30 transition-all duration-300 ease-out select-none ${
        isCollapsed
          ? 'bottom-2 left-1/2 -translate-x-1/2 w-auto'
          : 'bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[960px]'
      }`}
    >
      {/* Collapse/Expand Toggle Pill */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 shadow-md transition-all cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Airport Operations Dock (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls (Cinema Mode)</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-2xl overflow-hidden text-slate-100 backdrop-blur-md">
          {/* Dock Tab Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 bg-slate-900/60 overflow-x-auto scrollbar-none">
            <div className="flex space-x-1 py-1.5">
              <button
                onClick={() => setActiveTab('zones')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'zones'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Zonasi & Siaran ({selectedZoneIds.length}/5)</span>
              </button>

              <button
                onClick={() => setActiveTab('paging')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'paging'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Paging & SIP</span>
              </button>

              <button
                onClick={() => setActiveTab('fids')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'fids'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>FIDS & AI Voice</span>
              </button>

              <button
                onClick={() => setActiveTab('priority')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'priority'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Matriks Prioritas & Terjadwal</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'telemetry'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Telemetri EN 54-16</span>
              </button>
            </div>

            {/* Quick Status / Chime notification text */}
            <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>DSP: AEC/AGC Active</span>
            </div>
          </div>

          {/* Dock Content Body */}
          <div className="p-4 max-h-[340px] overflow-y-auto">
            {/* ================= TAB 1: ZONES & BROADCAST ================= */}
            {activeTab === 'zones' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-200">
                      5 Macro Zones Pengendalian Suara:
                    </span>
                    <button
                      onClick={selectAllZones}
                      className="text-[11px] text-sky-400 hover:underline"
                    >
                      Pilih Semua (All-Call)
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Standar Akustik STI-PA Min: 0.45
                  </span>
                </div>

                {/* 5 Macro Zone Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {macroZones.map((zone) => {
                    const isSelected = selectedZoneIds.includes(zone.id);
                    const isFocus = selectedZoneId === zone.id;

                    return (
                      <div
                        key={zone.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isFocus
                            ? 'bg-slate-800/90 border-sky-400 shadow-md ring-1 ring-sky-400/40'
                            : isSelected
                            ? 'bg-slate-900/90 border-slate-700'
                            : 'bg-slate-950/60 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleZoneCheckbox(zone.id)}
                              className="rounded border-slate-700 text-sky-500 focus:ring-0"
                            />
                            <span className="text-xs font-bold text-slate-100">
                              {zone.code}
                            </span>
                          </label>

                          <button
                            onClick={() => onSelectZone(isFocus ? null : zone.id)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            title="Focus in 3D"
                          >
                            {isFocus ? 'Exit' : '3D'}
                          </button>
                        </div>

                        <div className="mt-1 text-[11px] font-medium text-slate-200 line-clamp-1">
                          {zone.name}
                        </div>

                        {/* Telemetry info */}
                        <div className="mt-2 space-y-1 font-mono text-[10px] text-slate-400 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/60">
                          <div className="flex justify-between">
                            <span>SIP Ext:</span>
                            <span className="text-amber-300">{zone.sipExtension}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>STI-PA:</span>
                            <span
                              className={
                                zone.currentStipa >= 0.45
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-amber-400 font-bold'
                              }
                            >
                              {zone.currentStipa.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Noise / SPL:</span>
                            <span>{zone.ambientNoiseDba} / {zone.currentSplDba} dBA</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Speakers:</span>
                            <span className="text-sky-300">{zone.speakerCount} ({zone.ipRating})</span>
                          </div>
                        </div>

                        {/* Volume slider */}
                        <div className="mt-2 flex items-center space-x-2">
                          <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={zone.volume}
                            onChange={(e) =>
                              onUpdateZoneVolume(zone.id, parseInt(e.target.value))
                            }
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                          />
                          <span className="text-[10px] font-mono text-slate-300 w-6 text-right">
                            {zone.volume}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Broadcast Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={customAnnounceText}
                    onChange={(e) => setCustomAnnounceText(e.target.value)}
                    placeholder="Ketik teks siaran manual..."
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleBroadcastCustom}
                    disabled={isBroadcasting || selectedZoneIds.length === 0}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
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
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-slate-100 uppercase">
                        AOC Master Gooseneck PTT Station
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-500/30">
                      Priority 2 (Care Call)
                    </span>
                  </div>

                  {/* VU Meter & Waveform */}
                  <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Audio Input Level (VU Meter):</span>
                      <span className="text-emerald-400 font-bold">
                        {(vuLevel * 100).toFixed(0)} %
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 transition-all duration-75"
                        style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Real mic toggle */}
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRealMic}
                        onChange={(e) => setUseRealMic(e.target.checked)}
                        className="rounded border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span className="text-[11px]">
                        Gunakan Mikrofon Fisik Operator (Browser Mic)
                      </span>
                    </label>
                  </div>

                  {/* Big PTT Button */}
                  <button
                    onMouseDown={handleStartPaging}
                    onMouseUp={handleStopPaging}
                    onTouchStart={handleStartPaging}
                    onTouchEnd={handleStopPaging}
                    className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm tracking-wider uppercase shadow-lg transition-all cursor-pointer ${
                      isPagingActive
                        ? 'bg-orange-500 text-white ring-4 ring-orange-500/40 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isPagingActive ? (
                      <>
                        <Mic className="w-5 h-5 text-white" />
                        <span>ON-AIR: Tahan Untuk Siaran Langsung</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-5 h-5 text-slate-400" />
                        <span>Tekan & Tahan (PTT) Untuk Berbicara</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 italic text-center">
                    *Memicu nada 4-chime otomatis, me-redam BGM sebesar -24 dB, dan menyalurkan audio waktu-nyata ke zona aktif.
                  </p>
                </div>

                {/* SIP v2 Telephony Dialpad */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-100 uppercase">
                        IP-PBX SIP Paging Gateway
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      SIP v2 / G.722 HD
                    </span>
                  </div>

                  {/* Number display */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={sipNumber}
                      onChange={(e) => setSipNumber(e.target.value)}
                      placeholder="Contoh: #101"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono font-bold text-cyan-400 tracking-widest text-sm focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleSipCall}
                      disabled={isSipCalling}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-1.5 shadow-md cursor-pointer shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{isSipCalling ? 'Menghubungkan...' : 'Dial SIP'}</span>
                    </button>
                  </div>

                  {/* Quick Extension Presets */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                    <button
                      onClick={() => setSipNumber('#101')}
                      className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <div className="text-slate-400">#101</div>
                      <div className="text-[10px] text-slate-200 truncate">Dom-Dep</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#102')}
                      className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <div className="text-slate-400">#102</div>
                      <div className="text-[10px] text-slate-200 truncate">Dom-Arr</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#103')}
                      className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <div className="text-slate-400">#103</div>
                      <div className="text-[10px] text-slate-200 truncate">Intl-Dep</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#104')}
                      className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <div className="text-slate-400">#104</div>
                      <div className="text-[10px] text-slate-200 truncate">Intl-Arr</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#105')}
                      className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <div className="text-slate-400">#105</div>
                      <div className="text-[10px] text-slate-200 truncate">Parkir</div>
                    </button>
                    <button
                      onClick={() => setSipNumber('#999')}
                      className="p-1.5 rounded bg-red-950/50 hover:bg-red-900/50 border border-red-800/40 text-left"
                    >
                      <div className="text-red-400">#999</div>
                      <div className="text-[10px] text-red-200 truncate">All-Call</div>
                    </button>
                  </div>

                  {/* DSP Status */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-2">
                    <span>AEC: Echo Canceller (30dB)</span>
                    <span className="text-emerald-400">QoS Latency: 16ms</span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: FIDS & AI VOICE ================= */}
            {activeTab === 'fids' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-slate-100">
                      FIDS Schedule & AI Text-to-Speech (Multi-Bahasa)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Otomatisasi Chime + ID-ID & EN-US
                  </span>
                </div>

                {/* Flights List Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {flights.map((flight) => (
                    <div
                      key={flight.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-blue-500/40 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono font-bold text-sm text-sky-400">
                            {flight.flightNumber}
                          </span>
                          <span className="text-[11px] text-slate-300 ml-2">
                            {flight.airline}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            flight.status === 'Boarding'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : flight.status === 'Final Call'
                              ? 'bg-red-950 text-red-300 border border-red-500/40'
                              : flight.status === 'Gate Change'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {flight.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-200">
                        Ke: <span className="font-medium">{flight.destination}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                        <span>{flight.gate} &bull; {flight.scheduledTime}</span>
                        <button
                          onClick={() => handleBroadcastFlight(flight)}
                          disabled={isBroadcasting}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[10px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Siarkan Chime</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multilingual custom speech builder */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Template Pengumuman Cepat Bandara:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Panggilan kepada penumpang pesawat Garuda Indonesia nomor penerbangan GA-402 tujuan Bali, dipersilakan naik ke pesawat melalui Pintu 2.'
                        );
                        setCustomEnglishText(
                          'Attention passengers of Garuda Indonesia flight GA-402 to Bali, please proceed to Gate 2 for boarding.'
                        );
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                    >
                      Boarding Gate 2
                    </button>
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Panggilan terakhir untuk penumpang pesawat Singapore Airlines nomor SQ-951 tujuan Singapura, pintu keberangkatan Gate 8 akan segera ditutup.'
                        );
                        setCustomEnglishText(
                          'This is the final boarding call for Singapore Airlines flight SQ-951 to Singapore. Gate 8 is closing now.'
                        );
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                    >
                      Final Call Gate 8
                    </button>
                    <button
                      onClick={() => {
                        setCustomAnnounceText(
                          'Perhatian kepada pengguna jasa bandara, mohon untuk tidak meninggalkan barang bawaan Anda tanpa pengawasan di area terminal demi keamanan bersama.'
                        );
                        setCustomEnglishText(
                          'Attention airport passengers, please do not leave your baggage unattended at any time for safety and security.'
                        );
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                    >
                      Peringatan Bagasi Unattended
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: PRIORITY MATRIX & SCHEDULER ================= */}
            {activeTab === 'priority' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-100">
                    Matriks Prioritas Mutlak (6 Tingkat EN 54-16):
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Hardware & Software Rules-Engine Override
                  </span>
                </div>

                {/* Priority Table */}
                <div className="space-y-1.5 font-mono text-xs">
                  {([1, 2, 3, 4, 5, 6] as PriorityLevel[]).map((lvl) => {
                    const item = PRIORITY_MATRIX[lvl];
                    const isCurrent = telemetry.activePriorityLevel === lvl;

                    return (
                      <div
                        key={lvl}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          isCurrent
                            ? 'bg-slate-800 border-sky-400 shadow-md ring-1 ring-sky-400/40'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-white w-16">
                            LEVEL {item.level}
                          </span>
                          <span className="text-slate-200 font-semibold">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className="text-[11px] text-slate-400 hidden md:inline">
                            {item.description}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 font-mono text-cyan-400">
                            {item.duckingDb === -90
                              ? 'MUTE ALL'
                              : `${item.duckingDb} dB`}
                          </span>

                          {/* Quick manual simulation triggers */}
                          {lvl === 4 && (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => audioEngine.playScheduledAdzan(false)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] cursor-pointer font-medium"
                                title="Siarkan Adzan Biasa (Dzuhur, Ashar, Maghrib, Isya)"
                              >
                                Test Adzan Biasa
                              </button>
                              <button
                                onClick={() => audioEngine.playScheduledAdzan(true)}
                                className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] cursor-pointer font-medium"
                                title="Siarkan Adzan Subuh dengan lafaz Ash-shalatu khairum minan naum"
                              >
                                Test Adzan Subuh
                              </button>
                            </div>
                          )}
                          {lvl === 5 && (
                            <button
                              onClick={() => audioEngine.playIndonesiaRaya()}
                              className="px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white text-[10px] cursor-pointer font-medium"
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

                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-slate-300">
                  <span className="font-semibold text-purple-300">Logika Pe-redaman (Audio Ducking):</span> Ketika prioritas lebih tinggi aktif (misal Level 3 FIDS, Level 4 Adzan, atau Level 5 Indonesia Raya), BGM di Level 6 secara otomatis mengalami pelemahan volume (*ducking*) secara mulus, dan akan kembali normal (*fade-in*) setelah siaran selesai.
                </div>

                {/* Upload & Audio Assets Management Section */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                        Unggah & Kelola Berkas Audio Siaran (MP3/WAV/AAC)
                      </span>
                    </div>
                    {onOpenAudioUploadModal && (
                      <button
                        onClick={onOpenAudioUploadModal}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold tracking-wide uppercase transition-all cursor-pointer shadow-sm"
                      >
                        Buka Manajer Audio Lengkap
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    {/* BGM Upload Card */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-purple-300">BGM Terminal</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${customTracks?.bgm.hasCustomFile ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {customTracks?.bgm.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {customTracks?.bgm.fileName || 'Prosedural Ambient'}
                      </div>
                      <div className="flex space-x-1 pt-1">
                        <label className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] text-center cursor-pointer border border-slate-700">
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
                          className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] cursor-pointer"
                        >
                          {audioEngine.isBgmActive() ? 'Stop' : 'Putar'}
                        </button>
                      </div>
                    </div>

                    {/* Indonesia Raya Upload Card */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-pink-300">Indonesia Raya</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${customTracks?.indonesiaRaya.hasCustomFile ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {customTracks?.indonesiaRaya.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {customTracks?.indonesiaRaya.fileName || 'Prosedural Orkestra'}
                      </div>
                      <div className="flex space-x-1 pt-1">
                        <label className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] text-center cursor-pointer border border-slate-700">
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
                          className="px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>

                    {/* Adzan Biasa Upload Card */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-emerald-300">Adzan Biasa</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${customTracks?.adzanRegular.hasCustomFile ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {customTracks?.adzanRegular.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {customTracks?.adzanRegular.fileName || 'Prosedural Hijaz'}
                      </div>
                      <div className="flex space-x-1 pt-1">
                        <label className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] text-center cursor-pointer border border-slate-700">
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
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>

                    {/* Adzan Subuh Upload Card */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-teal-300">Adzan Subuh</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${customTracks?.adzanSubuh.hasCustomFile ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {customTracks?.adzanSubuh.hasCustomFile ? 'KUSTOM' : 'DEFAULT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {customTracks?.adzanSubuh.fileName || 'Prosedural Fajar'}
                      </div>
                      <div className="flex space-x-1 pt-1">
                        <label className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] text-center cursor-pointer border border-slate-700">
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
                          className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] cursor-pointer"
                        >
                          Siarkan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drill Simulation Callout */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <span>Uji Coba Latihan: Simulasi Skenario Darurat Interaktif (Sandbox)</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Pilih dari 5 skenario (Kebakaran L2, Koper Mencurigakan, Serangan Jantung, Hazmat Apron, Gempa All-Call) tanpa mengganggu operasional sistem PA nyata.
                    </p>
                  </div>
                  {onOpenSimulation && (
                    <button
                      onClick={onOpenSimulation}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer shrink-0"
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
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-100">
                      Surveilans Jalur Kabel 20 kHz & Sertifikasi EN 54-16
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Pilot Tone Scan Rate: 20,000 Hz
                  </span>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Speaker IP</div>
                    <div className="text-lg font-bold text-slate-100">
                      {telemetry.totalSpeakers} Unit
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      {telemetry.onlineSpeakers} Online / Normal
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Impedansi Jalur Nominal</div>
                    <div className="text-lg font-bold text-cyan-400">8.20 &Omega;</div>
                    <div className="text-[10px] text-slate-400">Toleransi EN54: &plusmn;10%</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">RSTP Ring Failover</div>
                    <div className="text-lg font-bold text-emerald-400">&lt; 18 ms</div>
                    <div className="text-[10px] text-slate-400">IGMP Snooping v3 Active</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Sekering Termal 150&deg;C</div>
                    <div className="text-lg font-bold text-emerald-400">100% Intact</div>
                    <div className="text-[10px] text-slate-400">EN 54-24 Fire Dome</div>
                  </div>
                </div>

                {/* Fault Injection Simulator (FR-TEL-01 Testing) */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Simulator Uji Coba Kegagalan Jalur (Fault Injection Test):
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      Uji Deteksi &lt; 2 Detik Sesuai FR-TEL-01
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={simulatedFaultSpeakerId}
                      onChange={(e) => setSimulatedFaultSpeakerId(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none"
                    >
                      {speakers.map((spk) => (
                        <option key={spk.id} value={spk.id}>
                          {spk.name} ({spk.ipAddress})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => onTriggerFault(simulatedFaultSpeakerId, true)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Simulasikan Putus Kabel (Line Break)</span>
                    </button>

                    <button
                      onClick={() => onTriggerFault(simulatedFaultSpeakerId, false)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
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
