import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StatusBar, BackHandler, useWindowDimensions
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../styles/playerStyles';
import { Colors } from '../styles/theme';
import { cancelUploads } from '../services/api';
import { getProgress, formatDuration } from '../services/storage';
import PlayerNativeControls from '../components/player/PlayerNativeControls';
import PlayerModals from '../components/player/PlayerModals';
import PlayerLoadingOverlay from '../components/player/PlayerLoadingOverlay';
import PlayerBottomInfo from '../components/player/PlayerBottomInfo';

// Custom Hooks & Utilities
import { usePlayerState } from '../hooks/usePlayerState';
import { useServerPlayback } from '../hooks/useServerPlayback';
import { useDoubleTapSkip } from '../hooks/useDoubleTapSkip';
import { useFullscreen } from '../hooks/useFullscreen';
import { useEpisodeNavigation } from '../hooks/useEpisodeNavigation';
import { useProgressSync } from '../hooks/useProgressSync';
import { getHostName } from '../utils/playerScripts';

export default function PlayerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ url: string; urls?: string; seriUrls?: string; sources?: string; gambar: string; seriUrl: string; judul: string; seriJudul?: string; autoPlayHost?: string; autoFullscreen?: string; uniqueId?: string; }>();

  // 1. Initialize State Hook
  const state = usePlayerState(params.judul || '');

  // 2. Initialize Navigation Hook
  const { episodes, setEpisodes, navPrev, setNavPrev, navNext, setNavNext } = useEpisodeNavigation(params.seriUrl, params.url, null, null, params.seriUrls || params.sources || params.urls);

  const isAzureBlob = state.nativeVideoUrl && state.nativeVideoUrl.includes('.blob.core.windows.net');
  let videoSource = null;
  if (state.nativeVideoUrl) {
    if (isAzureBlob) {
      videoSource = { uri: state.nativeVideoUrl };
    } else {
      videoSource = {
        uri: state.nativeVideoUrl,
        headers: Object.keys(state.nativeVideoHeaders).length > 0 ? state.nativeVideoHeaders : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0',
        }
      };
    }
  }

  const player = useVideoPlayer(videoSource, (player) => {
    player.preservesPitch = true;
    player.play();
  });

  const { status, error: playerError } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // 3. Initialize Playback Hook
  const playback = useServerPlayback(state, player);

  // 4. Initialize Fullscreen Hook
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(params.autoFullscreen === '1', { current: null }, state.playerMode);

  // 5. Initialize DoubleTap Skip Hook
  const { skipInfo, rippleAnim, playerLayoutWidth, setPlayerLayoutWidth, handleDoubleTapSkip } = useDoubleTapSkip(player);

  const stopAllMedia = useCallback(() => {
    try {
      if (player) player.pause();
    } catch (e) { }
  }, [player]);

  const navigateEpisode = useCallback((url: string) => {
    stopAllMedia();
    setTimeout(() => {
      state.setShowEpisodesModal(false);
      if (state.abortControllerRef.current) state.abortControllerRef.current.abort();

      let safeUrl = url;
      if (safeUrl.includes('#neosatsu_ep_')) {
        safeUrl = safeUrl.replace('#neosatsu_ep_', '___HASH_NEOSATSU___');
      }

      const targetEp = episodes.find(e => {
        const urlsToCheck = [
          e.urls?.kuronime,
          e.url,
          e.urls?.samehadaku,
          e.urls?.otakudesu,
          e.urls?.neosatsu
        ].filter(Boolean).map(u => decodeURIComponent(u as string));

        return urlsToCheck.some(epUrl => {
          if (epUrl === url) return true;
          if (epUrl.includes('#neosatsu_ep_') && url.includes('#neosatsu_ep_')) {
            return epUrl.split('#')[1] === url.split('#')[1];
          }
          return false;
        });
      });
      const nextJudul = targetEp ? targetEp.judul : '';
      const nextUrls = targetEp?.urls ? JSON.stringify(targetEp.urls) : undefined;
      
      let finalUrl = safeUrl;
      if (targetEp) {
          finalUrl = targetEp.url || targetEp.urls?.samehadaku || targetEp.urls?.otakudesu || targetEp.urls?.kuronime || targetEp.urls?.neosatsu || safeUrl;
      }

      router.setParams({
        url: finalUrl,
        gambar: params.gambar,
        seriUrl: params.seriUrl,
        seriUrls: params.seriUrls,
        sources: params.sources,
        judul: nextJudul,
        seriJudul: params.seriJudul,
        urls: nextUrls,
        autoPlayHost: state.preferredHostRef.current || state.activeHost,
        autoFullscreen: isFullscreen ? '1' : '0',
        uniqueId: params.uniqueId
      });
    }, 500);
  }, [stopAllMedia, state, episodes, router, params, isFullscreen]);

  // 6. Progress Synchronization Hook
  const { saveCurrentProgress } = useProgressSync({
    status,
    player,
    isPlaying,
    state,
    url: params.url as string,
    navNext,
    navigateEpisode,
  });

  // Handle native player error / retry
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
            state.setError('Gagal memutar video dari server. Silakan pilih server atau resolusi lain.');
            state.setNativeVideoUrl('');
            state.setFallbackWebviewUrl('');
            state.setRetryCount(0);
          }
        });
      } else {
        console.log('Max retries reached. Direct link not available.');
        state.setError('Gagal memutar video dari server. Silakan pilih server atau resolusi lain.');
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
    };
  }, [params.url]);

  const handleUIBackPress = useCallback(() => {
    saveCurrentProgress();
    stopAllMedia();
    cancelUploads(); // Membatalkan semua upload/prefetch yang masih berjalan di latar belakang
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e) {
      router.replace('/');
    }
  }, [saveCurrentProgress, stopAllMedia, router]);

  const isFullscreenRef = useRef(isFullscreen);
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  const handleUIBackPressRef = useRef(handleUIBackPress);
  useEffect(() => {
    handleUIBackPressRef.current = handleUIBackPress;
  }, [handleUIBackPress]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isFullscreenRef.current) {
          exitFullscreen();
          return true;
        }
        handleUIBackPressRef.current();
        return true;
      });
      return () => backHandler.remove();
    }, [exitFullscreen])
  );

  // Cross-Source Prefetch logic
  useEffect(() => {
    if (status === 'readyToPlay' && state.playerMode === 'native' && navNext) {
      console.log(`[Unified Prefetch] Memastikan episode selanjutnya diprefetch lintas server: ${navNext}`);
      import('../services/api').then(({ fetchSmartPlay }) => {
        fetchSmartPlay(
          params.url as string,
          params.seriUrl as string,
          navNext,
          new AbortController().signal,
          params.seriJudul as string,
          (params.uniqueId as string) || ''
        ).catch(() => { });
      });
    }
  }, [status, state.playerMode, navNext]);

  const isSkipOPVisible = state.controlsVisible && state.totalDuration > 0 && state.currentPosition < 360;
  const isSkipEDVisible = state.controlsVisible && state.totalDuration > 0 && state.currentPosition >= state.totalDuration - 90 && state.currentPosition < state.totalDuration - 2;

  const handleSkipOP = (e: any) => {
    e.stopPropagation();
    if (state.playerMode === 'native' && player) {
      player.currentTime = Math.min(state.totalDuration, (player.currentTime || 0) + 85);
    }
  };

  const handleSkipED = (e: any) => {
    e.stopPropagation();
    if (navNext) navigateEpisode(navNext);
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

  const activeHostItems = state.servers.filter(s => getHostName(s) === state.activeHost);

  const availableSources = React.useMemo(() => {
    const sources = new Set(state.servers.map(s => s.source || 'Samehadaku'));
    return Array.from(sources);
  }, [state.servers]);

  useEffect(() => {
    if (availableSources.length > 0) {
      const preferred = params.url?.includes('otakudesu') || params.seriUrl?.startsWith('/anime/') ? 'Otakudesu' : (params.url?.includes('kuronime') ? 'Kuronime' : (params.url?.includes('neosatsu') ? 'Neosatsu' : 'Samehadaku'));
      if (availableSources.includes(preferred) && state.serverTab === 'Samehadaku' && preferred !== 'Samehadaku') {
        state.setServerTab(preferred);
      } else if (!availableSources.includes(state.serverTab)) {
        state.setServerTab(availableSources[0]);
      }
    }
  }, [availableSources, state.serverTab, params.url, params.seriUrl]);

  const getResName = (nama: string) => {
    const p = nama.split('·');
    return p[0]?.trim() || 'Default';
  };

  return (
    <>
      <StatusBar hidden={isFullscreen} translucent backgroundColor="transparent" />
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
          <PlayerLoadingOverlay
            loading={state.loading}
            playerLoading={state.playerLoading}
            uploadProgress={state.uploadProgress}
          />

          {state.playerMode === 'native' && state.nativeVideoUrl ? (
            <View style={{ flex: 1 }}>
              <VideoView player={player} style={styles.video} nativeControls={false} />
              {playerError && (
                <View style={{ position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(255,50,50,0.9)', padding: 12, borderRadius: 10, zIndex: 100 }}>
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Gagal Memutar Video</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>
                    {isAzureBlob ? 'Koneksi ke server Cloud diblokir. Pastikan koneksi stabil atau coba server Alternatif.' : (playerError.message || 'Unknown Player Error')}
                  </Text>
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
                onReportBroken={() => playback.handleReportBroken(params, stopAllMedia)}
              />
            </View>
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
          <PlayerBottomInfo
            navPrev={navPrev}
            navNext={navNext}
            navigateEpisode={navigateEpisode}
            onReportBroken={() => playback.handleReportBroken(params, stopAllMedia)}
          />
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
