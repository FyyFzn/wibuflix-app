import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, Dimensions, BackHandler, useWindowDimensions, Animated
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../styles/playerStyles';
import { Colors } from '../styles/theme';
import { ServerItem } from '../services/api';
import { updateProgress, getProgress, formatDuration } from '../services/storage';
import PlayerNativeControls from '../components/player/PlayerNativeControls';
import PlayerWebView from '../components/player/PlayerWebView';
import PlayerModals from '../components/player/PlayerModals';

// Custom Hooks
import { usePlayerState } from '../hooks/usePlayerState';
import { useServerPlayback } from '../hooks/useServerPlayback';
import { useDoubleTapSkip } from '../hooks/useDoubleTapSkip';
import { useFullscreen } from '../hooks/useFullscreen';
import { useEpisodeNavigation } from '../hooks/useEpisodeNavigation';

const getHostName = (srv: ServerItem) => {
  if (srv.namaHost) return srv.namaHost.toLowerCase();
  const nama = srv.nama || '';
  const parts = nama.split('·');
  let candidate = (parts[parts.length - 1].trim().split(' ')[0] || 'unknown').toLowerCase();

  if (candidate === 'server' || candidate === 'unknown') {
    candidate = 'alternatif';
  }

  if (srv.source && srv.source === 'Otakudesu') {
    candidate = `[otaku] ${candidate}`;
  }

  return candidate;
};

