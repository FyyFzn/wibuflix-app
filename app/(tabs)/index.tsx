import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../styles/theme';
import { fetchKatalog, fetchHotAnime, AnimeItem } from '../../services/api';
import { getRiwayat, WatchHistoryItem } from '../../services/storage';
import AnimeCard from '../../components/AnimeCard';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function BerandaScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [historyList, setHistoryList] = useState<WatchHistoryItem[]>([]);
  const [hotAnime, setHotAnime] = useState<AnimeItem[]>([]);
  const [latestAnime, setLatestAnime] = useState<AnimeItem[]>([]);
  const [latestToku, setLatestToku] = useState<AnimeItem[]>([]);
  const [randomAnime, setRandomAnime] = useState<AnimeItem[]>([]);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);
  const [recommendationTitle, setRecommendationTitle] = useState('');

  // Shuffle array utility
  const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      // 1. History
      const history = await getRiwayat();
      setHistoryList(history.slice(0, 10));

      // 2. Fetch all other sections in parallel
      const randomPage = Math.floor(Math.random() * 10) + 1;
      const recPage = Math.floor(Math.random() * 5) + 1;
      const isLastWatchedToku = history.length > 0 && history[0].url.includes('neosatsu');

      if (history.length > 0) {
        setRecommendationTitle(`Karena kamu menonton ${history[0].judulSeri}`);
      } else {
        setRecommendationTitle(`Rekomendasi Spesial Buatmu`);
      }

      const [hotRes, latestAnimeRes, latestTokuRes, randomRes, recRes] = await Promise.allSettled([
        fetchHotAnime(),
        fetchKatalog(1, '', 'anime'),
        fetchKatalog(1, '', 'toku'),
        fetchKatalog(randomPage, '', 'anime'),
        fetchKatalog(recPage, '', isLastWatchedToku ? 'toku' : 'anime'),
      ]);

      if (hotRes.status === 'fulfilled') setHotAnime(hotRes.value.data.list || []);
      if (latestAnimeRes.status === 'fulfilled') setLatestAnime(latestAnimeRes.value.data.list || []);
      if (latestTokuRes.status === 'fulfilled') setLatestToku(latestTokuRes.value.data.list || []);
      if (randomRes.status === 'fulfilled') setRandomAnime(shuffle(randomRes.value.data.list || []).slice(0, 10));
      if (recRes.status === 'fulfilled') setRecommendations(shuffle(recRes.value.data.list || []).slice(0, 10));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Update history when screen is focused
      getRiwayat().then(history => {
         setHistoryList(history.slice(0, 10));
      });
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleAnimePress = (item: AnimeItem) => {
    router.push({
      pathname: '/anime/[id]',
      params: {
        id: encodeURIComponent(item.url),
        url: item.url,
        gambar: item.gambar,
        judul: item.judul,
      },
    });
  };

  const renderHistoryItem = ({ item }: { item: WatchHistoryItem }) => {
    const progressPercent = item.duration > 0 ? Math.min(100, (item.progress / item.duration) * 100) : 0;
    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/player',
          params: { url: encodeURIComponent(item.url), title: encodeURIComponent(item.judulSeri + ' - ' + item.nomorEp) }
        })}
      >
        <View style={styles.historyThumbContainer}>
          <AnimeCard gambar={item.gambar} judul="" onPress={() => {}} customStyle={{ width: 140, height: 80, marginBottom: 0 }} hideTitle />
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.historyOverlay}>
            <Text style={styles.historyEpText}>Eps {item.nomorEp}</Text>
          </View>
        </View>
        <Text style={styles.historyTitle} numberOfLines={1}>{item.judulSeri}</Text>
      </TouchableOpacity>
    );
  };

  const renderHorizontalItem = ({ item }: { item: AnimeItem }) => (
    <View style={{ width: 140, marginRight: Spacing.sm }}>
      <AnimeCard
        judul={item.judul}
        gambar={item.gambar}
        tipe={item.tipe}
        skor={item.skor}
        status={item.status}
        onPress={() => handleAnimePress(item)}
      />
    </View>
  );

  const renderSection = (title: string, data: any[], renderFn: any) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.horizontalSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          data={data}
          renderItem={renderFn}
          keyExtractor={(item, index) => item.url + index}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          removeClippedSubviews={false}
        />
      </View>
    );
  };

  if (loading && !refreshing) {
    return <LoadingOverlay message="Memuat beranda..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logoText}>
          WIBU<Text style={styles.logoAccent}>FLIX</Text>
        </Text>
      </View>
      <View style={styles.headerLine} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        {renderSection("LANJUTKAN MENONTON", historyList, renderHistoryItem)}
        {renderSection(recommendationTitle.toUpperCase(), recommendations, renderHorizontalItem)}
        {renderSection("SEDANG HANGAT 🔥", hotAnime, renderHorizontalItem)}
        {renderSection("KEJUTAN ACAK BUATMU 🎲", randomAnime, renderHorizontalItem)}
        {renderSection("ANIME TERBARU", latestAnime, renderHorizontalItem)}
        {renderSection("TOKUSATSU TERBARU", latestToku, renderHorizontalItem)}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  logoAccent: {
    color: Colors.accent,
  },
  headerLine: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  horizontalSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
  },
  historyCard: {
    width: 140,
    marginRight: Spacing.md,
  },
  historyThumbContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  historyOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyEpText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  historyTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  }
});
