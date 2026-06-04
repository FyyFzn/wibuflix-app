import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CatalogView from '../../components/CatalogView';

import { Colors } from '../../styles/theme';

export default function AnimeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top']}>
      <CatalogView category="anime" />
    </SafeAreaView>
  );
}
