import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/playerStyles';
import { Colors } from '../../styles/theme';

interface PlayerLoadingOverlayProps {
  loading: boolean;
  playerLoading: boolean;
  uploadProgress?: string;
}

export default function PlayerLoadingOverlay({
  loading,
  playerLoading,
  uploadProgress,
}: PlayerLoadingOverlayProps) {
  if (!loading && !playerLoading) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={Colors.accent} style={{ marginBottom: 16 }} />
      {uploadProgress ? (
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.border2,
          alignItems: 'center',
          gap: 8
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="cloud-upload" size={20} color={Colors.accent} />
            <Text style={{ color: Colors.white, fontSize: 15, fontWeight: 'bold' }}>Memproses Video ke Azure</Text>
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            {uploadProgress}
          </Text>
        </View>
      ) : (
        <Text style={styles.overlayText}>{loading ? 'Mencari server...' : 'Menyiapkan video...'}</Text>
      )}
    </View>
  );
}
