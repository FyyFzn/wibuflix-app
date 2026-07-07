import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchEpisodes, EpisodeItem, MalInfo, fetchQueueStatus, queueAdd } from '../services/api';
import { getRiwayat, getAllProgressMap, EpisodeProgress, WatchHistoryItem } from '../services/storage';
import { useAnimeStore } from '../store/animeStore';
import { ToastAndroid } from 'react-native';
import { cleanSeriesTitle } from '../utils/titleUtils';

export function useAnimeDetailData(url: string, initialJudul: string, initialGambar: string, sourcesParam?: string) {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [malInfo, setMalInfo] = useState<MalInfo | null>(null);
  const [judulSeri, setJudulSeri] = useState(() => cleanSeriesTitle(initialJudul));
  const [coverImage, setCoverImage] = useState(initialGambar);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queuedUrls, setQueuedUrls] = useState<Set<string>>(new Set());

  const [progressMap, setProgressMap] = useState<Record<string, EpisodeProgress>>({});
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);

  const selectedAnime = useAnimeStore((state) => state.selectedAnime);

  const { urlsObj, seriUrlsJson } = useMemo(() => {
    let uObj: any = undefined;
    if (selectedAnime && selectedAnime.sources && selectedAnime.url === url) {
      const otakuId = selectedAnime.sources.otakudesu?.id;
      const otakuUrl = selectedAnime.sources.otakudesu?.url;
      uObj = {
        samehadaku: selectedAnime.sources.samehadaku?.url || undefined,
        otakudesu: (otakuId && otakuId !== 'null' && otakuId !== 'undefined') ? `/anime/${otakuId}` : (otakuUrl || undefined),
        kuronime: selectedAnime.sources.kuronime?.url || undefined,
        nanime: selectedAnime.sources.nanime?.url || undefined,
      };
    }
    return {
      urlsObj: uObj,
      seriUrlsJson: uObj ? JSON.stringify(uObj) : sourcesParam,
    };
  }, [selectedAnime, url, sourcesParam]);

  const loadData = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setJudulSeri(cleanSeriesTitle(initialJudul));
    setCoverImage(initialGambar);

    try {
      const [json, queueRes] = await Promise.all([
        fetchEpisodes(url, urlsObj),
        fetchQueueStatus().catch(() => ({ success: false, queue: [] })),
      ]);

      if (json.status !== 'success') throw new Error('Gagal memuat daftar episode');

      const data = json.data;
      setJudulSeri(cleanSeriesTitle(data.judul_seri || initialJudul));
      setEpisodes(data.daftar_episode || []);
      setMalInfo(data.mal || null);

      if (data.mal?.cover) {
        setCoverImage(data.mal.cover);
      } else if (data.cover_scraper) {
        setCoverImage(data.cover_scraper);
      }

      if (queueRes.success && queueRes.queue) {
        const qUrls = new Set<string>();
        queueRes.queue.forEach((q: any) => qUrls.add(q.episodeUrl));
        setQueuedUrls(qUrls);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail anime');
    } finally {
      setLoading(false);
    }
  }, [url, urlsObj, initialJudul]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadProgress = async () => {
        const pm = await getAllProgressMap();
        if (!isActive) return;
        setProgressMap(pm);

        const riwayat = await getRiwayat();
        const historyItem = riwayat.find(r => r.seriUrl === url);
        if (historyItem && isActive) {
          setLastWatched(historyItem);
        }
      };
      loadProgress();
      return () => { isActive = false; };
    }, [url])
  );

  const handleQueuePress = useCallback(async (realUrl: string, judul: string) => {
    try {
      if (!realUrl) {
        ToastAndroid.show('Link episode tidak tersedia', ToastAndroid.SHORT);
        return;
      }
      ToastAndroid.show('Menambahkan ke antrean...', ToastAndroid.SHORT);
      const uniqueId = malInfo?.malId ? `mal-${malInfo.malId}` : undefined;
      const res = await queueAdd(realUrl, url, judulSeri, judul, uniqueId);
      if (res.success) {
        setQueuedUrls(prev => {
          const next = new Set(prev);
          next.add(realUrl);
          return next;
        });
        ToastAndroid.show('Berhasil dimasukkan ke antrean cloud!', ToastAndroid.LONG);
      }
    } catch (e) {
      console.error(e);
      ToastAndroid.show('Gagal memasukkan ke antrean', ToastAndroid.SHORT);
    }
  }, [url, judulSeri, malInfo]);

  return {
    episodes,
    malInfo,
    judulSeri,
    coverImage,
    loading,
    error,
    queuedUrls,
    progressMap,
    lastWatched,
    seriUrlsJson,
    handleQueuePress,
    retry: loadData,
  };
}
