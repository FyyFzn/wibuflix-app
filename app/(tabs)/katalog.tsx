import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import CatalogView from '../../components/CatalogView';

import { Colors } from '../../styles/theme';
import { useTabBackHandler } from '../../hooks/useTabBackHandler';

export default function KatalogScreen() {
  useTabBackHandler(false); // Bukan root tab: tombol Back kembali ke Beranda ('/')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top']}>
      <CatalogView category="all" />
    </SafeAreaView>
  );
}
