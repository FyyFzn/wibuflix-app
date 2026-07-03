/**
 * Anime Detail / Episode List Screen
 * Refactored modular screen using custom hooks, skeleton loading, and flatlist optimizations.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import EpisodeItemComponent from '../../components/EpisodeItem';
import DetailSkeleton from '../../components/detail/DetailSkeleton';
import MalHeaderPanel from '../../components/detail/MalHeaderPanel';
import ResumeWatchBanner from '../../components/detail/ResumeWatchBanner';
import EpisodeFilterBar from '../../components/detail/EpisodeFilterBar';
import { useAnimeDetailData } from '../../hooks/useAnimeDetailData';
import { WatchHistoryItem } from '../../services/storage';

export default function AnimeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; gambar: string; judul: string; sources?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const {
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
    retry,
  } = useAnimeDetailData(params.url || '', params.judul || '', params.gambar || '', params.sources);

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

  const handleEpisodePress = useCallback((realUrl: string, urlsJson: string, judul: string) => {
    router.push({
      pathname: '/player',
      params: {
        url: realUrl,
        urls: urlsJson,
        seriUrls: seriUrlsJson,
        sources: params.sources,
        gambar: coverImage,
        seriUrl: params.url,
        judul: judul,
        seriJudul: judulSeri,
        autoPlayHost: lastWatched?.host || '',
        uniqueId: malInfo?.malId ? `mal-${malInfo.malId}` : undefined,
      },
    });
  }, [params.url, params.sources, coverImage, judulSeri, malInfo, seriUrlsJson, lastWatched, router]);

  const handleResumePress = useCallback((item: WatchHistoryItem) => {
    router.push({
      pathname: '/player',
      params: {
        url: item.url,
        seriUrls: seriUrlsJson,
        sources: params.sources,
        gambar: item.gambar,
        seriUrl: item.seriUrl,
        seriJudul: item.judulSeri,
        judul: item.nomorEp ? `${item.judulSeri} Episode ${item.nomorEp}` : item.judulSeri,
        autoPlayHost: item.host || '',
        uniqueId: malInfo?.malId ? `mal-${malInfo.malId}` : undefined,
      },
    });
  }, [seriUrlsJson, params.sources, malInfo, router]);

  if (loading && episodes.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Detail Anime' }} />
        <View style={styles.container}>
          <DetailSkeleton />
        </View>
      </>
    );
  }

  if (error && episodes.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Detail Anime' }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Detail Anime' }} />
      <FlatList
        style={styles.container}
        data={filteredEpisodes}
        keyExtractor={(item, index) =>
          item.num != null
            ? `ep_${item.num}`
            : (item.url || item.urls?.samehadaku || item.urls?.otakudesu || item.urls?.kuronime || item.urls?.neosatsu || `idx_${index}`)
        }
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const realEpUrl = item.url || item.urls?.samehadaku || item.urls?.otakudesu || item.urls?.kuronime || item.urls?.neosatsu || '';
          const urlsJson = item.urls ? JSON.stringify(item.urls) : '';
          const isQueued = queuedUrls.has(realEpUrl);
          const prog = progressMap[realEpUrl];
          const progressPercent = prog?.duration > 0 ? Math.min((prog.progress / prog.duration) * 100, 100) : 0;

          return (
            <EpisodeItemComponent
              realUrl={realEpUrl}
              urlsJson={urlsJson}
              judul={item.judul}
              tanggal={item.tanggal}
              malJudul={item.malJudul}
              isQueued={isQueued}
              progressPercent={progressPercent}
              onPress={handleEpisodePress}
              onQueuePress={handleQueuePress}
            />
          );
        }}
        ListHeaderComponent={
          <View>
            <MalHeaderPanel
              malInfo={malInfo}
              coverImage={coverImage}
              judulSeri={judulSeri}
            />

            <ResumeWatchBanner
              lastWatched={lastWatched}
              onPress={handleResumePress}
            />

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Daftar Episode</Text>
            </View>

            <EpisodeFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortOrder={sortOrder}
              onToggleSort={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Tidak ada episode yang ditemukan.</Text>
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
  listHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textDim,
  },
});
