import React, { useCallback } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';

export function useTabBackHandler(isRootTab = false) {
  const navigation = useNavigation();
  const lastBackPressRef = React.useRef(0);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!isRootTab) {
          // Jika berada di tab selain Beranda (Katalog, Riwayat, Antrean),
          // gunakan navigation.navigate('index') untuk pindah tab secara natif tanpa unmount/exit
          try {
            (navigation as any).navigate('index');
          } catch (e) {
            // Fallback aman
          }
          return true;
        }

        // Jika berada di Beranda, tekan 2x dalam 2 detik untuk keluar aplikasi
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }

        lastBackPressRef.current = now;
        ToastAndroid.show('Tekan sekali lagi untuk keluar', ToastAndroid.SHORT);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [isRootTab, navigation])
  );
}
