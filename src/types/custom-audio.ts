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
    subtitle: 'Musik latar ambien kenyamanan penumpang. Otomatis Mute saat Level 1–3 (Darurat/Adzan/Indonesia Raya) ON.',
    priorityLevel: 6,
    fileName: null,
    hasCustomFile: false,
  },
  indonesiaRaya: {
    id: 'indonesiaRaya',
    title: 'Lagu Kebangsaan Indonesia Raya',
    subtitle: 'Prioritas Level 3: Siaran nasional terjadwal serentak. Otomatis mem-mute seluruh prioritas di bawahnya (Level 4–6).',
    priorityLevel: 3,
    fileName: null,
    hasCustomFile: false,
  },
  adzanRegular: {
    id: 'adzanRegular',
    title: 'Suara Adzan Biasa (Dzuhur, Ashar, Maghrib, Isya)',
    subtitle: 'Prioritas Level 2: Panggilan ibadah 4 waktu otomatis. Otomatis mem-mute seluruh prioritas di bawahnya (Level 3–6).',
    priorityLevel: 2,
    fileName: null,
    hasCustomFile: false,
  },
  adzanSubuh: {
    id: 'adzanSubuh',
    title: 'Suara Adzan Subuh',
    subtitle: 'Prioritas Level 2: Khusus waktu fajar dengan lafaz "Ash-shalatu khairum minan naum". Otomatis mem-mute Level 3–6.',
    priorityLevel: 2,
    fileName: null,
    hasCustomFile: false,
  },
};
