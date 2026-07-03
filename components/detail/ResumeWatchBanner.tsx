import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import { WatchHistoryItem } from '../../services/storage';

interface ResumeWatchBannerProps {
  lastWatched: WatchHistoryItem | null;
  onPress: (item: WatchHistoryItem) => void;
}

export default React.memo(function ResumeWatchBanner({ lastWatched, onPress }: ResumeWatchBannerProps) {
  if (!lastWatched) return null;

  const progressPercent = lastWatched.duration > 0
    ? Math.min((lastWatched.progress / lastWatched.duration) * 100, 100)
    : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onPress(lastWatched)}
        activeOpacity={0.8}
      >
        <Text style={styles.text}>
          ▶ Lanjutkan Menonton {lastWatched.nomorEp ? `Episode ${lastWatched.nomorEp}` : ''}
        </Text>
        {lastWatched.duration > 0 && (
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  progressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    opacity: 0.8,
  },
});
