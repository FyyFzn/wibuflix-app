import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';
import { MalInfo } from '../../services/api';

interface MalHeaderPanelProps {
  malInfo: MalInfo | null;
  coverImage: string;
  judulSeri: string;
}

export default React.memo(function MalHeaderPanel({ malInfo, coverImage, judulSeri }: MalHeaderPanelProps) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const router = useRouter();

  const handleAdminJump = () => {
    router.push({
      pathname: '/(tabs)/admin' as any,
      params: { q: judulSeri },
    });
  };

  if (!malInfo) {
    return (
      <View style={styles.malPanel}>
        <View style={styles.malPanelBorder} />
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.malCover} />
        ) : (
          <View style={styles.malCover} />
        )}
        <View style={styles.malInfo}>
          <Text style={styles.malTitle}>{judulSeri}</Text>
          <Text style={{ color: Colors.textMuted, marginTop: Spacing.sm }}>
            Informasi detail & metadata lengkap belum tersedia.
          </Text>
          <TouchableOpacity style={styles.btnQuickAdmin} onPress={handleAdminJump}>
            <Text style={styles.btnQuickAdminText}>🛠️ Kurasi / Kunci MAL ID</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.malPanel}>
      <View style={styles.malPanelBorder} />
      <Image source={{ uri: coverImage }} style={styles.malCover} />
      <View style={styles.malInfo}>
        <Text style={styles.malTitle}>{judulSeri}</Text>

        {/* Meta tags */}
        <View style={styles.malMeta}>
          {malInfo.malScore && (
            <View style={styles.scoreBadge}>
              <Text style={styles.starChar}>★</Text>
              <Text style={styles.scoreValue}>{malInfo.malScore}</Text>
            </View>
          )}
          {malInfo.status && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{malInfo.status}</Text>
            </View>
          )}
          {malInfo.year && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{malInfo.year}</Text>
            </View>
          )}
          {malInfo.episodes && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{malInfo.episodes} Eps</Text>
            </View>
          )}
        </View>

        {/* Genres */}
        <View style={styles.genresContainer}>
          {malInfo.genres?.map((g, i) => (
            <View key={i} style={styles.genreChip}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </View>

        {/* Synopsis */}
        {malInfo.synopsis ? (
          <>
            <Text
              style={styles.synopsis}
              numberOfLines={synopsisExpanded ? undefined : 3}
            >
              {malInfo.synopsis}
            </Text>
            <TouchableOpacity onPress={() => setSynopsisExpanded(!synopsisExpanded)}>
              <Text style={styles.toggleSynopsis}>
                {synopsisExpanded ? 'Sembunyikan sinopsis ▴' : 'Tampilkan sinopsis ▾'}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Studios */}
        {malInfo.studios && malInfo.studios.length > 0 && (
          <Text style={styles.studios}>🎬 {malInfo.studios.join(', ')}</Text>
        )}

        {/* Tombol Cepat Kurasi Admin */}
        <TouchableOpacity style={styles.btnQuickAdmin} onPress={handleAdminJump}>
          <Text style={styles.btnQuickAdminText}>🛠️ Kurasi Anime Ini (MAL ID / Merge)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});


const styles = StyleSheet.create({
  malPanel: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
    overflow: 'hidden',
  },
  malPanelBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: Colors.accent,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
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
  malTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    lineHeight: 22,
  },
  malMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.starBg,
    borderWidth: 1,
    borderColor: Colors.starBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  starChar: {
    color: Colors.star,
    fontSize: FontSize.base,
  },
  scoreValue: {
    color: Colors.star,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  tag: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genreChip: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  genreText: {
    color: Colors.accent2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  synopsis: {
    color: Colors.textDim,
    fontSize: FontSize.md,
    lineHeight: 21,
  },
  toggleSynopsis: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  studios: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  btnQuickAdmin: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: '#eab308',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  btnQuickAdminText: {
    color: '#facc15',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});

