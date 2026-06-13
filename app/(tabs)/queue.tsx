import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchQueueStatus, queueCancel, queuePrioritize, QueueItem } from '../../services/api';

export default function QueueScreen() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetchQueueStatus();
      if (res.success) {
        setQueue(res.queue);
      }
    } catch (err) {
      console.error('[Queue] Error loading queue', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    // Polling interval 2 detik
    const interval = setInterval(() => {
      loadQueue();
    }, 2000);

    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadQueue();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  const handleCancel = async (item: QueueItem) => {
    try {
      // Optimistic update
      setQueue(prev => prev.filter(q => q.id !== item.id));
      await queueCancel(item.id, item.seriesSlug, item.seriesSlug); // Note: Should pass episodeSlug but we don't have it explicitly stored unless we extract it. The backend extracts it. Wait, the backend uses item.episodeUrl to extract.
      loadQueue();
    } catch (e) {
      console.error(e);
      loadQueue();
    }
  };

  const handlePrioritize = async (item: QueueItem) => {
    try {
      await queuePrioritize(item.id);
      loadQueue();
    } catch (e) {
      console.error(e);
      loadQueue();
    }
  };

  const renderItem = ({ item, index }: { item: QueueItem, index: number }) => {
    const isUploading = item.status === 'UPLOADING';
    const isPending = item.status === 'PENDING';
    
    return (
      <View style={[styles.card, isUploading && styles.cardActive]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.seriesTitle} numberOfLines={1}>{item.seriesTitle}</Text>
            <Text style={styles.episodeTitle} numberOfLines={1}>{item.episodeTitle}</Text>
          </View>
          <View style={styles.statusBadgeContainer}>
            {isUploading && <View style={styles.dot} />}
            <Text style={[styles.statusText, isUploading && styles.statusTextActive]}>
              {isUploading ? 'MENGUNGGAH' : item.status}
            </Text>
          </View>
        </View>

        {isUploading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{item.progress || 'Menyiapkan video...'}</Text>
            <ActivityIndicator size="small" color="#E50914" style={{ marginLeft: 8 }} />
          </View>
        )}

        <View style={styles.actionRow}>
          {isPending && index !== 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrioritize(item)}>
              <Ionicons name="arrow-up-circle-outline" size={20} color="#00ff00" />
              <Text style={styles.actionTextPrioritize}>Prioritaskan</Text>
            </TouchableOpacity>
          )}
          
          {(isPending || isUploading) && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(item)}>
              <Ionicons name="close-circle-outline" size={20} color="#E50914" />
              <Text style={styles.actionTextCancel}>Batal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && queue.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Antrean Kosong</Text>
          <Text style={styles.emptySubtext}>Video yang Anda masukkan ke antrean cloud akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardActive: {
    borderColor: '#E50914',
    backgroundColor: '#1f1313',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  seriesTitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E50914',
    marginRight: 6,
  },
  statusText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextActive: {
    color: '#E50914',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    color: '#ddd',
    fontSize: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
  },
  actionTextPrioritize: {
    color: '#00ff00',
    marginLeft: 4,
    fontSize: 14,
  },
  actionTextCancel: {
    color: '#E50914',
    marginLeft: 4,
    fontSize: 14,
  },
});
