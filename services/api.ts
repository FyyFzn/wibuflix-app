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
  episodes: `${API_BASE}/api/episodes`,
  scrape: `${API_BASE}/api/scrape`,
  resolve: `${API_BASE}/api/resolve`,
  extractVideo: `${API_BASE}/api/extract-video`,
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
  url?: string; // Untuk backward compatibility
  urls?: { samehadaku?: string; otakudesu?: string; neosatsu?: string; kuronime?: string };
  tanggal: string;
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

export interface ResolveResponse {
  status: string;
  data: {
    iframeUrl: string;
    namaHost: string;
  };
}

export interface ExtractVideoResponse {
  success: boolean;
  url?: string;
  message?: string;
  headers?: Record<string, string>;
}

// ── API Functions ──────────────────────────────────────────

// Memori cache untuk performa (mengurangi block I/O pada AsyncStorage)
const memoryCache = new Map<string, { timestamp: number; data: any }>();

async function fetchWithCache<T>(url: string, cacheKey: string, ttl: number = 3600000, signal?: AbortSignal, forceRefresh: boolean = false): Promise<T> {
  // 1. Cek dari memori (RAM) terlebih dahulu jika tidak dipaksa refresh
  if (!forceRefresh) {
    const memData = memoryCache.get(cacheKey);
    if (memData && Date.now() - memData.timestamp < ttl) {
      return memData.data as T;
    }

    // 2. Fallback cek dari disk (AsyncStorage)
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        // Langsung kembalikan data jika belum expired (TTL)
        if (Date.now() - parsed.timestamp < ttl) {
          // Simpan ke memori cache
          memoryCache.set(cacheKey, { timestamp: parsed.timestamp, data: parsed.data });
          
          // (Opsional) Refresh cache di latar belakang tanpa menunggu
          fetch(url).then(res => res.json()).then(json => {
            const freshData = { timestamp: Date.now(), data: json };
            memoryCache.set(cacheKey, freshData);
            AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
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
  
  // 3. Simpan hasil baru ke cache memori dan disk
  const newData = { timestamp: Date.now(), data: json };
  memoryCache.set(cacheKey, newData);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(newData));
  return json;
}

export async function fetchKatalog(page = 1, search = '', tab = 'all', typeFilter = '', genreFilter = '', signal?: AbortSignal, forceRefresh = false): Promise<KatalogResponse> {
  let url = `${API.katalog}?page=${page}&tab=${tab}`;
  if (search) url += `&s=${encodeURIComponent(search)}`;
  if (typeFilter && typeFilter !== 'Semua') url += `&typeFilter=${encodeURIComponent(typeFilter)}`;
  if (genreFilter && genreFilter !== 'Semua') url += `&genre=${encodeURIComponent(genreFilter)}`;
  const cacheKey = `katalog_${page}_${search}_${tab}_${typeFilter}_${genreFilter}`;
  return fetchWithCache<KatalogResponse>(url, cacheKey, 3600000, signal, forceRefresh); // Cache 1 jam
}

export async function fetchHotAnime(signal?: AbortSignal): Promise<HotAnimeResponse> {
  const cacheKey = 'hot_anime';
  return fetchWithCache<HotAnimeResponse>(API.hot, cacheKey, 3600000, signal); // Cache 1 jam
}

export async function fetchEpisodes(targetUrl: string, urls?: { samehadaku?: string; otakudesu?: string; kuronime?: string }, signal?: AbortSignal): Promise<EpisodesResponse> {
  let url = `${API.episodes}?url=${encodeURIComponent(targetUrl)}`;
  let cacheKey = `episodes_${targetUrl}`;
  
  if (urls && (urls.samehadaku || urls.otakudesu || urls.kuronime)) {
    url = `${API.episodes}?`;
    if (urls.samehadaku) url += `urlSamehadaku=${encodeURIComponent(urls.samehadaku)}&`;
    if (urls.otakudesu) url += `urlOtakudesu=${encodeURIComponent(urls.otakudesu)}&`;
    if (urls.kuronime) url += `urlKuronime=${encodeURIComponent(urls.kuronime)}&`;
    url = url.replace(/&$/, ''); // remove trailing ampersand
    
    cacheKey = `episodes_merged_${urls.samehadaku || ''}_${urls.otakudesu || ''}_${urls.kuronime || ''}`;
  }
  
  return fetchWithCache<EpisodesResponse>(url, cacheKey, 86400000, signal); // Cache 24 jam
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

export async function resolveServer(targetUrl: string, nume: string, signal?: AbortSignal): Promise<ResolveResponse> {
  const res = await fetch(`${API.resolve}?url=${encodeURIComponent(targetUrl)}&nume=${nume}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function extractVideoUrl(embedUrl: string, signal?: AbortSignal): Promise<ExtractVideoResponse> {
  const res = await fetch(`${API.extractVideo}?url=${encodeURIComponent(embedUrl)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface SmartPlayResponse {
  success: boolean;
  status: 'READY' | 'UPLOADING' | 'FAILED';
  url?: string;
  message?: string;
}

export async function fetchSmartPlay(
  episodeUrl: string,
  seriesUrl?: string,
  nextEpisodeUrl?: string,
  signal?: AbortSignal,
  seriesTitle?: string,
  episodeTitle?: string,
  uniqueId?: string,
): Promise<SmartPlayResponse> {
  let url = `${getApiBase()}/api/smart-play?episodeUrl=${encodeURIComponent(episodeUrl)}`;
  if (seriesUrl) url += `&seriesUrl=${encodeURIComponent(seriesUrl)}`;
  if (nextEpisodeUrl) url += `&nextEpisodeUrl=${encodeURIComponent(nextEpisodeUrl)}`;
  if (seriesTitle) url += `&seriesTitle=${encodeURIComponent(seriesTitle)}`;
  if (episodeTitle) url += `&episodeTitle=${encodeURIComponent(episodeTitle)}`;
  if (uniqueId) url += `&uniqueId=${encodeURIComponent(uniqueId)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
