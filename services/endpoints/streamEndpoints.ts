import { API, fetchWithCache, getApiBase } from '../apiClient';
import { EpisodesResponse, ServerItem } from './catalogEndpoints';

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

export interface SmartPlayResponse {
  success: boolean;
  status: 'READY' | 'UPLOADING' | 'FAILED' | 'PENDING';
  url?: string;
  message?: string;
  progress?: number;
  nav_prev?: string | null;
  nav_next?: string | null;
  servers?: ServerItem[];
  judul?: string;
}

export async function fetchEpisodes(targetUrl: string, urls?: Record<string, string>, signal?: AbortSignal): Promise<EpisodesResponse> {
  let url = `${API.episodes}?url=${encodeURIComponent(targetUrl)}`;
  if (urls) {
    Object.keys(urls).forEach(key => {
      if (urls[key]) url += `&url${key.charAt(0).toUpperCase() + key.slice(1)}=${encodeURIComponent(urls[key])}`;
    });
  }
  const cacheKey = `v2_episodes_${targetUrl}`;
  return fetchWithCache<EpisodesResponse>(url, cacheKey, 3600000, signal);
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
  if (urls) url += `&urls=${encodeURIComponent(urls)}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.status === 'success' && json.data) {
    return {
      success: true,
      status: json.data.stream_status || 'UPLOADING',
      url: json.data.url,
      message: json.data.message,
      progress: json.data.progress,
      nav_prev: json.data.nav_prev || null,
      nav_next: json.data.nav_next || null,
      servers: json.data.servers || [],
      judul: json.data.judul
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

export async function cancelUploads(url?: string, seriesUrl?: string, seriesTitle?: string, uniqueId?: string): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/cancel-uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, seriesUrl, seriesTitle, uniqueId })
    });
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
