import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import CatalogView from '../../components/CatalogView';
import { Colors } from '../../styles/theme';

export default function DynamicListScreen() {
  const { type, headerTitle } = useLocalSearchParams<{ type: string; headerTitle?: string }>();

  let category: 'anime' | 'toku' | 'all' = 'all';
  if (type === 'latest_anime') category = 'anime';
  else if (type === 'latest_toku') category = 'toku';

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
      <CatalogView category={category} hideSearchBar={true} />
    </View>
  );
}
