/**
 * Storage Service — Watch history with progress tracking
 * Uses AsyncStorage as replacement for localStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanSeriesTitle } from '../utils/titleUtils';

const HISTORY_KEY = 'wibuflix_riwayat';
const MAX_HISTORY_ITEMS = 150; // Batasi ketat jumlah riwayat untuk mencegah OOM AsyncStorage (batas 6MB SQLite Android)
const MAX_HISTORY = MAX_HISTORY_ITEMS;

export interface WatchHistoryItem {
  judulSeri: string;
  nomorEp: string;
  url: string;         // episode URL
  seriUrl: string;      // series URL
  gambar: string;
  waktu: number;        // timestamp when watched
  progress: number;     // seconds watched (position)
  duration: number;     // total duration in seconds
  host?: string;        // last active server
  uniqueId?: string;    // MAL ID or series unique ID
}

// ── Get RAW history (internal use) ──────────────────────────

export async function getRawRiwayat(): Promise<WatchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data) as WatchHistoryItem[];
  } catch {
    return [];
  }
}

// ── Get DEDUPLICATED history (for UI) ──────────────────────

export async function getRiwayat(): Promise<WatchHistoryItem[]> {
  try {
    const parsed = await getRawRiwayat();
    
    // Pembersihan On-The-Fly untuk riwayat lama agar ter-deduplikasi
    const cleanedMap = new Map<string, WatchHistoryItem>();
    
    parsed.forEach(item => {
      let jt = cleanSeriesTitle(item.judulSeri || '');
      if (!jt) jt = item.judulSeri;
      
      const key = item.seriUrl || jt;
      
      const existing = cleanedMap.get(key);
      // Simpan yang paling baru (yang pertama kali masuk di array parsed karena urutan desc)
      if (!existing) {
        cleanedMap.set(key, { ...item, judulSeri: jt });
      }
    });
    
    return Array.from(cleanedMap.values());
  } catch {
    return [];
  }
}

// ── Save to history (upsert by series title) ────────────────

export async function simpanKeRiwayat(
  judul: string,
  url: string,
  seriUrl: string,
  gambar: string,
  progress: number = 0,
  duration: number = 0,
  host?: string,
  seriJudul?: string,
  uniqueId?: string
): Promise<void> {
  try {
    let baseJudul = cleanSeriesTitle(judul);
    if (!baseJudul) baseJudul = judul;
    
    let finalJudulSeri = cleanSeriesTitle(seriJudul || baseJudul);
    if (!finalJudulSeri) finalJudulSeri = seriJudul || baseJudul;
    
    const judulSeri = finalJudulSeri;
    
    const epMatch = judul.match(/(?:Episode|Eps|OVA)\s+(\d+(?:\.\d+)?)/i) || judul.match(/\s+(\d+)\s+Sub/i) || judul.match(/\s+(\d+)$/i);
    const nomorEp = epMatch ? epMatch[1] : '';

    let riwayat = await getRawRiwayat();

    // Hapus duplikat jika episode yang sama ditonton ulang agar naik ke paling atas
    riwayat = riwayat.filter(r => r.url !== url);

    // Masukkan ke paling depan (FIFO unshift)
    riwayat.unshift({
      judulSeri,
      nomorEp,
      url,
      seriUrl,
      gambar,
      waktu: Date.now(),
      progress,
      duration,
      host,
      uniqueId,
    });

    // POTONG array jika melebihi batas untuk mencegah OOM AsyncStorage
    if (riwayat.length > MAX_HISTORY_ITEMS) {
      riwayat = riwayat.slice(0, MAX_HISTORY_ITEMS);
    }

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
  } catch (e) {
    console.error('[Storage Error] Gagal menyimpan ke riwayat AsyncStorage:', e);
  }
}

const PROGRESS_KEY = 'wibuflix_progress';

export interface EpisodeProgress {
  progress: number;
  duration: number;
  waktu: number;
}

// ── Update progress for specific episode ───────────────

export async function updateProgress(
  url: string,
  progress: number,
  duration: number,
  host?: string
): Promise<void> {
  // Update in History (for latest episode card)
  try {
    const riwayat = await getRawRiwayat();
    const itemIndex = riwayat.findIndex(r => r.url === url);
    if (itemIndex !== -1) {
      riwayat[itemIndex].progress = progress;
      riwayat[itemIndex].duration = duration;
      riwayat[itemIndex].waktu = Date.now();
      if (host) riwayat[itemIndex].host = host;
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
    }
  } catch (e) {
    console.warn('[Storage Error] Gagal update progress di riwayat:', e);
  }

  // Update in standalone Progress DB (for episode lists)
  try {
    const data = await AsyncStorage.getItem(PROGRESS_KEY);
    let allProgress: Record<string, EpisodeProgress> = data ? JSON.parse(data) : {};
    
    allProgress[url] = { progress, duration, waktu: Date.now() };
    
    // Cleanup if too large (keep last 500)
    const keys = Object.keys(allProgress);
    if (keys.length > 500) {
      const sortedKeys = keys.sort((a, b) => allProgress[b].waktu - allProgress[a].waktu);
      const newProgress: Record<string, EpisodeProgress> = {};
      sortedKeys.slice(0, 500).forEach(k => {
        newProgress[k] = allProgress[k];
      });
      allProgress = newProgress;
    }

    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
  } catch (e) {
    console.warn('Failed to save progress', e);
  }
}

// ── Get progress for a specific episode URL ─────────────────

export async function getProgress(url: string): Promise<{ progress: number; duration: number; host?: string } | null> {
  // 1. Cek standalone Progress DB
  try {
    const data = await AsyncStorage.getItem(PROGRESS_KEY);
    if (data) {
      const allProgress: Record<string, EpisodeProgress> = JSON.parse(data);
      if (allProgress[url] && allProgress[url].progress > 0) {
        return { progress: allProgress[url].progress, duration: allProgress[url].duration };
      }
    }
  } catch (e) {}

  // 2. Fallback cek History DB lama
  const riwayat = await getRawRiwayat();
  const item = riwayat.find(r => r.url === url);
  if (item && item.progress > 0) {
    return { progress: item.progress, duration: item.duration, host: item.host };
  }
  return null;
}

export async function getAllProgressMap(): Promise<Record<string, EpisodeProgress>> {
  try {
    const data = await AsyncStorage.getItem(PROGRESS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {};
}

// ── Delete a single history item ────────────────────────────

export async function hapusRiwayat(identifier: string): Promise<void> {
  let riwayat = await getRawRiwayat();
  riwayat = riwayat.filter(r => r.seriUrl !== identifier && r.judulSeri !== identifier);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
}

// ── Clear all history ───────────────────────────────────────

export async function clearAllHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ── Format relative time (same as web version) ─────────────

export function formatWaktuYangLalu(timestamp: number): string {
  const detik = Math.floor((Date.now() - timestamp) / 1000);
  if (detik < 60) return 'Baru saja';
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} mnt yang lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam yang lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari yang lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID');
}

// ── Format seconds to mm:ss ─────────────────────────────────

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
