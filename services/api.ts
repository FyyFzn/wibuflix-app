/**
 * API Service Facade — Ported and Modularized (SRP)
 * Canonical import entry point for all API client, cache utilities, and domain endpoints.
 * All external consumers must import from this facade rather than individual endpoint modules.
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
  adminForceMalId,
  adminRenameAnime,
  adminForceEnrichCard,
  adminGetAnimeDetails,
  adminSplitUrl
} from './endpoints/adminEndpoints';


