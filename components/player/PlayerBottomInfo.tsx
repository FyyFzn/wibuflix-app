import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/playerStyles';
import { Colors } from '../../styles/theme';

interface PlayerBottomInfoProps {
  navPrev?: string | null;
  navNext?: string | null;
  navigateEpisode: (url: string) => void;
}

export default function PlayerBottomInfo({
  navPrev,
  navNext,
  navigateEpisode,
}: PlayerBottomInfoProps) {
  return (
    <ScrollView style={styles.controlsContainer} contentContainerStyle={styles.controlsContent}>
      <View style={{
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border2,
        marginTop: 10,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={20} color={Colors.accent} />
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: 'bold' }}>Smart Auto-Play Premium</Text>
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 13, lineHeight: 18 }}>
          Sistem secara otomatis memilih resolusi terbaik dan mengalirkan video secara stabil langsung ke Cloud Storage.
        </Text>
        <View style={{ height: 1, backgroundColor: Colors.border2, marginVertical: 4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Status Koneksi</Text>
            <Text style={{ color: Colors.white, fontSize: 14, fontWeight: '600', marginTop: 2 }}>Terhubung (Direct Stream)</Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(46,196,182,0.15)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#2EC4B6'
          }}>
            <Text style={{ color: '#2EC4B6', fontSize: 11, fontWeight: 'bold' }}>READY</Text>
          </View>
        </View>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, !navPrev && styles.navBtnDisabled]}
          onPress={() => navPrev && navigateEpisode(navPrev)}
          disabled={!navPrev}
        >
          <Text style={[styles.navBtnText, !navPrev && styles.navBtnTextDisabled]}>« Episode Sebelumnya</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, !navNext && styles.navBtnDisabled]}
          onPress={() => navNext && navigateEpisode(navNext)}
          disabled={!navNext}
        >
          <Text style={[styles.navBtnText, !navNext && styles.navBtnTextDisabled]}>Episode Selanjutnya »</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
