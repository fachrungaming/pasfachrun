/**
 * Airport IP Public Address System - Type Definitions & Constants
 * Compliant with EN 54-16 / EN 54-24 standards
 */

export type PriorityLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface PriorityDefinition {
  level: PriorityLevel;
  name: string;
  nameEn: string;
  description: string;
  behavior: 'override' | 'duck_heavy' | 'duck_medium' | 'duck_light' | 'duck_mute' | 'base';
  duckingDb: number; // dB attenuation applied to lower levels
  color: string;
  icon: string;
}

export const PRIORITY_MATRIX: Record<PriorityLevel, PriorityDefinition> = {
  1: {
    level: 1,
    name: 'Emergency (Darurat / Evakuasi)',
    nameEn: 'Emergency Evacuation',
    description: 'Dipicu Fire Alarm / ARFF. Override mutlak seluruh saluran audio, volume maksimal EN 54-16.',
    behavior: 'override',
    duckingDb: -90, // total mute
    color: '#ef4444',
    icon: 'Flame',
  },
  2: {
    level: 2,
    name: 'Care Call (Prioritas Medis / Keamanan)',
    nameEn: 'Care & Security Call',
    description: 'Panggilan darurat personel, medis, atau peringatan sekuriti zona langsung dari AOC.',
    behavior: 'duck_heavy',
    duckingDb: -24,
    color: '#f97316',
    icon: 'ShieldAlert',
  },
  3: {
    level: 3,
    name: 'Panggilan Informasi Penerbangan (FIDS)',
    nameEn: 'Flight Information (FIDS)',
    description: 'Integrasi FIDS otomatis & manual: Boarding, Final Call, Gate Change, Delay multi-bahasa.',
    behavior: 'duck_medium',
    duckingDb: -18,
    color: '#3b82f6',
    icon: 'Plane',
  },
  4: {
    level: 4,
    name: 'Adzan Terjadwal',
    nameEn: 'Scheduled Adzan',
    description: 'Pengumuman waktu ibadah otomatis berbasis perhitungan astronomis lokal bandara.',
    behavior: 'duck_mute',
    duckingDb: -60,
    color: '#10b981',
    icon: 'Clock',
  },
  5: {
    level: 5,
    name: 'Indonesia Raya',
    nameEn: 'National Anthem',
    description: 'Pemutaran lagu kebangsaan jam terjadwal serentak ke seluruh zona bandara.',
    behavior: 'duck_mute',
    duckingDb: -60,
    color: '#ec4899',
    icon: 'Flag',
  },
  6: {
    level: 6,
    name: 'Background Music (BGM)',
    nameEn: 'Ambient Background Music',
    description: 'Musik latar kenyamanan terminal bandara. Otomatis fade-out jika ada level 1-5.',
    behavior: 'base',
    duckingDb: 0,
    color: '#8b5cf6',
    icon: 'Music',
  },
};

export type ZoneId = 'macro-1' | 'macro-2' | 'macro-3' | 'macro-4' | 'macro-5';

export interface MacroZone {
  id: ZoneId;
  name: string;
  nameEn: string;
  code: string;
  sipExtension: string;
  targetStipa: number; // e.g. 0.45 min
  currentStipa: number;
  currentSplDba: number;
  ambientNoiseDba: number;
  speakerCount: number;
  subZones: SubZone[];
  centerPos: [number, number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  color: string;
  description: string;
  environmentalType: 'indoor_concourse' | 'indoor_baggage' | 'indoor_gate' | 'outdoor_curb';
  ipRating: 'IP42' | 'IP54' | 'IP65';
  evacuationStatus: 'normal' | 'standby' | 'alert' | 'evacuating';
  volume: number; // 0 - 100
  isMuted: boolean;
}

export interface SubZone {
  id: string;
  name: string;
  macroZoneId: ZoneId;
  speakerIds: string[];
}

export type SpeakerStatus = 'online' | 'broadcasting' | 'pilot_fault' | 'offline' | 'emergency';

export interface IPSpeaker {
  id: string;
  name: string;
  macroZoneId: ZoneId;
  subZoneId: string;
  position: [number, number, number]; // 3D coordinates
  ipAddress: string;
  macAddress: string;
  poeClass: 'PoE+ (30W)' | 'PoE++ (60W)';
  currentWattage: number;
  status: SpeakerStatus;
  impedanceOhm: number; // Nominal ~8.2 Ohm
  pilotTone20kHzOk: boolean;
  thermalFuse150Ok: boolean; // EN 54-24 fire dome fuse
  splDba: number;
  stipaScore: number;
  dspEnabled: boolean;
}

export interface CableRoute {
  id: string;
  sourceSwitch: string;
  targetSpeakerIds: string[];
  cableType: 'Cat6A F/UTP LSZH (PoE++)' | 'SingleMode Fiber Trunk';
  pilotToneHealthy: boolean;
  path: [number, number, number][];
}

export interface FlightAnnouncement {
  id: string;
  flightNumber: string;
  airline: string;
  destination: string;
  gate: string;
  scheduledTime: string;
  status: 'Scheduled' | 'Boarding' | 'Final Call' | 'Gate Change' | 'Delayed';
  zoneId: ZoneId;
  language: 'id' | 'en' | 'both';
}

export interface SystemTelemetry {
  currentTimeUtc: string;
  currentTimeWib: string;
  en54Compliant: boolean;
  rstpRingStatus: 'Redundant Loop OK' | 'Failover Active' | 'Ring Degraded';
  networkLatencyMs: number; // < 50ms requirement
  igmpSnoopingActive: boolean;
  activePriorityLevel: PriorityLevel;
  activeAnnouncementText: string | null;
  activeSource: string;
  activeZones: ZoneId[];
  pilotToneScanFrequencyHz: 20000;
  totalSpeakers: number;
  onlineSpeakers: number;
  faultySpeakers: number;
  bgmPlaying: boolean;
}
