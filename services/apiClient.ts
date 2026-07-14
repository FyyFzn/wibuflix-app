/**
 * API Client & Cache Engine — Base URL configuration and LRU Memory/Disk Cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://api.wibuflix.me';

export function getApiBase(): string {
  return API_BASE;
}

export const API = {
  katalog: `${API_BASE}/api/katalog`,
  episodes: `${API_BASE}/api/v2/episodes`,
  v2Stream: `${API_BASE}/api/v2/stream`,
  v2ReportBroken: `${API_BASE}/api/v2/stream/report-broken`,
  scrape: `${API_BASE}/api/scrape`,
  hot: `${API_BASE}/api/hot`,
};

class LRUMemoryCache<K, V extends { timestamp: number }> {
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
    } else {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > 3600000) {
          this.cache.delete(k);
        }
      }
      if (this.cache.size >= this.max) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new LRUMemoryCache<string, { timestamp: number; data: any }>(50);

export function isCacheValid(data: any): boolean {
  if (!data || data.status === 'error') return false;
  const payload = data.data || data;
  if (Array.isArray(payload.list) && payload.list.length === 0) return false;
  if (Array.isArray(payload.daftar_episode) && payload.daftar_episode.length === 0) return false;
  if (Array.isArray(payload.episodes) && payload.episodes.length === 0) return false;
  if (Array.isArray(payload.servers) && payload.servers.length === 0) return false;
  return true;
}

export async function fetchWithCache<T>(url: string, cacheKey: string, ttl: number = 3600000, signal?: AbortSignal, forceRefresh: boolean = false): Promise<T> {
  if (!forceRefresh) {
    const memData = memoryCache.get(cacheKey);
    if (memData && Date.now() - memData.timestamp < ttl && isCacheValid(memData.data)) {
      return memData.data as T;
    }

    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (Date.now() - parsed.timestamp < ttl && isCacheValid(parsed.data)) {
          memoryCache.set(cacheKey, { timestamp: parsed.timestamp, data: parsed.data });
          
          fetch(url).then(res => res.json()).then(json => {
            if (isCacheValid(json)) {
              const freshData = { timestamp: Date.now(), data: json };
              memoryCache.set(cacheKey, freshData);
              AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
            }
          }).catch(() => {});
          return parsed.data as T;
        }
      } catch (e) {}
    }
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  
  if (isCacheValid(json)) {
    const newData = { timestamp: Date.now(), data: json };
    memoryCache.set(cacheKey, newData);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(newData));
  }
  return json;
}
