/**
 * Katalog Screen (Home) — Browse anime catalog with search and pagination.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/indexStyles';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';
import { fetchKatalog, fetchHotAnime, AnimeItem } from '../services/api';
import { getRiwayat, WatchHistoryItem } from '../services/storage';
import AnimeCard from '../components/AnimeCard';
import SearchBar from '../components/SearchBar';
import LoadingOverlay from '../components/LoadingOverlay';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 3;

export default function KatalogScreen() {
  const router = useRouter();
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'anime' | 'toku'>('anime');

  // New states for Features
  const [historyList, setHistoryList] = useState<WatchHistoryItem[]>([]);
  const [hotAnime, setHotAnime] = useState<AnimeItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRiwayat().then(res => setHistoryList(res.slice(0, 10)));
    }, [])
  );

  const loadKatalog = useCallback(async (page: number, search: string, tab: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const json = await fetchKatalog(page, search, tab);
      if (json.status !== 'success') throw new Error('Gagal memuat');

      setAnimeList(json.data.list || []);
      setHasNext(json.data.hasNext);

      if (page === 1 && !search) {
        const hotJson = await fetchHotAnime();
        if (hotJson.status === 'success') {
          setHotAnime(hotJson.data.list || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat katalog');
      setAnimeList([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKatalog(currentPage, searchQuery, activeTab);
  }, [currentPage, searchQuery, activeTab, loadKatalog]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'anime' | 'toku') => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadKatalog(currentPage, searchQuery, activeTab, true);
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

  const renderHotItem = ({ item }: { item: AnimeItem }) => (
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

  const renderHeader = () => (
    <View>
      {historyList.length > 0 && !searchQuery && (
        <View style={styles.horizontalSection}>
          <Text style={styles.sectionTitle}>LANJUTKAN MENONTON</Text>
          <FlatList
            data={historyList}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.url}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {hotAnime.length > 0 && !searchQuery && (
        <View style={styles.horizontalSection}>
          <Text style={styles.sectionTitle}>SEDANG HANGAT 🔥</Text>
          <FlatList
            data={hotAnime}
            renderItem={renderHotItem}
            keyExtractor={item => item.url}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Catalog Header */}
      <View style={[styles.catalogHeader, (historyList.length > 0 || hotAnime.length > 0) && !searchQuery && { marginTop: Spacing.lg }]}>
        <Text style={styles.sectionTitle}>{searchQuery ? 'HASIL PENCARIAN' : 'PERPUSTAKAAN'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setSearchQuery(''); setCurrentPage(1); setActiveTab('anime'); }}>
          <Text style={styles.logoText}>
            WIBU<Text style={styles.logoAccent}>FLIX</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push('/history')}
          activeOpacity={0.7}
        >
          <Text style={styles.historyIcon}>🕐</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerLine} />

      <View style={styles.searchWrapper}>
        <SearchBar onSearch={handleSearch} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'anime' && styles.tabBtnActive]} 
          onPress={() => handleTabChange('anime')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'anime' && styles.tabBtnTextActive]}>Anime</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'toku' && styles.tabBtnActive]} 
          onPress={() => handleTabChange('toku')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'toku' && styles.tabBtnTextActive]}>Tokusatsu</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <LoadingOverlay message="Memuat daftar anime..." />
      ) : error ? (
        <View style={styles.centerMessage}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadKatalog(currentPage, searchQuery, activeTab)}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : animeList.length === 0 ? (
        <View style={styles.centerMessage}>
          <Text style={styles.emptyText}>Tidak ada anime yang ditemukan.</Text>
        </View>
      ) : (
        <FlatList
          data={animeList}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.url + index}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
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
    </SafeAreaView>
  );
}

