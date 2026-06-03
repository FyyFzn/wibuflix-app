import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/playerStyles';
import { Colors } from '../../styles/theme';
import { ServerItem, EpisodeItem } from '../../services/api';

interface PlayerNativeControlsProps {
  player: any;
  title: string;
  isFullscreen: boolean;
  controlsVisible: boolean;
  isPlaying: boolean;
  currentPosition: number;
  totalDuration: number;
  playbackSpeed: number;
  activeServerName: string;
  activeHostItems: ServerItem[];
  episodes: EpisodeItem[];
  navPrev: string | null;
  navNext: string | null;
  skipInfo: { side: 'left' | 'right', amount: number } | null;
  rippleAnim: Animated.Value;
  isSkipOPVisible: boolean;
  isSkipEDVisible: boolean;
  
  handleVideoTap: (evt: any) => void;
  setPlayerLayoutWidth: (width: number) => void;
  exitFullscreen: () => void;
  enterFullscreen: () => void;
  setShowSpeedModal: (val: boolean) => void;
  setShowResModal: (val: boolean) => void;
  setShowEpisodesModal: (val: boolean) => void;
  getResName: (name: string) => string;
  navigateEpisode: (url: string) => void;
  formatDuration: (s: number) => string;
  controlsTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setControlsVisible: (val: boolean) => void;
  handleSkipOP: (e: any) => void;
  handleSkipED: (e: any) => void;
}

export default function PlayerNativeControls({
  player, title, isFullscreen, controlsVisible, isPlaying, currentPosition, totalDuration,
  playbackSpeed, activeServerName, activeHostItems, episodes, navPrev, navNext,
  skipInfo, rippleAnim, isSkipOPVisible, isSkipEDVisible,
  handleVideoTap, setPlayerLayoutWidth, exitFullscreen, enterFullscreen,
  setShowSpeedModal, setShowResModal, setShowEpisodesModal, getResName,
  navigateEpisode, formatDuration, controlsTimeoutRef, setControlsVisible,
  handleSkipOP, handleSkipED
}: PlayerNativeControlsProps) {
  // State untuk seek preview bubble
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingValue, setSeekingValue] = useState(0);
  const [seekBubbleLeft, setSeekBubbleLeft] = useState(0);
  const sliderWidthRef = useRef(0);

  const getSeekBubbleLeft = (val: number, max: number, sliderWidth: number) => {
    const THUMB_RADIUS = 10;
    const BUBBLE_WIDTH = 68;
    const percent = max > 0 ? val / max : 0;
    const rawLeft = percent * (sliderWidth - THUMB_RADIUS * 2) + THUMB_RADIUS - BUBBLE_WIDTH / 2;
    return Math.max(0, Math.min(rawLeft, sliderWidth - BUBBLE_WIDTH));
  };
  return (
    <Pressable 
      style={styles.touchOverlay} 
      onLayout={(e) => setPlayerLayoutWidth(e.nativeEvent.layout.width)}
      onPress={handleVideoTap}
    >
      {skipInfo && (
        <Animated.View 
          style={[
            styles.skipIndicator, 
            skipInfo.side === 'left' ? styles.skipLeft : styles.skipRight,
            {
              opacity: rippleAnim.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0]
              }),
              transform: [{
                scale: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.5]
                })
              }]
            }
          ]}
        >
           <View style={styles.skipBubble}>
             <Ionicons name={skipInfo.side === 'left' ? 'play-back' : 'play-forward'} size={32} color={Colors.white} />
             <Text style={styles.skipText}>{skipInfo.amount > 0 ? '+' : ''}{skipInfo.amount}s</Text>
           </View>
        </Animated.View>
      )}
      {controlsVisible && (
        <View style={styles.controlsUI}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            {isFullscreen && (
              <TouchableOpacity style={styles.ctrlBtn} onPress={exitFullscreen}>
                <Text style={styles.ctrlBtnText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={styles.flex1}>
              {isFullscreen && <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>}
            </View>
            <View style={styles.topRightActions}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowSpeedModal(true)}>
                <Text style={styles.ctrlBtnText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
              {activeHostItems.length > 0 && (
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowResModal(true)}>
                  <Text style={styles.ctrlBtnText}>{getResName(activeServerName)}</Text>
                </TouchableOpacity>
              )}
              {episodes.length > 0 && (
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowEpisodesModal(true)}>
                  <Text style={styles.ctrlBtnText}>Eps</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Center Play/Pause */}
          <View style={styles.centerControls}>
            <TouchableOpacity 
              style={styles.playPauseBtn} 
              onPress={() => isPlaying ? player.pause() : player.play()}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} style={[styles.playPauseIcon, isPlaying ? styles.ml0 : styles.ml4]} />
            </TouchableOpacity>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatDuration(currentPosition)}</Text>
            <View
              style={styles.sliderContainer}
              onLayout={(e) => { sliderWidthRef.current = e.nativeEvent.layout.width; }}
            >
              {/* Seek Preview Bubble */}
              {isSeeking && (
                <View
                  style={[
                    styles.seekBubble,
                    { left: seekBubbleLeft }
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.seekBubbleText}>{formatDuration(Math.round(seekingValue))}</Text>
                </View>
              )}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={totalDuration || 1}
                value={currentPosition}
                onValueChange={(val) => {
                  if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                  setIsSeeking(true);
                  setSeekingValue(val);
                  setSeekBubbleLeft(
                    getSeekBubbleLeft(val, totalDuration || 1, sliderWidthRef.current)
                  );
                }}
                onSlidingComplete={(val) => {
                  setIsSeeking(false);
                  player.currentTime = val;
                  controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4000);
                }}
                minimumTrackTintColor={Colors.accent}
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor={Colors.accent}
              />
            </View>
            <Text style={styles.timeText}>{formatDuration(totalDuration)}</Text>
            
            <View style={styles.bottomRightGroup}>
              <TouchableOpacity style={styles.smallNavBtn} onPress={() => navPrev && navigateEpisode(navPrev)} disabled={!navPrev}>
                <Text style={[styles.smallNavIcon, !navPrev && styles.opacity30]}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallNavBtn} onPress={() => navNext && navigateEpisode(navNext)} disabled={!navNext}>
                <Text style={[styles.smallNavIcon, !navNext && styles.opacity30]}>⏭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallNavBtn} onPress={isFullscreen ? exitFullscreen : enterFullscreen}>
                <Text style={styles.smallNavIcon}>{isFullscreen ? '✕' : '⛶'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Native Skip Overlays */}
          {isSkipOPVisible && (
            <TouchableOpacity style={styles.skipOpBtn} onPress={handleSkipOP}>
              <Text style={styles.skipOpText}>Skip Opening ⇥</Text>
            </TouchableOpacity>
          )}
          {isSkipEDVisible && navNext && (
            <TouchableOpacity style={styles.skipEdBtn} onPress={handleSkipED}>
              <Text style={styles.skipOpText}>Episode Selanjutnya ⏭</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Pressable>
  );
}
