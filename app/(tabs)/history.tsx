/**
 * History Screen — Watch history with progress tracking display.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import {
  getRiwayat,
  hapusRiwayat,
  clearAllHistory,
  formatWaktuYangLalu,
  formatDuration,
  WatchHistoryItem,
} from '../../services/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 3;
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload history when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    setLoading(true);
    const data = await getRiwayat();
    setHistory(data);
    setLoading(false);
  };

  const handlePress = (item: WatchHistoryItem) => {
    router.push({
      pathname: '/player',
      params: {
        url: item.url,
        gambar: item.gambar,
        seriUrl: item.seriUrl,
        judul: `${item.judulSeri} Episode ${item.nomorEp}`,
        autoPlayHost: item.host || '',
      },
    });
  };

  const handleDelete = (item: WatchHistoryItem) => {
    Alert.alert(
      'Hapus Riwayat',
      `Hapus "${item.judulSeri}" dari riwayat?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await hapusRiwayat(item.judulSeri);
            loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Hapus Semua Riwayat',
      'Yakin ingin menghapus seluruh riwayat tontonan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            await clearAllHistory();
            loadHistory();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WatchHistoryItem }) => {
    const progressPercent = item.duration > 0
      ? Math.min((item.progress / item.duration) * 100, 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imgContainer}>
          <Image
            source={{ uri: item.gambar }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Episode badge */}
          {item.nomorEp ? (
            <View style={styles.epBadge}>
              <Text style={styles.epBadgeText}>Eps {item.nomorEp}</Text>
            </View>
          ) : null}

          {/* Progress bar overlay */}
          {progressPercent > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          )}

          {/* Duration overlay */}
          {item.progress > 0 && item.duration > 0 && (
            <View style={styles.durationOverlay}>
              <Text style={styles.durationText}>
                {formatDuration(item.progress)} / {formatDuration(item.duration)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.judulSeri}</Text>
          <Text style={styles.timeAgo}>{formatWaktuYangLalu(item.waktu)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header actions */}
      {history.length > 0 && (
        <View style={styles.headerActions}>
          <Text style={styles.countText}>{history.length} item</Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Hapus Semua</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Memuat riwayat...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🕐</Text>
          <Text style={styles.emptyText}>Belum ada riwayat tontonan.</Text>
          <Text style={styles.emptySubtext}>
            Anime yang kamu tonton akan muncul di sini.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.judulSeri + index}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  countText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  clearAllText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  row: {
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: Spacing.lg,
  },
  imgContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  epBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: FontWeight.semibold,
  },
  info: {
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 18,
  },
  timeAgo: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    opacity: 0.6,
  },
});
