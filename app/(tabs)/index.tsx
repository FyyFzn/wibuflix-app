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
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../styles/theme';
import { fetchKatalog, fetchHotAnime, AnimeItem } from '../../services/api';
import AnimeCard from '../../components/AnimeCard';
import LoadingOverlay from '../../components/LoadingOverlay';
import SearchBar from '../../components/SearchBar';
import CatalogView from '../../components/CatalogView';

export default function BerandaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [hotAnime, setHotAnime] = useState<AnimeItem[]>([]);
  const [latestAnime, setLatestAnime] = useState<AnimeItem[]>([]);
  const [latestToku, setLatestToku] = useState<AnimeItem[]>([]);
  const [randomAnime, setRandomAnime] = useState<AnimeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Shuffle array utility
  const shuffle = (array: any[]) => array.sort(() => 0.5 - Math.random());

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const randomAnimePage = Math.floor(Math.random() * 20) + 1;
      const randomTokuPage = Math.floor(Math.random() * 2) + 1;

      const [hotRes, latestAnimeRes, latestTokuRes, randomAnimeRes, randomTokuRes] = await Promise.allSettled([
        fetchHotAnime(),
        fetchKatalog(1, '', 'anime'),
        fetchKatalog(1, '', 'toku'),
        fetchKatalog(randomAnimePage, '', 'anime'),
        fetchKatalog(randomTokuPage, '', 'toku'),
      ]);

      if (hotRes.status === 'fulfilled') setHotAnime(hotRes.value.data.list || []);
      if (latestAnimeRes.status === 'fulfilled') setLatestAnime(latestAnimeRes.value.data.list || []);
      if (latestTokuRes.status === 'fulfilled') setLatestToku(latestTokuRes.value.data.list || []);
      
      let randomMixed: AnimeItem[] = [];
      if (randomAnimeRes.status === 'fulfilled') randomMixed = [...randomMixed, ...(randomAnimeRes.value.data.list || [])];
      if (randomTokuRes.status === 'fulfilled') randomMixed = [...randomMixed, ...(randomTokuRes.value.data.list || [])];
      
      setRandomAnime(shuffle(randomMixed).slice(0, 10));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to tab press to clear search
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      // If we are currently searching, clear the search and return to normal view
      if (searchQuery) {
        setSearchQuery('');
      }
    });
    return unsubscribe;
  }, [navigation, searchQuery]);

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

  const renderHorizontalItem = ({ item }: { item: AnimeItem }) => (
    <View style={{ width: 140, marginRight: Spacing.sm }}>
      <AnimeCard
        judul={item.judul}
        gambar={item.gambar}
        tipe={item.tipe}
        skor={item.skor}
        status={item.status}
        onPress={() => handleAnimePress(item)}
        customStyle={{ width: '100%', marginBottom: 0 }}
      />
    </View>
  );

  const renderHotItem = ({ item }: { item: AnimeItem }) => (
    <View style={{ width: 140, marginRight: Spacing.sm }}>
      <AnimeCard
        judul={item.judul}
        gambar={item.gambar}
        tipe={item.tipe}
        skor={item.skor}
        onPress={() => handleAnimePress(item)}
        customStyle={{ width: '100%', marginBottom: 0 }}
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

      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <SearchBar onSearch={setSearchQuery} />
      </View>

      {searchQuery ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>
              Hasil pencarian: <Text style={{ color: Colors.accent }}>"{searchQuery}"</Text>
            </Text>
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Tutup (X)</Text>
            </TouchableOpacity>
          </View>
          <CatalogView category="all" externalSearchQuery={searchQuery} hideSearchBar={true} onClearSearch={() => setSearchQuery('')} />
        </View>
      ) : (
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
        {renderSection("SEDANG HANGAT 🔥", hotAnime, renderHotItem)}
        {renderSection("KEJUTAN ACAK BUATMU 🎲", randomAnime, renderHorizontalItem)}
        {renderSection("ANIME TERBARU", latestAnime, renderHorizontalItem)}
        {renderSection("TOKUSATSU TERBARU", latestToku, renderHorizontalItem)}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}
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
