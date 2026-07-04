/**
 * AnimeCard — Grid card for anime catalog and history.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 3;
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface AnimeCardProps {
  judul: string;
  gambar: string;
  tipe?: string;
  skor?: string;
  status?: string;
  onPress: (item?: any) => void;
  itemData?: any;
  // History-specific props
  nomorEp?: string;
  progress?: number;
  duration?: number;
  waktuLabel?: string;
  customStyle?: any;
  hideTitle?: boolean;
}

function getBadgeColor(tipe: string): string {
  const t = tipe.toUpperCase();
  if (t === 'MOVIE') return Colors.accent;
  if (['OVA', 'ONA', 'SPECIAL'].includes(t)) return Colors.purple;
  return Colors.teal;
}

const AnimeCard = React.memo(function AnimeCard({
  judul,
  gambar,
  tipe,
  skor,
  status,
  onPress,
  nomorEp,
  progress,
  duration,
  waktuLabel,
  customStyle,
  hideTitle,
  itemData,
}: AnimeCardProps) {
  const progressPercent = duration && duration > 0 ? Math.min((progress || 0) / duration, 1) : 0;

  return (
    <TouchableOpacity
      style={[styles.card, customStyle]}
      onPress={() => onPress(itemData)}
      activeOpacity={0.7}
    >
      <View style={styles.imgContainer}>
        <Image
          source={{ uri: gambar }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {/* Gradient overlay */}
        <View style={styles.gradient} />

        {/* Type badge */}
        {tipe && (
          <View style={[styles.badgeType, { backgroundColor: getBadgeColor(tipe) }]}>
            <Text style={styles.badgeText}>{tipe.toUpperCase()}</Text>
          </View>
        )}

        {/* Score badge */}
        {skor && skor !== '-' && (
          <View style={styles.badgeScore}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.scoreText}>{skor}</Text>
          </View>
        )}

        {/* Status / Episode count badge */}
        {status && (
          <View style={styles.badgeStatus}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        )}

        {/* History: episode badge */}
        {nomorEp && (
          <View style={styles.badgeEp}>
            <Text style={styles.badgeText}>Eps {nomorEp}</Text>
          </View>
        )}

        {/* History: progress bar */}
        {progressPercent > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
          </View>
        )}
      </View>

      {!hideTitle && (
        <Text style={styles.title} numberOfLines={2}>
          {judul}
        </Text>
      )}

      {waktuLabel && (
        <Text style={styles.timeLabel}>{waktuLabel}</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: Spacing.lg,
  },
  imgContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  image: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'transparent',
    // We use a semi-transparent gradient simulation
    // since LinearGradient needs to be imported
  },
  badgeType: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeScore: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starIcon: {
    color: Colors.star,
    fontSize: FontSize.xs,
  },
  scoreText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  badgeStatus: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  badgeEp: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  timeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 3,
  },
});

export default AnimeCard;
