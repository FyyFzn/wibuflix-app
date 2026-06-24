/**
 * Anime Detail / Episode List Screen
 * Shows MAL info panel and episode list with search & sort.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  BackHandler,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect, Stack } from 'expo-router';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import { fetchEpisodes, EpisodeItem as EpisodeItemType, MalInfo, queueAdd, fetchQueueStatus } from '../../services/api';
import { getRiwayat, getAllProgressMap, EpisodeProgress, WatchHistoryItem } from '../../services/storage';
import EpisodeItemComponent from '../../components/EpisodeItem';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAnimeStore } from '../../store/animeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AnimeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; gambar: string; judul: string; sources?: string }>();

  const [episodes, setEpisodes] = useState<EpisodeItemType[]>([]);
  const [malInfo, setMalInfo] = useState<MalInfo | null>(null);
  const [judulSeri, setJudulSeri] = useState(params.judul || '');
  const [coverImage, setCoverImage] = useState(params.gambar || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [epsSearch, setEpsSearch] = useState('');
  const [queuedUrls, setQueuedUrls] = useState<Set<string>>(new Set());

  const [progressMap, setProgressMap] = useState<Record<string, EpisodeProgress>>({});
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);

  useEffect(() => {
    loadEpisodes();
  }, [params.url, params.sources]);

  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        const pm = await getAllProgressMap();
        setProgressMap(pm);

        const riwayat = await getRiwayat();
        const historyItem = riwayat.find(r => r.seriUrl === params.url);
        if (historyItem) {
          setLastWatched(historyItem);
        }
      };
      loadProgress();
    }, [params.url])
  );

  const navigation = useNavigation();



  const loadEpisodes = async () => {
    if (!params.url) return;
    setLoading(true);
    setError(null);

    try {
      const selectedAnime = useAnimeStore.getState().selectedAnime;
      let urlsObj = undefined;

      // Jika ada data sources di Zustand store (dan pastikan url-nya cocok untuk menghindari bug state nyangkut)
      if (selectedAnime && selectedAnime.sources && selectedAnime.url === params.url) {
        if (selectedAnime.sources.samehadaku && selectedAnime.sources.otakudesu) {
          urlsObj = {
            samehadaku: selectedAnime.sources.samehadaku.url,
            otakudesu: `/anime/${selectedAnime.sources.otakudesu.id}`
          };
        }
      }

      // --- Client-Side Stale-While-Revalidate ---
      try {
        let cacheKey = `episodes_${params.url}`;
        if (urlsObj && urlsObj.samehadaku && urlsObj.otakudesu) {
          cacheKey = `episodes_merged_${urlsObj.samehadaku}_${urlsObj.otakudesu}`;
        }
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          // parsed.data here comes from fetchWithCache structure { timestamp, data }
          if (parsed && parsed.data && parsed.data.status === 'success') {
            const cachedData = parsed.data.data;
            setJudulSeri(cachedData.judul_seri || params.judul || '');
            setEpisodes(cachedData.daftar_episode || []);
            setMalInfo(cachedData.mal || null);

            if (cachedData.mal?.cover) {
              setCoverImage(cachedData.mal.cover);
            } else if (cachedData.cover_scraper) {
              setCoverImage(cachedData.cover_scraper);
            }

            // Turn off loading instantly!
            setLoading(false);
          }
        }
      } catch (e) {
        // Ignore cache read errors
      }

      // Mulai fetchEpisodes dan fetchQueueStatus secara bersamaan untuk mempercepat loading
      const [json, queueRes] = await Promise.all([
        fetchEpisodes(params.url, urlsObj),
        fetchQueueStatus().catch(() => ({ success: false, queue: [] }))
      ]);

      if (json.status !== 'success') throw new Error('Gagal memuat');

      const data = json.data;
      setJudulSeri(data.judul_seri);
      setEpisodes(data.daftar_episode || []);
      setMalInfo(data.mal || null);

      if (queueRes.success && queueRes.queue) {
        const qUrls = new Set<string>();
        queueRes.queue.forEach((q: any) => qUrls.add(q.episodeUrl));
        setQueuedUrls(qUrls);
      }

      let finalCover = params.gambar || '';
      if (data.mal?.cover) {
        setCoverImage(data.mal.cover);
        finalCover = data.mal.cover;
      } else if (data.cover_scraper) {
        setCoverImage(data.cover_scraper);
        finalCover = data.cover_scraper;
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar episode');
    } finally {
      setLoading(false);
    }
  };

  const filteredEpisodes = useMemo(() => {
    let list = [...episodes];
    if (searchQuery) {
      list = list.filter(e => e.judul.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (sortOrder === 'asc') {
      list = list.reverse();
    }
    return list;
  }, [episodes, searchQuery, sortOrder]);

  const handleEpisodePress = useCallback(async (realUrl: string, urlsJson: string, judul: string) => {
    const riwayat = await getRiwayat();
    const historyItem = riwayat.find(r => r.seriUrl === params.url);
    const host = historyItem?.host || '';

    router.push({
      pathname: '/player',
      params: {
        url: realUrl,
        urls: urlsJson,
        gambar: coverImage,
        seriUrl: params.url,
        judul: judul,
        seriJudul: judulSeri,
        autoPlayHost: host,
        uniqueId: malInfo?.malId ? `mal-${malInfo.malId}` : undefined
      },
    });
  }, [params.url, coverImage, judulSeri, malInfo]);

  const handleQueuePress = useCallback(async (realUrl: string, judul: string) => {
    try {
      if (!realUrl) {
        ToastAndroid.show('Link episode tidak tersedia', ToastAndroid.SHORT);
        return;
      }
      ToastAndroid.show('Menambahkan ke antrean...', ToastAndroid.SHORT);
      const uniqueId = malInfo?.malId ? `mal-${malInfo.malId}` : undefined;
      const res = await queueAdd(realUrl, params.url as string, judulSeri, judul, uniqueId);
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
  }, [params.url, judulSeri, malInfo]);

  // Remove full-screen loading overlay to make screen responsive instantly

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadEpisodes()}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <>
      <Stack.Screen options={{ title: 'Detail Anime' }} />
      <FlatList
        style={styles.container}
        data={filteredEpisodes}
        keyExtractor={(item, index) => (item.url || item.urls?.samehadaku || item.urls?.otakudesu || item.urls?.kuronime || item.urls?.neosatsu || '') + index.toString()}
        renderItem={({ item }) => {
          const realEpUrl = item.url || item.urls?.samehadaku || item.urls?.otakudesu || item.urls?.kuronime || item.urls?.neosatsu || '';
          const urlsJson = item.urls ? JSON.stringify(item.urls) : '';
          const isQueued = queuedUrls.has(realEpUrl);

          return (
            <EpisodeItemComponent
              realUrl={realEpUrl}
              urlsJson={urlsJson}
              judul={item.judul}
              tanggal={item.tanggal}
              malJudul={item.malJudul}
              isQueued={isQueued}
              progressPercent={progressMap[realEpUrl]?.duration > 0 ? Math.min((progressMap[realEpUrl].progress / progressMap[realEpUrl].duration) * 100, 100) : 0}
              onPress={handleEpisodePress}
              onQueuePress={handleQueuePress}
            />
          );
        }}
        ListHeaderComponent={
          <View>
            {/* MAL Panel */}
            {malInfo ? (
              <View style={styles.malPanel}>
                <View style={styles.malPanelBorder} />
                <Image source={{ uri: coverImage }} style={styles.malCover} />
                <View style={styles.malInfo}>
                  <Text style={styles.malTitle}>{judulSeri}</Text>

                  {/* Meta tags */}
                  <View style={styles.malMeta}>
                    {malInfo.malScore && (
                      <View style={styles.scoreBadge}>
                        <Text style={styles.starChar}>★</Text>
                        <Text style={styles.scoreValue}>{malInfo.malScore}</Text>
                      </View>
                    )}
                    {malInfo.status && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{malInfo.status}</Text>
                      </View>
                    )}
                    {malInfo.year && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{malInfo.year}</Text>
                      </View>
                    )}
                    {malInfo.episodes && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{malInfo.episodes} Eps</Text>
                      </View>
                    )}
                  </View>

                  {/* Genres */}
                  <View style={styles.genresContainer}>
                    {malInfo.genres.map((g, i) => (
                      <View key={i} style={styles.genreChip}>
                        <Text style={styles.genreText}>{g}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Synopsis */}
                  {malInfo.synopsis && (
                    <>
                      <Text
                        style={styles.synopsis}
                        numberOfLines={synopsisExpanded ? undefined : 3}
                      >
                        {malInfo.synopsis}
                      </Text>
                      <TouchableOpacity onPress={() => setSynopsisExpanded(!synopsisExpanded)}>
                        <Text style={styles.toggleSynopsis}>
                          {synopsisExpanded ? 'Sembunyikan sinopsis ▴' : 'Tampilkan sinopsis ▾'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Studios */}
                  {malInfo.studios && malInfo.studios.length > 0 && (
                    <Text style={styles.studios}>🎬 {malInfo.studios.join(', ')}</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.malPanel}>
                <View style={styles.malPanelBorder} />
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={styles.malCover} />
                ) : (
                  <View style={styles.malCover} />
                )}
                <View style={styles.malInfo}>
                  <Text style={styles.malTitle}>{judulSeri}</Text>
                  {loading ? (
                    <Text style={{ color: Colors.textMuted, marginTop: Spacing.sm }}>
                      Memuat informasi detail & episode...
                    </Text>
                  ) : (
                    <Text style={{ color: Colors.textMuted, marginTop: Spacing.sm }}>
                      Informasi detail tidak tersedia.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Resume Button */}
            {lastWatched && (
              <View style={styles.resumeContainer}>
                <TouchableOpacity
                  style={styles.resumeBtn}
                  onPress={() => {
                    router.push({
                      pathname: '/player',
                      params: {
                        url: lastWatched.url,
                        gambar: lastWatched.gambar,
                        seriUrl: lastWatched.seriUrl,
                        seriJudul: lastWatched.judulSeri,
                        judul: lastWatched.nomorEp ? `${lastWatched.judulSeri} Episode ${lastWatched.nomorEp}` : lastWatched.judulSeri,
                        autoPlayHost: lastWatched.host || '',
                        uniqueId: malInfo?.malId ? `mal-${malInfo.malId}` : undefined,
                      },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resumeBtnText}>
                    ▶ Lanjutkan Menonton {lastWatched.nomorEp ? `Episode ${lastWatched.nomorEp}` : ''}
                  </Text>
                  {lastWatched.duration > 0 && (
                    <View style={styles.resumeProgressBg}>
                      <View style={[styles.resumeProgressFill, { width: `${Math.min((lastWatched.progress / lastWatched.duration) * 100, 100)}%` }]} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Daftar Episode</Text>
            </View>

            {/* Episode controls */}
            <View style={styles.epsControls}>
              <TextInput
                style={styles.epsSearch}
                placeholder="Cari episode..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <Text style={styles.sortText}>
                  {sortOrder === 'desc' ? 'Terbaru ↑' : 'Terlama ↓'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={[styles.emptyText, { marginTop: Spacing.md }]}>Mengambil daftar episode...</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>Tidak ada episode yang ditemukan.</Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  errorText: {
    color: Colors.accent,
    fontSize: FontSize.base,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    textAlign: 'center',
  },

  // ── MAL Panel ──
  malPanel: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  malPanelBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: Colors.accent,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  malCover: {
    width: 100,
    aspectRatio: 2 / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  malInfo: {
    flex: 1,
    gap: Spacing.sm + 2,
  },
  malTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 22,
  },
  malMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.starBg,
    borderWidth: 1,
    borderColor: Colors.starBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  starChar: {
    color: Colors.star,
    fontSize: FontSize.base,
  },
  scoreValue: {
    color: Colors.star,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  tag: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genreChip: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  genreText: {
    color: Colors.accent2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  synopsis: {
    color: Colors.textDim,
    fontSize: FontSize.md,
    lineHeight: 21,
  },
  toggleSynopsis: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  studios: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },

  // ── Fallback title ──
  fallbackTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  titleBorder: {
    width: 3,
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  fallbackTitleText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },

  // ── Resume Watch ──
  resumeContainer: {
    marginBottom: Spacing.xl,
  },
  resumeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  resumeBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  resumeProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  resumeProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    opacity: 0.8,
  },

  // ── Episode controls ──
  epsControls: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  epsSearch: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 1,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    color: Colors.text,
    fontSize: FontSize.base,
  },
  sortBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 1,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
  },
  sortText: {
    color: Colors.textDim,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // ── Source Picker ──
  sourcePickerContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 2,
  },
  sourcePickerLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sourceBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  sourceBtnActive: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderColor: Colors.accent,
  },
  sourceBtnText: {
    color: Colors.textDim,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  sourceBtnTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  listHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textDim,
  },
});
