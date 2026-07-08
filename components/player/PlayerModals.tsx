import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ScrollView } from 'react-native';
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

  const groupedServers = React.useMemo(() => {
    const groups: Record<string, ServerItem[]> = {};
    activeHostItems.forEach(srv => {
      let format = 'Video';
      const nameUpper = srv.nama.toUpperCase();
      if (nameUpper.includes('MKV')) format = 'MKV';
      else if (nameUpper.includes('MP4')) format = 'MP4';
      else if (nameUpper.includes('X265') || nameUpper.includes('HEVC')) format = 'x265';
      
      if (!groups[format]) groups[format] = [];
      groups[format].push(srv);
    });
    return groups;
  }, [activeHostItems]);

  return (
    <>
      {/* Episodes Modal */}
      <Modal visible={showEpisodesModal} transparent animationType="fade" onRequestClose={() => setShowEpisodesModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daftar Episode</Text>
              <FlatList
              data={episodes}
              keyExtractor={(item) => item.url || item.judul}
              renderItem={({item}) => {
                const epUrl = item.url || (item.urls ? item.urls.samehadaku || item.urls.otakudesu || item.urls.kuronime || item.urls.nanime || item.urls.neosatsu || item.urls.nimegami : '');
                return (
                <TouchableOpacity 
                  style={[styles.modalItem, currentUrl === epUrl && styles.modalItemActive]}
                  onPress={() => epUrl && navigateEpisode(epUrl)}
                >
                  <Text style={[styles.modalItemText, currentUrl === epUrl && styles.modalItemTextActive]}>{item.judul}</Text>
                </TouchableOpacity>
              )}}
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
            <Text style={styles.modalTitle}>Server: {activeHost.toUpperCase()}</Text>
            
            <ScrollView style={{ maxHeight: 350 }}>
              {Object.keys(groupedServers).map(format => (
                <View key={format} style={styles.formatBlock}>
                  <Text style={styles.formatTitle}>Format: {format}</Text>
                  <View style={styles.resolutionRow}>
                    {groupedServers[format].map((srv, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.resChip, activeServerName === srv.nama && styles.resChipActive]} 
                        onPress={() => handleSelectResolution(srv)}
                      >
                        <Text style={[styles.resChipText, activeServerName === srv.nama && styles.resChipTextActive]}>
                          {getResName(srv.nama).replace(/MKV|MP4|x265|HEVC/i, '').trim() || 'Play'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

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
