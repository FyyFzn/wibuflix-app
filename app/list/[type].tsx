import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import CatalogView from '../../components/CatalogView';
import { Colors } from '../../styles/theme';

export default function DynamicListScreen() {
  const { type, headerTitle } = useLocalSearchParams<{ type: string; headerTitle?: string }>();

  let category: 'anime' | 'toku' | 'all' = 'all';
  let sortMode: 'latest' | 'az' = 'az';
  if (type === 'latest_anime') {
    category = 'anime';
    sortMode = 'latest';
  } else if (type === 'latest_toku') {
    category = 'toku';
    sortMode = 'latest';
  }

  const title = headerTitle || (category === 'anime' ? 'Anime Terbaru' : category === 'toku' ? 'Toku Terbaru' : 'Daftar');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Kembali',
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
        }}
      />
      <CatalogView category={category} sort={sortMode} hideSearchBar={true} />
    </View>
  );
}
