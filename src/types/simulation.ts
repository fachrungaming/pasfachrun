/**
 * Emergency Simulation Types & Scenario Definitions
 * Digital Twin Sandboxed Emergency Drill Engine (EN 54-16 Phased Evacuation)
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
    title: 'Kebakaran Kendaraan di Gedung Parkir L2',
    titleEn: 'Vehicle Fire in Car Park Level 2',
    category: 'fire',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-5',
    subZoneName: 'Car Park Level 2 Ramp West',
    incidentCoordinates: [-25, 6.0, -62],
    triggerSource: 'Optical Smoke Detector Loop 4 (FACP address #04-12)',
    description: 'Terdeteksi asap pekat dan kenaikan suhu drastis pada dek parkir barat lantai 2. Sistem memicu interlock EN 54-16 untuk evakuasi bertahap gedung parkir tanpa membuat panik terminal utama.',
    announcementId: 'Perhatian! Latihan simulasi darurat: Terdeteksi indikasi kebakaran di area Gedung Parkir Lantai 2. Seluruh pengunjung di area parkir diminta segera menuju pintu keluar darurat barat.',
    announcementEn: 'Attention! Emergency drill simulation: A fire has been reported at Car Park Level 2. All personnel and visitors in the car park must evacuate immediately through the west emergency exits.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Assembly Point Lapangan Parkir Barat (Titik Kumpul C)',
    evacuationRouteDescription: 'Gedung Parkir L2 -> Tangga Egress Darurat Barat -> Curbside Terbuka -> Assembly Point C',
    steps: [
      {
        stepNumber: 1,
        title: 'Verifikasi Alarm & Interlock Matriks',
        description: 'Sensor FACP mengirim sinyal kontak kering ke IP PA Gateway. Sistem memverifikasi alarm dalam 0.8 detik.',
        systemResponse: 'Matriks Prioritas Level 1 aktif otomatis. Pe-redaman BGM (-90 dB total mute).',
        affectedZoneIds: ['macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Sirine ISO 8201 diaktifkan pada speaker PoE++ Gedung Parkir.',
      },
      {
        stepNumber: 2,
        title: 'Siaran Evakuasi Gedung Parkir (Fase 1)',
        description: 'Pesan evakuasi multi-bahasa disiarkan berulang hanya di Gedung Parkir dan Drop-Off curbside.',
        systemResponse: 'Terminal Domestik & Internasional diset ke mode "Standby Terkendali" agar tidak memicu kepanikan.',
        affectedZoneIds: ['macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Pesan suara evakuasi Bahasa Indonesia dan Inggris diputar berkala.',
      },
      {
        stepNumber: 3,
        title: 'Ekskalasi Siaga Terminal Kedatangan (Fase 2)',
        description: 'Jika asap menyebar ke curbside, perimeter Terminal Kedatangan disiagakan untuk penutupan akses masuk.',
        systemResponse: 'Pemberitahuan petugas keamanan bandara diaktifkan melalui SIP Paging langsung ke tim Avsec.',
        affectedZoneIds: ['macro-5', 'macro-2'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Peringatan siaga internal dialirkan ke posko pengamanan.',
      },
      {
        stepNumber: 4,
        title: 'Evakuasi Tuntas & Status Aman (All Clear)',
        description: 'Regu ARFF/Pemadam Bandara berhasil melokalisir sumber api. Evakuasi dinyatakan selesai.',
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
    title: 'Koper Mencurigakan di SCP Keberangkatan Domestik',
    titleEn: 'Suspicious Unattended Bag at Domestic SCP',
    category: 'security',
    severity: 'high',
    priorityLevel: 2,
    primaryZoneId: 'macro-1',
    subZoneName: 'Security Checkpoint Portal 1 (SCP-1)',
    incidentCoordinates: [-40, 5, 20],
    triggerSource: 'Analitik AI CCTV & Tombol Panik Avsec Portal 1',
    description: 'Ditemukan bagasi tanpa pemilik yang tergeletak di depan antrian SCP-1 selama lebih dari 10 menit. Prosedur sterilisasi perimeter 50 meter diaktifkan.',
    announcementId: 'Panggilan perhatian! Latihan simulasi keamanan: Petugas Avsec dan penjinak bom segera merapat ke Security Checkpoint 1. Pengunjung di sekitarnya dimohon mundur secara tertib.',
    announcementEn: 'Attention! Security drill simulation: Airport Security Team please report to Security Checkpoint 1 immediately. Passengers in the vicinity please step back calmly.',
    soundType: 'security_chime',
    assemblyPoint: 'Area Check-in Island A Concourse Timur',
    evacuationRouteDescription: 'SCP-1 -> Koridor Sisi Kanan -> Check-in Hall Terbuka',
    steps: [
      {
        stepNumber: 1,
        title: 'Deteksi & Isolasi Perimeter',
        description: 'Avsec menekan tombol peringatan sekuriti zona domestik.',
        systemResponse: 'Matriks Prioritas Level 2 (Care Call) aktif. BGM terminal di-ducking sebesar -24 dB.',
        affectedZoneIds: ['macro-1'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Chime perhatian khusus disiarkan ke Sub-zona Check-in & SCP.',
      },
      {
        stepNumber: 2,
        title: 'Pengumuman Pemilik Bagasi & Sterilisasi',
        description: 'Sistem menyiarkan panggilan terakhir pemilik bagasi sebelum penanganan tim penjinak bom.',
        systemResponse: 'Gate Boarding 1-6 tetap beroperasi normal untuk meminimalkan keterlambatan penerbangan.',
        affectedZoneIds: ['macro-1'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Panggilan konfirmasi bagasi tanpa pengawasan disiarkan.',
      },
      {
        stepNumber: 3,
        title: 'Pemeriksaan X-Ray Portabel & Deklarasi Aman',
        description: 'Bagasi dipindai dan dinyatakan aman (barang tertinggal oleh penumpang GA-402).',
        systemResponse: 'Area SCP-1 dibuka kembali. Status sistem kembali normal.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Pemberitahuan pembukaan jalur SCP kembali.',
      },
    ],
  },
  {
    id: 'scen-med-cardiac',
    title: 'Darurat Medis / Serangan Jantung di Carousel Bagasi',
    titleEn: 'Medical Cardiac Emergency at Baggage Claim',
    category: 'medical',
    severity: 'medium',
    priorityLevel: 2,
    primaryZoneId: 'macro-4',
    subZoneName: 'Customs & Baggage Carousel 4',
    incidentCoordinates: [40, 4, -15],
    triggerSource: 'Tombol Panggilan Medis Darurat Tiang Informasi Carousel 4',
    description: 'Seorang penumpang internasional dilaporkan kolaps di dekat Carousel 4. Petugas membutuhkan dokter, perawat bandara, dan perangkat defibrilator (AED) seketika.',
    announcementId: 'Panggilan darurat medis! Latihan simulasi: Tim medis bandara dan pembawa perangkat AED dimohon segera merapat ke Baggage Carousel 4 Terminal Kedatangan Internasional.',
    announcementEn: 'Medical emergency drill: Airport emergency medical response team with AED please proceed immediately to International Baggage Claim Carousel 4.',
    soundType: 'medical_paging',
    assemblyPoint: 'Klinik Kesehatan Bandara (Kantor Karantina)',
    evacuationRouteDescription: 'Akses cepat melalui koridor Bea Cukai Barat ke Ruang Pertolongan Medis',
    steps: [
      {
        stepNumber: 1,
        title: 'Pemicuan Paging Medis Terarah',
        description: 'Petugas carousel menekan tombol bantuan medis darurat.',
        systemResponse: 'Matriks Prioritas Level 2 (Care Call) memprioritaskan saluran audio Terminal Kedatangan Internasional.',
        affectedZoneIds: ['macro-4'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Nada dering medis bernada ganda berbunyi, diikuti instruksi petugas.',
      },
      {
        stepNumber: 2,
        title: 'Pengarahan Tim Medis & AED',
        description: 'Pesan otomatis disiarkan ke seluruh pengeras suara Terminal Kedatangan dan ruang istirahat staf KKP.',
        systemResponse: 'Penerbangan kedatangan lain tetap berjalan tanpa gangguan audio.',
        affectedZoneIds: ['macro-4'],
        isEvacuating: false,
        priorityLevel: 2,
        audioAction: 'Pesan panggilan dokter bandara diulang sekali.',
      },
      {
        stepNumber: 3,
        title: 'Penanganan Pasien & Evakuasi Ambulans',
        description: 'Pasien berhasil distabilkan dan dibawa ambulans apron menuju rumah sakit terdekat.',
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
    title: 'Tumpahan Bahan Bakar Avtur di Apron Gate 9',
    titleEn: 'Jet Fuel Spill on Apron Gate 9',
    category: 'hazmat',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-3',
    subZoneName: 'Airbridge 9 Jetway & Apron',
    incidentCoordinates: [34, 4, 38],
    triggerSource: 'Detektor Uap Bahan Bakar Hidrokarbon Apron & Laporan Ramp Marshall',
    description: 'Terjadi kebocoran hidran bahan bakar saat pengisian pesawat di Gate 9. Uap bahan bakar berisiko menyala. Memerlukan penutupan Garbarata dan isolasi holdroom sekitar.',
    announcementId: 'Perhatian! Latihan simulasi: Terdeteksi tumpahan bahan bakar di area Gate 9. Pintu Garbarata dikunci otomatis. Penumpang di Gate 9 dan 10 segera berpindah ke Gate 12.',
    announcementEn: 'Attention! Fuel spill simulation at Gate 9 apron. Jet bridge is sealed. Passengers at Gates 9 and 10 please relocate immediately to Gate 12.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Satellite Concourse Gate 12 Lounge',
    evacuationRouteDescription: 'Gate 9 -> Concourse Koridor Sisi Dalam -> Gate 12 Area Aman',
    steps: [
      {
        stepNumber: 1,
        title: 'Karantina Udara & Penguncian Garbarata',
        description: 'Ramp marshall memicu tombol darurat bahan bakar di tiang parkir pesawat.',
        systemResponse: 'Sistem PA memotong siaran FIDS penerbangan Gate 9. Prioritas Level 1 aktif.',
        affectedZoneIds: ['macro-3'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Peringatan sirine dan pengumuman pemindahan penumpang disiarkan.',
      },
      {
        stepNumber: 2,
        title: 'Pengalihan Arus Penumpang ke Gate 12',
        description: 'Speaker satelit Gate 9 dan Gate 10 memandu penumpang menjauhi jendela sisi apron.',
        systemResponse: 'Visualizer 3D menampilkan rute aman menuju Gate 12.',
        affectedZoneIds: ['macro-3'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Panduan rute aman disiarkan berkesinambungan.',
      },
      {
        stepNumber: 3,
        title: 'Pembersihan Busa Foam oleh ARFF',
        description: 'Unit ARFF menyemprotkan busa penetralisir api di apron. Area dinyatakan steril.',
        systemResponse: 'Status darurat ditutup, terminal internasional dipulihkan ke jadwal normal.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Selesai simulasi.',
      },
    ],
  },
  {
    id: 'scen-earthquake-all',
    title: 'Gempa Bumi Kuat & Evakuasi Menyeluruh (All-Call)',
    titleEn: 'Major Earthquake & All-Terminal Evacuation',
    category: 'earthquake',
    severity: 'critical',
    priorityLevel: 1,
    primaryZoneId: 'macro-1',
    subZoneName: 'Seluruh Terminal Bandara (Macro 1 s/d 5)',
    incidentCoordinates: [0, 5, 0],
    triggerSource: 'Sistem Peringatan Dini Gempa BMKG & Sensor Seismik Bangunan',
    description: 'Terjadi gempa bumi berskala 6.8 SR. Struktur terminal berguncang. Prosedur standar mewajibkan evakuasi total seluruh 5 zona makro menuju area terbuka apron dan lapangan parkir.',
    announcementId: 'Peringatan darurat nasional! Latihan simulasi gempa: Lindungi kepala Anda, jauhi dinding kaca. Segera berjalan tenang menuju pintu darurat terdekat menuju area terbuka apron.',
    announcementEn: 'Emergency earthquake drill! Protect your head, stay clear of glass walls. Evacuate calmly to the nearest open assembly area at the apron.',
    soundType: 'siren_iso8201',
    assemblyPoint: 'Area Terbuka Tarmac Apron & Lapangan Parkir Eksternal',
    evacuationRouteDescription: 'Seluruh Pintu Egress Darurat 1-12 Terbuka Otomatis',
    steps: [
      {
        stepNumber: 1,
        title: 'Pemicuan Sinyal All-Call Serentak',
        description: 'Integrasi BMKG memicu relai kontak otomatis ke sistem PA.',
        systemResponse: 'Kelima zona makro (1, 2, 3, 4, 5) menerima perintah Level 1 Emergency serempak.',
        affectedZoneIds: ['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Sirine gempa ganda berbunyi di seluruh 52 speaker bandara.',
      },
      {
        stepNumber: 2,
        title: 'Panduan Evakuasi Tenang & Anti-Panik',
        description: 'Pesan sintesis suara membimbing penumpang untuk tidak menggunakan lift atau eskalator.',
        systemResponse: 'Visualisasi 3D memperlihatkan seluruh koridor hijau egress terbuka.',
        affectedZoneIds: ['macro-1', 'macro-2', 'macro-3', 'macro-4', 'macro-5'],
        isEvacuating: true,
        priorityLevel: 1,
        audioAction: 'Pesan panduan keselamatan berulang dalam 2 bahasa.',
      },
      {
        stepNumber: 3,
        title: 'Pemeriksaan Integritas Struktur & Rekonsiliasi',
        description: 'Tim teknisi memeriksa keretakan struktur. Simulasi selesai.',
        systemResponse: 'Status dikembalikan ke siaga operasional.',
        affectedZoneIds: [],
        isEvacuating: false,
        priorityLevel: 6,
        audioAction: 'Sirine dimatikan, chime konfirmasi disiarkan.',
      },
    ],
  },
];
