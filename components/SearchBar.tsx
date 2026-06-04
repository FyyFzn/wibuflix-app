/**
 * SearchBar — Reusable search input with button.
 */

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  showButton?: boolean;
  initialValue?: string;
}

export default function SearchBar({
  placeholder = 'Cari judul anime...',
  onSearch,
  showButton = true,
  initialValue = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
      setQuery('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (!showButton) {
            onSearch(text.trim());
          }
        }}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        autoCorrect={false}
      />
      {showButton && (
        <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Cari</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    color: Colors.text,
    fontSize: FontSize.base,
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
    letterSpacing: 0.5,
  },
});
