/**
 * IndexedDB storage helper for Airport PA Custom Audio Tracks
 * Stores and retrieves custom audio buffers (BGM, Indonesia Raya, Adzan Biasa, Adzan Subuh)
 * so uploads persist across browser reloads.
 */

import { AudioTrackType, CustomAudioTrack } from '../types/custom-audio';

const DB_NAME = 'AirportDigitalTwin_AudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_audio_tracks';

interface StoredTrackRecord {
  id: AudioTrackType;
  arrayBuffer: ArrayBuffer;
  name: string;
  sizeFormatted: string;
  durationSec: number;
  sampleRate: number;
  uploadedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrackToDB(
  type: AudioTrackType,
  file: File,
  metadata: { durationSec: number; sampleRate: number; sizeFormatted: string }
): Promise<void> {
  try {
    const db = await openDB();
    const arrayBuffer = await file.arrayBuffer();

    const record: StoredTrackRecord = {
      id: type,
      arrayBuffer,
      name: file.name,
      sizeFormatted: metadata.sizeFormatted,
      durationSec: metadata.durationSec,
      sampleRate: metadata.sampleRate,
      uploadedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save custom audio to IndexedDB:', err);
  }
}

export async function loadAllTracksFromDB(): Promise<StoredTrackRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not load custom audio from IndexedDB:', err);
    return [];
  }
}

export async function deleteTrackFromDB(type: AudioTrackType): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(type);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete audio track from IndexedDB:', err);
  }
}
