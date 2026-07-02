/**
 * Root Layout — Expo Router navigation with dark theme.
 */

import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../styles/theme';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.bg,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.bg,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="anime/[id]"
          options={{
            headerTitle: 'Daftar Episode',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen
          name="player"
          options={{
            headerTitle: 'Player',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="list/[type]"
          options={{
            headerTitle: 'Daftar',
            headerBackTitle: 'Kembali',
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
