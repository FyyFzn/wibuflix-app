import React from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/theme';
import { Platform, BackHandler, ToastAndroid } from 'react-native';

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const backPressCount = React.useRef(0);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // Jika router bisa mundur ke halaman sebelumnya (misal sedang di detail anime)
      if (router.canGoBack()) {
        router.back();
        return true; // Berhasil mundur, jangan keluar aplikasi
      }

      // Jika kita berada di halaman-halaman utama (tabs)
      const isRoot = ['/', '/anime', '/tokusatsu', '/history'].includes(pathname);
      
      if (isRoot) {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          ToastAndroid.show('Tekan sekali lagi untuk keluar', ToastAndroid.SHORT);
          
          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);
          
          return true;
        } else {
          BackHandler.exitApp();
          return true;
        }
      }
      
      // Fallback jika tidak tertangkap
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pathname, router]);

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
        name="anime"
        options={{
          title: 'Anime',
          tabBarIcon: ({ color }) => <Ionicons name="tv" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tokusatsu"
        options={{
          title: 'Tokusatsu',
          tabBarIcon: ({ color }) => <Ionicons name="flash" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
