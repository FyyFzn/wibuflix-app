import React, { useCallback } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

export function useTabBackHandler(isRootTab = false) {
  const router = useRouter();
  const lastBackPressRef = React.useRef(0);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!isRootTab) {
          // Jika berada di tab selain Beranda (Katalog, Riwayat, Antrean),
          // tombol Back akan mengarahkan pengguna kembali ke Beranda ('/')
          router.replace('/');
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
    }, [isRootTab, router])
  );
}
