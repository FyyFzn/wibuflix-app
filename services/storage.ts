/**
 * Storage Service — Watch history with progress tracking
 * Uses AsyncStorage as replacement for localStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'wibuflix_riwayat';
const MAX_HISTORY = 100;

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
}

// ── Get all history ─────────────────────────────────────────

export async function getRiwayat(): Promise<WatchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
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
  seriJudul?: string
): Promise<void> {
  const judulSeri = seriJudul || judul.replace(/\s+Episode\s+.*/i, '').trim();
  const epMatch = judul.match(/Episode\s+(\d+)/i) || judul.match(/\s+(\d+)\s+Sub/i) || judul.match(/\s+(\d+)$/i);
  const nomorEp = epMatch ? epMatch[1] : '';

  let riwayat = await getRiwayat();

  // Remove existing entry for same series
  riwayat = riwayat.filter(r => r.judulSeri !== judulSeri);

  // Add new entry at the top
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
  });

  // Limit size
  if (riwayat.length > MAX_HISTORY) {
    riwayat = riwayat.slice(0, MAX_HISTORY);
  }

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
}

// ── Update progress for existing history item ───────────────

export async function updateProgress(
  url: string,
  progress: number,
  duration: number,
  host?: string
): Promise<void> {
  const riwayat = await getRiwayat();
  const item = riwayat.find(r => r.url === url);
  if (item) {
    item.progress = progress;
    item.duration = duration;
    item.waktu = Date.now();
    if (host) item.host = host;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
  }
}

// ── Get progress for a specific episode URL ─────────────────

export async function getProgress(url: string): Promise<{ progress: number; duration: number; host?: string } | null> {
  const riwayat = await getRiwayat();
  const item = riwayat.find(r => r.url === url);
  if (item && item.progress > 0) {
    return { progress: item.progress, duration: item.duration, host: item.host };
  }
  return null;
}

// ── Delete a single history item ────────────────────────────

export async function hapusRiwayat(judulSeri: string): Promise<void> {
  let riwayat = await getRiwayat();
  riwayat = riwayat.filter(r => r.judulSeri !== judulSeri);
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

