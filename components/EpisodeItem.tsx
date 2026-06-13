/**
 * EpisodeItem — Row item for the episode list.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';

interface EpisodeItemProps {
  judul: string;
  tanggal: string;
  malJudul?: string;
  onPress: () => void;
  onQueuePress?: () => void;
}

export default function EpisodeItem({ judul, tanggal, malJudul, onPress, onQueuePress }: EpisodeItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{judul}</Text>
        {malJudul && (
          <Text style={styles.malTitle} numberOfLines={1}>{malJudul}</Text>
        )}
      </View>
      <View style={styles.rightContent}>
        <Text style={styles.date}>{tanggal}</Text>
        {onQueuePress && (
          <TouchableOpacity style={styles.queueBtn} onPress={onQueuePress}>
            <Ionicons name="cloud-download-outline" size={22} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs + 2,
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
});
