/**
 * API Service Facade — Ported and Modularized (SRP)
 * Re-exports core API client, cache utilities, and domain-specific endpoints.
 */

export { getApiBase, API, memoryCache, isCacheValid, fetchWithCache } from './apiClient';

export {
  AnimeItem,
  KatalogResponse,
  HotAnimeResponse,
  EpisodeItem,
  MalInfo,
  EpisodesResponse,
  ServerItem,
  fetchKatalog,
  fetchHotAnime
} from './endpoints/catalogEndpoints';

export {
  ScrapeResponse,
  SmartPlayResponse,
  fetchEpisodes,
  scrapeVideo,
  fetchSmartPlay,
  fetchUploadStatus,
  cancelUploads,
  fetchCancelStream,
  fetchReportBroken
} from './endpoints/streamEndpoints';

export {
  QueueItem,
  queueAdd,
  queuePrioritize,
  queueCancel,
  fetchQueueStatus
} from './endpoints/queueEndpoints';

export {
  AdminCatalogItem,
  adminCatalogSearch,
  adminMergeAnime,
  adminForceMalId
} from './endpoints/adminEndpoints';

