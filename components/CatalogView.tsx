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
  Modal,
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
  sort?: 'az' | 'latest';
}

export default function CatalogView({ category, externalSearchQuery, hideSearchBar, onClearSearch, sort = 'az' }: CatalogViewProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState(category === 'toku' ? 'Tokusatsu' : category === 'anime' ? 'Anime' : 'Semua');
  const [activeSubclass, setActiveSubclass] = useState('Semua');
  const [activeGenre, setActiveGenre] = useState('Semua');
  const [genreModalVisible, setGenreModalVisible] = useState(false);
  
  const setCatalog = useAnimeStore((state) => state.setCatalog);
  const setSelectedAnime = useAnimeStore((state) => state.setSelectedAnime);

  const typeOptions = ['Semua', 'Anime', 'Tokusatsu'];
  const getSubclassOptions = () => {
    if (activeType === 'Tokusatsu') return ['Semua', 'Kamen Rider', 'Super Sentai', 'Power Rangers', 'Ultraman', 'Lainnya'];
    if (activeType === 'Anime') return ['Semua', 'TV', 'Movie', 'OVA', 'ONA', 'Special'];
    return ['Semua', 'TV', 'Movie', 'OVA', 'Kamen Rider', 'Super Sentai', 'Ultraman'];
  };

  const genreOptions = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 
    'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Isekai'
  ];

  const loadKatalog = useCallback(async (page: number, search: string, tType: string, tSubclass: string, tGenre: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    let tabParam = 'all';
    if (tType === 'Anime') tabParam = 'anime';
    else if (tType === 'Tokusatsu') tabParam = 'toku';

    try {
      const json = await fetchKatalog(page, search, tabParam, tSubclass, tGenre, undefined, isRefresh, sort);
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
  }, [category, sort, setCatalog]);

  useEffect(() => {
    loadKatalog(currentPage, searchQuery, activeType, activeSubclass, activeGenre);
  }, [currentPage, searchQuery, activeType, activeSubclass, activeGenre, loadKatalog]);

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
        setActiveType('Semua');
        setActiveSubclass('Semua');
        setActiveGenre('Semua');
        
        // Force refresh
        setRefreshing(true);
        loadKatalog(1, '', 'Semua', 'Semua', 'Semua', true);
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

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setActiveSubclass('Semua');
    setCurrentPage(1);
    setAnimeList([]);
  };

  const handleSubclassChange = (subclass: string) => {
    setActiveSubclass(subclass);
    setCurrentPage(1);
    setAnimeList([]);
  };

  const handleGenreChange = (genre: string) => {
    setActiveGenre(genre);
    setCurrentPage(1);
    setAnimeList([]);
    setGenreModalVisible(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKatalog(currentPage, searchQuery, activeType, activeSubclass, activeGenre, true);
  };

  const handleAnimePress = useCallback((item: AnimeItem) => {
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
      },
    });
  }, [setSelectedAnime, router]);

  const renderItem = useCallback(({ item }: { item: AnimeItem }) => (
    <AnimeCard
      judul={item.judul}
      gambar={item.gambar}
      tipe={item.tipe}
      skor={item.skor}
      status={item.status}
      itemData={item}
      onPress={handleAnimePress}
    />
  ), [handleAnimePress]);

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

      {/* Filter Section */}
      <View style={{ marginBottom: Spacing.sm }}>
        {/* Class 1: Type & Class 3: Genre Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {typeOptions.map(opt => {
              const isActive = activeType === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleTypeChange(opt)}
                  style={[localStyles.filterChip, isActive && localStyles.filterChipActive]}
                >
                  <Text style={[localStyles.filterText, isActive && localStyles.filterTextActive]}>{opt}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Genre Button */}
          <TouchableOpacity 
            onPress={() => setGenreModalVisible(true)}
            style={[localStyles.filterChip, activeGenre !== 'Semua' && localStyles.filterChipActive, { marginLeft: Spacing.md, backgroundColor: '#2d3748', borderColor: '#4a5568' }]}
          >
            <Text style={[localStyles.filterText, activeGenre !== 'Semua' && localStyles.filterTextActive]}>
              {activeGenre === 'Semua' ? 'Genre ▾' : `${activeGenre} ▾`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Class 2: Subclass */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, gap: Spacing.sm, marginTop: Spacing.xs }}>
          {getSubclassOptions().map(opt => {
            const isActive = activeSubclass === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => handleSubclassChange(opt)}
                style={[localStyles.subclassChip, isActive && localStyles.filterChipActive]}
              >
                <Text style={[localStyles.filterText, isActive && localStyles.filterTextActive, { fontSize: 12 }]}>{opt}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Genre Modal */}
      <Modal visible={genreModalVisible} transparent={true} animationType="fade" onRequestClose={() => setGenreModalVisible(false)}>
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Pilih Genre</Text>
              <TouchableOpacity onPress={() => setGenreModalVisible(false)}>
                <Text style={localStyles.modalCloseText}>Tutup (X)</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={localStyles.genreGrid}>
              <TouchableOpacity
                style={[localStyles.genreItem, activeGenre === 'Semua' && localStyles.genreItemActive]}
                onPress={() => handleGenreChange('Semua')}
              >
                <Text style={[localStyles.genreItemText, activeGenre === 'Semua' && localStyles.filterTextActive]}>Semua Genre</Text>
              </TouchableOpacity>
              {genreOptions.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[localStyles.genreItem, activeGenre === genre && localStyles.genreItemActive]}
                  onPress={() => handleGenreChange(genre)}
                >
                  <Text style={[localStyles.genreItemText, activeGenre === genre && localStyles.filterTextActive]}>{genre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading && !refreshing ? (
        <LoadingOverlay message="Memuat daftar..." />
      ) : error ? (
        <View style={styles.centerMessage}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadKatalog(currentPage, searchQuery, activeType, activeSubclass, activeGenre)}
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
          keyExtractor={(item) => item.url}
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
  },
  subclassChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    maxHeight: '70%',
    padding: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  genreItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genreItemActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  genreItemText: {
    color: Colors.textMuted,
    fontSize: 13,
  }
});
