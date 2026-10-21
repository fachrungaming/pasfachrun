import { PriorityLevel } from './pa-system';

export type AudioTrackType = 'bgm' | 'indonesiaRaya' | 'adzanRegular' | 'adzanSubuh';

export interface CustomAudioTrack {
  id: AudioTrackType;
  title: string;
  subtitle: string;
  priorityLevel: PriorityLevel;
  fileName: string | null;
  fileSizeFormatted?: string;
  durationSec?: number;
  sampleRate?: number;
  uploadedAt?: string;
  hasCustomFile: boolean;
  isPlaying?: boolean;
}

export const INITIAL_CUSTOM_TRACKS: Record<AudioTrackType, CustomAudioTrack> = {
  bgm: {
    id: 'bgm',
    title: 'Musik Latar Terminal (BGM)',
    subtitle: 'Musik latar ambien kenyamanan penumpang. Otomatis fade-out saat prioritas 1-5 aktif.',
    priorityLevel: 6,
    fileName: null,
    hasCustomFile: false,
  },
  indonesiaRaya: {
    id: 'indonesiaRaya',
    title: 'Lagu Kebangsaan Indonesia Raya',
    subtitle: 'Siaran nasional terjadwal jam 10:00 WIB serentak ke seluruh 5 zona makro.',
    priorityLevel: 5,
    fileName: null,
    hasCustomFile: false,
  },
  adzanRegular: {
    id: 'adzanRegular',
    title: 'Suara Adzan Biasa (Dzuhur, Ashar, Maghrib, Isya)',
    subtitle: 'Panggilan ibadah 4 waktu otomatis berbasis waktu astronomis lokal bandara.',
    priorityLevel: 4,
    fileName: null,
    hasCustomFile: false,
  },
  adzanSubuh: {
    id: 'adzanSubuh',
    title: 'Suara Adzan Subuh',
    subtitle: 'Khusus waktu fajar dengan lafaz "Ash-shalatu khairum minan naum".',
    priorityLevel: 4,
    fileName: null,
    hasCustomFile: false,
  },
};
