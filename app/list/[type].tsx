import React, { useCallback } from 'react';
import { View, BackHandler } from 'react-native';
import { useLocalSearchParams, Stack, useNavigation, useFocusEffect } from 'expo-router';
import CatalogView from '../../components/CatalogView';
import { Colors } from '../../styles/theme';

export default function DynamicListScreen() {
  const { type, headerTitle } = useLocalSearchParams<{ type: string; headerTitle?: string }>();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          try {
            (navigation as any).navigate('(tabs)' as never);
          } catch (e) {}
        }
        return true; // Cegah Android keluar aplikasi!
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation])
  );

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
