/**
 * Emergency Simulation Types & Scenario Definitions
 * Digital Twin Sandboxed Emergency Drill Engine (EN 54-16 Phased Evacuation)
 * Bandar Udara Internasional Sultan Hasanuddin Makassar (WAAA / MKS)
 */

import { ZoneId, PriorityLevel } from './pa-system';

export type ScenarioCategory = 'fire' | 'security' | 'medical' | 'hazmat' | 'earthquake';

export interface SimulationStep {
  stepNumber: number;
  title: string;
  description: string;
  systemResponse: string;
  affectedZoneIds: ZoneId[];
  isEvacuating: boolean;
  priorityLevel: PriorityLevel;
  audioAction: string;
}

export interface EmergencyScenario {
  id: string;
  title: string;
  titleEn: string;
  category: ScenarioCategory;
  severity: 'critical' | 'high' | 'medium';
  priorityLevel: PriorityLevel;
  primaryZoneId: ZoneId;
  subZoneName: string;
  incidentCoordinates: [number, number, number];
  triggerSource: string;
  description: string;
  announcementId: string;
  announcementEn: string;
  soundType: 'siren_iso8201' | 'security_chime' | 'medical_paging' | 'earthquake_rumble';
  assemblyPoint: string;
  evacuationRouteDescription: string;
  steps: SimulationStep[];
}

export interface SimulationState {
  isActive: boolean;
  activeScenario: EmergencyScenario | null;
  currentStepIndex: number;
  isPlayingAudio: boolean;
  elapsedSeconds: number;
  isPaused: boolean;
  logs: { time: string; message: string; type: 'info' | 'warn' | 'alarm' | 'success' }[];
}

