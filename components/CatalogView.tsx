import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '../styles/indexStyles';
import { Colors, Spacing } from '../styles/theme';
import { fetchKatalog, AnimeItem } from '../services/api';
import AnimeCard from './AnimeCard';
import SearchBar from './SearchBar';
import LoadingOverlay from './LoadingOverlay';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 3;

interface CatalogViewProps {
  category: 'anime' | 'toku';
}

export default function CatalogView({ category }: CatalogViewProps) {
  const router = useRouter();
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKatalog = useCallback(async (page: number, search: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const json = await fetchKatalog(page, search, category);
      if (json.status !== 'success') throw new Error('Gagal memuat');

      setAnimeList(json.data.list || []);
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
    loadKatalog(currentPage, searchQuery);
  }, [currentPage, searchQuery, loadKatalog]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKatalog(currentPage, searchQuery, true);
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
      <View style={styles.searchWrapper}>
        <SearchBar onSearch={handleSearch} />
      </View>

      {/* Catalog Header */}
      <View style={[styles.catalogHeader, { marginTop: Spacing.sm }]}>
        <Text style={styles.sectionTitle}>{searchQuery ? 'HASIL PENCARIAN' : 'PERPUSTAKAAN'}</Text>
      </View>

      {loading && !refreshing ? (
        <LoadingOverlay message="Memuat daftar..." />
      ) : error ? (
        <View style={styles.centerMessage}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadKatalog(currentPage, searchQuery)}
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
  }
});
