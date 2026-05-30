/**
 * LoadingOverlay — Full-screen loading spinner with message.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../styles/theme';

interface LoadingOverlayProps {
  message?: string;
  visible?: boolean;
}

export default function LoadingOverlay({
  message = 'Memuat data...',
  visible = true,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.spinnerGlow}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.xl,
  },
  spinnerGlow: {
    padding: Spacing.lg,
  },
  text: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    letterSpacing: 0.5,
  },
});
