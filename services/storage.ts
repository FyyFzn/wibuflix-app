/**
 * Storage Service — Watch history with progress tracking
 * Uses AsyncStorage as replacement for localStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanSeriesTitle } from '../utils/titleUtils';
import { API } from './api';

const HISTORY_KEY = 'wibuflix_riwayat';
const SYNC_TOKEN_KEY = 'wibuflix_sync_token';
const MAX_HISTORY_ITEMS = 150; // Batasi ketat jumlah riwayat untuk mencegah OOM AsyncStorage (batas 6MB SQLite Android)
const MAX_HISTORY = MAX_HISTORY_ITEMS;

// ── Sync Token Management ──────────────────────────────

export async function getSyncToken(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(SYNC_TOKEN_KEY)) || '';
  } catch {
    return '';
  }
}

export async function setSyncToken(token: string): Promise<void> {
  try {
    if (!token) {
      await AsyncStorage.removeItem(SYNC_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(SYNC_TOKEN_KEY, token.trim());
    }
  } catch (e) {
    console.warn('[Storage] Gagal menyimpan sync token:', e);
  }
}

export async function getSyncHeaders(): Promise<Record<string, string>> {
  const token = await getSyncToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['x-sync-token'] = token;
  }
  return headers;
}

async function pushHistoryToCloud(item: WatchHistoryItem): Promise<void> {
  try {
    const headers = await getSyncHeaders();
    await fetch(API.history, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    });
  } catch {
    // Non-blocking fire-and-forget sync
  }
}

async function pushProgressToCloud(
  url: string,
  progress: number,
  duration: number,
  host?: string
): Promise<void> {
  try {
    const riwayat = await getRawRiwayat();
    const existing = riwayat.find(r => r.url === url);
    const validDuration = duration > 0 ? duration : (existing?.duration || 1);
    const payload: Partial<WatchHistoryItem> & { url: string; progress: number; duration: number } = existing ? {
      ...existing,
      progress: Math.min(progress, validDuration),
      duration: validDuration,
      waktu: Date.now(),
      ...(host ? { host } : {}),
    } : {
      judulSeri: url,
      url,
      progress: Math.min(progress, validDuration),
      duration: validDuration,
      waktu: Date.now(),
      ...(host ? { host } : {}),
    };

    const headers = await getSyncHeaders();
    await fetch(API.history, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking fire-and-forget sync
  }
}

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
    let epMatch = judul.match(/(?:Episode|Eps|OVA)\s+(\d+(?:\.\d+)?)/i) || judul.match(/\s+(\d+)\s+Sub/i) || judul.match(/\s+(\d+)$/i);
    if (!epMatch && url) {
      epMatch = url.match(/[?&]ep=(\d+(?:\.\d+)?)/i) || url.match(/episode[-_](\d+(?:\.\d+)?)/i) || url.match(/-(\d+(?:\.\d+)?)\/?$/);
    }
    const nomorEp = epMatch ? epMatch[1] : '';

    let baseJudul = cleanSeriesTitle(judul);
    if (!baseJudul || baseJudul.toLowerCase() === 'episode') baseJudul = '';
    let finalJudulSeri = cleanSeriesTitle(seriJudul || baseJudul);
    if (!finalJudulSeri || finalJudulSeri.toLowerCase() === 'episode') {
      if (seriUrl) {
        const slug = seriUrl.replace(/\/$/, '').split('/').pop() || '';
        finalJudulSeri = cleanSeriesTitle(slug.replace(/[-_]/g, ' '));
      }
    }
    if (!finalJudulSeri || finalJudulSeri.toLowerCase() === 'episode') {
      finalJudulSeri = seriJudul || baseJudul || 'Anime';
    }

    const judulSeri = finalJudulSeri;

    let riwayat = await getRawRiwayat();

    // Dedup agresif: Hapus episode lama dari seri yang sama agar riwayat tidak bengkak
    riwayat = riwayat.filter(r => r.url !== url && (seriUrl ? r.seriUrl !== seriUrl : r.judulSeri !== judulSeri));

    const newItem: WatchHistoryItem = {
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
    };

    riwayat.unshift(newItem);

    if (riwayat.length > 100) {
      riwayat = riwayat.slice(0, 100);
    }

    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
    } catch (writeErr: any) {
      if (writeErr?.message?.includes('sqlite_full') || writeErr?.message?.includes('database or disk is full')) {
        console.warn('[Storage] SQLite full detected in simpanKeRiwayat! Trimming history to 30 items...');
        // Force trim to 30 items to free up space
        const trimmed = riwayat.slice(0, 30);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)).catch(console.error);
      } else {
        throw writeErr;
      }
    }

    pushHistoryToCloud(newItem);
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

let isProgressUpdating = false;
let pendingProgressUpdate: { url: string; progress: number; duration: number; host?: string } | null = null;

export async function updateProgress(
  url: string,
  progress: number,
  duration: number,
  host?: string
): Promise<void> {
  if (!url || progress < 0 || duration <= 0) return;
  if (isProgressUpdating) {
    pendingProgressUpdate = { url, progress, duration, host };
    return;
  }

  isProgressUpdating = true;
  try {
    // 1. Update in History DB secara aman
    try {
      const riwayat = await getRawRiwayat();
      const itemIndex = riwayat.findIndex(r => r.url === url);
      if (itemIndex !== -1) {
        const validDuration = duration > 0 ? duration : (riwayat[itemIndex].duration || 1);
        riwayat[itemIndex].progress = Math.min(progress, validDuration);
        riwayat[itemIndex].duration = validDuration;
        riwayat[itemIndex].waktu = Date.now();
        if (host) riwayat[itemIndex].host = host;
        
        try {
          await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat));
        } catch (err: any) {
          if (err?.message?.includes('sqlite_full') || err?.message?.includes('database or disk is full')) {
             console.warn('[Storage] SQLite full in History! Trimming to 30 items...');
             await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat.slice(0, 30))).catch(() => {});
          } else {
             throw err;
          }
        }
      }
    } catch (e) {
      console.warn('[Storage Error] Gagal update progress di riwayat:', e);
    }

    // 2. Update in standalone Progress DB secara tersanitasi
    try {
      const data = await AsyncStorage.getItem(PROGRESS_KEY);
      let allProgress: Record<string, EpisodeProgress> = {};
      if (data) {
        try {
          allProgress = JSON.parse(data) || {};
        } catch {
          allProgress = {};
        }
      }
      
      allProgress[url] = { 
        progress: Math.min(progress, duration), 
        duration, 
        waktu: Date.now() 
      };
      
      const keys = Object.keys(allProgress);
      if (keys.length > 150) {
        const sortedKeys = keys.sort((a, b) => (allProgress[b]?.waktu || 0) - (allProgress[a]?.waktu || 0));
        const newProgress: Record<string, EpisodeProgress> = {};
        sortedKeys.slice(0, 150).forEach(k => {
          if (allProgress[k]) newProgress[k] = allProgress[k];
        });
        allProgress = newProgress;
      }

      try {
        await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
      } catch (err: any) {
        if (err?.message?.includes('sqlite_full') || err?.message?.includes('database or disk is full')) {
          console.warn('[Storage] SQLite full in Progress DB! Trimming to 30 items...');
          const emergencyProgress: Record<string, EpisodeProgress> = {};
          const emergencyKeys = Object.keys(allProgress).sort((a, b) => (allProgress[b]?.waktu || 0) - (allProgress[a]?.waktu || 0)).slice(0, 30);
          emergencyKeys.forEach(k => { emergencyProgress[k] = allProgress[k]; });
          await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(emergencyProgress)).catch(() => {});
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.warn('[Storage Error] Gagal update progress di Progress DB:', e);
    }

    pushProgressToCloud(url, progress, duration, host);
  } finally {
    isProgressUpdating = false;
    if (pendingProgressUpdate) {
      const next = pendingProgressUpdate;
      pendingProgressUpdate = null;
      updateProgress(next.url, next.progress, next.duration, next.host);
    }
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
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(riwayat)).catch(() => {});

  try {
    const headers = await getSyncHeaders();
    fetch(`${API.history}/${encodeURIComponent(identifier)}`, {
      method: 'DELETE',
      headers,
    }).catch(() => {});
  } catch {}
}

// ── Clear all history ───────────────────────────────────────

export async function clearAllHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);

  try {
    const headers = await getSyncHeaders();
    fetch(API.history, {
      method: 'DELETE',
      headers,
    }).catch(() => {});
  } catch {}
}

// ── Cloud Reconciliation ──────────────────────────────

export async function syncHistoryFromCloud(): Promise<WatchHistoryItem[]> {
  try {
    const headers = await getSyncHeaders();
    const res = await fetch(API.history, { headers });
    if (!res.ok) {
      return await getRiwayat();
    }
    const json = await res.json();
    const remoteList: WatchHistoryItem[] = (json && Array.isArray(json.data))
      ? json.data
      : (Array.isArray(json) ? json : []);

    const localList = await getRawRiwayat();

    const mergedMap = new Map<string, WatchHistoryItem>();

    const getItemKey = (item: WatchHistoryItem) => {
      let jt = cleanSeriesTitle(item.judulSeri || '');
      if (!jt) jt = item.judulSeri;
      return item.seriUrl || jt || item.url;
    };

    const allItems = [...localList, ...remoteList];
    for (const item of allItems) {
      if (!item || (!item.url && !item.seriUrl && !item.judulSeri)) continue;
      const key = getItemKey(item);
      const existing = mergedMap.get(key);
      if (!existing || (item.waktu || 0) > (existing.waktu || 0)) {
        mergedMap.set(key, item);
      }
    }

    // Auto-sync: Push any local items missing or newer to the cloud
    const remoteUrlMap = new Map(remoteList.map(r => [r.url, r.waktu || 0]));
    const toUpload = localList.filter(l => {
      const remoteWaktu = remoteUrlMap.get(l.url);
      return remoteWaktu === undefined || (l.waktu || 0) > remoteWaktu;
    });
    if (toUpload.length > 0) {
      Promise.all(toUpload.slice(0, 50).map(item => pushHistoryToCloud(item))).catch(() => {});
    }

    const mergedList = Array.from(mergedMap.values())
      .sort((a, b) => (b.waktu || 0) - (a.waktu || 0))
      .slice(0, MAX_HISTORY_ITEMS);

    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(mergedList));
    } catch (writeErr: any) {
      console.warn('[Storage] Gagal menyimpan hasil sync ke AsyncStorage:', writeErr);
    }

    return await getRiwayat();
  } catch (err) {
    console.warn('[Storage] syncHistoryFromCloud gagal:', err);
    return await getRiwayat();
  }
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
