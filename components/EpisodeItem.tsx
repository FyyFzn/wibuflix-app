/**
 * EpisodeItem — Row item for the episode list.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';

interface EpisodeItemProps {
  judul: string;
  tanggal: string;
  malJudul?: string;
  onPress: () => void;
}

export default function EpisodeItem({ judul, tanggal, malJudul, onPress }: EpisodeItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{judul}</Text>
        {malJudul && (
          <Text style={styles.malTitle} numberOfLines={1}>{malJudul}</Text>
        )}
      </View>
      <Text style={styles.date}>{tanggal}</Text>
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
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    flexShrink: 0,
  },
});
