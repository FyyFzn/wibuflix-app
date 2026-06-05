/**
 * API Service — Ported from js/api.js
 * Configurable API_BASE for VPS deployment.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Ganti dengan IP/URL VPS kamu ──────────────────────────
// Development: 'http://192.168.x.x:3000' (IP lokal PC)
// Production:  'https://api.wibuflix.com' (domain VPS)
const API_BASE = 'https://wibuflix.azurewebsites.net';

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
  url: string;
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

async function fetchWithCache<T>(url: string, cacheKey: string, ttl: number = 3600000, signal?: AbortSignal): Promise<T> {
  // 1. Cek dari memori (AsyncStorage) terlebih dahulu
  const cachedStr = await AsyncStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      // Langsung kembalikan data jika belum expired (TTL)
      if (Date.now() - parsed.timestamp < ttl) {
        // (Opsional) Refresh cache di latar belakang tanpa menunggu
        fetch(url).then(res => res.json()).then(json => {
          AsyncStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: json }));
        }).catch(() => {});
        return parsed.data as T;
      }
    } catch (e) {
      // Abaikan error parse dan lanjut nge-fetch
    }
  }

  // 2. Fetch data dari server jika tidak ada di cache / sudah expired
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  
  // 3. Simpan hasil baru ke cache
  await AsyncStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: json }));
  return json;
}

export async function fetchKatalog(page = 1, search = '', tab = 'anime', typeFilter = '', signal?: AbortSignal): Promise<KatalogResponse> {
  let url = `${API.katalog}?page=${page}&tab=${tab}`;
  if (search) url += `&s=${encodeURIComponent(search)}`;
  if (typeFilter && typeFilter !== 'Semua') url += `&typeFilter=${encodeURIComponent(typeFilter)}`;
  const cacheKey = `katalog_${page}_${search}_${tab}_${typeFilter}`;
  return fetchWithCache<KatalogResponse>(url, cacheKey, 3600000, signal); // Cache 1 jam
}

export async function fetchHotAnime(signal?: AbortSignal): Promise<HotAnimeResponse> {
  const cacheKey = 'hot_anime';
  return fetchWithCache<HotAnimeResponse>(API.hot, cacheKey, 3600000, signal); // Cache 1 jam
}

export async function fetchEpisodes(targetUrl: string, signal?: AbortSignal): Promise<EpisodesResponse> {
  const url = `${API.episodes}?url=${encodeURIComponent(targetUrl)}`;
  const cacheKey = `episodes_${targetUrl}`;
  return fetchWithCache<EpisodesResponse>(url, cacheKey, 86400000, signal); // Cache 24 jam (episode anime lawas jarang berubah)
}

export async function scrapeVideo(targetUrl: string, seriesTitle?: string, episodeTitle?: string, signal?: AbortSignal): Promise<ScrapeResponse> {
  let url = `${API.scrape}?url=${encodeURIComponent(targetUrl)}`;
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