export default function PlayerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ url: string; urls?: string; gambar: string; seriUrl: string; judul: string; seriJudul?: string; autoPlayHost?: string; autoFullscreen?: string; }>();

  // 1. Initialize State Hook
  const state = usePlayerState(params.judul || '');

  // 2. Initialize Navigation Hook
  const { episodes, setEpisodes, navPrev, setNavPrev, navNext, setNavNext } = useEpisodeNavigation(params.seriUrl, params.url, null, null);


  const videoSource = state.nativeVideoUrl ? {
    uri: state.nativeVideoUrl,
    headers: Object.keys(state.nativeVideoHeaders).length > 0 ? state.nativeVideoHeaders : {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0',
    }
  } : null;

  const player = useVideoPlayer(videoSource, (player) => {
    player.preservesPitch = true;
    player.play();
  });

  const { status, error: playerError } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // 3. Initialize Playback Hook
  const playback = useServerPlayback(state, player);

  // 4. Initialize Fullscreen Hook
  const webviewRef = useRef<WebView>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(params.autoFullscreen === '1', webviewRef, state.playerMode);

  // 5. Initialize DoubleTap Skip Hook
  const { skipInfo, rippleAnim, playerLayoutWidth, setPlayerLayoutWidth, handleDoubleTapSkip } = useDoubleTapSkip(player);

  const stopAllMedia = useCallback(() => {
    try {
      if (player) player.pause();
    } catch (e) { }
    try {
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('var v=document.querySelectorAll("video");for(var i=0;i<v.length;i++){v[i].pause();}true;');
      }
    } catch (e) { }
  }, [player]);

  const saveCurrentProgress = useCallback(async () => {
    if (state.currentEpisodeUrlRef.current && state.currentPosition > 0) {
      await updateProgress(state.currentEpisodeUrlRef.current, state.currentPosition, state.totalDuration, state.activeHost);
    }
  }, [state.currentPosition, state.totalDuration, state.activeHost]);

  // Handle native player status / auto-webview fallback
  useEffect(() => {
    if (status === 'error' && playerError && state.playerMode === 'native' && state.fallbackWebviewUrl) {
      if (state.retryCount < 2) {
        console.log(`Native Player Error: ${playerError.message}. Retrying extraction (${state.retryCount + 1}/2)...`);
        state.setRetryCount((prev: number) => prev + 1);

        if (state.abortControllerRef.current) state.abortControllerRef.current.abort();
        state.abortControllerRef.current = new AbortController();
        const signal = state.abortControllerRef.current.signal;

        playback.playServer(state.fallbackWebviewUrl, state.activeServerName, true, signal).then(success => {
          if (signal.aborted) return;
          if (!success) {
            state.setPlayerMode('webview');
            state.setWebviewUrl(state.fallbackWebviewUrl);
            state.setNativeVideoUrl('');
            state.setFallbackWebviewUrl('');
            state.setRetryCount(0);
          }
        });
      } else {
        console.log('Max retries reached. Falling back to WebView');
        state.setPlayerMode('webview');
        state.setWebviewUrl(state.fallbackWebviewUrl);
        state.setNativeVideoUrl('');
        state.setFallbackWebviewUrl('');
        state.setRetryCount(0);
      }
    }
  }, [status, playerError, state.playerMode, state.fallbackWebviewUrl]);

  // Load speed settings
  useEffect(() => {
    AsyncStorage.getItem('playback_speed').then(val => {
      if (val) state.setPlaybackSpeed(parseFloat(val));
    });
  }, []);

  // Sync playback speed with native player
  useEffect(() => {
    if (player && state.playerMode === 'native' && status === 'readyToPlay') {
      player.playbackRate = state.playbackSpeed;
    }
  }, [state.playbackSpeed, player, state.playerMode, status]);

  const changeSpeed = async (speed: number) => {
    state.setPlaybackSpeed(speed);
    await AsyncStorage.setItem('playback_speed', speed.toString());
    state.setShowSpeedModal(false);
  };

  // Restore saved progress
  useEffect(() => {
    if (status === 'readyToPlay' && state.nativeVideoUrl) {
      if (player.duration) {
        state.setTotalDuration(Math.floor(player.duration));
      }

      if (state.restoredVideoUrl !== state.nativeVideoUrl && state.savedProgress > 5) {
        console.log(`[Resume] Seeking to ${state.savedProgress}s on ${state.nativeVideoUrl.substring(0, 60)}`);
        player.currentTime = state.savedProgress;
        state.setRestoredVideoUrl(state.nativeVideoUrl);

        const retryTimer = setTimeout(() => {
          try {
            if (Math.floor(player.currentTime) < state.savedProgress - 3) {
              console.log(`[Resume] Retry seek to ${state.savedProgress}s (was at ${Math.floor(player.currentTime)}s)`);
              player.currentTime = state.savedProgress;
            }
          } catch { }
        }, 1500);
        return () => clearTimeout(retryTimer);
      }
    }
  }, [status, player, state.savedProgress, state.restoredVideoUrl, state.nativeVideoUrl]);

  // Progress tracking interval
  useEffect(() => {
    if (state.playerMode === 'native' && isPlaying) {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
      state.progressIntervalRef.current = setInterval(() => {
        try {
          const curr = Math.floor(player.currentTime || 0);
          state.setCurrentPosition(curr);
          state.lastKnownPositionRef.current = curr;
          if (curr > 0 && params.url) {
            updateProgress(params.url, curr, Math.floor(player.duration || 0));
          }
        } catch (e) {
          if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
        }
      }, 1000);
    } else {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
    }

    return () => {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
    };
  }, [state.playerMode, isPlaying, params.url, player]);

  // Load episode on mount or params.url change
  useEffect(() => {
    state.isMounted.current = true;

    if (params.autoFullscreen === '1') {
      enterFullscreen();
    } else {
      exitFullscreen();
    }

    if (params.url) {
      state.setRestoredVideoUrl('');
      state.setSavedProgress(0);
      let realUrl = params.url as string;
      if (realUrl.includes('___HASH_NEOSATSU___')) {
        realUrl = realUrl.replace('___HASH_NEOSATSU___', '#neosatsu_ep_');
      }
      getProgress(realUrl).then(saved => {
        if (saved && saved.progress > 5) state.setSavedProgress(saved.progress);
      });
      playback.loadEpisode(realUrl, params).then((data: any) => {
        if (data) {
          if (data.nav_prev) setNavPrev(data.nav_prev);
          if (data.nav_next) setNavNext(data.nav_next);
        }
      });
    }
    return () => {
      state.isMounted.current = false;
      stopAllMedia();
      if (state.abortControllerRef.current) {
        state.abortControllerRef.current.abort();
      }
      saveCurrentProgress();
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
    };
  }, [params.url]);

  const handleUIBackPress = useCallback(() => {
    saveCurrentProgress();
    stopAllMedia();
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        router.replace('/');
      }
    } catch (e) {
      router.replace('/');
    }
  }, [saveCurrentProgress, navigation, router]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isFullscreen) {
          exitFullscreen();
          return true; // Hanya kembalikan ke portrait, jangan keluar player
        }
        handleUIBackPress();
        return true;
      });
      return () => backHandler.remove();
    }, [isFullscreen, handleUIBackPress, exitFullscreen])
  );

  const navigateEpisode = (url: string) => {
    stopAllMedia();
    setTimeout(() => {
      state.setShowEpisodesModal(false);
      saveCurrentProgress();
      state.isMounted.current = false;
      if (state.abortControllerRef.current) state.abortControllerRef.current.abort();

      let safeUrl = url;
      if (safeUrl.includes('#neosatsu_ep_')) {
        safeUrl = safeUrl.replace('#neosatsu_ep_', '___HASH_NEOSATSU___');
      }

      const targetEp = episodes.find(e =>
        e.url === url ||
        (e.url && e.url.includes('#neosatsu_ep_') && url.includes('#neosatsu_ep_') && e.url.split('#')[1] === url.split('#')[1])
      );
      const nextJudul = targetEp ? targetEp.judul : '';

      router.replace({
        pathname: '/player',
        params: {
          url: safeUrl,
          gambar: params.gambar,
          seriUrl: params.seriUrl,
          judul: nextJudul,
          seriJudul: params.seriJudul,
          autoPlayHost: state.preferredHostRef.current || state.activeHost,
          autoFullscreen: isFullscreen ? '1' : '0'
        }
      });
    }, 500);
  };

  // Auto-next logic
  useEffect(() => {
    if (state.totalDuration > 0 && state.currentPosition > 0 && navNext) {
      if (state.currentPosition >= state.totalDuration - 2) {
        console.log('[Auto-Next] Triggered navigateEpisode');
        navigateEpisode(navNext);
      }
    }
  }, [state.currentPosition, state.totalDuration, navNext]);

  const isSkipOPVisible = state.controlsVisible && state.totalDuration > 0 && state.currentPosition < 360;
  const isSkipEDVisible = state.controlsVisible && state.totalDuration > 0 && state.currentPosition >= state.totalDuration - 90 && state.currentPosition < state.totalDuration - 2;

  const handleSkipOP = (e: any) => {
    e.stopPropagation();
    if (state.playerMode === 'native' && player) {
      player.currentTime = Math.min(state.totalDuration, (player.currentTime || 0) + 85);
    } else if (state.playerMode === 'webview') {
      skipWebview(85);
    }
  };

  const handleSkipED = (e: any) => {
    e.stopPropagation();
    if (navNext) navigateEpisode(navNext);
  };

  const skipWebview = (amount: number) => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        try {
          const v = document.querySelector('video');
          if (v) {
            v.currentTime = Math.max(0, v.currentTime + (${amount}));
          }
        } catch(e){}
        true;
      `);
    }
    if (state.webviewControlsTimeoutRef.current) clearTimeout(state.webviewControlsTimeoutRef.current);
    state.webviewControlsTimeoutRef.current = setTimeout(() => state.setShowWebviewControls(false), 4000);
  };

  const toggleControls = () => {
    state.setControlsVisible(!state.controlsVisible);
    if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    if (!state.controlsVisible && isPlaying) {
      state.controlsTimeoutRef.current = setTimeout(() => state.setControlsVisible(false), 4000);
    }
  };

  const handleVideoTap = (evt: any) => {
    handleDoubleTapSkip(evt, state.controlsVisible, toggleControls);
  };

  useEffect(() => {
    if (isPlaying) {
      if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
      state.controlsTimeoutRef.current = setTimeout(() => state.setControlsVisible(false), 4000);
    } else {
      state.setControlsVisible(true);
      if (state.controlsTimeoutRef.current) clearTimeout(state.controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  const { width: screenWidth } = useWindowDimensions();
  const playerWrapperStyle = isFullscreen
    ? { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#000' }
    : { height: (screenWidth * 9) / 16 };

  // WebView Javascript setup
  const activeHostItems = state.servers.filter(s => getHostName(s) === state.activeHost);
  const isBlogger = state.activeHost.toLowerCase().includes('blog');
  const isVidhide = state.activeHost.toLowerCase().includes('vidhide') || state.activeHost.toLowerCase().includes('vidlion');
  const isGdrive = state.activeHost.toLowerCase().includes('drive') || state.activeHost.toLowerCase().includes('gdrive');
  const isMega = state.activeHost.toLowerCase().includes('mega');

  let injectedJS = `
    window.open = function() { return null; };
    window.hasRestoredProgress = false;
    document.addEventListener('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'webviewClick'}));
    }, true);
    document.addEventListener('touchstart', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webviewClick' }));
    }, {passive: true, capture: true});

    ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
      document.addEventListener(evt, () => {
        const isFS = document.fullscreenElement || document.webkitFullscreenElement;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: isFS ? 'fullscreen' : 'exitFullscreen' }));
      });
    });
  `;

  if (isBlogger || isGdrive) {
    injectedJS += `
      let extracted = false;
      setInterval(() => {
        if(extracted) return;
        try {
          const playBtn = document.querySelector('.ytp-large-play-button, .play-button, button, .ndfHFb-c4YZDc-Wrql6b, [role="button"]');
          if (playBtn) playBtn.click();
          
          const v = document.querySelector('video');
          if (v && v.src && v.src.startsWith('http') && !v.src.startsWith('blob:')) {
            extracted = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoUrl', url: v.src }));
          }
        } catch(e){}
      }, 500);
    `;
  }

  if (isVidhide) {
    injectedJS += `
      setInterval(() => {
        try {
          const overlays = document.querySelectorAll('div, iframe');
          overlays.forEach(o => {
             const z = window.getComputedStyle(o).zIndex;
             if (z && !isNaN(z) && parseInt(z) > 1000 && o.id !== 'vjs_video_3') {
                o.style.display = 'none';
              }
          });
        } catch(e){}
      }, 1000);
    `;
  }

  if (isMega) {
    injectedJS += `
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    `;
  }

  if (!isBlogger && !isGdrive) {
    injectedJS += `
      console.log('[InjectedJS] savedProgress=${state.savedProgress}');
      setInterval(() => {
        try {
          const v = document.querySelector('video');
          if (v) {
             if (v.paused) {
                v.play().catch(()=>{});
             }
             if (!window.hasRestoredProgress && ${state.savedProgress} > 5 && v.readyState >= 1) {
                v.currentTime = ${state.savedProgress};
                window.hasRestoredProgress = true;
             }
             if (v.currentTime > 5 && v.duration > 0 && !v.paused) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                   type: 'progress', 
                   currentTime: v.currentTime, 
                   duration: v.duration 
                }));
             }
          }
        } catch(e){}
      }, 1000);
    `;
  }

  injectedJS += "true;";

  const availableSources = React.useMemo(() => {
    const sources = new Set(state.servers.map(s => s.source || 'Samehadaku'));
    return Array.from(sources);
  }, [state.servers]);

  useEffect(() => {
    if (availableSources.length > 0 && !availableSources.includes(state.serverTab)) {
      state.setServerTab(availableSources[0]);
    }
  }, [availableSources, state.serverTab]);

  const visibleServers = React.useMemo(() => {
    return state.servers.filter(s => (s.source || 'Samehadaku') === state.serverTab);
  }, [state.servers, state.serverTab]);

  const getResName = (nama: string) => {
    const p = nama.split('·');
    return p[0]?.trim() || 'Default';
  };

  return (
    <>
      <StatusBar
        hidden={isFullscreen}
        translucent
        backgroundColor="transparent"
      />
      <SafeAreaView style={styles.container} edges={isFullscreen ? [] : ['top']}>
        {!isFullscreen && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={handleUIBackPress}>
              <Text style={styles.backText}>← Kembali</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{state.title}</Text>
          </View>
        )}

        <View style={[styles.playerWrapper, playerWrapperStyle]}>
          {(state.loading || state.playerLoading) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.overlayText}>{state.loading ? 'Mencari server...' : 'Menyiapkan video...'}</Text>
            </View>
          )}

          {state.playerMode === 'native' && state.nativeVideoUrl ? (
            <View style={{ flex: 1 }}>
              <VideoView player={player} style={styles.video} nativeControls={false} />
              {playerError && (
                <View style={{ position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(255,0,0,0.8)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: 'white', fontSize: 12 }}>{playerError.message || 'Unknown Player Error'}</Text>
                </View>
              )}
              <PlayerNativeControls
                player={player} status={status} title={state.title} isFullscreen={isFullscreen} controlsVisible={state.controlsVisible}
                isPlaying={isPlaying} currentPosition={state.currentPosition} totalDuration={state.totalDuration}
                playbackSpeed={state.playbackSpeed} activeServerName={state.activeServerName} activeHostItems={activeHostItems}
                episodes={episodes} navPrev={navPrev} navNext={navNext} skipInfo={skipInfo} rippleAnim={rippleAnim}
                isSkipOPVisible={isSkipOPVisible} isSkipEDVisible={isSkipEDVisible}
                handleVideoTap={handleVideoTap} setPlayerLayoutWidth={setPlayerLayoutWidth}
                exitFullscreen={exitFullscreen} enterFullscreen={enterFullscreen}
                setShowSpeedModal={state.setShowSpeedModal} setShowResModal={state.setShowResModal}
                setShowEpisodesModal={state.setShowEpisodesModal} getResName={getResName}
                navigateEpisode={navigateEpisode} formatDuration={formatDuration}
                controlsTimeoutRef={state.controlsTimeoutRef} setControlsVisible={state.setControlsVisible}
                handleSkipOP={handleSkipOP} handleSkipED={handleSkipED}
              />
            </View>
          ) : state.playerMode === 'webview' && state.webviewUrl ? (
            <PlayerWebView
              webviewRef={webviewRef} webviewUrl={state.webviewUrl} isBlogger={isBlogger} injectedJS={injectedJS}
              isFullscreen={isFullscreen} showWebviewControls={state.showWebviewControls}
              setShowWebviewControls={state.setShowWebviewControls} setPlayerMode={state.setPlayerMode}
              setNativeVideoUrl={state.setNativeVideoUrl} setWebviewUrl={state.setWebviewUrl}
              setCurrentPosition={state.setCurrentPosition} setTotalDuration={state.setTotalDuration}
              lastKnownPositionRef={state.lastKnownPositionRef} enterFullscreen={enterFullscreen}
              exitFullscreen={exitFullscreen} setPlayerLoading={state.setPlayerLoading}
              handleUIBackPress={handleUIBackPress} navPrev={navPrev} navNext={navNext}
              navigateEpisode={navigateEpisode} webviewControlsTimeoutRef={state.webviewControlsTimeoutRef}
              isSkipOPVisible={isSkipOPVisible} isSkipEDVisible={isSkipEDVisible}
              handleSkipOP={handleSkipOP} handleSkipED={handleSkipED}
              playbackSpeed={state.playbackSpeed} setShowSpeedModal={state.setShowSpeedModal}
            />
          ) : !state.loading && state.error ? (
            <View style={styles.playerError}>
              {isFullscreen && (
                <TouchableOpacity style={styles.wvPermExitBtn} onPress={exitFullscreen}>
                  <Ionicons name="contract" size={24} color={Colors.white} />
                  <Text style={[styles.wvPermExitText, { marginLeft: 8 }]}>Tutup Fullscreen</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.playerErrorText}>{state.error}</Text>
            </View>
          ) : null}
        </View>

        {!isFullscreen && (
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
              <TouchableOpacity style={[styles.navBtn, !navPrev && styles.navBtnDisabled]} onPress={() => navPrev && navigateEpisode(navPrev)} disabled={!navPrev}>
                <Text style={[styles.navBtnText, !navPrev && styles.navBtnTextDisabled]}>« Episode Sebelumnya</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navBtn, !navNext && styles.navBtnDisabled]} onPress={() => navNext && navigateEpisode(navNext)} disabled={!navNext}>
                <Text style={[styles.navBtnText, !navNext && styles.navBtnTextDisabled]}>Episode Selanjutnya »</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        <PlayerModals
          showEpisodesModal={state.showEpisodesModal} setShowEpisodesModal={state.setShowEpisodesModal}
          episodes={episodes} currentUrl={params.url as string} navigateEpisode={navigateEpisode}
          showResModal={state.showResModal} setShowResModal={state.setShowResModal} activeHost={state.activeHost}
          activeHostItems={activeHostItems} activeServerName={state.activeServerName}
          handleSelectResolution={(srv) => playback.handleSelectResolution(srv, params, stopAllMedia, saveCurrentProgress)} getResName={getResName}
          showSpeedModal={state.showSpeedModal} setShowSpeedModal={state.setShowSpeedModal}
          playbackSpeed={state.playbackSpeed} changeSpeed={changeSpeed}
        />

      </SafeAreaView>
    </>
  );
}
