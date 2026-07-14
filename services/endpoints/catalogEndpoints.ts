import { API, fetchWithCache } from '../apiClient';

export interface AnimeItem {
  judul: string;
  url: string;
  gambar: string;
  gambarScraper?: string;
  tipe: string;
  skor: string;
  status: string;
  id?: string;
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
  url?: string;
  urls?: Record<string, string>;
  tanggal?: string;
  malJudul?: string;
}

export interface MalInfo {
  malId: number | null;
  malUrl?: string | null;
  malScore: string | null;
  malRank?: number | null;
  genres: string[];
  synopsis: string | null;
  episodes: number | null;
  status: string;
  studios?: string[];
  year: number | null;
  rating?: string | null;
  cover: string;
  coverWebp?: string | null;
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

export async function fetchKatalog(page = 1, search = '', tab = 'all', typeFilter = '', genreFilter = '', signal?: AbortSignal, forceRefresh = false, sort = 'az'): Promise<KatalogResponse> {
  let url = `${API.katalog}?page=${page}&tab=${tab}&sort=${sort}`;
  if (search) url += `&s=${encodeURIComponent(search)}`;
  if (typeFilter && typeFilter !== 'Semua') url += `&typeFilter=${encodeURIComponent(typeFilter)}`;
  if (genreFilter && genreFilter !== 'Semua') url += `&genre=${encodeURIComponent(genreFilter)}`;
  const cacheKey = `katalog_${page}_${search}_${tab}_${typeFilter}_${genreFilter}_${sort}`;
  return fetchWithCache<KatalogResponse>(url, cacheKey, 3600000, signal, forceRefresh);
}

export async function fetchHotAnime(signal?: AbortSignal): Promise<HotAnimeResponse> {
  const cacheKey = 'hot_anime';
  return fetchWithCache<HotAnimeResponse>(API.hot, cacheKey, 3600000, signal);
}
