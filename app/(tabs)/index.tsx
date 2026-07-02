import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../styles/theme';
import { fetchKatalog, fetchHotAnime, AnimeItem } from '../../services/api';
import AnimeCard from '../../components/AnimeCard';
import LoadingOverlay from '../../components/LoadingOverlay';
import SearchBar from '../../components/SearchBar';
import CatalogView from '../../components/CatalogView';
import { useAnimeStore } from '../../store/animeStore';

export default function BerandaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const setSelectedAnime = useAnimeStore((state) => state.setSelectedAnime);
  
  const lastBackPressRef = React.useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }

        lastBackPressRef.current = now;
        ToastAndroid.show('Tekan sekali lagi untuk keluar', ToastAndroid.SHORT);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [])
  );
  
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

  const lastTapRef = React.useRef(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Listen to tab press to clear search or double tap to refresh
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 300;
      lastTapRef.current = now;

      if (isDoubleTap) {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
        setSearchQuery('');
        handleRefresh();
      } else {
        // If we are currently searching, clear the search and return to normal view
        if (searchQuery) {
          setSearchQuery('');
        }
      }
    });
    return unsubscribe;
  }, [navigation, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleAnimePress = (item: AnimeItem) => {
    setSelectedAnime(item);
    router.push({
      pathname: '/detail/[id]',
      params: {
        id: encodeURIComponent(item.url),
        url: item.url,
        gambar: item.gambar,
        judul: item.judul,
        sources: item.sources ? JSON.stringify(item.sources) : undefined,
      },
    });
  };

  const renderHorizontalItem = ({ item }: { item: AnimeItem }) => (
    <View style={styles.animeCardWrapper}>
      <AnimeCard
        judul={item.judul}
        gambar={item.gambar}
        tipe={item.tipe}
        skor={item.skor}
        status={item.status}
        onPress={() => handleAnimePress(item)}
        customStyle={styles.animeCardStyle}
      />
    </View>
  );

  const renderHotItem = ({ item }: { item: AnimeItem }) => (
    <View style={styles.animeCardWrapper}>
      <AnimeCard
        judul={item.judul}
        gambar={item.gambar}
        tipe={item.tipe}
        skor={item.skor}
        onPress={() => handleAnimePress(item)}
        customStyle={styles.animeCardStyle}
      />
    </View>
  );

  const renderSection = (title: string, data: any[], renderFn: any, typeKey?: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.horizontalSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {typeKey && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/list/[type]',
                  params: { type: typeKey, headerTitle: title },
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Lihat Semua ➔</Text>
            </TouchableOpacity>
          )}
        </View>
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
        <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: 'bold', marginLeft: 8, marginTop: 4 }}>v2.5</Text>
      </View>
      <View style={styles.headerLine} />

      <View style={styles.searchBarContainer}>
        <SearchBar onSearch={setSearchQuery} />
      </View>

      {searchQuery ? (
        <View style={styles.searchResultContainer}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchResultText}>
              Hasil pencarian: <Text style={styles.searchResultAccent}>"{searchQuery}"</Text>
            </Text>
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchResultCloseText}>Tutup (X)</Text>
            </TouchableOpacity>
          </View>
          <CatalogView category="all" externalSearchQuery={searchQuery} hideSearchBar={true} onClearSearch={() => setSearchQuery('')} />
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        >
          {renderSection("Sedang Populer 🔥", hotAnime, renderHotItem)}
          {renderSection("Anime Terbaru 📺", latestAnime, renderHorizontalItem, "latest_anime")}
          {renderSection("Tokusatsu Terbaru 🏍️", latestToku, renderHorizontalItem, "latest_toku")}
          {renderSection("Rekomendasi Acak 🎲", randomAnime, renderHorizontalItem)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 2,
    textShadowColor: 'rgba(230, 57, 70, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
  },
  animeCardWrapper: {
    width: 140,
    marginRight: Spacing.sm,
  },
  animeCardStyle: {
    width: '100%',
    marginBottom: 0,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchResultContainer: {
    flex: 1,
  },
  searchResultHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultAccent: {
    color: Colors.accent,
  },
  searchResultCloseText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