export const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: 'scen-fire-carpark',
    title: 'Kebakaran Kendaraan di Gedung Parkir',
    titleEn: 'Vehicle Fire in Car Park',
    category: 'fire',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-5',
    subZoneName: 'Gedung Parkir Lantai 2',
    incidentCoordinates: [38, 6.0, -66],
    triggerSource: 'Optical Smoke Detector Loop 4 (FACP WAAA address #04-12)',
    description: 'Terdeteksi asap pekat dan kenaikan suhu drastis pada dek parkir barat lantai 2 Gedung Parkir 3 Lantai. Sistem memicu interlock EN 54-16 untuk evakuasi bertahap gedung parkir tanpa membuat panik Terminal Utama.',
    announcementId: 'Perhatian! Latihan simulasi darurat Bandara Sultan Hasanuddin: Terdeteksi indikasi kebakaran di area Gedung Parkir Lantai 2. Seluruh pengunjung di area parkir diminta segera menuju tangga darurat barat.',
    announcementEn: 'Attention! Emergency drill simulation at Sultan Hasanuddin Airport: A fire has been reported at Car Park Level 2. All visitors in the car park must evacuate immediately through the west emergency exits.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Assembly Point Lapangan Parkir Barat (Titik Kumpul C)',
    evacuationRouteDescription: 'Gedung Parkir Lt.2 -> Ramp & Tangga Egress Barat -> Curbside Terbuka -> Assembly Point C',
    steps: [
      {
        stepNumber: 1,
        title: 'Verifikasi Alarm & Interlock Matriks',
        description: 'Sensor FACP mengirim sinyal kontak kering ke IP PA Gateway WAAA. Sistem memverifikasi alarm dalam 0.8 detik.',
        systemResponse: 'Matriks Prioritas Level 1 aktif otomatis. Pe-redaman BGM (-90 dB total mute).',
        affectedZoneIds: ['macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Sirine ISO 8201 diaktifkan pada speaker Horn PoE++ Gedung Parkir 3 Lantai.',
      },
      {
        stepNumber: 2,
        title: 'Siaran Evakuasi Gedung Parkir (Fase 1)',
        description: 'Pesan evakuasi dua bahasa disiarkan berulang hanya di Gedung Parkir 3 Lantai dan Skybridge Curbside.',
        systemResponse: 'Terminal Utama, Eksisting, dan Selatan diset ke mode "Standby Terkendali" agar tidak memicu kepanikan.',
        affectedZoneIds: ['macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Pesan suara evakuasi Bahasa Indonesia dan Inggris diputar berkala.',
      },
      {
        stepNumber: 3,
        title: 'Eskalasi Siaga Terminal Utama 3 Lantai (Fase 2)',
        description: 'Jika asap mendekati Skybridge, perimeter Lantai 1 & 2 Terminal Utama disiagakan untuk penutupan akses jembatan.',
        systemResponse: 'Pemberitahuan petugas Avsec diaktifkan melalui SIP Paging langsung ke posko Terminal Utama.',
        affectedZoneIds: ['macro-5', 'macro-1'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Peringatan siaga internal dialirkan ke koridor Skybridge Terminal Utama.',
      },
      {
        stepNumber: 4,
        title: 'Evakuasi Tuntas & Status Aman (All Clear)',
        description: 'Regu PKP-PK (ARFF) Bandara Sultan Hasanuddin berhasil memadamkan titik api. Evakuasi selesai.',
        systemResponse: 'Sistem mereset status prioritas darurat dan mengembalikan mode BGM secara perlahan (fade-in).',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Pengumuman pemulihan status normal disiarkan.',
      },
    ],
  },
  {
    id: 'scen-sec-unattended',
    title: 'Bagasi Mencurigakan di SCP Terminal Utama',
    titleEn: 'Suspicious Unattended Bag at Main Terminal SCP',
    category: 'security',
    severity: 'high',
    priorityLevel: 2,
    primaryZoneId: 'macro-1',
    subZoneName: 'Lantai 2 — Check-in Hall & SCP Utama',
    incidentCoordinates: [28, 7.6, -24],
    triggerSource: 'Analitik AI CCTV & Tombol Panik Avsec SCP Terminal Utama',
    description: 'Ditemukan koper tanpa pemilik di dekat portal Security Checkpoint (SCP) Lantai 2 Terminal Utama 3 Lantai selama lebih dari 10 menit. Prosedur sterilisasi perimeter 50 meter diaktifkan.',
    announcementId: 'Panggilan perhatian! Latihan simulasi keamanan: Petugas Avsec segera merapat ke Security Checkpoint Lantai 2 Terminal Utama. Penumpang di sekitarnya dimohon mundur secara tertib.',
    announcementEn: 'Attention! Security drill simulation: Airport Security Team please report to Main Terminal Level 2 Security Checkpoint immediately. Passengers in the vicinity please step back calmly.',
    soundType: 'security_chime',
    assemblyPoint: 'Area Check-in Island A-B Sisi Barat Terminal Utama',
    evacuationRouteDescription: 'SCP Lantai 2 -> Jembatan Penghubung Barat -> Lobi Terbuka Terminal Utama',
    steps: [
      {
        stepNumber: 1,
        title: 'Deteksi & Isolasi Perimeter Lantai 2',
        description: 'Avsec menekan tombol peringatan sekuriti zona Terminal Utama (3 Lantai).',
        systemResponse: 'Matriks Prioritas Level 2 (Care Call) aktif. BGM terminal di-ducking sebesar -24 dB.',
        affectedZoneIds: ['macro-1'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Chime perhatian khusus disiarkan ke Lantai 2 Check-in & SCP Terminal Utama.',
      },
      {
        stepNumber: 2,
        title: 'Pengumuman Pemilik Bagasi & Sterilisasi',
        description: 'Sistem menyiarkan panggilan terakhir pemilik bagasi sebelum penanganan tim Gegana/Jihandak.',
        systemResponse: 'Boarding Gate 01–12 di Terminal Selatan & Eksisting tetap beroperasi normal.',
        affectedZoneIds: ['macro-1'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Panggilan konfirmasi bagasi tanpa pengawasan disiarkan.',
      },
      {
        stepNumber: 3,
        title: 'Pemeriksaan X-Ray Portabel & Deklarasi Aman',
        description: 'Bagasi dipindai dan dinyatakan aman (barang tertinggal oleh penumpang GA-601).',
        systemResponse: 'Area SCP Lantai 2 dibuka kembali. Status sistem kembali normal.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Pemberitahuan pembukaan jalur SCP kembali.',
      },
    ],
  },
  {
    id: 'scen-med-cardiac',
    title: 'Darurat Medis di Rotunda Terminal Selatan (Gate 02)',
    titleEn: 'Medical Emergency at South Terminal Rotunda (Gate 02)',
    category: 'medical',
    severity: 'medium',
    priorityLevel: 2,
    primaryZoneId: 'macro-3',
    subZoneName: 'Rotunda Selatan — Holdroom Gate 01 & 02',
    incidentCoordinates: [-58, 6.5, 8],
    triggerSource: 'Tombol Panggilan Medis Darurat Boarding Gate 02 Terminal Selatan',
    description: 'Seorang penumpang dilaporkan mengalami henti jantung mendadak di ruang tunggu Rotunda Terminal Selatan (Gate 02). Petugas membutuhkan tim medis KKP dan perangkat AED seketika.',
    announcementId: 'Panggilan darurat medis! Latihan simulasi: Tim medis KKP Bandara Sultan Hasanuddin dan pembawa AED dimohon segera merapat ke Ruang Tunggu Gate 02 Terminal Selatan Lantai 2.',
    announcementEn: 'Medical emergency drill: Airport medical response team with AED please proceed immediately to South Terminal Holdroom Gate 02 on Level 2.',
    soundType: 'medical_paging',
    assemblyPoint: 'Klinik Kesehatan Pelabuhan (KKP) Koridor Selatan',
    evacuationRouteDescription: 'Rotunda Gate 02 -> Koridor Transit Selatan Lantai 1 -> Ambulans Apron Stand Selatan',
    steps: [
      {
        stepNumber: 1,
        title: 'Pemicuan Paging Medis Terarah',
        description: 'Petugas gate menekan tombol bantuan medis darurat di Gate 02.',
        systemResponse: 'Matriks Prioritas Level 2 (Care Call) memprioritaskan saluran audio Terminal Selatan (2 Lantai).',
        affectedZoneIds: ['macro-3'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Nada dering medis ganda berbunyi, diikuti instruksi petugas.',
      },
      {
        stepNumber: 2,
        title: 'Pengarahan Tim Medis & AED ke Gate 02',
        description: 'Pesan otomatis disiarkan ke pengeras suara Terminal Selatan dan posko medis.',
        systemResponse: 'Penerbangan di Terminal Eksisting (Gate 07–12) tetap berjalan tanpa gangguan audio.',
        affectedZoneIds: ['macro-3'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Pesan panggilan dokter bandara diulang sekali.',
      },
      {
        stepNumber: 3,
        title: 'Penanganan Pasien & Evakuasi Ambulans',
        description: 'Pasien berhasil distabilkan dan dievakuasi menuju RSUP Dr. Wahidin Sudirohusodo Makassar.',
        systemResponse: 'Sistem mereset prioritas kembali ke musik latar ambien.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Audio dinormalkan kembali.',
      },
    ],
  },
  {
    id: 'scen-hazmat-spill',
    title: 'Tumpahan Avtur di Apron & Garbarata Gate 09 (Terminal Eksisting)',
    titleEn: 'Jet Fuel Spill on Apron & Jet Bridge Gate 09',
    category: 'hazmat',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-4',
    subZoneName: 'Garbarata Eksisting (Gate 09 Apron Stand)',
    incidentCoordinates: [18, 4.5, 28],
    triggerSource: 'Detektor Uap Hidrokarbon Apron & Laporan Ramp Marshall Stand 09',
    description: 'Terjadi kebocoran bahan bakar Avtur saat refuelling pesawat parkir di Apron Gate 09. Uap avtur berisiko terbakar. Memerlukan penguncian Garbarata Gate 09 dan relokasi penumpang di Terminal Eksisting.',
    announcementId: 'Perhatian! Latihan simulasi: Terdeteksi tumpahan avtur di Apron Gate 09. Garbarata Gate 09 ditutup otomatis. Penumpang di Gate 08, 09, dan 10 Terminal Eksisting harap berpindah ke Gate 12.',
    announcementEn: 'Attention! Fuel spill simulation at Gate 09 apron. Jet bridge 09 is sealed. Passengers at Gates 08, 09, and 10 in the Existing Terminal please relocate immediately to Gate 12.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Holdroom Gate 12 Terminal Eksisting / Lobi Utama',
    evacuationRouteDescription: 'Garbarata Gate 09 -> Concourse Terminal Eksisting Lt.2 -> Jembatan Penghubung -> Terminal Utama',
    steps: [
      {
        stepNumber: 1,
        title: 'Isolasi Apron & Penguncian Garbarata 09',
        description: 'Ramp marshall memicu tombol darurat hazmat di tiang Garbarata Gate 09.',
        systemResponse: 'Sistem PA memotong siaran FIDS. Prioritas Level 1 aktif di Apron & Terminal Eksisting.',
        affectedZoneIds: ['macro-4', 'macro-2'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Peringatan sirine dan instruksi sterilisasi Garbarata disiarkan.',
      },
      {
        stepNumber: 2,
        title: 'Relokasi Penumpang Terminal Eksisting (2 Lantai)',
        description: 'Speaker holdroom Gate 08–10 memandu penumpang menjauhi kaca fasad sisi apron.',
        systemResponse: 'Visualizer 3D menampilkan rute hijau aman menuju jembatan penghubung Terminal Utama.',
        affectedZoneIds: ['macro-4', 'macro-2'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Panduan rute aman disiarkan berkesinambungan.',
      },
      {
        stepNumber: 3,
        title: 'Penyemprotan Foam PKP-PK & Deklarasi Steril',
        description: 'Unit PKP-PK menyemprotkan busa penetralisir di Apron Stand 09. Area dinyatakan aman.',
        systemResponse: 'Status darurat ditutup, operasional Apron dan Garbarata kembali normal.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Selesai simulasi.',
      },
    ],
  },
  {
    id: 'scen-earthquake-all',
    title: 'Gempa Bumi Kuat & Evakuasi Menyeluruh Sultan Hasanuddin (All-Call)',
    titleEn: 'Major Earthquake & All-Terminal Evacuation (WAAA Makassar)',
    category: 'earthquake',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-1',
    subZoneName: 'Seluruh Kompleks Terminal WAAA (Utama, Eksisting, Selatan, Apron, Parkir)',
    incidentCoordinates: [10, 6, -5],
    triggerSource: 'Sistem Peringatan Dini Gempa BMKG Wilayah IV Makassar & Sensor Seismik Struktur',
    description: 'Terjadi gempa bumi tektonik kuat. Prosedur standar keselamatan bandara mewajibkan evakuasi serentak seluruh 5 zona (Terminal Utama 3 Lt, Terminal Eksisting 2 Lt, Terminal Selatan 2 Lt, Apron/Garbarata, dan Gedung Parkir 3 Lt).',
    announcementId: 'Peringatan darurat! Latihan simulasi gempa bumi Bandara Sultan Hasanuddin: Lindungi kepala Anda, jauhi dinding kaca dan jangan gunakan lift. Segera berjalan tenang menuju titik kumpul terbuka.',
    announcementEn: 'Emergency earthquake drill at Sultan Hasanuddin Airport! Protect your head, stay clear of glass walls, do not use elevators. Evacuate calmly to the nearest open assembly area.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Area Terbuka Apron & Lapangan Parkir Landside Makassar',
    evacuationRouteDescription: 'Seluruh Tangga Darurat Terminal Utama, Eksisting, Selatan & Gedung Parkir Terbuka Otomatis',
    steps: [
      {
        stepNumber: 1,
        title: 'Pemicuan Sinyal All-Call 5 Zona Serentak',
        description: 'Integrasi sensor seismik BMKG memicu relai kontak otomatis ke sistem Master PA WAAA.',
        systemResponse: 'Kelima zona makro (Terminal Utama, Eksisting, Selatan, Apron, Gedung Parkir) menerima perintah Level 1.',
        affectedZoneIds: ['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Sirine ISO 8201 berbunyi serentak di seluruh 52 unit IP Speaker bandara.',
      },
      {
        stepNumber: 2,
        title: 'Panduan Evakuasi Tenang & Anti-Panik',
        description: 'Pesan suara membimbing penumpang turun dari Lantai 3 & Lantai 2 melalui tangga darurat.',
        systemResponse: 'Visualisasi 3D memperlihatkan seluruh jalur hijau egress menuju titik kumpul.',
        affectedZoneIds: ['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Pesan panduan keselamatan berulang dalam Bahasa Indonesia & Inggris.',
      },
      {
        stepNumber: 3,
        title: 'Pemeriksaan Struktur Atap Phinisi & Rekonsiliasi',
        description: 'Tim teknik memeriksa integritas struktur Terminal Utama, Eksisting, dan Selatan. Simulasi selesai.',
        systemResponse: 'Status dikembalikan ke siaga operasional normal.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Sirine dimatikan, chime konfirmasi pemulihan disiarkan.',
      },
    ],
  },
];
