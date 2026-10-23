/**
 * Airport IP Public Address System - Digital Twin Application
 * Compliant with EN 54-16 / EN 54-24 standards
 */

import React, { useState, useEffect, useRef } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { DigitalTwinCanvas } from './components/DigitalTwinCanvas';
import { DockControls } from './components/DockControls';
import { SpeakerDetailDrawer } from './components/SpeakerDetailDrawer';
import { EmergencyModal } from './components/EmergencyModal';
import { SimulationSandboxDrawer } from './components/SimulationSandboxDrawer';
import { AudioUploadManagerModal } from './components/AudioUploadManagerModal';
import { LandingPage } from './components/LandingPage';
import { AirportSceneManager, VisualizerMode, CameraPresetType } from './three/AirportSceneManager';
import {
  MacroZone,
  IPSpeaker,
  ZoneId,
  FlightAnnouncement,
  PriorityLevel,
  SystemTelemetry,
} from './types/pa-system';
import { EmergencyScenario } from './types/simulation';
import {
  AudioTrackType,
  CustomAudioTrack,
  INITIAL_CUSTOM_TRACKS,
} from './types/custom-audio';
import {
  INITIAL_MACRO_ZONES,
  INITIAL_SPEAKERS,
  INITIAL_FLIGHTS,
} from './data/mock-airport-data';
import { audioEngine } from './audio/audio-engine';
import { loadAllTracksFromDB, saveTrackToDB, deleteTrackFromDB } from './audio/audio-storage';

