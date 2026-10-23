"use client"

import React, { useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Box, Layers, Volume2, VolumeX } from "lucide-react"

export interface NavItem {
  label: string
  href: string
}

export interface TokyoSkylineHeroProps {
  youtubeVideoId?: string
  title?: string
  subtitle?: string
  badgeText?: string
  scrollHint?: string
  navItems?: NavItem[]
  ctaLabel?: string
  onCtaClick?: () => void
  secondaryCtaLabel?: string
  onSecondaryCtaClick?: () => void
  stats?: { value: string; label: string }[]
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_YOUTUBE_ID = "wOYu5UXFuOk"

const DEFAULT_NAV: NavItem[] = [
  { label: "Pratinjau 3D", href: "#pratinjau-3d" },
  { label: "Zona Terminal", href: "#zona-terminal" },
  { label: "Speaker 3D Pixar", href: "#kategori-speaker" },
  { label: "Mockup Lantai 1 & 2", href: "#denah-lantai" },
  { label: "Standar EN 54-16", href: "#spesifikasi-en54" },
]

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.15,
    },
  },
}

const heroItemVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
}

export default function TokyoSkylineHero({
  youtubeVideoId = DEFAULT_YOUTUBE_ID,
  title = "Digital Twin Public Addres System",
  subtitle = "Public Address System dengan Layout Bandara Sultan Hasanuddin Makassar sebagai media pembelajaran",
  badgeText = "BANDARA INTERNASIONAL SULTAN HASANUDDIN MAKASSAR · WAAA / MKS · EN 54-16 & EN 54-24",
  scrollHint = "SCROLL UNTUK EKSPLORASI",
  navItems = DEFAULT_NAV,
  ctaLabel = "Masuk ke Konsol 3D Digital Twin",
  onCtaClick,
  secondaryCtaLabel = "Inspeksi Lantai 1 & 2",
  onSecondaryCtaClick,
  className,
  style,
}: TokyoSkylineHeroProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isMuted, setIsMuted] = useState(true)

  const toggleYoutubeMute = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return
    const nextMuted = !isMuted
    const command = nextMuted ? "mute" : "unMute"
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: command,
        args: [],
      }),
      "*"
    )
    setIsMuted(nextMuted)
  }

  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&playlist=${youtubeVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1&disablekb=1`

  return (
    <section
      className={`relative w-full h-dvh min-h-[680px] overflow-hidden bg-slate-950 select-none ${className || ""}`}
      style={style}
    >
      {/* 1. Full-Bleed YouTube Background Video (16:9 Object-Cover Scaling) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Bandara Internasional Sultan Hasanuddin Makassar Background Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-[100dvh] min-w-[177.78dvh] scale-[1.06] pointer-events-none border-0"
        />
      </div>

      {/* 2. Atmospheric Scrims for High-Contrast Typography Legibility */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,11,20,0.78) 0%, rgba(7,11,20,0.42) 38%, rgba(7,11,20,0.58) 72%, rgba(7,11,20,0.96) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(7,11,20,0.72) 0%, rgba(7,11,20,0.15) 70%)",
        }}
      />

      {/* 3. Top Navigation Bar (Single-Row, 3 Zones Contract) */}
      <motion.header
        initial={{ y: -36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-30 w-full border-b border-white/10 bg-slate-950/45 backdrop-blur-md"
      >
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="text-sm font-mono font-bold tracking-wider uppercase text-white whitespace-nowrap shrink-0"
          >
            WAAA · PA DIGITAL TWIN
          </a>

          {/* Zone 2: Primary Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm text-slate-200">
            {navItems.map((item, idx) => (
              <motion.a
                key={item.href}
                href={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.06, duration: 0.45 }}
                whileHover={{ y: -2 }}
                className="hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 font-medium"
              >
                {item.label}
              </motion.a>
            ))}
          </nav>

          {/* Zone 3: Primary Action & Audio Control */}
          <div className="flex items-center gap-2.5 shrink-0">
            <motion.button
              type="button"
              onClick={toggleYoutubeMute}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={isMuted ? "Nyalakan Suara Video Latar" : "Bisukan Suara Video Latar"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Audio Off</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Audio On</span>
                </>
              )}
            </motion.button>

            {onCtaClick && (
              <motion.button
                type="button"
                onClick={onCtaClick}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg shadow-sky-950/50"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Buka 3D Digital Twin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* 4. Hero Foreground Content */}
      <div className="relative z-20 max-w-[1400px] mx-auto px-6 h-[calc(100dvh-4rem)] flex flex-col justify-center">
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl space-y-6"
        >
          {/* Unboxed Metadata Line */}
          <motion.div
            variants={heroItemVariants}
            className="text-xs font-mono uppercase tracking-widest text-sky-400 tabular-nums drop-shadow"
          >
            {badgeText}
          </motion.div>

          {/* Dominant Headline */}
          <motion.h1
            variants={heroItemVariants}
            className="font-bold tracking-tight text-white leading-[1.08] drop-shadow-lg"
            style={{ fontSize: "clamp(2.25rem, 4.2vw, 3.85rem)" }}
          >
            {title}
          </motion.h1>

          {/* Subtitle / Value Proposition */}
          {subtitle && (
            <motion.p
              variants={heroItemVariants}
              className="text-slate-200 text-base md:text-lg leading-relaxed max-w-[62ch] drop-shadow"
            >
              {subtitle}
            </motion.p>
          )}

          {/* CTA Buttons */}
          <motion.div
            variants={heroItemVariants}
            className="pt-2 flex flex-wrap items-center gap-3.5"
          >
            {onCtaClick && (
              <motion.button
                type="button"
                onClick={onCtaClick}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide transition-colors cursor-pointer shadow-xl shadow-sky-950/60"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}

            {onSecondaryCtaClick && (
              <motion.button
                type="button"
                onClick={onSecondaryCtaClick}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg border border-white/25 hover:border-white/50 bg-slate-950/55 hover:bg-slate-900/75 text-white font-semibold text-sm backdrop-blur-md transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>{secondaryCtaLabel}</span>
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* 5. Bottom Scroll Indicator */}
      <motion.a
        href="#pratinjau-3d"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        whileHover={{ y: 3 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
      >
        <span className="text-[10px] font-mono tracking-[0.28em] uppercase">
          {scrollHint}
        </span>
        <motion.svg
          width="14"
          height="18"
          viewBox="0 0 14 18"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M7 1 L7 17 M2 12 L7 17 L12 12"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.a>
    </section>
  )
}
