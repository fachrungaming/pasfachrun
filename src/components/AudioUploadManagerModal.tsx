/**
 * Audio Asset Upload & Scheduler Manager
 * Allows operators to upload and manage custom MP3/WAV/AAC audio for:
 * 1. Background Music (BGM)
 * 2. Lagu Kebangsaan Indonesia Raya
 * 3. Suara Adzan Biasa (Dzuhur, Ashar, Maghrib, Isya)
 * 4. Suara Adzan Subuh
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Upload,
  Music,
  Clock,
  Flag,
  Play,
  Square,
  Trash2,
  CheckCircle2,
  Volume2,
  FileAudio,
  Radio,
  Sliders,
  Sparkles,
  Info,
  VolumeX,
} from 'lucide-react';
import {
  AudioTrackType,
  CustomAudioTrack,
  INITIAL_CUSTOM_TRACKS,
} from '../types/custom-audio';
import { audioEngine } from '../audio/audio-engine';
import { saveTrackToDB, deleteTrackFromDB } from '../audio/audio-storage';

interface AudioUploadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Record<AudioTrackType, CustomAudioTrack>;
  onTrackUploaded: (type: AudioTrackType, metadata: { name: string; sizeFormatted: string; durationSec: number; sampleRate?: number }) => void;
  onTrackRemoved: (type: AudioTrackType) => void;
  onShowToast: (message: string) => void;
}

export const AudioUploadManagerModal: React.FC<AudioUploadManagerModalProps> = ({
  isOpen,
  onClose,
  tracks,
  onTrackUploaded,
  onTrackRemoved,
  onShowToast,
}) => {
  const [playingTrackId, setPlayingTrackId] = useState<AudioTrackType | null>(null);
  const [isUploading, setIsUploading] = useState<AudioTrackType | null>(null);
  const [dragOverType, setDragOverType] = useState<AudioTrackType | null>(null);

  // Hidden file input refs
  const fileInputRefs = {
    bgm: useRef<HTMLInputElement>(null),
    indonesiaRaya: useRef<HTMLInputElement>(null),
    adzanRegular: useRef<HTMLInputElement>(null),
    adzanSubuh: useRef<HTMLInputElement>(null),
  };

  // Sync playing track with audio engine
  useEffect(() => {
    if (!isOpen) {
      if (playingTrackId && playingTrackId !== 'bgm') {
        audioEngine.stopActiveCustomBroadcast();
        setPlayingTrackId(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processUploadedFile = async (type: AudioTrackType, file: File) => {
    try {
      setIsUploading(type);
      const meta = await audioEngine.loadCustomAudioFile(type, file);
      
      // Persist in IndexedDB
      await saveTrackToDB(type, file, {
        durationSec: meta.duration,
        sampleRate: meta.sampleRate,
        sizeFormatted: meta.sizeFormatted,
      });

      onTrackUploaded(type, {
        name: meta.name,
        sizeFormatted: meta.sizeFormatted,
        durationSec: meta.duration,
        sampleRate: meta.sampleRate,
      });

      onShowToast(`✅ Berhasil mengupload audio "${meta.name}" (${meta.sizeFormatted}) untuk ${tracks[type].title}.`);
    } catch (err) {
      console.error('Failed to load audio file:', err);
      onShowToast(`❌ Gagal membaca berkas audio: Format tidak didukung atau berkas rusak.`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleFileChange = async (type: AudioTrackType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(type, file);
    if (e.target) e.target.value = '';
  };

  const handleDrop = async (type: AudioTrackType, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverType(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(type, file);
    }
  };

  const handlePlayTrack = async (type: AudioTrackType) => {
    setPlayingTrackId(type);

    if (type === 'bgm') {
      audioEngine.startBgm();
      onShowToast('🎵 Memutar Musik Latar BGM Terminal (Looping dengan Audio Ducking)');
    } else if (type === 'indonesiaRaya') {
      onShowToast('🇮🇩 Menyiarkan Lagu Kebangsaan Indonesia Raya (Prioritas 5)...');
      await audioEngine.playIndonesiaRaya();
      setPlayingTrackId(null);
    } else if (type === 'adzanRegular') {
      onShowToast('🕌 Menyiarkan Adzan Biasa (Prioritas 4 - Redam BGM)...');
      await audioEngine.playScheduledAdzan(false);
      setPlayingTrackId(null);
    } else if (type === 'adzanSubuh') {
      onShowToast('🕌 Menyiarkan Adzan Subuh (Lafaz Ash-shalatu khairum minan naum)...');
      await audioEngine.playScheduledAdzan(true);
      setPlayingTrackId(null);
    }
  };

  const handleStopTrack = (type: AudioTrackType) => {
    if (type === 'bgm') {
      audioEngine.stopBgm();
    } else {
      audioEngine.stopActiveCustomBroadcast();
    }
    setPlayingTrackId(null);
    onShowToast(`⏹️ Siaran ${tracks[type].title} dihentikan.`);
  };

  const handleRemoveTrack = async (type: AudioTrackType) => {
    audioEngine.removeCustomAudioFile(type);
    await deleteTrackFromDB(type);
    onTrackRemoved(type);
    if (playingTrackId === type) {
      handleStopTrack(type);
    }
    onShowToast(`🗑️ Berkas audio ${tracks[type].title} dihapus. Kembali ke default sintesis prosedural.`);
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '--:--';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getTrackIcon = (type: AudioTrackType) => {
    switch (type) {
      case 'bgm':
        return <Music className="w-5 h-5 text-purple-400" />;
      case 'indonesiaRaya':
        return <Flag className="w-5 h-5 text-pink-400" />;
      case 'adzanRegular':
        return <Clock className="w-5 h-5 text-emerald-400" />;
      case 'adzanSubuh':
        return <Sparkles className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileAudio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Manajemen Berkas Audio Siaran Bandara
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40">
                  EN 54-16 Matrix Audio
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unggah berkas audio kustom untuk Musik BGM, Indonesia Raya, Adzan Biasa, dan Adzan Subuh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick Notice Info Banner */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-slate-300 flex items-start space-x-3">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-purple-200">
                Penyimpanan & Dekoder Web Audio DSP Resolusi Tinggi (48 kHz)
              </div>
              <p className="text-[11px] text-slate-300">
                Format yang didukung: <span className="font-mono text-cyan-300">.mp3, .wav, .ogg, .m4a, .aac</span>. Berkas yang diunggah akan otomatis disimpan ke IndexedDB browser dan diintegrasikan ke dalam matriks prioritas EN 54-16 dengan fitur pelemahan audio otomatis (ducking) saat ada siaran berkategori lebih tinggi.
              </p>
            </div>
          </div>

          {/* Track Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['bgm', 'indonesiaRaya', 'adzanRegular', 'adzanSubuh'] as AudioTrackType[]).map((type) => {
              const track = tracks[type];
              const isPlaying = playingTrackId === type;
              const hasCustom = track.hasCustomFile;
              const isDragOver = dragOverType === type;

              return (
                <div
                  key={type}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverType(type);
                  }}
                  onDragLeave={() => setDragOverType(null)}
                  onDrop={(e) => handleDrop(type, e)}
                  className={`p-4 rounded-xl border transition-all space-y-3 relative ${
                    isDragOver
                      ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                      : isPlaying
                      ? 'bg-slate-900/90 border-purple-400 ring-2 ring-purple-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRefs[type]}
                    onChange={(e) => handleFileChange(type, e)}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                  />

                  {/* Header card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/60">
                        {getTrackIcon(type)}
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100">{track.title}</h3>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                          <span>Prioritas Level {track.priorityLevel}</span>
                          <span>&bull;</span>
                          <span className="text-purple-300">
                            {type === 'bgm' ? 'Loop Otomatis' : 'Siaran 1x (Ducking BGM)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        hasCustom
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hasCustom ? 'BERKAS KUSTOM' : 'SINTESIS DEFAULT'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{track.subtitle}</p>

                  {/* Metadata display */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Nama Berkas:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[200px]" title={track.fileName || 'Prosedural Algoritmik'}>
                        {track.fileName || 'Sintesis Prosedural Web Audio'}
                      </span>
                    </div>
                    {hasCustom && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Spesifikasi:</span>
                        <span className="text-cyan-300">
                          {track.fileSizeFormatted} &bull; {formatDuration(track.durationSec)} {track.sampleRate ? `• ${Math.round(track.sampleRate / 1000)}kHz` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Drag-drop prompt area */}
                  <div
                    onClick={() => fileInputRefs[type].current?.click()}
                    className="p-2 rounded-lg border border-dashed border-slate-700 hover:border-purple-400 bg-slate-950/40 hover:bg-slate-900/60 text-center cursor-pointer transition-all"
                  >
                    <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>Tarik file ke sini atau klik untuk memilih file</span>
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => fileInputRefs[type].current?.click()}
                      disabled={isUploading === type}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isUploading === type ? 'Memproses...' : hasCustom ? 'Ganti File' : 'Upload File'}</span>
                    </button>

                    {isPlaying ? (
                      <button
                        onClick={() => handleStopTrack(type)}
                        className="py-2 px-3.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md"
                        title="Hentikan Siaran"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlayTrack(type)}
                        className="py-2 px-3.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md"
                        title="Uji Siaran"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{type === 'bgm' ? 'Putar BGM' : 'Siarkan'}</span>
                      </button>
                    )}

                    {hasCustom && (
                      <button
                        onClick={() => handleRemoveTrack(type)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 transition-all cursor-pointer"
                        title="Hapus berkas kustom dan kembali ke default"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tersimpan otomatis ke database lokal (IndexedDB) &bull; Persisten setelah refresh</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer transition-all shadow-md"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
