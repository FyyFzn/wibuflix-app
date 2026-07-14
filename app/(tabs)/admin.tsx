/**
 * Admin Curation Screen — In-App Catalog Manager
 * Enables manual card merging and MAL ID metadata forcing directly from the mobile app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import {
  AdminCatalogItem,
  adminCatalogSearch,
  adminMergeAnime,
  adminForceMalId,
  adminRenameAnime,
  adminForceEnrichCard,
} from '../../services/api';


export default function AdminCurationScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [loading, setLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<AdminCatalogItem[]>([]);
  
  // State untuk mode Merge
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);

  // State untuk mode Force MAL ID (modal/inline editor)
  const [editingItem, setEditingItem] = useState<AdminCatalogItem | null>(null);
  const [inputMalId, setInputMalId] = useState('');
  const [savingMalId, setSavingMalId] = useState(false);

  // State untuk mode Rename / Edit Judul
  const [renamingItem, setRenamingItem] = useState<AdminCatalogItem | null>(null);
  const [inputNewTitle, setInputNewTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // State untuk mode Force Enrich
  const [enriching, setEnriching] = useState(false);



  const fetchCatalog = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const data = await adminCatalogSearch(query);
      setCatalogItems(data);
    } catch (err: any) {
      Alert.alert('Gagal Memuat Katalog', err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params.q) {
      setSearchQuery(params.q);
      fetchCatalog(params.q);
    } else {
      fetchCatalog();
    }
  }, [params.q, fetchCatalog]);

  const handleSearchSubmit = () => {
    fetchCatalog(searchQuery);
  };

  const toggleSelectForMerge = (id: string) => {
    setSelectedForMerge(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleMergeSubmit = async () => {
    if (selectedForMerge.length < 2) {
      Alert.alert('Pilih Minimal 2 Kartu', 'Pilih 1 kartu utama dan minimal 1 kartu duplikat untuk digabungkan.');
      return;
    }

    // Kartu pertama yang dipilih menjadi kartu utama (Primary)
    const primaryId = selectedForMerge[0];
    const targetIds = selectedForMerge.slice(1);
    const primaryItem = catalogItems.find(c => c._id === primaryId);

    Alert.alert(
      'Konfirmasi Penggabungan (Merge)',
      `Semua sumber dan episode dari ${targetIds.length} kartu akan digabungkan ke dalam:\n\n"${primaryItem?.title}"\n\nKartu duplikat setelahnya akan dihapus dan kartu ini akan dikunci (Locked). Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: '⚡ Gabung Sekarang',
          style: 'destructive',
          onPress: async () => {
            setMerging(true);
            try {
              const result = await adminMergeAnime(primaryId, targetIds);
              Alert.alert('✅ Berhasil!', result.message);
              setSelectedForMerge([]);
              fetchCatalog(searchQuery);
            } catch (err: any) {
              Alert.alert('Gagal Merge', err.message || 'Terjadi kesalahan saat menggabungkan kartu');
            } finally {
              setMerging(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenMalEditor = (item: AdminCatalogItem) => {
    setEditingItem(item);
    setInputMalId(item.malId ? item.malId.toString() : '');
  };

  const handleSaveMalId = async () => {
    if (!editingItem) return;
    setSavingMalId(true);
    try {
      const numericId = inputMalId.trim() ? parseInt(inputMalId.trim(), 10) : null;
      if (inputMalId.trim() && (isNaN(numericId!) || numericId! <= 0)) {
        Alert.alert('MAL ID Tidak Valid', 'Masukkan angka ID MyAnimeList yang benar (contoh: 58514).');
        setSavingMalId(false);
        return;
      }
      const result = await adminForceMalId(editingItem._id, numericId);
      Alert.alert('✅ MAL ID Dikunci!', result.message);
      setEditingItem(null);
      fetchCatalog(searchQuery);
    } catch (err: any) {
      Alert.alert('Gagal Menyimpan MAL ID', err.message || 'Terjadi kesalahan saat mengupdate MAL ID');
    } finally {
      setSavingMalId(false);
    }
  };

  const handleOpenRenameEditor = (item: AdminCatalogItem) => {
    setRenamingItem(item);
    setInputNewTitle(item.title || '');
  };

  const handleSaveRename = async () => {
    if (!renamingItem) return;
    if (!inputNewTitle.trim()) {
      Alert.alert('Judul Tidak Boleh Kosong', 'Masukkan judul anime yang valid.');
      return;
    }
    setSavingTitle(true);
    try {
      const result = await adminRenameAnime(renamingItem._id, inputNewTitle.trim());
      Alert.alert('✅ Judul Berhasil Diubah!', result.message);
      setRenamingItem(null);
      fetchCatalog(searchQuery);
    } catch (err: any) {
      Alert.alert('Gagal Mengubah Judul', err.message || 'Terjadi kesalahan saat mengubah judul anime');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleQuickEnrich = async (item: AdminCatalogItem) => {
    setEnriching(true);
    try {
      const result = await adminForceEnrichCard([item._id]);
      Alert.alert('⚡ Force Enrich Berhasil!', result.message);
      fetchCatalog(searchQuery);
    } catch (err: any) {
      Alert.alert('Gagal Force Enrich', err.message || 'Terjadi kesalahan saat memperkaya data kartu');
    } finally {
      setEnriching(false);
    }
  };

  const handleBulkEnrich = async () => {
    if (selectedForMerge.length === 0) return;
    setEnriching(true);
    try {
      const result = await adminForceEnrichCard(selectedForMerge);
      Alert.alert('⚡ Bulk Force Enrich Berhasil!', result.message);
      setSelectedForMerge([]);
      fetchCatalog(searchQuery);
    } catch (err: any) {
      Alert.alert('Gagal Bulk Enrich', err.message || 'Terjadi kesalahan saat memperkaya data kartu massal');
    } finally {
      setEnriching(false);
    }
  };

  const renderCatalogRow = ({ item }: { item: AdminCatalogItem }) => {
    const isSelected = selectedForMerge.includes(item._id);
    const isPrimary = selectedForMerge[0] === item._id;
    const sourcesCount = item.sources ? Object.values(item.sources).filter((s: any) => s?.url).length : 0;
    const providerList = item.sources
      ? Object.entries(item.sources)
          .filter(([_, val]: any) => val?.url)
          .map(([key]) => key.toUpperCase())
          .join(', ')
      : 'TIDAK ADA';

    return (
      <View style={[styles.card, isSelected && styles.cardSelected, isPrimary && styles.cardPrimary]}>
        {/* Bagian Atas: Poster & Info Metadata */}
        <View style={styles.cardTopSection}>
          <Image
            source={{ uri: item.image && !item.image.includes('placehold') ? item.image : 'https://via.placeholder.com/150x220/1e293b/94a3b8?text=No+Cover' }}
            style={styles.thumb}
            resizeMode="cover"
          />

          <View style={styles.cardInfo}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              {item.isLocked && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={10} color="#34d399" />
                  <Text style={styles.lockedText}>LOCKED</Text>
                </View>
              )}
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.miniBadge, item.malId ? styles.badgeMalActive : styles.badgeMalEmpty]}>
                <Text style={styles.miniBadgeText}>MAL: {item.malId || 'Belum Ada'}</Text>
              </View>
              {item.tmdbId && (
                <View style={styles.miniBadge}>
                  <Text style={styles.miniBadgeText}>TMDB: {item.tmdbId}</Text>
                </View>
              )}
            </View>

            <View style={styles.serverRow}>
              <View style={styles.serverDot} />
              <Text style={styles.metaText} numberOfLines={1}>
                <Text style={{ fontWeight: '700', color: '#e2e8f0' }}>{sourcesCount} Server:</Text> {providerList}
              </Text>
            </View>

            {item.aliases && item.aliases.length > 0 && (
              <Text style={styles.aliasesText} numberOfLines={1}>
                Alias: {item.aliases.slice(0, 3).join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Garis Pemisah Toolbar */}
        <View style={styles.cardDivider} />

        {/* Toolbar Aksi Kurasi (Full Width Bottom Bar) */}
        <View style={styles.actionToolbar}>
          <TouchableOpacity style={styles.toolBtnMal} onPress={() => handleOpenMalEditor(item)}>
            <Ionicons name="create-outline" size={15} color="#cbd5e1" />
            <Text style={styles.toolBtnTextMal}>MAL ID</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtnRename} onPress={() => handleOpenRenameEditor(item)}>
            <Ionicons name="pencil-outline" size={15} color="#93c5fd" />
            <Text style={styles.toolBtnTextRename}>Rename</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtnEnrich} onPress={() => handleQuickEnrich(item)}>
            <Ionicons name="flash" size={15} color="#6ee7b7" />
            <Text style={styles.toolBtnTextEnrich}>Enrich</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtnSelect, isSelected && (isPrimary ? styles.toolBtnSelectPrimary : styles.toolBtnSelectActive)]}
            onPress={() => toggleSelectForMerge(item._id)}
          >
            <Ionicons name={isPrimary ? 'star' : isSelected ? 'checkmark-circle' : 'add-circle-outline'} size={15} color={isSelected ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.toolBtnTextSelect, isSelected && { color: '#ffffff' }]}>
              {isPrimary ? '★ Utama' : isSelected ? '✓ Terpilih' : '+ Merge'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🛠️ Admin Kurasi & Merge</Text>
            <Text style={styles.headerSubtitle}>Gabungkan kartu terpisah & Kunci MAL ID dengan tepat</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchCatalog(searchQuery)}>
            <Ionicons name="refresh" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari judul anime atau alias (contoh: Dandadan, Hero)..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchCatalog(''); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Floating Merge Action Bar jika ada yang dipilih */}
        {selectedForMerge.length > 0 && (
          <View style={styles.mergeBar}>
            <View style={styles.mergeBarTextCol}>
              <Text style={styles.mergeBarTitle}>
                🔗 {selectedForMerge.length} Kartu Dipilih
              </Text>
              <Text style={styles.mergeBarSub}>
                Kartu pertama ({catalogItems.find(c => c._id === selectedForMerge[0])?.title?.slice(0, 20) || 'Utama'}) menjadi target gabungan utama.
              </Text>
            </View>
            <View style={styles.mergeBarBtns}>
              <TouchableOpacity style={styles.btnClearSelection} onPress={() => setSelectedForMerge([])}>
                <Text style={styles.btnClearText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnExecuteEnrich, enriching && { opacity: 0.5 }]}
                onPress={handleBulkEnrich}
                disabled={enriching}
              >
                {enriching ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.btnExecuteText}>⚡ ENRICH</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnExecuteMerge, selectedForMerge.length < 2 && { opacity: 0.5 }]}
                onPress={handleMergeSubmit}
                disabled={selectedForMerge.length < 2 || merging}
              >
                {merging ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.btnExecuteText}>🧲 GABUNG</Text>}
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* Modal / Inline Editor untuk Force MAL ID */}
        <Modal
          transparent={true}
          visible={!!editingItem}
          animationType="fade"
          onRequestClose={() => setEditingItem(null)}
        >
          {editingItem && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🛠️ Kunci / Force MAL ID</Text>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close" size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  Mengatur ID MyAnimeList untuk <Text style={{ fontWeight: 'bold', color: Colors.white }}>{editingItem.title}</Text>
                </Text>

                <Text style={styles.inputLabel}>MyAnimeList ID (Angka):</Text>
                <TextInput
                  style={styles.malInput}
                  placeholder="Contoh: 58514 (Kosongkan untuk hapus)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={inputMalId}
                  onChangeText={setInputMalId}
                />
                <Text style={styles.helperText}>
                  💡 Tips: Cari di myanimelist.net/anime/<Text style={{ fontWeight: 'bold', color: Colors.accent }}>[ID]</Text>. ID yang dikunci di sini tidak akan bisa ditimpa atau dirusak oleh scraper otomatis.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnModalCancel} onPress={() => setEditingItem(null)}>
                    <Text style={styles.btnModalCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnModalSave} onPress={handleSaveMalId} disabled={savingMalId}>
                    {savingMalId ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.btnModalSaveText}>🔒 Simpan & Kunci</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>

        {/* Modal untuk Rename / Edit Judul Kartu */}
        <Modal
          transparent={true}
          visible={!!renamingItem}
          animationType="fade"
          onRequestClose={() => setRenamingItem(null)}
        >
          {renamingItem && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✏️ Rename Judul Kartu Anime</Text>
                  <TouchableOpacity onPress={() => setRenamingItem(null)}>
                    <Ionicons name="close" size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  Ubah judul untuk <Text style={{ fontWeight: 'bold', color: Colors.white }}>{renamingItem.title}</Text>
                </Text>

                <Text style={styles.inputLabel}>Judul Baru:</Text>
                <TextInput
                  style={styles.malInput}
                  placeholder="Masukkan judul baru (misal: One Piece (2024))"
                  placeholderTextColor={Colors.textMuted}
                  value={inputNewTitle}
                  onChangeText={setInputNewTitle}
                />
                <Text style={styles.helperText}>
                  💡 Judul lama otomatis disimpan ke dalam daftar alias (<Text style={{ fontWeight: 'bold', color: Colors.accent }}>aliases</Text>) sehingga pencarian dengan judul lama tetap bekerja, dan kartu dikunci (<Text style={{ fontWeight: 'bold', color: Colors.accent }}>LOCKED</Text>) agar tidak tertimpa ulang scraper.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnModalCancel} onPress={() => setRenamingItem(null)}>
                    <Text style={styles.btnModalCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnModalSave} onPress={handleSaveRename} disabled={savingTitle}>
                    {savingTitle ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.btnModalSaveText}>✏️ Simpan Judul</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>

        {/* Daftar Katalog */}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Memuat Katalog Backend...</Text>
          </View>
        ) : catalogItems.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Tidak Ada Kartu Anime</Text>
            <Text style={styles.emptySub}>Coba cari dengan kata kunci lain atau judul parsial.</Text>
          </View>
        ) : (
          <FlatList
            data={catalogItems}
            keyExtractor={item => item._id}
            renderItem={renderCatalogRow}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#222',
    borderRadius: BorderRadius.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSize.sm,
    paddingVertical: 10,
  },
  mergeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderWidth: 1,
    borderColor: Colors.accent,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  mergeBarTextCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  mergeBarTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  mergeBarSub: {
    fontSize: FontSize.xxs,
    color: Colors.textDim,
    marginTop: 2,
  },
  mergeBarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnClearSelection: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btnClearText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  btnExecuteEnrich: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  btnExecuteMerge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  btnExecuteText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#111e38',
  },
  cardPrimary: {
    borderColor: '#eab308',
    backgroundColor: '#1e1c14',
  },
  cardTopSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 76,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginRight: 6,
    lineHeight: 20,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34d399',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeMalActive: {
    backgroundColor: '#1e1b4b',
    borderColor: '#4338ca',
  },
  badgeMalEmpty: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  aliasesText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  toolBtnMal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  toolBtnTextMal: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  toolBtnRename: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1e40af',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  toolBtnTextRename: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '600',
  },
  toolBtnEnrich: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  toolBtnTextEnrich: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '600',
  },
  toolBtnSelect: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  toolBtnSelectActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  toolBtnSelectPrimary: {
    backgroundColor: '#ca8a04',
    borderColor: '#eab308',
  },
  toolBtnTextSelect: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  center: {

    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textDim,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 250,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textDim,
    marginBottom: 6,
  },
  malInput: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: BorderRadius.md,
    color: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helperText: {
    fontSize: FontSize.xxs,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btnModalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#21262d',
  },
  btnModalCancelText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  btnModalSave: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#238636',
  },
  btnModalSaveText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
});
