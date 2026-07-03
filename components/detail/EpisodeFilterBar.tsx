import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../styles/theme';

interface EpisodeFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: 'desc' | 'asc';
  onToggleSort: () => void;
}

export default React.memo(function EpisodeFilterBar({
  searchQuery,
  onSearchChange,
  sortOrder,
  onToggleSort,
}: EpisodeFilterBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Cari episode..."
        placeholderTextColor={Colors.textMuted}
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.sortBtn} onPress={onToggleSort}>
        <Text style={styles.sortText}>
          {sortOrder === 'desc' ? 'Terbaru ↑' : 'Terlama ↓'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 1,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    color: Colors.text,
    fontSize: FontSize.base,
  },
  sortBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 1,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
  },
  sortText: {
    color: Colors.textDim,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
