/**
 * EpisodeItem — Row item for the episode list.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';

interface EpisodeItemProps {
  realUrl: string;
  urlsJson: string;
  judul: string;
  tanggal: string;
  malJudul?: string;
  isQueued?: boolean;
  progressPercent?: number;
  onPress: (realUrl: string, urlsJson: string, judul: string) => void;
  onQueuePress?: (realUrl: string, judul: string) => void;
}

export default React.memo(function EpisodeItem({ realUrl, urlsJson, judul, tanggal, malJudul, isQueued, progressPercent = 0, onPress, onQueuePress }: EpisodeItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(realUrl, urlsJson, judul)} activeOpacity={0.6}>
      <View style={styles.contentWrapper}>
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>{judul}</Text>
          {malJudul && (
            <Text style={styles.malTitle} numberOfLines={1}>{malJudul}</Text>
          )}
        </View>
        <View style={styles.rightContent}>
          <Text style={styles.date}>{tanggal}</Text>
          {onQueuePress && (
            <TouchableOpacity 
              style={[styles.queueBtn, isQueued && { backgroundColor: 'rgba(0,255,0,0.1)' }]} 
              onPress={isQueued ? undefined : () => onQueuePress && onQueuePress(realUrl, judul)}
              activeOpacity={isQueued ? 1 : 0.6}
            >
              <Ionicons 
                name={isQueued ? "checkmark-circle" : "cloud-download-outline"} 
                size={22} 
                color={isQueued ? "#00ff00" : Colors.accent} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Progress Bar Overlay */}
      {progressPercent > 0 && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs + 2,
    overflow: 'hidden', // Ensure progress bar stays inside
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  main: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  malTitle: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: 3,
    fontStyle: 'italic',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  queueBtn: {
    padding: 6,
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
});
