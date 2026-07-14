import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: '#333',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="katalog"
        options={{
          title: 'Katalog',
          tabBarIcon: ({ color }) => <Ionicons name="library" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Antrean',
          tabBarIcon: ({ color }) => <Ionicons name="cloud-download" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Kurasi',
          tabBarIcon: ({ color }) => <Ionicons name="construct" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

