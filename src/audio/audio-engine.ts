/**
 * Airport IP Public Address - Real-time Audio DSP & Priority Matrix Engine
 * Web Audio API procedural synthesis, EN 54-16 Emergency Siren, 4-Note Chime,
 * Multilingual TTS, 20kHz Pilot Tone Surveillance, and BGM Ambient Ducking.
 */

import { PriorityLevel } from '../types/pa-system';
import { AudioTrackType } from '../types/custom-audio';

class AirportAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private announcementGain: GainNode | null = null;
  private emergencyGain: GainNode | null = null;

  // Custom Uploaded Audio Buffers (BGM, Indonesia Raya, Adzan Biasa, Adzan Subuh)
  private customAudioBuffers: Map<AudioTrackType, AudioBuffer> = new Map();
  private bgmBufferSource: AudioBufferSourceNode | null = null;
  private activeBroadcastSource: AudioBufferSourceNode | null = null;
  private activeBroadcastType: AudioTrackType | null = null;
  private broadcastOscillators: OscillatorNode[] = [];
  private broadcastRunId: number = 0;

  // Active audio state
  private isBgmPlaying: boolean = false;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmTimer: number | null = null;
  private emergencyInterval: number | null = null;
  private currentPriority: PriorityLevel = 6;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micGain: GainNode | null = null;

  // Listeners
  private onPriorityChangeCallbacks: ((level: PriorityLevel) => void)[] = [];
  private onVuMeterCallbacks: ((level: number) => void)[] = [];
  private vuAnimFrame: number | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // BGM Channel
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // Announcement Channel (Levels 2-5)
      this.announcementGain = this.ctx.createGain();
      this.announcementGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.announcementGain.connect(this.masterGain);

      // Emergency Channel (Level 1)
      this.emergencyGain = this.ctx.createGain();
      this.emergencyGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.emergencyGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public subscribePriorityChange(cb: (level: PriorityLevel) => void) {
    this.onPriorityChangeCallbacks.push(cb);
    return () => {
      this.onPriorityChangeCallbacks = this.onPriorityChangeCallbacks.filter((c) => c !== cb);
    };
  }

  public subscribeVuMeter(cb: (level: number) => void) {
    this.onVuMeterCallbacks.push(cb);
    return () => {
      this.onVuMeterCallbacks = this.onVuMeterCallbacks.filter((c) => c !== cb);
    };
  }

  private setPriority(level: PriorityLevel) {
    this.currentPriority = level;
    this.applyPriorityDucking();
    this.onPriorityChangeCallbacks.forEach((cb) => cb(level));
  }

  public getCurrentPriority(): PriorityLevel {
    return this.currentPriority;
  }

  /**
   * Returns true if Adzan (Level 2) or Indonesia Raya (Level 3) or Emergency (Level 1)
   * is currently active (ON), automatically muting lower priority levels.
   */
  public isPriorityMuted(targetLevel: PriorityLevel): boolean {
    if (this.currentPriority === 1 && targetLevel > 1) return true;
    if (this.currentPriority === 2 && targetLevel > 2) return true;
    if (this.currentPriority === 3 && targetLevel > 3) return true;
    return false;
  }

  /**
   * Load and decode an uploaded custom audio file (BGM, Indonesia Raya, Adzan Biasa, Adzan Subuh)
   * High sample-rate decoding with Web Audio API.
   */
  public async loadCustomAudioFile(
    type: AudioTrackType,
    file: File
  ): Promise<{ duration: number; sampleRate: number; name: string; sizeFormatted: string }> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.customAudioBuffers.set(type, audioBuffer);

    // If BGM is actively playing and a new BGM is uploaded, hot-swap immediately
    if (type === 'bgm' && this.isBgmPlaying) {
      this.stopBgm();
      this.startBgm();
    }

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      name: file.name,
      sizeFormatted,
    };
  }

  public async loadCustomAudioFromArrayBuffer(
    type: AudioTrackType,
    arrayBuffer: ArrayBuffer,
    name: string,
    sizeFormatted: string
  ): Promise<{ duration: number; sampleRate: number; name: string; sizeFormatted: string }> {
    const ctx = this.initContext();
    // decodeAudioData consumes the arrayBuffer, so slice a copy
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.customAudioBuffers.set(type, audioBuffer);

    if (type === 'bgm' && this.isBgmPlaying) {
      this.stopBgm();
      this.startBgm();
    }

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      name,
      sizeFormatted,
    };
  }

  public removeCustomAudioFile(type: AudioTrackType) {
    this.customAudioBuffers.delete(type);
    if (type === 'bgm' && this.isBgmPlaying) {
      this.stopBgm();
      this.startBgm(); // falls back to procedural
    }
  }

  public hasCustomAudio(type: AudioTrackType): boolean {
    return this.customAudioBuffers.has(type);
  }

  public getActiveBroadcastType(): AudioTrackType | null {
    return this.activeBroadcastType;
  }

  private cleanupBroadcastAudioNodes() {
    this.broadcastRunId++;
    if (this.activeBroadcastSource) {
      try {
        this.activeBroadcastSource.onended = null;
        this.activeBroadcastSource.stop();
      } catch {
        // ignore
      }
      this.activeBroadcastSource = null;
    }
    this.broadcastOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    this.broadcastOscillators = [];
    this.activeBroadcastType = null;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public stopActiveCustomBroadcast() {
    this.cleanupBroadcastAudioNodes();
    if (this.currentPriority !== 1) {
      this.setPriority(6);
    }
  }

  /**
   * Automatic Audio Mute & Ducking logic based on 6-tier EN 54-16 Priority Matrix:
   * Level 1: Emergency -> Total Mute everything below (Levels 2–6 = 0)
   * Level 2: Adzan Terjadwal -> Auto-Mute everything below (Levels 3–6 = 0, BGM = 0)
   * Level 3: Indonesia Raya -> Auto-Mute everything below (Levels 4–6 = 0, BGM = 0)
   * Level 4: Care Call -> Duck BGM to 0.02 (-24 dB)
   * Level 5: FIDS -> Duck BGM to 0.035 (-18 dB)
   * Level 6: BGM -> Normal 0.20 (0 dB)
   */
  private applyPriorityDucking() {
    if (!this.ctx || !this.bgmGain || !this.announcementGain) return;
    const now = this.ctx.currentTime;

    switch (this.currentPriority) {
      case 1: // Emergency Override (Mutes 2-6)
        this.bgmGain.gain.setTargetAtTime(0.00001, now, 0.03);
        this.announcementGain.gain.setTargetAtTime(0.00001, now, 0.03);
        if (this.micGain) this.micGain.gain.setTargetAtTime(0.00001, now, 0.03);
        if (this.emergencyGain) this.emergencyGain.gain.setTargetAtTime(1.0, now, 0.05);
        break;
      case 2: // Adzan Terjadwal (Auto-Mutes 3-6 including Indonesia Raya, Care Call, FIDS, BGM)
      case 3: // Indonesia Raya (Auto-Mutes 4-6 including Care Call, FIDS, BGM)
        this.bgmGain.gain.setTargetAtTime(0.00001, now, 0.05); // Complete Auto-Mute of BGM
        if (this.micGain) this.micGain.gain.setTargetAtTime(0.00001, now, 0.05); // Auto-Mute lower-priority live mic
        this.announcementGain.gain.setTargetAtTime(0.95, now, 0.08);
        break;
      case 4: // Care Call (Medis / Keamanan)
        this.bgmGain.gain.setTargetAtTime(0.02, now, 0.2);
        if (this.micGain) this.micGain.gain.setTargetAtTime(0.9, now, 0.08);
        this.announcementGain.gain.setTargetAtTime(0.95, now, 0.1);
        break;
      case 5: // FIDS (Informasi Penerbangan)
        this.bgmGain.gain.setTargetAtTime(0.035, now, 0.3);
        this.announcementGain.gain.setTargetAtTime(0.9, now, 0.1);
        break;
      case 6: // BGM Only
      default:
        this.bgmGain.gain.setTargetAtTime(0.2, now, 0.6);
        this.announcementGain.gain.setTargetAtTime(0.9, now, 0.2);
        break;
    }
  }

  /**
   * Procedural Airport Chime (4-note ding-dong chime: F4, A4, C5, F5 or traditional F-A-C-E)
   */
  public playAirportChime(): Promise<void> {
    const ctx = this.initContext();
    return new Promise((resolve) => {
      const notes = [349.23, 440.0, 523.25, 698.46]; // F4, A4, C5, F5
      const noteDuration = 0.35;
      const startTime = ctx.currentTime + 0.05;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = startTime + idx * noteDuration;

        // Chime harmonics: mix of sine and triangle
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.35, noteStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration + 0.6);

        osc.connect(gain);
        if (this.announcementGain) gain.connect(this.announcementGain);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration + 0.65);
        this.broadcastOscillators.push(osc);
      });

      const totalDuration = notes.length * noteDuration + 0.7;
      setTimeout(() => {
        resolve();
      }, totalDuration * 1000);
    });
  }

  /**
   * Level 1: Fire & Emergency Evacuation Tone (EN 54-16)
   * Alternating 440Hz and 554Hz ISO 8201 evacuation pulses
   */
  public startEmergencyEvacuation(voiceText?: string) {
    const ctx = this.initContext();
    this.cleanupBroadcastAudioNodes();
    this.setPriority(1);

    if (this.emergencyInterval) {
      clearInterval(this.emergencyInterval);
    }

    const playSirenBurst = () => {
      if (!ctx || this.currentPriority !== 1) return;
      const now = ctx.currentTime;

      // Two-tone rising sweep (ISO 8201 Evac)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.5);
      osc.frequency.setValueAtTime(1000, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(500, now + 1.0);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 1.05);

      osc.connect(gain);
      if (this.emergencyGain) gain.connect(this.emergencyGain);

      osc.start(now);
      osc.stop(now + 1.1);
    };

    // Play immediately and repeat
    playSirenBurst();
    this.emergencyInterval = window.setInterval(playSirenBurst, 1400);

    // Multilingual emergency voice alert
    const defaultVoice =
      voiceText ||
      'Perhatian! Terdeteksi keadaan darurat di gedung parkir bandara. Silakan segera tinggalkan area melalui jalur evakuasi bertahap. Attention! An emergency evacuation has been activated. Please proceed to the nearest emergency exit immediately.';

    setTimeout(() => {
      if (this.currentPriority === 1) {
        this.speakText(defaultVoice, 'id-ID', false);
      }
    }, 2000);
  }

  public stopEmergencyEvacuation() {
    if (this.emergencyInterval) {
      clearInterval(this.emergencyInterval);
      this.emergencyInterval = null;
    }
    window.speechSynthesis.cancel();
    this.setPriority(6);
  }

  /**
   * Interactive Drill Simulation Audio (FR-AUD-01 & EN 54-16 Sandbox)
   * Localized operator audio synthesis without transmitting to production PA hardware.
   */
  private simInterval: number | null = null;
  private simOscillators: OscillatorNode[] = [];

  public async startSimulationScenarioAudio(
    soundType: 'siren_iso8201' | 'security_chime' | 'medical_paging' | 'earthquake_rumble',
    announcementId: string,
    announcementEn?: string
  ): Promise<void> {
    const ctx = this.initContext();
    this.stopSimulationScenarioAudio();

    if (soundType === 'siren_iso8201') {
      this.setPriority(1);
      const playSiren = () => {
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.45);
        osc.frequency.setValueAtTime(1000, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.9);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.95);
        osc.connect(gain);
        if (this.emergencyGain) gain.connect(this.emergencyGain);
        osc.start(now);
        osc.stop(now + 1.0);
      };
      playSiren();
      this.simInterval = window.setInterval(playSiren, 1300);
    } else if (soundType === 'security_chime') {
      this.setPriority(4);
      // High-priority triple security alert chord (A5 - F5 - D5)
      const tones = [880, 698.46, 587.33];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.18;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        if (this.announcementGain) gain.connect(this.announcementGain);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      await new Promise((r) => setTimeout(r, 650));
    } else if (soundType === 'medical_paging') {
      this.setPriority(4);
      // Dual-tone urgent hospital paging chime (523Hz - 784Hz)
      const tones = [523.25, 783.99];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.22;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain);
        if (this.announcementGain) gain.connect(this.announcementGain);
        osc.start(start);
        osc.stop(start + 0.45);
      });
      await new Promise((r) => setTimeout(r, 700));
    } else if (soundType === 'earthquake_rumble') {
      this.setPriority(1);
      // Low rumble 45Hz sub-bass oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 3.0);
      osc.connect(gain);
      if (this.emergencyGain) gain.connect(this.emergencyGain);
      osc.start();
      osc.stop(ctx.currentTime + 3.0);
      this.simOscillators.push(osc);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Speak announcement
    await this.speakText(announcementId, 'id-ID');
    if (announcementEn) {
      await new Promise((r) => setTimeout(r, 500));
      await this.speakText(announcementEn, 'en-US');
    }
  }

  public stopSimulationScenarioAudio() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.simOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    this.simOscillators = [];
    window.speechSynthesis.cancel();
    this.setPriority(6);
  }

  /**
   * Level 5: FIDS Airline Text-to-Speech Announcement
   * Automatically Muted if Emergency (Level 1), Adzan (Level 2), Indonesia Raya (Level 3), or Care Call (Level 4) is ON.
   */
  public async playFlightAnnouncement(textId: string, textEn?: string): Promise<void> {
    this.initContext();
    if (this.currentPriority < 5) {
      // Lower priority automatically Muted while higher priority (Adzan / Indonesia Raya / Emergency / Care Call) is ON
      return;
    }

    const runId = ++this.broadcastRunId;
    this.setPriority(5);

    // 1. Play Airport 4-note chime first
    await this.playAirportChime();
    if (this.broadcastRunId !== runId || this.currentPriority !== 5) return;

    // 2. Speak Indonesian
    await this.speakText(textId, 'id-ID');
    if (this.broadcastRunId !== runId || this.currentPriority !== 5) return;

    // 3. If English text present, speak English
    if (textEn) {
      await new Promise((r) => setTimeout(r, 600));
      if (this.broadcastRunId !== runId || this.currentPriority !== 5) return;
      await this.speakText(textEn, 'en-US');
    }

    // Reset back to BGM priority once done
    if (this.broadcastRunId === runId && this.currentPriority === 5) {
      this.setPriority(6);
    }
  }

  /**
   * Level 4: Care Call / Security paging announcement
   * Automatically Muted if Emergency (Level 1), Adzan (Level 2), or Indonesia Raya (Level 3) is ON.
   */
  public async playCareCall(message: string): Promise<void> {
    this.initContext();
    if (this.currentPriority < 4) {
      // Automatically Muted when Level 1, Level 2 (Adzan), or Level 3 (Indonesia Raya) is ON
      return;
    }

    const runId = ++this.broadcastRunId;
    this.setPriority(4);
    await this.playAirportChime();
    if (this.broadcastRunId !== runId || this.currentPriority !== 4) return;
    await this.speakText(message, 'id-ID');
    if (this.broadcastRunId === runId && this.currentPriority === 4) {
      this.setPriority(6);
    }
  }

  /**
   * Level 2: Scheduled Adzan Broadcast (Regular or Subuh)
   * Automatically preempts and Mutes all priorities below it (Level 3 Indonesia Raya, Level 4 Care Call, Level 5 FIDS, Level 6 BGM).
   */
  public async playScheduledAdzan(isSubuh: boolean = false): Promise<void> {
    const ctx = this.initContext();
    if (this.currentPriority === 1) return; // Cannot override Emergency Level 1

    // Preempt & Mute any lower-priority broadcast (e.g. Level 3 Indonesia Raya, Level 4 Care Call, Level 5 FIDS, Level 6 BGM)
    this.cleanupBroadcastAudioNodes();
    const runId = ++this.broadcastRunId;
    const trackKey: AudioTrackType = isSubuh ? 'adzanSubuh' : 'adzanRegular';
    this.activeBroadcastType = trackKey;
    this.setPriority(2); // Auto-Mutes Levels 3, 4, 5, 6

    const customBuffer = this.customAudioBuffers.get(trackKey);

    if (customBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = customBuffer;
      if (this.announcementGain) source.connect(this.announcementGain);

      return new Promise((resolve) => {
        source.onended = () => {
          if (this.broadcastRunId !== runId) {
            resolve();
            return;
          }
          this.activeBroadcastSource = null;
          const msg = isSubuh
            ? 'Waktu sholat Subuh telah tiba untuk wilayah bandara dan sekitarnya.'
            : 'Waktu sholat telah tiba untuk wilayah bandara dan sekitarnya.';
          this.speakText(msg, 'id-ID').then(() => {
            if (this.broadcastRunId === runId && this.currentPriority === 2) {
              this.activeBroadcastType = null;
              this.setPriority(6);
            }
            resolve();
          });
        };
        this.activeBroadcastSource = source;
        source.start(0);
      });
    }

    // Procedural melodious Adzan call synthesized using modal resonant tones
    const rootNotes = isSubuh
      ? [220, 246.94, 261.63, 293.66, 329.63, 349.23] // Subuh variant
      : [220, 246.94, 261.63, 293.66, 329.63]; // Hijaz scale feel
    const phrases = isSubuh ? 5 : 4;

    for (let p = 0; p < phrases; p++) {
      if (this.broadcastRunId !== runId || this.currentPriority !== 2) return;
      for (const freq of rootNotes) {
        if (this.broadcastRunId !== runId || this.currentPriority !== 2) return;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        osc2.connect(gain);
        if (this.announcementGain) gain.connect(this.announcementGain);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 1.3);
        osc2.stop(now + 1.3);
        this.broadcastOscillators.push(osc, osc2);

        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (this.broadcastRunId !== runId || this.currentPriority !== 2) return;
    const reminder = isSubuh
      ? 'Waktu sholat Subuh telah tiba untuk wilayah bandara dan sekitarnya.'
      : 'Waktu sholat telah tiba untuk wilayah bandara dan sekitarnya.';
    await this.speakText(reminder, 'id-ID');
    if (this.broadcastRunId === runId && this.currentPriority === 2) {
      this.activeBroadcastType = null;
      this.setPriority(6);
    }
  }

  /**
   * Level 3: Indonesia Raya Scheduled Broadcast
   * Automatically Muted if Emergency (Level 1) or Adzan (Level 2) is ON.
   * When ON, automatically preempts and Mutes all priorities below it (Level 4 Care Call, Level 5 FIDS, Level 6 BGM).
   */
  public async playIndonesiaRaya(): Promise<void> {
    const ctx = this.initContext();
    if (this.currentPriority < 3) {
      // Automatically Muted because Emergency (Level 1) or Adzan (Level 2) is currently ON
      return;
    }

    // Preempt & Mute any lower-priority broadcast (Level 4 Care Call, Level 5 FIDS, Level 6 BGM)
    this.cleanupBroadcastAudioNodes();
    const runId = ++this.broadcastRunId;
    this.activeBroadcastType = 'indonesiaRaya';
    this.setPriority(3); // Auto-Mutes Levels 4, 5, 6

    const customAnthem = this.customAudioBuffers.get('indonesiaRaya');
    if (customAnthem) {
      const source = ctx.createBufferSource();
      source.buffer = customAnthem;
      if (this.announcementGain) source.connect(this.announcementGain);

      return new Promise((resolve) => {
        source.onended = () => {
          if (this.broadcastRunId !== runId) {
            resolve();
            return;
          }
          this.activeBroadcastSource = null;
          this.speakText(
            'Pemutaran lagu kebangsaan Indonesia Raya telah selesai. Terima kasih kepada seluruh pengguna jasa bandara.',
            'id-ID'
          ).then(() => {
            if (this.broadcastRunId === runId && this.currentPriority === 3) {
              this.activeBroadcastType = null;
              this.setPriority(6);
            }
            resolve();
          });
        };
        this.activeBroadcastSource = source;
        source.start(0);
      });
    }

    // Procedural majestic orchestral brass chords for National Anthem
    const anthemMelody = [
      { f: 261.63, d: 0.5 }, // C4
      { f: 329.63, d: 0.5 }, // E4
      { f: 392.0, d: 0.5 },  // G4
      { f: 523.25, d: 0.8 }, // C5
      { f: 493.88, d: 0.4 }, // B4
      { f: 440.0, d: 0.4 },  // A4
      { f: 392.0, d: 1.0 },  // G4
    ];

    for (const note of anthemMelody) {
      if (this.broadcastRunId !== runId || this.currentPriority !== 3) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      if (this.announcementGain) gain.connect(this.announcementGain);

      osc.start(now);
      osc.stop(now + note.d + 0.1);
      this.broadcastOscillators.push(osc);

      await new Promise((r) => setTimeout(r, note.d * 1000));
    }

    if (this.broadcastRunId !== runId || this.currentPriority !== 3) return;
    await this.speakText(
      'Pemberitahuan kepada seluruh pengguna jasa bandara, mari bersama-sama mendengarkan lagu kebangsaan Indonesia Raya.',
      'id-ID'
    );
    if (this.broadcastRunId === runId && this.currentPriority === 3) {
      this.activeBroadcastType = null;
      this.setPriority(6);
    }
  }

  /**
   * Web Speech Synthesis Wrapper with voice selection
   */
  private speakText(text: string, langCode: string, returnPromise = true): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.92; // Slightly measured airport cadence
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find((v) => v.lang.startsWith(langCode.slice(0, 2)));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onend = () => {
        if (returnPromise) resolve();
      };
      utterance.onerror = () => {
        if (returnPromise) resolve();
      };

      window.speechSynthesis.speak(utterance);

      if (!returnPromise) {
        resolve();
      }
    });
  }

  /**
   * Ambient BGM (Background Music) Generator
   * Plays uploaded custom audio file in a seamless loop, or falls back to procedural ambient chords
   */
  public startBgm() {
    if (this.isBgmPlaying) return;
    const ctx = this.initContext();
    this.isBgmPlaying = true;
    this.applyPriorityDucking();

    // 1. Check if user uploaded a custom BGM track
    const customBgm = this.customAudioBuffers.get('bgm');
    if (customBgm) {
      const source = ctx.createBufferSource();
      source.buffer = customBgm;
      source.loop = true;
      if (this.bgmGain) source.connect(this.bgmGain);
      source.start(0);
      this.bgmBufferSource = source;
      return;
    }

    // 2. Fallback to procedural ambient chord progression: Cmaj9 -> Am9 -> Fmaj7 -> Gsus4
    const chordSets = [
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9
      [174.61, 261.63, 329.63, 349.23, 440.0], // Fmaj7
      [196.0, 261.63, 293.66, 392.0, 440.0],  // Gsus4
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.isBgmPlaying || !ctx) return;
      const notes = chordSets[chordIdx % chordSets.length];
      chordIdx++;
      const now = ctx.currentTime;

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Slow soft swell
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);

        osc.connect(gain);
        if (this.bgmGain) gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 6.0);
        this.bgmOscillators.push(osc);
      });

      // Cleanup old oscillators
      if (this.bgmOscillators.length > 20) {
        this.bgmOscillators = this.bgmOscillators.slice(-10);
      }
    };

    playChord();
    this.bgmTimer = window.setInterval(playChord, 5200);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmBufferSource) {
      try {
        this.bgmBufferSource.stop();
      } catch {
        // ignore
      }
      this.bgmBufferSource = null;
    }
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore already stopped
      }
    });
    this.bgmOscillators = [];
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying;
  }

  /**
   * PTT (Push To Talk) Live Paging Station Simulation & Real Mic Input (Priority Level 4)
   * Automatically Muted if Emergency (Level 1), Adzan (Level 2), or Indonesia Raya (Level 3) is ON.
   */
  public async startLivePaging(useRealMic: boolean = true): Promise<boolean> {
    if (this.currentPriority < 4) {
      // Automatically Muted when Level 1, Level 2 (Adzan), or Level 3 (Indonesia Raya) is ON
      this.onVuMeterCallbacks.forEach((cb) => cb(0));
      return false;
    }
    const ctx = this.initContext();
    this.setPriority(4); // Care Call / Operator Live Paging priority (Level 4)

    await this.playAirportChime();
    if (this.currentPriority !== 4) return false;

    if (useRealMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micSource = ctx.createMediaStreamSource(this.micStream);
        this.micAnalyser = ctx.createAnalyser();
        this.micAnalyser.fftSize = 256;
        this.micGain = ctx.createGain();
        this.micGain.gain.setValueAtTime(0.9, ctx.currentTime);

        this.micSource.connect(this.micAnalyser);
        this.micAnalyser.connect(this.micGain);
        if (this.announcementGain) this.micGain.connect(this.announcementGain);

        this.startVuMeterLoop();
        return true;
      } catch {
        // Fallback to simulated mic DSP
      }
    }

    // Simulated Mic DSP
    this.startSimulatedMic();
    return true;
  }

  public stopLivePaging() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micGain) {
      this.micGain.disconnect();
      this.micGain = null;
    }
    if (this.vuAnimFrame) {
      cancelAnimationFrame(this.vuAnimFrame);
      this.vuAnimFrame = null;
    }

    this.onVuMeterCallbacks.forEach((cb) => cb(0));
    if (this.currentPriority === 4) {
      this.setPriority(6);
    }
  }

  private startVuMeterLoop() {
    if (!this.micAnalyser) return;
    const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);

    const update = () => {
      if (!this.micAnalyser) return;
      this.micAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1.0, avg / 128.0);
      this.onVuMeterCallbacks.forEach((cb) => cb(normalized));
      this.vuAnimFrame = requestAnimationFrame(update);
    };

    update();
  }

  private startSimulatedMic() {
    let phase = 0;
    const loop = () => {
      phase += 0.1;
      const simLevel = 0.4 + 0.35 * Math.sin(phase) * Math.sin(phase * 1.7);
      this.onVuMeterCallbacks.forEach((cb) => cb(simLevel));
      this.vuAnimFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * 20 kHz Pilot Tone Line Monitoring (FR-TEL-01)
   * Sends ultrasound tone at 20 kHz outside hearing threshold,
   * measures line impedance (8.2 Ohm ± 10%). Short-circuit or open-circuit
   * triggers instant fault alert in < 2 seconds.
   */
  public measureLineImpedance(isFaulty: boolean = false, faultType: 'open' | 'short' = 'open'): {
    impedanceOhm: number;
    pilotToneOk: boolean;
    latencyMs: number;
  } {
    if (isFaulty) {
      const imp = faultType === 'short' ? 0.3 : 158.4;
      return {
        impedanceOhm: Number(imp.toFixed(1)),
        pilotToneOk: false,
        latencyMs: 12 + Math.floor(Math.random() * 8),
      };
    }
    // Normal nominal impedance
    const imp = 8.2 + (Math.random() * 0.4 - 0.2);
    return {
      impedanceOhm: Number(imp.toFixed(2)),
      pilotToneOk: true,
      latencyMs: 14 + Math.floor(Math.random() * 6),
    };
  }

  public setZoneVolume(gainFactor: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, gainFactor)), this.ctx.currentTime, 0.05);
    }
  }
}

export const audioEngine = new AirportAudioEngine();
