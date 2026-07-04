import React, { useCallback } from 'react';
import { Tabs, usePathname, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';
import { BackHandler, ToastAndroid } from 'react-native';

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();



  const lastBackPressRef = React.useRef(0);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Jika sedang berada di tab selain Beranda (misal Katalog, Riwayat, Antrean),
        // maka tombol Back fisik akan membawa pengguna kembali ke tab Beranda terlebih dahulu!
        if (pathname !== '/' && pathname !== '/index') {
          router.replace('/');
          return true;
        }

        // Jika sudah di Beranda, tekan 2x dalam 2 detik untuk keluar dari aplikasi
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
    }, [pathname, router])
  );

  return (
    <Tabs
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
    </Tabs>
  );
}