export default function App() {
  const [macroZones, setMacroZones] = useState<MacroZone[]>(INITIAL_MACRO_ZONES);
  const [speakers, setSpeakers] = useState<IPSpeaker[]>(INITIAL_SPEAKERS);
  const [flights, setFlights] = useState<FlightAnnouncement[]>(INITIAL_FLIGHTS);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);
  const [initialPreset, setInitialPreset] = useState<CameraPresetType>('overview');

  // Interaction State
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<IPSpeaker | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bim_normal');
  const [broadcastingZoneIds, setBroadcastingZoneIds] = useState<ZoneId[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Emergency Drill Simulation State (Isolated Sandbox)
  const [isSimulationDrawerOpen, setIsSimulationDrawerOpen] = useState<boolean>(false);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<EmergencyScenario | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSimAudioPlaying, setIsSimAudioPlaying] = useState<boolean>(false);

  // Reference to 3D scene manager
  const sceneManagerRef = useRef<AirportSceneManager | null>(null);

  // Custom Uploaded Audio Tracks (BGM, Indonesia Raya, Adzan Biasa, Adzan Subuh)
  const [customTracks, setCustomTracks] = useState<Record<AudioTrackType, CustomAudioTrack>>(INITIAL_CUSTOM_TRACKS);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);

  // Restore saved custom audio from IndexedDB on startup
  useEffect(() => {
    async function restoreSavedTracks() {
      try {
        const records = await loadAllTracksFromDB();
        for (const record of records) {
          try {
            await audioEngine.loadCustomAudioFromArrayBuffer(
              record.id,
              record.arrayBuffer,
              record.name,
              record.sizeFormatted
            );
            setCustomTracks((prev) => ({
              ...prev,
              [record.id]: {
                ...prev[record.id],
                fileName: record.name,
                fileSizeFormatted: record.sizeFormatted,
                durationSec: record.durationSec,
                sampleRate: record.sampleRate,
                uploadedAt: record.uploadedAt,
                hasCustomFile: true,
              },
            }));
          } catch (e) {
            console.warn('Could not restore track', record.id, e);
          }
        }
      } catch (err) {
        console.warn('Failed to load audio tracks from DB:', err);
      }
    }
    restoreSavedTracks();
  }, []);

  // System Telemetry
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    currentTimeUtc: '',
    currentTimeWib: '',
    en54Compliant: true,
    rstpRingStatus: 'Redundant Loop OK',
    networkLatencyMs: 14,
    igmpSnoopingActive: true,
    activePriorityLevel: 6,
    activeAnnouncementText: null,
    activeSource: 'AOC Terminal Master DSP',
    activeZones: [],
    pilotToneScanFrequencyHz: 20000,
    totalSpeakers: INITIAL_SPEAKERS.length,
    onlineSpeakers: INITIAL_SPEAKERS.length,
    faultySpeakers: 0,
    bgmPlaying: false,
  });

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Subscribe to Priority Matrix changes from Audio Engine
  useEffect(() => {
    const unsub = audioEngine.subscribePriorityChange((level: PriorityLevel) => {
      setTelemetry((prev) => ({
        ...prev,
        activePriorityLevel: level,
      }));
    });
    return () => unsub();
  }, []);

  // Update counts when speakers change
  useEffect(() => {
    const online = speakers.filter((s) => s.status === 'online' || s.status === 'broadcasting').length;
    const faulty = speakers.filter((s) => s.status === 'pilot_fault' || s.status === 'offline').length;
    setTelemetry((prev) => ({
      ...prev,
      onlineSpeakers: online,
      faultySpeakers: faulty,
    }));
  }, [speakers]);

  // Master Emergency Evacuation Trigger (Level 1 Mutlak)
  const handleTriggerEmergency = () => {
    setIsEmergencyActive(true);
    setIsEmergencyModalOpen(true);
    audioEngine.startEmergencyEvacuation();
    showToast('🚨 EN 54-16 EMERGENCY ACTIVATED: Sirine ISO 8201 dan jalur evakuasi aktif!');
  };

  const handleCancelEmergency = () => {
    setIsEmergencyActive(false);
    setIsEmergencyModalOpen(false);
    audioEngine.stopEmergencyEvacuation();
    showToast('✅ Status Darurat Direset: Sistem kembali ke pengoperasian normal.');
  };

  // BGM Lounge Music Toggle
  const handleToggleBgm = () => {
    if (isBgmActive) {
      audioEngine.stopBgm();
      setIsBgmActive(false);
      showToast('BGM Terminal Dimatikan.');
    } else {
      audioEngine.startBgm();
      setIsBgmActive(true);
      const isCustom = customTracks.bgm.hasCustomFile;
      showToast(
        isCustom
          ? `🎵 BGM Terminal Aktif: Memutar "${customTracks.bgm.fileName}" (Looping Audio Kustom).`
          : '🎵 BGM Terminal Aktif: Musik lounge prosedural diputar.'
      );
    }
  };

  // Custom Audio Track Handlers (BGM, Indonesia Raya, Adzan Biasa, Adzan Subuh)
  const handleUploadTrack = async (type: AudioTrackType, file: File) => {
    try {
      const meta = await audioEngine.loadCustomAudioFile(type, file);
      await saveTrackToDB(type, file, {
        durationSec: meta.duration,
        sampleRate: meta.sampleRate,
        sizeFormatted: meta.sizeFormatted,
      });

      setCustomTracks((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          fileName: meta.name,
          fileSizeFormatted: meta.sizeFormatted,
          durationSec: meta.duration,
          sampleRate: meta.sampleRate,
          uploadedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
          hasCustomFile: true,
        },
      }));
      showToast(`✅ Berhasil mengunggah berkas ${meta.name} (${meta.sizeFormatted}) untuk ${INITIAL_CUSTOM_TRACKS[type].title}.`);
    } catch (err) {
      console.error('Failed to load audio file:', err);
      showToast('❌ Gagal membaca berkas audio: Format tidak didukung.');
    }
  };

  const handleTrackUploaded = (
    type: AudioTrackType,
    meta: { name: string; sizeFormatted: string; durationSec: number; sampleRate?: number }
  ) => {
    setCustomTracks((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        fileName: meta.name,
        fileSizeFormatted: meta.sizeFormatted,
        durationSec: meta.durationSec,
        sampleRate: meta.sampleRate,
        uploadedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
        hasCustomFile: true,
      },
    }));
  };

  const handleTrackRemoved = async (type: AudioTrackType) => {
    audioEngine.removeCustomAudioFile(type);
    await deleteTrackFromDB(type);
    setCustomTracks((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        fileName: null,
        fileSizeFormatted: undefined,
        durationSec: undefined,
        sampleRate: undefined,
        uploadedAt: undefined,
        hasCustomFile: false,
      },
    }));
    showToast(`Berhasil mereset audio ${INITIAL_CUSTOM_TRACKS[type].title} ke default.`);
  };

  // Broadcast announcement to selected zones
  const handleBroadcastToZones = async (zoneIds: ZoneId[], textId: string, textEn?: string) => {
    setBroadcastingZoneIds(zoneIds);
    setTelemetry((prev) => ({
      ...prev,
      activeZones: zoneIds,
      activeAnnouncementText: textId,
    }));

    showToast(`📢 Menyiarkan pengumuman ke ${zoneIds.length} zona dengan Chime 4-Nada.`);
    await audioEngine.playFlightAnnouncement(textId, textEn);

    setBroadcastingZoneIds([]);
    setTelemetry((prev) => ({
      ...prev,
      activeZones: [],
      activeAnnouncementText: null,
    }));
  };

  // 20kHz Pilot Tone Fault Simulation (FR-TEL-01 Testing)
  const handleTriggerFault = (speakerId: string, isFaulty: boolean) => {
    const measurement = audioEngine.measureLineImpedance(isFaulty);

    setSpeakers((prev) =>
      prev.map((spk) => {
        if (spk.id === speakerId) {
          const updated: IPSpeaker = {
            ...spk,
            status: isFaulty ? 'pilot_fault' : 'online',
            impedanceOhm: measurement.impedanceOhm,
            pilotTone20kHzOk: measurement.pilotToneOk,
          };

          // Update 3D scene node status LED
          if (sceneManagerRef.current) {
            sceneManagerRef.current.updateSpeakerStatus(speakerId, updated.status);
          }

          return updated;
        }
        return spk;
      })
    );

    if (isFaulty) {
      showToast(
        `⚠️ FR-TEL-01 ALARM (< 2s): Putus Jalur / Hambatan Anomali pada ${speakerId} (Impedansi: ${measurement.impedanceOhm} Ω)!`
      );
    } else {
      showToast(`✅ Jalur ${speakerId} Pulih: Impedansi normal 8.20 Ω, Pilot Tone OK.`);
    }
  };

  // Interactive Emergency Drill Simulation Handlers
  const handleStartScenario = async (scenario: EmergencyScenario) => {
    setIsSimulationActive(true);
    setActiveScenario(scenario);
    setCurrentStepIndex(0);
    setIsSimAudioPlaying(true);

    const firstStep = scenario.steps[0];
    setTelemetry((prev) => ({
      ...prev,
      activePriorityLevel: firstStep.priorityLevel,
    }));

    if (sceneManagerRef.current) {
      sceneManagerRef.current.setSimulationIncident(
        scenario,
        firstStep.affectedZoneIds,
        firstStep.isEvacuating
      );
    }

    showToast(`🚨 DRILL SIMULASI AKTIF: ${scenario.title} (Sistem Fisik Aman Terisolasi)`);
    await audioEngine.startSimulationScenarioAudio(
      scenario.soundType,
      scenario.announcementId,
      scenario.announcementEn
    );
  };

  const handleAdvanceStep = async (stepIndex: number) => {
    if (!activeScenario) return;
    setCurrentStepIndex(stepIndex);
    const targetStep = activeScenario.steps[stepIndex];

    setTelemetry((prev) => ({
      ...prev,
      activePriorityLevel: targetStep.priorityLevel,
    }));

    if (sceneManagerRef.current) {
      sceneManagerRef.current.setSimulationIncident(
        activeScenario,
        targetStep.affectedZoneIds,
        targetStep.isEvacuating
      );
    }

    showToast(`⚡ Langkah ${stepIndex + 1}: ${targetStep.title}`);
  };

  const handleStopSimulation = () => {
    setIsSimulationActive(false);
    setActiveScenario(null);
    setCurrentStepIndex(0);
    setIsSimAudioPlaying(false);

    audioEngine.stopSimulationScenarioAudio();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearSimulationIncident();
    }

    setTelemetry((prev) => ({
      ...prev,
      activePriorityLevel: 6,
    }));

    showToast('✅ Simulasi Selesai: Sistem Digital Twin kembali ke mode normal.');
  };

  const handleToggleSimAudio = () => {
    if (isSimAudioPlaying) {
      audioEngine.stopSimulationScenarioAudio();
      setIsSimAudioPlaying(false);
      showToast('Audio simulasi dimatikan.');
    } else if (activeScenario) {
      audioEngine.startSimulationScenarioAudio(
        activeScenario.soundType,
        activeScenario.announcementId,
        activeScenario.announcementEn
      );
      setIsSimAudioPlaying(true);
      showToast('Audio simulasi dihidupkan.');
    }
  };

  const handleFocusIncident = (coords: [number, number, number]) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.focusCoordinates(coords);
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(
        next === 'light'
          ? '☀️ Mode Tampilan Terang (Light Mode) Aktif.'
          : '🌙 Mode Tampilan Gelap (Dark Mode) Aktif.'
      );
      return next;
    });
  };

  // Zone volume slider
  const handleUpdateZoneVolume = (zoneId: ZoneId, volume: number) => {
    setMacroZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, volume } : z))
    );
  };

  // Keyboard shortcut listener (H for dock toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') setSelectedZoneId('macro-1');
      if (e.key === '2') setSelectedZoneId('macro-2');
      if (e.key === '3') setSelectedZoneId('macro-3');
      if (e.key === '4') setSelectedZoneId('macro-4');
      if (e.key === '5') setSelectedZoneId('macro-5');
      if (e.key === '0' || e.key === 'o' || e.key === 'O') {
        setSelectedZoneId(null);
        sceneManagerRef.current?.setCameraPreset('overview');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEnterDigitalTwin = (options?: {
    zoneId?: ZoneId | null;
    floorCutaway?: 'all' | 'floor1' | 'floor2';
    openSimulation?: boolean;
  }) => {
    if (options?.floorCutaway === 'floor1') {
      setInitialPreset('lantai1');
      setSelectedZoneId(null);
    } else if (options?.floorCutaway === 'floor2') {
      setInitialPreset('lantai2');
      setSelectedZoneId(null);
    } else if (options?.zoneId) {
      setSelectedZoneId(options.zoneId);
      if (options.zoneId === 'macro-1') setInitialPreset('utama');
      else if (options.zoneId === 'macro-2') setInitialPreset('eksisting');
      else if (options.zoneId === 'macro-3') setInitialPreset('selatan');
      else if (options.zoneId === 'macro-4') setInitialPreset('apron');
      else if (options.zoneId === 'macro-5') setInitialPreset('parking');
    } else {
      setInitialPreset('overview');
      setSelectedZoneId(null);
    }

    if (options?.openSimulation) {
      setIsSimulationDrawerOpen(true);
    }

    setShowLandingPage(false);
  };

  if (showLandingPage) {
    return (
      <LandingPage
        macroZones={macroZones}
        speakers={speakers}
        onEnterDigitalTwin={handleEnterDigitalTwin}
      />
    );
  }

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-300 ${
        theme === 'light' ? 'light-mode bg-sky-100' : 'bg-slate-950'
      }`}
    >
      {/* 1. Header Bar */}
      <HeaderBar
        telemetry={telemetry}
        onTriggerEmergency={handleTriggerEmergency}
        onCancelEmergency={handleCancelEmergency}
        onToggleBgm={handleToggleBgm}
        isBgmActive={isBgmActive}
        onToggleSimulation={() => setIsSimulationDrawerOpen(!isSimulationDrawerOpen)}
        isSimulationActive={isSimulationActive}
        activeScenarioTitle={activeScenario?.title}
        onOpenAudioUploadModal={() => setIsAudioModalOpen(true)}
        customTracksCount={Object.values(customTracks).filter((t) => t.hasCustomFile).length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenLandingPage={() => setShowLandingPage(true)}
      />

      {/* 2. 3D Digital Twin WebGL Viewport */}
      <main className="w-full h-full pt-12">
        <DigitalTwinCanvas
          macroZones={macroZones}
          speakers={speakers}
          selectedZoneId={selectedZoneId}
          onSelectZone={(zid) => setSelectedZoneId(zid)}
          onSelectSpeaker={(spk) => setSelectedSpeaker(spk)}
          visualizerMode={visualizerMode}
          onSetVisualizerMode={(mode) => setVisualizerMode(mode)}
          isEmergencyActive={isEmergencyActive}
          broadcastingZoneIds={broadcastingZoneIds}
          theme={theme}
          initialPreset={initialPreset}
          onSceneManagerReady={(manager) => {
            sceneManagerRef.current = manager;
          }}
        />
      </main>

      {/* 3. Collapsible Ergonomic Bottom Dock (Zero Viewport Occlusion) */}
      <DockControls
        macroZones={macroZones}
        speakers={speakers}
        selectedZoneId={selectedZoneId}
        onSelectZone={(zid) => setSelectedZoneId(zid)}
        flights={flights}
        telemetry={telemetry}
        onBroadcastToZones={handleBroadcastToZones}
        onTriggerFault={handleTriggerFault}
        onUpdateZoneVolume={handleUpdateZoneVolume}
        onOpenSimulation={() => setIsSimulationDrawerOpen(true)}
        customTracks={customTracks}
        onOpenAudioUploadModal={() => setIsAudioModalOpen(true)}
        onUploadTrack={handleUploadTrack}
      />

      {/* 4. Single Speaker Inspection Drawer */}
      {selectedSpeaker && (
        <SpeakerDetailDrawer
          speaker={selectedSpeaker}
          zone={macroZones.find((z) => z.id === selectedSpeaker.macroZoneId)}
          onClose={() => setSelectedSpeaker(null)}
          onToggleFault={handleTriggerFault}
        />
      )}

      {/* 5. EN 54-16 Phased Evacuation Tactical Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        macroZones={macroZones}
        onTriggerEvacZone={(zid) => setSelectedZoneId(zid)}
      />

      {/* 6. Interactive Emergency Scenario Drill Simulation Drawer */}
      <SimulationSandboxDrawer
        isOpen={isSimulationDrawerOpen}
        onClose={() => setIsSimulationDrawerOpen(false)}
        macroZones={macroZones}
        onStartScenario={handleStartScenario}
        onAdvanceStep={handleAdvanceStep}
        onStopSimulation={handleStopSimulation}
        onToggleSimAudio={handleToggleSimAudio}
        onFocusIncident={handleFocusIncident}
        activeScenario={activeScenario}
        currentStepIndex={currentStepIndex}
        isSimAudioPlaying={isSimAudioPlaying}
        isSimulationActive={isSimulationActive}
      />

      {/* 7. Airport Audio Assets & Upload Manager Modal */}
      <AudioUploadManagerModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        tracks={customTracks}
        onTrackUploaded={handleTrackUploaded}
        onTrackRemoved={handleTrackRemoved}
        onShowToast={showToast}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-24 right-4 z-40 max-w-md p-3 rounded-xl bg-slate-900/95 border border-sky-500/50 shadow-2xl text-xs font-mono text-slate-100 backdrop-blur-md animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
