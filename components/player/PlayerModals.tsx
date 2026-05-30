import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { styles } from '../../styles/playerStyles';
import { EpisodeItem, ServerItem } from '../../services/api';

interface PlayerModalsProps {
  // Episodes Modal
  showEpisodesModal: boolean;
  setShowEpisodesModal: (val: boolean) => void;
  episodes: EpisodeItem[];
  currentUrl: string;
  navigateEpisode: (url: string) => void;
  
  // Resolution Modal
  showResModal: boolean;
  setShowResModal: (val: boolean) => void;
  activeHost: string;
  activeHostItems: ServerItem[];
  activeServerName: string;
  handleSelectResolution: (srv: ServerItem) => void;
  getResName: (name: string) => string;
  
  // Speed Modal
  showSpeedModal: boolean;
  setShowSpeedModal: (val: boolean) => void;
  playbackSpeed: number;
  changeSpeed: (speed: number) => void;
}

export default function PlayerModals({
  showEpisodesModal, setShowEpisodesModal, episodes, currentUrl, navigateEpisode,
  showResModal, setShowResModal, activeHost, activeHostItems, activeServerName, handleSelectResolution, getResName,
  showSpeedModal, setShowSpeedModal, playbackSpeed, changeSpeed
}: PlayerModalsProps) {
  return (
    <>
      {/* Episodes Modal */}
      <Modal visible={showEpisodesModal} transparent animationType="fade" onRequestClose={() => setShowEpisodesModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daftar Episode</Text>
            <FlatList
              data={episodes}
              keyExtractor={(item) => item.url}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[styles.modalItem, currentUrl === item.url && styles.modalItemActive]}
                  onPress={() => navigateEpisode(item.url)}
                >
                  <Text style={[styles.modalItemText, currentUrl === item.url && styles.modalItemTextActive]}>{item.judul}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowEpisodesModal(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Resolution Modal */}
      <Modal visible={showResModal} transparent animationType="fade" onRequestClose={() => setShowResModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Resolusi ({activeHost.toUpperCase()})</Text>
            {activeHostItems.map((srv, idx) => (
              <TouchableOpacity key={idx} style={[styles.modalItem, activeServerName === srv.nama && styles.modalItemActive]} onPress={() => handleSelectResolution(srv)}>
                <Text style={[styles.modalItemText, activeServerName === srv.nama && styles.modalItemTextActive]}>{getResName(srv.nama)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowResModal(false)}>
              <Text style={styles.modalCloseText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Speed Modal */}
      <Modal visible={showSpeedModal} transparent animationType="fade" onRequestClose={() => setShowSpeedModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kecepatan Video</Text>
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
              <TouchableOpacity key={speed} style={[styles.modalItem, playbackSpeed === speed && styles.modalItemActive]} onPress={() => changeSpeed(speed)}>
                <Text style={[styles.modalItemText, playbackSpeed === speed && styles.modalItemTextActive]}>{speed}x {speed === 1.0 ? '(Normal)' : ''}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowSpeedModal(false)}>
              <Text style={styles.modalCloseText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
