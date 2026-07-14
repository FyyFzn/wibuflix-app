/**
 * Admin / Curation Endpoints — Modular Service (SRP)
 * Handles catalog search, card merging, and forcing MAL/TMDB ID metadata anchors.
 */

import { getApiBase, memoryCache } from '../apiClient';

export interface AdminCatalogItem {
  _id: string;
  title: string;
  aliases: string[];
  image: string;
  type?: string;
  score?: string;
  status?: string;
  isLocked?: boolean;
  malId?: number;
  tmdbId?: number;
  sources?: Record<string, { url?: string; id?: string }>;
  updatedAt?: string;
}

/**
 * Cari daftar anime langsung di database backend untuk keperluan penggabungan (merge).
 */
export async function adminCatalogSearch(query: string = ''): Promise<AdminCatalogItem[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/admin/catalog-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err: any) {
    console.error('[adminCatalogSearch Error]', err.message);
    throw err;
  }
}

/**
 * Gabungkan beberapa kartu duplikat ke dalam 1 kartu utama dan kunci metadatanya.
 */
export async function adminMergeAnime(primaryId: string, targetIds: string[]): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/admin/merge-anime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryId, targetIds }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    // Bersihkan cache lokal frontend setelah perubahan katalog
    memoryCache.clear();
    return json;
  } catch (err: any) {
    console.error('[adminMergeAnime Error]', err.message);
    throw err;
  }
}

/**
 * Paksa / Kunci MAL ID untuk sebuah kartu anime agar metadata, skor, dan cover sinkron dengan MAL.
 */
export async function adminForceMalId(animeId: string, malId: number | null): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/admin/force-mal-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeId, malId }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    memoryCache.clear();
    return json;
  } catch (err: any) {
    console.error('[adminForceMalId Error]', err.message);
    throw err;
  }
}

/**
 * Ubah judul kartu anime di database dan otomatis mengunci kartu (isLocked: true).
 */
export async function adminRenameAnime(animeId: string, newTitle: string): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/admin/rename-anime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeId, newTitle }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    memoryCache.clear();
    return json;
  } catch (err: any) {
    console.error('[adminRenameAnime Error]', err.message);
    throw err;
  }
}

/**
 * Paksa peremajaan / pengayaan data metadata TMDB/AniList pada 1 atau lebih kartu anime secara instan.
 */
export async function adminForceEnrichCard(animeIds: string | string[], forceOverwriteImage: boolean = false): Promise<any> {
  try {
    const ids = Array.isArray(animeIds) ? animeIds : [animeIds];
    const res = await fetch(`${getApiBase()}/api/admin/force-enrich-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animeIds: ids, forceOverwriteImage }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    memoryCache.clear();
    return json;
  } catch (err: any) {
    console.error('[adminForceEnrichCard Error]', err.message);
    throw err;
  }
}



