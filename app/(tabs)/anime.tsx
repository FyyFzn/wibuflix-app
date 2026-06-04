import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CatalogView from '../../components/CatalogView';

export default function AnimeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <CatalogView category="anime" />
    </SafeAreaView>
  );
}
