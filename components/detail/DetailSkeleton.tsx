import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';

export default function DetailSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* MAL Panel Skeleton */}
      <Animated.View style={[styles.malPanel, { opacity: pulseAnim }]}>
        <View style={styles.malCover} />
        <View style={styles.malInfo}>
          <View style={styles.titleLine} />
          <View style={styles.titleLineShort} />
          
          <View style={styles.metaRow}>
            <View style={styles.badgeSkeleton} />
            <View style={styles.badgeSkeleton} />
            <View style={styles.badgeSkeleton} />
          </View>
          
          <View style={styles.synopsisLine} />
          <View style={styles.synopsisLine} />
          <View style={styles.synopsisLineShort} />
        </View>
      </Animated.View>

      {/* Controls Skeleton */}
      <View style={styles.controlsRow}>
        <Animated.View style={[styles.searchSkeleton, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.sortSkeleton, { opacity: pulseAnim }]} />
      </View>

      {/* Episode Rows Skeleton */}
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <Animated.View key={idx} style={[styles.episodeRow, { opacity: pulseAnim }]}>
          <View style={styles.episodeTextLine} />
          <View style={styles.episodeButtonSkeleton} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  malPanel: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  malCover: {
    width: 100,
    aspectRatio: 2 / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  malInfo: {
    flex: 1,
    gap: Spacing.sm + 2,
  },
  titleLine: {
    height: 18,
    backgroundColor: Colors.surface2,
    borderRadius: 4,
    width: '90%',
  },
  titleLineShort: {
    height: 18,
    backgroundColor: Colors.surface2,
    borderRadius: 4,
    width: '60%',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  badgeSkeleton: {
    height: 22,
    width: 50,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.full,
  },
  synopsisLine: {
    height: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 3,
    width: '100%',
  },
  synopsisLineShort: {
    height: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 3,
    width: '40%',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  searchSkeleton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
  },
  sortSkeleton: {
    width: 100,
    height: 44,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
  },
  episodeRow: {
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
  episodeTextLine: {
    height: 16,
    width: '65%',
    backgroundColor: Colors.surface2,
    borderRadius: 4,
  },
  episodeButtonSkeleton: {
    height: 32,
    width: 32,
    backgroundColor: Colors.surface2,
    borderRadius: 8,
  },
});
