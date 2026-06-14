import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { styles } from '../styles/indexStyles';
import { Colors, Spacing } from '../styles/theme';
import { fetchKatalog, AnimeItem } from '../services/api';
import AnimeCard from './AnimeCard';
import SearchBar from './SearchBar';
import LoadingOverlay from './LoadingOverlay';
import { useAnimeStore } from '../store/animeStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 3;

interface CatalogViewProps {
  category: 'anime' | 'toku' | 'all';
  externalSearchQuery?: string;
  hideSearchBar?: boolean;
  onClearSearch?: () => void;
}

export default function CatalogView({ category, externalSearchQuery, hideSearchBar, onClearSearch }: CatalogViewProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Semua');
  
  const setCatalog = useAnimeStore((state) => state.setCatalog);
  const setSelectedAnime = useAnimeStore((state) => state.setSelectedAnime);

  const filterOptions = category === 'toku' 
    ? ['Semua', 'Kamen Rider', 'Super Sentai', 'Power Rangers', 'Ultraman', 'Lainnya']
    : ['Semua', 'TV', 'Movie', 'OVA', 'ONA', 'Special'];

  const loadKatalog = useCallback(async (page: number, search: string, filter: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const json = await fetchKatalog(page, search, category, filter, undefined, isRefresh);
      if (json.status !== 'success') throw new Error('Gagal memuat');

      const newList = json.data.list || [];
      setAnimeList(newList);
      
      if (page === 1) {
        // Simpan halaman pertama ke dalam Zustand cache
        setCatalog(category, newList);
      }
      setHasNext(json.data.hasNext);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat katalog');
      setAnimeList([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    loadKatalog(currentPage, searchQuery, activeFilter);
  }, [currentPage, searchQuery, activeFilter, loadKatalog]);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
      setCurrentPage(1);
    }
  }, [externalSearchQuery]);

  const lastTapRef = React.useRef(0);
  const flatListRef = React.useRef<FlatList>(null);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 300;
      lastTapRef.current = now;

      if (isDoubleTap) {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
        setSearchQuery('');
        if (onClearSearch) onClearSearch();
        setCurrentPage(1);
        handleFilterChange('Semua'); // Optionally reset filter too
        
        // Force refresh
        setRefreshing(true);
        loadKatalog(1, '', 'Semua', true);
      } else {
        if (searchQuery) {
          setSearchQuery('');
          if (onClearSearch) onClearSearch();
        }
      }
    });
    return unsubscribe;
  }, [navigation, searchQuery, onClearSearch]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    setAnimeList([]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKatalog(currentPage, searchQuery, activeFilter, true);
  };

  const handleAnimePress = (item: AnimeItem) => {
    // Simpan anime lengkap di Global Store (Zustand) agar layar berikutnya tidak perlu mencari ulang
    setSelectedAnime(item);
    
    // Kirim ID/URL secara simpel ke router
    router.push({
      pathname: '/detail/[id]',
      params: {
        id: encodeURIComponent(item.url),
        url: item.url,
        gambar: item.gambar,
        judul: item.judul,
        // Dihapus: sources: item.sources ? JSON.stringify(item.sources) : undefined,
      },
    });
  };

  const renderItem = ({ item }: { item: AnimeItem }) => (
    <AnimeCard
      judul={item.judul}
      gambar={item.gambar}
      tipe={item.tipe}
      skor={item.skor}
      status={item.status}
      onPress={() => handleAnimePress(item)}
    />
  );

  return (
    <View style={localStyles.container}>
      {!hideSearchBar && (
        <View style={styles.searchWrapper}>
          <SearchBar onSearch={handleSearch} />
        </View>
      )}

      {/* Catalog Header or Search Result Info */}
      {searchQuery && !hideSearchBar ? (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>
            Hasil pencarian: <Text style={{ color: Colors.accent }}>"{searchQuery}"</Text>
          </Text>
          <TouchableOpacity onPress={() => { setSearchQuery(''); if (onClearSearch) onClearSearch(); }}>
            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Tutup (X)</Text>
          </TouchableOpacity>
        </View>
      ) : !hideSearchBar ? (
        <View style={[styles.catalogHeader, { marginTop: Spacing.sm }]}>
          <Text style={styles.sectionTitle}>PERPUSTAKAAN</Text>
        </View>
      ) : null}

      {/* Filter Chips */}
      <View style={{ marginBottom: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, gap: Spacing.sm }}>
          {filterOptions.map(opt => {
            const isActive = activeFilter === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => handleFilterChange(opt)}
                style={[
                  localStyles.filterChip,
                  isActive && localStyles.filterChipActive
                ]}
              >
                <Text style={[
                  localStyles.filterText,
                  isActive && localStyles.filterTextActive
                ]}>{opt}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <LoadingOverlay message="Memuat daftar..." />
      ) : error ? (
        <View style={styles.centerMessage}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadKatalog(currentPage, searchQuery, activeFilter)}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : animeList.length === 0 ? (
        <View style={styles.centerMessage}>
          <Text style={styles.emptyText}>Tidak ada yang ditemukan.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={animeList}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.url + index}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
              progressBackgroundColor={Colors.surface}
            />
          }
          ListFooterComponent={
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
                onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.navBtnText, currentPage <= 1 && styles.navBtnTextDisabled]}>
                  « Sebelumnya
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>Hal {currentPage}</Text>

              <TouchableOpacity
                style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
                onPress={() => hasNext && setCurrentPage(currentPage + 1)}
                disabled={!hasNext}
                activeOpacity={0.7}
              >
                <Text style={[styles.navBtnText, !hasNext && styles.navBtnTextDisabled]}>
                  Selanjutnya »
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.white,
  }
});
