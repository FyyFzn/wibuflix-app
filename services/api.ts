/**
 * API Service — Ported from js/api.js
 * Configurable API_BASE for VPS deployment.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Ganti dengan IP/URL VPS kamu ──────────────────────────
// Development: 'http://192.168.x.x:3000' (IP lokal PC)
// Production:  'https://api.wibuflix.com' (domain VPS)
// Base URL diarahkan ke Cloudflare API untuk keamanan dan caching CDN
const API_BASE = 'https://api.wibuflix.me';

export function getApiBase(): string {
  return API_BASE;
}

export const API = {
  katalog: `${API_BASE}/api/katalog`,
  episodes: `${API_BASE}/api/v2/episodes`, // Beralih ke V2 Server-Driven (Thin Client)
  v2Stream: `${API_BASE}/api/v2/stream`,
  v2ReportBroken: `${API_BASE}/api/v2/stream/report-broken`,
  scrape: `${API_BASE}/api/scrape`,
  hot: `${API_BASE}/api/hot`,
};

// ── Types ──────────────────────────────────────────────────

export interface AnimeItem {
  judul: string;
  url: string;
  gambar: string;
  gambarScraper?: string;
  tipe: string;
  skor: string;
  status: string;
  sources?: any;
}

export interface KatalogResponse {
  status: string;
  data: {
    list: AnimeItem[];
    hasNext: boolean;
  };
}

export interface HotAnimeResponse {
  status: string;
  data: {
    list: AnimeItem[];
  };
}

export interface EpisodeItem {
  judul: string;
  num?: number | null;
  url?: string; // Untuk backward compatibility
  urls?: Record<string, string>;
  tanggal?: string;
  malJudul?: string;
}

export interface MalInfo {
  malId: number;
  malUrl: string;
  malScore: string | null;
  malRank: number | null;
  genres: string[];
  synopsis: string;
  episodes: number | null;
  status: string;
  studios: string[];
  year: number | null;
  rating: string;
  cover: string;
  coverWebp: string | null;
}

export interface EpisodesResponse {
  status: string;
  data: {
    judul_seri: string;
    cover_scraper: string;
    daftar_episode: EpisodeItem[];
    mal: MalInfo | null;
  };
}

export interface ServerItem {
  nama: string;
  post: string;
  nume: string;
  type: string;
  aktif: boolean;
  iframeUrl?: string;
  namaHost?: string;
  source?: string;
}

export interface ScrapeResponse {
  status: string;
  data: {
    judul: string;
    gambar: string;
    nav_prev: string | null;
    nav_next: string | null;
    servers: ServerItem[];
    iframeAktif: string | null;
  };
}


// ── API Functions ──────────────────────────────────────────

// Memori cache untuk performa (mengurangi block I/O pada AsyncStorage)
class LRUMemoryCache<K, V> {
  private cache = new Map<K, V>();
  private max: number;

  constructor(max: number = 50) {
    this.max = max;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
}

const memoryCache = new LRUMemoryCache<string, { timestamp: number; data: any }>(50);

function isCacheValid(data: any): boolean {
  if (!data || data.status === 'error') return false;
  if (data.data && Array.isArray(data.data.list) && data.data.list.length === 0) return false;
  return true;
}

async function fetchWithCache<T>(url: string, cacheKey: string, ttl: number = 3600000, signal?: AbortSignal, forceRefresh: boolean = false): Promise<T> {
  // 1. Cek dari memori (RAM) terlebih dahulu jika tidak dipaksa refresh
  if (!forceRefresh) {
    const memData = memoryCache.get(cacheKey);
    if (memData && Date.now() - memData.timestamp < ttl && isCacheValid(memData.data)) {
      return memData.data as T;
    }

    // 2. Fallback cek dari disk (AsyncStorage)
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        // Langsung kembalikan data jika belum expired (TTL) dan valid
        if (Date.now() - parsed.timestamp < ttl && isCacheValid(parsed.data)) {
          // Simpan ke memori cache
          memoryCache.set(cacheKey, { timestamp: parsed.timestamp, data: parsed.data });
          
          // (Opsional) Refresh cache di latar belakang tanpa menunggu
          fetch(url).then(res => res.json()).then(json => {
            if (isCacheValid(json)) {
              const freshData = { timestamp: Date.now(), data: json };
              memoryCache.set(cacheKey, freshData);
              AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
          }).catch(() => {});
          return parsed.data as T;
        }
      } catch (e) {
        // Abaikan error parse dan lanjut nge-fetch
      }
    }
  }

  // 2. Fetch data dari server jika tidak ada di cache / sudah expired / dipaksa refresh
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  
  // 3. Simpan hasil baru ke cache memori dan disk jika valid
  if (isCacheValid(json)) {
    const newData = { timestamp: Date.now(), data: json };
    memoryCache.set(cacheKey, newData);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(newData));
  }
  return json;
}

export async function fetchKatalog(page = 1, search = '', tab = 'all', typeFilter = '', genreFilter = '', signal?: AbortSignal, forceRefresh = false, sort = 'az'): Promise<KatalogResponse> {
  let url = `${API.katalog}?page=${page}&tab=${tab}&sort=${sort}`;
  if (search) url += `&s=${encodeURIComponent(search)}`;
  if (typeFilter && typeFilter !== 'Semua') url += `&typeFilter=${encodeURIComponent(typeFilter)}`;
  if (genreFilter && genreFilter !== 'Semua') url += `&genre=${encodeURIComponent(genreFilter)}`;
  const cacheKey = `katalog_${page}_${search}_${tab}_${typeFilter}_${genreFilter}_${sort}`;
  return fetchWithCache<KatalogResponse>(url, cacheKey, 3600000, signal, forceRefresh); // Cache 1 jam
}

export async function fetchHotAnime(signal?: AbortSignal): Promise<HotAnimeResponse> {
  const cacheKey = 'hot_anime';
  return fetchWithCache<HotAnimeResponse>(API.hot, cacheKey, 3600000, signal); // Cache 1 jam
}

export async function fetchEpisodes(targetUrl: string, urls?: { samehadaku?: string; otakudesu?: string; kuronime?: string; nanime?: string }, signal?: AbortSignal): Promise<EpisodesResponse> {
  // Gunakan endpoint V2 Server-Driven (Thin Client) yang otomatis mengorkestrasi merge di backend
  const url = `${API.episodes}?url=${encodeURIComponent(targetUrl)}`;
  const cacheKey = `v2_episodes_${targetUrl}`;
  return fetchWithCache<EpisodesResponse>(url, cacheKey, 3600000, signal); // Cache 1 jam di client
}

export async function scrapeVideo(targetUrl: string, seriesTitle?: string, episodeTitle?: string, signal?: AbortSignal, urls?: string): Promise<ScrapeResponse> {
  let url = `${API.scrape}?url=${encodeURIComponent(targetUrl)}`;
  if (urls) url += `&urls=${encodeURIComponent(urls)}`;
  if (seriesTitle) url += `&series=${encodeURIComponent(seriesTitle)}`;
  if (episodeTitle) url += `&episode=${encodeURIComponent(episodeTitle)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


export interface SmartPlayResponse {
  success: boolean;
  status: 'READY' | 'UPLOADING' | 'FAILED' | 'PENDING';
  url?: string;
  message?: string;
  progress?: number;
}

export async function fetchSmartPlay(
  episodeUrl: string,
  seriesUrl?: string,
  nextEpisodeUrl?: string,
  signal?: AbortSignal,
  seriesTitle?: string,
  episodeTitle?: string,
  uniqueId?: string,
  urls?: string,
): Promise<SmartPlayResponse> {
  let url = `${API.v2Stream}?episodeUrl=${encodeURIComponent(episodeUrl)}`;
  if (seriesUrl) url += `&seriesUrl=${encodeURIComponent(seriesUrl)}`;
  if (nextEpisodeUrl) url += `&nextEpisodeUrl=${encodeURIComponent(nextEpisodeUrl)}`;
  if (seriesTitle) url += `&seriesTitle=${encodeURIComponent(seriesTitle)}`;
  if (episodeTitle) url += `&episodeTitle=${encodeURIComponent(episodeTitle)}`;
  if (uniqueId) url += `&uniqueId=${encodeURIComponent(uniqueId)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.status === 'success' && json.data) {
    return {
      success: true,
      status: json.data.stream_status || 'UPLOADING',
      url: json.data.url,
      message: json.data.message,
      progress: json.data.progress
    };
  }
  return json;
}

export async function fetchUploadStatus(episodeUrl: string, seriesUrl?: string, seriesTitle?: string, uniqueId?: string, signal?: AbortSignal): Promise<{ success: boolean; progressMessage?: string }> {
  let url = `${getApiBase()}/api/upload-status?episodeUrl=${encodeURIComponent(episodeUrl)}`;
  if (seriesUrl) url += `&seriesUrl=${encodeURIComponent(seriesUrl)}`;
  if (seriesTitle) url += `&seriesTitle=${encodeURIComponent(seriesTitle)}`;
  if (uniqueId) url += `&uniqueId=${encodeURIComponent(uniqueId)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function cancelUploads(): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/cancel-uploads`, { method: 'POST' });
  } catch (e) {
    console.error('[API] Failed to cancel uploads', e);
  }
}

export async function fetchCancelStream(url: string, seriesUrl?: string, seriesTitle?: string, uniqueId?: string): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/cancel-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, seriesUrl, seriesTitle, uniqueId })
    });
  } catch (e) {
    console.error('[API] Failed to cancel stream', e);
  }
}

export async function fetchReportBroken(url: string, seriesUrl?: string, seriesTitle?: string, uniqueId?: string, episodeTitle?: string, currentServer?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(API.v2ReportBroken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, seriesUrl, seriesTitle, uniqueId, episodeTitle, currentServer })
    });
    const json = await res.json();
    if (json && json.status === 'success') {
      return { success: true, message: json.data?.message };
    }
    return { success: false };
  } catch (e) {
    console.error('[API] Failed to report broken video to V2', e);
    return { success: false };
  }
}

// =================================================================
// QUEUE APIs
// =================================================================

export interface QueueItem {
  id: string;
  episodeUrl: string;
  seriesUrl?: string;
  seriesSlug: string;
  seriesTitle: string;
  episodeTitle: string;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: string;
  createdAt: number;
  uniqueId?: string;
}

export async function queueAdd(episodeUrl: string, seriesUrl?: string, seriesTitle?: string, episodeTitle?: string, uniqueId?: string): Promise<{ success: boolean, item?: QueueItem }> {
  const res = await fetch(`${getApiBase()}/api/queue/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episodeUrl, seriesUrl, seriesTitle, episodeTitle, uniqueId })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function queuePrioritize(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${getApiBase()}/api/queue/prioritize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function queueCancel(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${getApiBase()}/api/queue/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchQueueStatus(signal?: AbortSignal): Promise<{ success: boolean, queue: QueueItem[] }> {
  const res = await fetch(`${getApiBase()}/api/queue/status`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
