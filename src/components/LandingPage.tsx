import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Layers,
  CheckCircle2,
  ChevronRight,
  Eye,
} from 'lucide-react';
import TokyoSkylineHero from '@/components/ui/sunset-skyline-hero';
import { ZoneId, MacroZone, IPSpeaker } from '../types/pa-system';

interface LandingPageProps {
  macroZones: MacroZone[];
  speakers: IPSpeaker[];
  onEnterDigitalTwin: (options?: {
    zoneId?: ZoneId | null;
    floorCutaway?: 'all' | 'floor1' | 'floor2';
    openSimulation?: boolean;
  }) => void;
}

interface PreviewShowcaseItem {
  id: 'all' | 'floor2' | 'floor1' | 'aircraft';
  label: string;
  code: string;
  title: string;
  subtitle: string;
  image: string;
  specs: string;
  floorCutaway: 'all' | 'floor1' | 'floor2';
  zoneId: ZoneId | null;
}

const HERO_SHOWCASE_ITEMS: PreviewShowcaseItem[] = [
  {
    id: 'all',
    label: 'Semua Terminal (Atap Utuh)',
    code: 'EXTERIOR · WAAA',
    title: 'Arsitektur Atap Phinisi & Kompleks Terpadu Bandara Sultan Hasanuddin',
    subtitle:
      'Visualisasi utuh atap bergelombang putih-biru ikonik Makassar, menara ATC, monumen berkuda Sultan Hasanuddin, jalan layang Lantai 3 dengan arus kendaraan aktif, dan 12 garbarata.',
    image: '/assets/aistudio/image_bf82482f.png',
    specs: '5 Zona Makro · 34 Titik Speaker IP · Jalan Layang 2 Lajur Aktif',
    floorCutaway: 'all',
    zoneId: null,
  },
  {
    id: 'floor2',
    label: 'Mockup Lantai 2 (Keberangkatan)',
    code: 'ELEVASI +7.5M · LANTAI 2',
    title: 'Ruang Tunggu Gate 01–12, Pulau Check-in, dan Koridor Keberangkatan',
    subtitle:
      'Potongan horizontal Lantai 2 menampilkan tata letak kursi ruang tunggu biru per gate, konter check-in merah, pemeriksaan X-Ray, ritel duty-free, serta sebaran Ceiling & Column Speaker.',
    image: '/assets/aistudio/Tanpa_judul__920_x_197_mm___1__606ea6fe.png',
    specs: '12 Boarding Gate · Check-in Hall · Ceiling & Column Acoustic Array',
    floorCutaway: 'floor2',
    zoneId: null,
  },
  {
    id: 'floor1',
    label: 'Mockup Lantai 1 (Terminal Eksisting & Utama)',
    code: 'ELEVASI 0.0M · LANTAI 1',
    title: 'Mockup Lantai 1 Terminal Eksisting, Hall Terrazzo, BHS & Klaim Bagasi',
    subtitle:
      'Denah 3D terperinci Lantai 1 Terminal Eksisting meliputi sayap L-Wing Timur, hall BHS, spine ruang tengah 3 lajur, pulau konter memanjang, hall keramik terrazzo, dan deretan 10 kubikel utara.',
    image: '/assets/aistudio/lantai1_eksisting_ref.png',
    specs: 'Lantai 1 Terminal Eksisting · Terrazzo Hall · BHS & Klaim Bagasi',
    floorCutaway: 'floor1',
    zoneId: null,
  },
  {
    id: 'aircraft',
    label: 'Apron & Boeing 737 MAX 8',
    code: 'AIRSIDE · APRON & GARBARATA',
    title: 'Armada Lion Air Boeing 737 MAX 8 & Jembatan Garbarata 01–12',
    subtitle:
      'Pemodelan presisi armada Boeing 737 MAX 8 dengan sirip ekor dorsal fillet, Split-Tip Scimitar Winglets, mesin kembar CFM LEAP-1B, serta Horn Speaker IP66 tahan cuaca untuk kru darat.',
    image: '/assets/aistudio/ref_plane_2.jpg',
    specs: '12 Garbarata · 76 dBA Ambient Noise Sensor · Horn Speaker 112 dB',
    floorCutaway: 'all',
    zoneId: 'macro-4',
  },
];

const fadeUpVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  macroZones,
  speakers,
  onEnterDigitalTwin,
}) => {
  const [activeShowcase, setActiveShowcase] = useState<PreviewShowcaseItem>(HERO_SHOWCASE_ITEMS[0]);
  const [selectedFloorComparison, setSelectedFloorComparison] = useState<'floor2' | 'floor1' | 'parking'>('floor2');

  // AOC Commissioning / Demo Request Form State
  const [operatorName, setOperatorName] = useState('');
  const [unitDivision, setUnitDivision] = useState('AOC & Elektronika Bandara');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const ceilingCount = speakers.filter((s) => s.category === 'ceiling').length;
  const columnCount = speakers.filter((s) => s.category === 'column').length;
  const hornCount = speakers.filter((s) => s.category === 'horn').length;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim()) {
      setFormError('Nama personel atau koordinator wajib diisi.');
      return;
    }
    if (!operatorEmail.includes('@') || !operatorEmail.includes('.')) {
      setFormError('Masukkan alamat email korporat/bandara yang valid.');
      return;
    }
    setFormError(null);
    setFormSubmitted(true);
  };

  return (
    <div
      id="top"
      className="min-h-screen w-full bg-[#070B14] text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950 overflow-x-hidden"
    >
      {/* 1. YOUTUBE VIDEO BACKGROUND HERO (https://youtu.be/wOYu5UXFuOk) */}
      <TokyoSkylineHero
        youtubeVideoId="wOYu5UXFuOk"
        badgeText="BANDARA INTERNASIONAL SULTAN HASANUDDIN MAKASSAR · WAAA / MKS · EN 54-16 & EN 54-24 VOICE ALARM"
        title="Digital Twin Public Addres System"
        subtitle="Public Address System dengan Layout Bandara Sultan Hasanuddin Makassar sebagai media pembelajaran"
        scrollHint="SCROLL UNTUK EKSPLORASI"
        navItems={[
          { label: 'Pratinjau 3D', href: '#pratinjau-3d' },
          { label: 'Zona Terminal', href: '#zona-terminal' },
          { label: 'Speaker 3D Pixar', href: '#kategori-speaker' },
          { label: 'Mockup Lantai 1 & 2', href: '#denah-lantai' },
          { label: 'Standar EN 54-16', href: '#spesifikasi-en54' },
        ]}
        ctaLabel="Masuk ke Konsol 3D Digital Twin"
        onCtaClick={() =>
          onEnterDigitalTwin({
            floorCutaway: activeShowcase.floorCutaway,
            zoneId: activeShowcase.zoneId,
          })
        }
        secondaryCtaLabel="Inspeksi Lantai 1 & 2"
        onSecondaryCtaClick={() =>
          onEnterDigitalTwin({
            floorCutaway: 'floor2',
            zoneId: null,
          })
        }
        stats={[
          { value: `${macroZones.length} Zona`, label: 'Terminal, Apron & Parkir' },
          { value: `${speakers.length} Unit`, label: 'Speaker 3D Pixar Aktif' },
          { value: '20 kHz', label: 'Supervisi Pilot Tone' },
        ]}
      />

      {/* 2. INTERACTIVE 3D TERMINAL SHOWCASE & QUICK LAUNCH */}
      <section id="pratinjau-3d" className="relative py-20 border-b border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-3 tabular-nums"
          >
            PRATINJAU VIEWPORT INTERAKTIF &middot; PILIH MODE TAMPILAN 3D WAAA
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Context & Quick Launch Presets */}
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="lg:col-span-5 flex flex-col justify-between space-y-8"
            >
              <motion.div variants={fadeUpVariants} className="space-y-4">
                <h2
                  className="font-bold tracking-tight text-white leading-[1.12]"
                  style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.5rem)' }}
                >
                  Eksplorasi Eksterior Atap Phinisi, Cutaway Lantai 1 &amp; 2, serta Armada Apron.
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-[62ch]">
                  Pilih salah satu preset tampilan di samping untuk meninjau konfigurasi ruang
                  tunggu keberangkatan, area klaim bagasi 9 konveyor, hingga posisi armada Lion Air
                  Boeing 737 MAX 8 sebelum membuka ruang kendali 3D penuh.
                </p>
              </motion.div>

              {/* Primary Action Block */}
              <motion.div variants={fadeUpVariants} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      onEnterDigitalTwin({
                        floorCutaway: activeShowcase.floorCutaway,
                        zoneId: activeShowcase.zoneId,
                      })
                    }
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide transition-colors cursor-pointer shadow-lg shadow-sky-950/50"
                  >
                    <span>Buka Preset &ldquo;{activeShowcase.label}&rdquo;</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      onEnterDigitalTwin({
                        floorCutaway: 'floor1',
                        zoneId: null,
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-3.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/70 hover:bg-slate-800/80 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Cutaway Lantai 1</span>
                  </motion.button>
                </div>

                <p className="text-xs font-mono text-slate-400 tabular-nums">
                  Mode Pemotongan Horizontal (Cutaway) &middot; Telemetri Impedansi &lt; 2.0s &middot; Audio WebAPI Sintetis &amp; Kustom
                </p>
              </motion.div>

              {/* Quantified Operational Metrics (Tabular Nums, Hairline Grid) */}
              <motion.div
                variants={fadeUpVariants}
                className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/90 tabular-nums"
              >
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white font-mono">
                    {macroZones.length} Zona
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Terminal, Apron &amp; Parkir
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-sky-400 font-mono">
                    {speakers.length} Unit
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Speaker 3D Pixar Aktif
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-emerald-400 font-mono">
                    20 kHz
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Supervisi Pilot Tone
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: Dominant 16:9 Interactive Architecture Switcher */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7 space-y-4"
            >
              {/* Interactive View Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HERO_SHOWCASE_ITEMS.map((item) => {
                  const isActive = activeShowcase.id === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveShowcase(item)}
                      className={`relative text-left px-3 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 border-sky-500 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono text-[10px] text-sky-400 truncate">
                        {item.code}
                      </div>
                      <div className="font-semibold truncate mt-0.5">{item.label}</div>
                    </motion.button>
                  );
                })}
              </div>

              {/* 16:9 Showcase Frame with AnimatePresence */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeShowcase.id}
                      src={activeShowcase.image}
                      alt={activeShowcase.title}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full h-full object-cover object-center"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

                  {/* Bottom Overlay Info & Direct Preset Launch */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeShowcase.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-1 max-w-xl"
                      >
                        <div className="text-xs font-mono text-sky-400 uppercase tracking-wider">
                          {activeShowcase.code} &middot; {activeShowcase.specs}
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-white">
                          {activeShowcase.title}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {activeShowcase.subtitle}
                        </p>
                      </motion.div>
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        onEnterDigitalTwin({
                          floorCutaway: activeShowcase.floorCutaway,
                          zoneId: activeShowcase.zoneId,
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka Tampilan Ini di 3D</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. CORE CAPABILITIES & 5 MACRO ZONES (Asymmetric Bento Grid with Editorial Numbering) */}
      <section id="zona-terminal" className="py-20 border-b border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-2">
                ARSITEKTUR ZONASI AKUSTIK &middot; 5 ZONA MAKRO
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Pemetaan Spasial Seluruh Kompleks Terminal WAAA
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-[54ch]">
              Setiap zona makro memiliki matriks prioritas independen, kontrol penguatan desibel
              (dB SPL), dan pemantauan otomatis sensor kebisingan sekitar (Ambient Noise Sensor).
            </p>
          </motion.div>

          {/* Asymmetric Bento Grid: 2-column & 1-column spans */}
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {macroZones.map((zone, index) => {
              const zoneSpeakers = speakers.filter((s) => s.macroZoneId === zone.id);
              const ceilingInZone = zoneSpeakers.filter((s) => s.category === 'ceiling').length;
              const columnInZone = zoneSpeakers.filter((s) => s.category === 'column').length;
              const hornInZone = zoneSpeakers.filter((s) => s.category === 'horn').length;
              const isWide = index === 0 || index === 3;

              return (
                <motion.div
                  key={zone.id}
                  variants={fadeUpVariants}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className={`group rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 p-6 flex flex-col justify-between transition-colors ${
                    isWide ? 'lg:col-span-2' : 'lg:col-span-1'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Clean Human Editorial Numbering (01. - 05.) */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                      <span
                        className="font-mono text-xs font-bold tracking-wider uppercase"
                        style={{ color: zone.color }}
                      >
                        0{index + 1}. {zone.code}
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {zoneSpeakers.length} Titik Speaker &middot; {zone.currentSplDba} dB SPL &middot; STIPA {zone.currentStipa}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{zone.name}</h3>
                      <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-[65ch]">
                        {zone.description}
                      </p>
                    </div>

                    {/* Sub-Zones List */}
                    <div className="pt-2">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        Cakupan Sub-Zona Terminal ({zone.sipExtension}):
                      </div>
                      <div className="text-xs text-slate-300 font-mono leading-relaxed">
                        {zone.subZones.map((sz) => sz.name).join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Telemetry & Direct Zone Jump Action */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-mono text-slate-400 tabular-nums">
                      Ceiling: <strong className="text-sky-400">{ceilingInZone}</strong> &middot; Column:{' '}
                      <strong className="text-amber-400">{columnInZone}</strong> &middot; Horn:{' '}
                      <strong className="text-orange-400">{hornInZone}</strong> &middot; ANS {zone.ambientNoiseDba} dBA
                    </div>

                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() =>
                        onEnterDigitalTwin({
                          zoneId: zone.id,
                          floorCutaway: 'all',
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      <span>Fokus Kamera 3D ke Zona Ini</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. 3D PIXAR SPEAKER CATEGORIES SECTION */}
      <section id="kategori-speaker" className="py-20 border-b border-slate-800/80 bg-[#090F1C]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Visual Reference Asset of 3D Pixar Speakers */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5"
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-hidden"
              >
                <img
                  src="/assets/aistudio/image_58915406.png"
                  alt="Kategori Speaker 3D Pixar Animation Bandara Sultan Hasanuddin"
                  className="w-full h-auto rounded-lg object-cover"
                />
                <div className="pt-3 px-1 flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
                  <span>Visualisasi Node Akustik 3D Pixar</span>
                  <span>Total: {speakers.length} Transduser IP</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: Detailed Technical Breakdown of the 3 Speaker Categories */}
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="lg:col-span-7 space-y-8"
            >
              <motion.div variants={fadeUpVariants}>
                <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-2">
                  TRANSDUSER EN 54-24 &middot; VISUALISASI 3D PIXAR ANIMATION
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Tiga Kategori Speaker Sesuai Karakteristik Akustik Ruangan
                </h2>
                <p className="text-sm text-slate-300 mt-3 max-w-[65ch] leading-relaxed">
                  Setiap unit speaker dirender secara tiga dimensi di lokasi fisiknya pada plafon,
                  kolom struktur, maupun tiang apron dengan cincin gelombang akustik terarah dan
                  indikator supervisi impedansi.
                </p>
              </motion.div>

              <div className="space-y-4">
                {/* Category 1: Ceiling Speaker */}
                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                  className="rounded-xl border border-slate-800 hover:border-sky-500/40 bg-slate-900/50 p-5 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-sky-400 font-mono">
                      01. Ceiling Speaker (Plafon Terminal)
                    </h3>
                    <span className="text-xs font-mono text-slate-300 tabular-nums">
                      {ceilingCount} Unit Terpasang &middot; 6W Power Tap &middot; 94 dB SPL &middot; 120&deg; Conical
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Dipasang merata di plafon area ruang tunggu keberangkatan (Gate 01–12), pulau
                    konter Check-in, pemeriksaan keamanan (X-Ray), serta area pengambilan bagasi
                    (Baggage Claim) Lantai 1 untuk menghasilkan distribusi suara dan musik latar
                    (BGM) yang jernih.
                  </p>
                </motion.div>

                {/* Category 2: Column Speaker */}
                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                  className="rounded-xl border border-slate-800 hover:border-amber-500/40 bg-slate-900/50 p-5 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-amber-400 font-mono">
                      02. Column Speaker (Pilar &amp; Koridor)
                    </h3>
                    <span className="text-xs font-mono text-slate-300 tabular-nums">
                      {columnCount} Unit Terpasang &middot; 30W Power Tap &middot; 102 dB SPL &middot; 90&deg;&times;30&deg; Line-Array
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Dipasang vertikal pada dinding pilar struktural dan koridor penghubung Terminal
                    Utama, Terminal Eksisting, dan Terminal Selatan. Fokus pancaran akustik
                    horizontal meminimalkan pantulan gema pada bangunan beratap tinggi dan berdinding kaca.
                  </p>
                </motion.div>

                {/* Category 3: Horn Speaker */}
                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ x: 6, transition: { duration: 0.2 } }}
                  className="rounded-xl border border-slate-800 hover:border-orange-500/40 bg-slate-900/50 p-5 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-orange-400 font-mono">
                      03. Horn Speaker (Apron &amp; Area Bising Terbuka)
                    </h3>
                    <span className="text-xs font-mono text-slate-300 tabular-nums">
                      {hornCount} Unit Terpasang &middot; 50W Power Tap &middot; 112 dB SPL &middot; IP66 Weatherproof
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Corong akustik berdaya tembus tinggi untuk area terbuka dengan tingkat kebisingan
                    mesin jet dan lalu lintas ekstrem, mencakup 12 Garbarata &amp; Apron Stand,
                    Drop-off Jalan Layang Lantai 3, serta Gedung Parkir.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE FLOOR CUTAWAY & TERMINAL MOCKUP COMPARISON */}
      <section id="denah-lantai" className="py-20 border-b border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-2">
                PEMOTONGAN HORIZONTAL 3D &middot; INSPEKSI INTERIOR LANTAI 1 &amp; LANTAI 2
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Mockup Denah Lantai 1, Lantai 2, dan Infrastruktur Jalan Layang
              </h2>
            </div>

            {/* Switcher Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedFloorComparison('floor2')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedFloorComparison === 'floor2'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                Mockup Lantai 2 (+7.5m)
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedFloorComparison('floor1')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedFloorComparison === 'floor1'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                Mockup Lantai 1 (0.0m)
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedFloorComparison('parking')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedFloorComparison === 'parking'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                Gedung Parkir &amp; Jalan Layang
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedFloorComparison === 'floor2' && (
              <motion.div
                key="floor2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-xl border border-slate-800 bg-slate-900/30 p-6"
              >
                <div className="lg:col-span-7 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src="/assets/aistudio/Tanpa_judul__920_x_197_mm___1__606ea6fe.png"
                    alt="Mockup Lantai 2 Terminal Utama, Eksisting, dan Selatan"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="lg:col-span-5 space-y-5">
                  <div className="text-xs font-mono text-sky-400 uppercase tracking-wider">
                    CUTAWAY PRESET &middot; MOCKUP LANTAI 2 (+7.5M)
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Lantai 2: Ruang Tunggu Gate 01–12, Check-In &amp; Konektor Selatan
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Saat memilih mode <strong>Mockup Lantai 2</strong> pada konsol 3D, atap Phinisi dan
                    atap bergelombang diangkat secara otomatis untuk memperlihatkan interior Lantai 2
                    secara presisi sesuai blueprint:
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Terminal Utama (Barat):</strong> Ruang tunggu Gate 07–12 dengan deretan
                        kursi biru, karpet boarding biru, dan area ritel tengah.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Terminal Eksisting (Timur):</strong> Ruang tunggu Gate 01–06, pulau
                        konter Check-in merah, pemeriksaan X-Ray, dan musholla.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Terminal Selatan:</strong> Hall transisi, VIP Lounge, dan koridor
                        penghubung menuju jembatan skybridge gedung parkir.
                      </span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        onEnterDigitalTwin({
                          floorCutaway: 'floor2',
                          zoneId: null,
                        })
                      }
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
                    >
                      <span>Buka Cutaway Lantai 2 di Konsol 3D</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedFloorComparison === 'floor1' && (
              <motion.div
                key="floor1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-xl border border-slate-800 bg-slate-900/30 p-6"
              >
                <div className="lg:col-span-7 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src="/assets/aistudio/image_6015f581.png"
                    alt="Mockup Lantai 1 Baggage Claim dan BHS Hall"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="lg:col-span-5 space-y-5">
                  <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                    CUTAWAY PRESET &middot; MOCKUP LANTAI 1 (0.0M)
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Lantai 1: Baggage Claim 9 Carousel, BHS Hall &amp; Kedatangan
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Mode <strong>Mockup Lantai 1</strong> menyembunyikan plat lantai 2 dan atap
                    sehingga operator AOC dapat menginspeksi seluruh fasilitas lantai dasar:
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>6 Carousel Bagasi Terminal Utama &amp; 3 Carousel Eksisting:</strong>{' '}
                        Dilengkapi pulau konveyor melingkar dan speaker plafon tepat di atas jalur
                        klaim bagasi penumpang.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>BHS Make-Up &amp; Sorting Area:</strong> Area operasional petugas
                        bagasi sisi udara dengan pengumuman operasional terarah.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Hall Kedatangan &amp; Curbside Penjemputan:</strong> Koridor keluar
                        penumpang menuju kanopi penjemputan dan Gedung Parkir.
                      </span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        onEnterDigitalTwin({
                          floorCutaway: 'floor1',
                          zoneId: null,
                        })
                      }
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
                    >
                      <span>Buka Cutaway Lantai 1 di Konsol 3D</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedFloorComparison === 'parking' && (
              <motion.div
                key="parking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-xl border border-slate-800 bg-slate-900/30 p-6"
              >
                <div className="lg:col-span-7 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src="/assets/aistudio/Terminal_Selatan__1__b9bc7e87.png"
                    alt="Gedung Parkir, Jalan Layang Lantai 3, dan Curbside Terminal"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="lg:col-span-5 space-y-5">
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                    LANDSIDE INFRASTRUCTURE &middot; ZONA MAKRO 5
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Gedung Parkir Multi-Lantai, Jalan Layang Lantai 3 &amp; Animasi Lalu Lintas
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Area sisi darat (Landside) menampilkan integrasi jalan layang keberangkatan
                    2 lajur dengan tanjakan/turunan miring, putaran U-Loop, bundaran Patung Sultan
                    Hasanuddin, dan lalu lintas kendaraan 3D yang bergerak secara kontinu:
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>17 Kendaraan Jalan Raya Beranimasi:</strong> Sedan, SUV, taksi bandara,
                        dan shuttle bus bergerak mulus mengikuti tanjakan, jembatan layang Lantai 3,
                        dan bundaran monumen.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Gedung Parkir &amp; Jembatan Penyeberangan (Skybridge):</strong>{' '}
                        Terkoneksi langsung ke Terminal Selatan dengan cakupan Horn &amp; Column Speaker.
                      </span>
                    </li>
                  </ul>
                  <div className="pt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        onEnterDigitalTwin({
                          floorCutaway: 'all',
                          zoneId: 'macro-5',
                        })
                      }
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
                    >
                      <span>Inspeksi Gedung Parkir &amp; Jalan Layang di 3D</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 6. PROOF OF COMPLIANCE: EN 54-16 / EN 54-24 & COMMISSIONING REQUEST */}
      <section id="spesifikasi-en54" className="py-20 border-b border-slate-800/80 bg-[#090F1C]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left 7 Columns: Quantified Engineering Proof Cards */}
            <motion.div
              variants={staggerContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="lg:col-span-7 space-y-6"
            >
              <motion.div variants={fadeUpVariants}>
                <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-2">
                  STANDAR KESELAMATAN &amp; TELEMETRI JARINGAN &middot; EN 54-16 / EN 54-24
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Arsitektur Redundansi &amp; Matriks Prioritas Evakuasi Bertahap
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2"
                >
                  <div className="text-xs font-mono text-emerald-400 uppercase">
                    SUPERVISI JALUR OTOMATIS (FR-TEL-01)
                  </div>
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    &lt; 2.0 Detik Deteksi Fault
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Gelombang kontinu 20 kHz Pilot Tone memonitor impedansi setiap jalur speaker
                    (8.20 &Omega; normal). Anomali rangkaian terbuka atau hubung singkat memicu alarm
                    visual merah pada titik 3D secara instan.
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2"
                >
                  <div className="text-xs font-mono text-sky-400 uppercase">
                    6-LEVEL PRIORITY MATRIX &amp; DUCKING
                  </div>
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    -40 dB hingga Mute Otomatis
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sirine Evakuasi ISO 8201 (Prioritas 1) secara mutlak membisukan BGM Lounge,
                    panggilan boarding gate, dan pengumuman FIDS otomatis tanpa intervensi manual.
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2"
                >
                  <div className="text-xs font-mono text-amber-400 uppercase">
                    SANDBOX SIMULASI DARURAT TERISOLASI
                  </div>
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    100% Dry-Run Aman
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Latih skenario kebakaran dapur lounge, kebocoran bahan bakar apron, atau
                    evakuasi bertahap di konsol 3D tanpa mengganggu pengeras suara fisik di terminal.
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeUpVariants}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2"
                >
                  <div className="text-xs font-mono text-purple-400 uppercase">
                    MANAJEMEN ASET AUDIO BANDARA
                  </div>
                  <div className="text-2xl font-bold text-white font-mono tabular-nums">
                    IndexedDB Persistent Audio
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Unggah dan simpan berkas MP3/WAV kustom untuk BGM Instrumen Makassar, Lagu
                    Kebangsaan Indonesia Raya (Pukul 10.00 WITA), serta Adzan 5 Waktu.
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Right 5 Columns: Validated AOC Commissioning / Schedule Form */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:p-8"
            >
              <div className="text-xs font-mono uppercase tracking-wider text-sky-400 mb-1">
                LOGBOOK KOMISIONING &amp; PENGUJIAN AOC
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Jadwalkan Uji Fungsi &amp; Audit Akustik Terminal
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Catat sesi pengujian lapangan atau langsung buka ruang kendali 3D untuk memulai
                simulasi pengumuman dan uji impedansi jalur speaker.
              </p>

              <AnimatePresence mode="wait">
                {formSubmitted ? (
                  <motion.div
                    key="submitted"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-950/30 p-5 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Jadwal Pengujian AOC Tercatat</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sesi inspeksi atas nama <strong>{operatorName}</strong> ({unitDivision}) telah
                      diregistrasi. Anda dapat langsung melanjutkan ke Konsol 3D Digital Twin.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onEnterDigitalTwin({ floorCutaway: 'all', zoneId: null })}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
                    >
                      <span>Lanjut ke Konsol 3D Digital Twin</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleFormSubmit}
                    className="space-y-4"
                    noValidate
                  >
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Nama Engineer / Koordinator AOC
                      </label>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="Contoh: Ir. Andi Tenri Sumpala"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none text-sm text-white placeholder:text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Unit Operasional Bandara
                      </label>
                      <select
                        value={unitDivision}
                        onChange={(e) => setUnitDivision(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none text-sm text-white"
                      >
                        <option value="AOC & Elektronika Bandara">AOC &amp; Elektronika Bandara (ELBAN)</option>
                        <option value="ARFF & Keselamatan Evakuasi">ARFF &amp; Keselamatan Evakuasi</option>
                        <option value="Manajemen Terminal & Layanan Penumpang">Manajemen Terminal &amp; Layanan Penumpang</option>
                        <option value="Operasional Airside & Garbarata">Operasional Airside &amp; Garbarata</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Email Dinas / Notifikasi Log
                      </label>
                      <input
                        type="email"
                        value={operatorEmail}
                        onChange={(e) => setOperatorEmail(e.target.value)}
                        placeholder="engineer.waaa@ap1.co.id"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none text-sm text-white placeholder:text-slate-600"
                      />
                    </div>

                    {formError && (
                      <div className="text-xs text-red-400 font-mono">{formError}</div>
                    )}

                    <div className="pt-2 flex flex-col gap-2.5">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
                      >
                        Registrasi Sesi Audit Akustik
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() =>
                          onEnterDigitalTwin({
                            floorCutaway: 'all',
                            zoneId: null,
                            openSimulation: true,
                          })
                        }
                        className="w-full py-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-sky-400 hover:text-sky-300 font-mono text-xs transition-colors cursor-pointer"
                      >
                        Langsung Buka Sandbox Simulasi Darurat &rarr;
                      </motion.button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. QUIET FOOTER */}
      <footer className="py-10 bg-[#05080F] text-xs text-slate-500">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono text-slate-400">
            WAAA · AIRPORT IP PA DIGITAL TWIN &middot; BANDARA INTERNASIONAL SULTAN HASANUDDIN MAKASSAR
          </div>
          <div className="flex items-center gap-6 font-mono">
            <a href="#zona-terminal" className="hover:text-slate-300 transition-colors">
              5 Zona Makro
            </a>
            <a href="#kategori-speaker" className="hover:text-slate-300 transition-colors">
              34 IP Speaker
            </a>
            <a href="#denah-lantai" className="hover:text-slate-300 transition-colors">
              Cutaway Lantai 1 &amp; 2
            </a>
            <button
              onClick={() => onEnterDigitalTwin({ floorCutaway: 'all', zoneId: null })}
              className="text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              Konsol 3D WebGL &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
