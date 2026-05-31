import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, ActivityIndicator, Dimensions, BackHandler, Modal, FlatList, StatusBar, Alert, Animated, Easing
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/playerStyles';
import { Ionicons } from '@expo/vector-icons';

import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';
import { scrapeVideo, resolveServer, extractVideoUrl, ServerItem, fetchEpisodes, EpisodeItem } from '../services/api';
import { simpanKeRiwayat, updateProgress, getProgress, formatDuration } from '../services/storage';
import ServerSelector from '../components/ServerSelector';
import PlayerNativeControls from '../components/player/PlayerNativeControls';
import PlayerWebView from '../components/player/PlayerWebView';
import PlayerModals from '../components/player/PlayerModals';

const getHostName = (srv: ServerItem) => {
  if (srv.namaHost) return srv.namaHost.toLowerCase();
  const nama = srv.nama || '';
  const parts = nama.split('·');
  let candidate = (parts[parts.length - 1].trim().split(' ')[0] || 'unknown').toLowerCase();
  if (candidate === 'server' || candidate === 'unknown') return 'alternatif';
  return candidate;
};

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; gambar: string; seriUrl: string; judul: string; autoPlayHost?: string; autoFullscreen?: string; }>();

  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeVideoHeaders, setNativeVideoHeaders] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(params.judul || '');
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [navPrev, setNavPrev] = useState<string | null>(null);
  const [navNext, setNavNext] = useState<string | null>(null);

  // Active Server State
  const [activeHost, setActiveHost] = useState('');
  const [activeServerName, setActiveServerName] = useState('');

  // Enhanced UI State
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [showWebviewControls, setShowWebviewControls] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [restoredVideoUrl, setRestoredVideoUrl] = useState<string>('');
  const [savedProgress, setSavedProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSwitchingHost, setIsSwitchingHost] = useState(false);
  const preferredHostRef = useRef<string>('');
  const lastKnownPositionRef = useRef<number>(0);
  const webviewControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player state
  const [playerMode, setPlayerMode] = useState<'webview' | 'native' | 'none'>('none');
  const [webviewUrl, setWebviewUrl] = useState<string>('');
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string>('');
  const [fallbackWebviewUrl, setFallbackWebviewUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webviewRef = useRef<WebView>(null);

  // Progress tracking
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef<boolean>(true);

  // Double Tap State
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [skipInfo, setSkipInfo] = useState<{ side: 'left' | 'right', amount: number, wasPlaying?: boolean } | null>(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [playerLayoutWidth, setPlayerLayoutWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    if (skipInfo) {
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    }
  }, [skipInfo]);

  const videoSource = nativeVideoUrl ? {
    uri: nativeVideoUrl,
    headers: Object.keys(nativeVideoHeaders).length > 0 ? nativeVideoHeaders : {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  } : null;

  const player = useVideoPlayer(videoSource, (player) => {
    player.preservesPitch = true;
    player.play();
  });

  const stopAllMedia = useCallback(() => {
    try {
      if (player) player.pause();
    } catch (e) {}
    try {
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript('var v=document.querySelectorAll("video");for(var i=0;i<v.length;i++){v[i].pause();}true;');
      }
    } catch (e) {}
  }, [player]);

  const { status, error: playerError } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  useEffect(() => {
    if (status === 'error' && playerError && playerMode === 'native' && fallbackWebviewUrl) {
      if (retryCount < 2) {
        console.log(`Native Player Error: ${playerError.message}. Retrying extraction (${retryCount + 1}/2)...`);
        setRetryCount(prev => prev + 1);
        
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        playServer(fallbackWebviewUrl, activeServerName, true, signal).then(success => {
          if (signal.aborted) return; // Mencegah pemaksaan webview jika user ganti server
          if (!success) {
            setPlayerMode('webview');
            setWebviewUrl(fallbackWebviewUrl);
            setNativeVideoUrl('');
            setFallbackWebviewUrl('');
            setRetryCount(0);
          }
        });
      } else {
        console.log('Max retries reached. Falling back to WebView');
        setPlayerMode('webview');
        setWebviewUrl(fallbackWebviewUrl);
        setNativeVideoUrl('');
        setFallbackWebviewUrl('');
        setRetryCount(0);
      }
    }
  }, [status, playerError, playerMode, fallbackWebviewUrl]);


  // Filter items for current host
  const activeHostItems = servers.filter(s => getHostName(s) === activeHost);
  const isBlogger = activeHost.toLowerCase().includes('blog');

  const isVidhide = activeHost.toLowerCase().includes('vidhide') || activeHost.toLowerCase().includes('vidlion');

  let injectedJS = `
    window.open = function() { return null; };
    window.hasRestoredProgress = false;
    document.addEventListener('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'webviewClick'}));
    }, true);
    document.addEventListener('touchstart', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webviewClick' }));
    }, {passive: true, capture: true});

    // Dengarkan perubahan fullscreen untuk merotasi perangkat
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
      document.addEventListener(evt, () => {
        const isFS = document.fullscreenElement || document.webkitFullscreenElement;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: isFS ? 'fullscreen' : 'exitFullscreen' }));
      });
    });
  `;

  if (isBlogger) {
    injectedJS += `
      let extracted = false;
      setInterval(() => {
        if(extracted) return;
        try {
          const playBtn = document.querySelector('.ytp-large-play-button, .play-button, button, [role="button"]');
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

  // Universal Video Auto-Play & Progress Resume for ALL WebView Servers
  if (!isBlogger) {
    injectedJS += `
      console.log('[InjectedJS] savedProgress=${savedProgress}');
      setInterval(() => {
        try {
          const v = document.querySelector('video');
          if (v) {
             if (v.paused) {
                v.play().catch(()=>{});
             }
             if (!window.hasRestoredProgress && ${savedProgress} > 5 && v.readyState >= 1) {
                v.currentTime = ${savedProgress};
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

  useEffect(() => {
    AsyncStorage.getItem('playback_speed').then(val => {
      if (val) setPlaybackSpeed(parseFloat(val));
    });
  }, []);

  // Cleanup orientasi global hanya saat screen benar-benar unmount (keluar ke beranda)
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (player && playerMode === 'native' && status === 'readyToPlay') {
      player.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, player, playerMode, status]);

  const changeSpeed = async (speed: number) => {
    setPlaybackSpeed(speed);
    await AsyncStorage.setItem('playback_speed', speed.toString());
    setShowSpeedModal(false);
  };

  useEffect(() => {
    if (params.seriUrl) {
      fetchEpisodes(params.seriUrl)
        .then(res => {
          const epList = res.data.daftar_episode || [];
          setEpisodes(epList);
        })
        .catch(() => {});
    }
  }, [params.seriUrl]);

  // Fallback: If backend fails to extract nav_prev/nav_next, calculate them from the episodes list
  useEffect(() => {
    if (episodes.length > 0 && params.url) {
      const currentIndex = episodes.findIndex(e => e.url === params.url);
      if (currentIndex !== -1) {
        // Episodes are typically sorted latest to oldest (index 0 is latest)
        // Previous episode is currentIndex + 1
        // Next episode is currentIndex - 1
        setNavPrev(prev => prev || (currentIndex < episodes.length - 1 ? episodes[currentIndex + 1].url : null));
        setNavNext(prev => prev || (currentIndex > 0 ? episodes[currentIndex - 1].url : null));
      }
    }
  }, [episodes, params.url, navPrev, navNext]);

  useEffect(() => {
    if (status === 'readyToPlay' && nativeVideoUrl) {
      if (player.duration) {
        setTotalDuration(Math.floor(player.duration));
      }
      
      if (restoredVideoUrl !== nativeVideoUrl && savedProgress > 5) {
        console.log(`[Resume] Seeking to ${savedProgress}s on ${nativeVideoUrl.substring(0, 60)}`);
        player.currentTime = savedProgress;
        setRestoredVideoUrl(nativeVideoUrl);
        
        // Retry seek after delay - player may ignore the first seek if not fully buffered
        const retryTimer = setTimeout(() => {
          try {
            if (Math.floor(player.currentTime) < savedProgress - 3) {
              console.log(`[Resume] Retry seek to ${savedProgress}s (was at ${Math.floor(player.currentTime)}s)`);
              player.currentTime = savedProgress;
            }
          } catch {}
        }, 1500);
        return () => clearTimeout(retryTimer);
      }
    }
  }, [status, player, savedProgress, restoredVideoUrl, nativeVideoUrl]);

  useEffect(() => {
    if (playerMode === 'native' && isPlaying) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        try {
          const curr = Math.floor(player.currentTime || 0);
          setCurrentPosition(curr);
          lastKnownPositionRef.current = curr;
          if (curr > 0 && params.url) {
            updateProgress(params.url, curr, Math.floor(player.duration || 0));
          }
        } catch (e) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
      }, 1000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [playerMode, isPlaying, params.url, player]);

  const saveCurrentProgress = useCallback(async () => {
    if (params.url && currentPosition > 0) {
      await updateProgress(params.url, currentPosition, totalDuration, activeHost);
    }
  }, [params.url, currentPosition, totalDuration, activeHost]);

  useEffect(() => {
    isMounted.current = true;
    
    // Jaga agar tetap fullscreen jika parameter autoFullscreen di-set '1' (seamless transition)
    if (params.autoFullscreen === '1') {
      setIsFullscreen(true);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    } else {
      setIsFullscreen(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    }

    if (params.url) {
      setRestoredVideoUrl('');
      setSavedProgress(0);
      getProgress(params.url).then(saved => {
         if (saved && saved.progress > 5) setSavedProgress(saved.progress);
      });
      loadEpisode(params.url);
    }
    return () => {
      isMounted.current = false;
      stopAllMedia();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      saveCurrentProgress();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [params.url]);

  const handleUIBackPress = useCallback(() => {
    saveCurrentProgress();
    stopAllMedia();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [saveCurrentProgress, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        exitFullscreen();
        return true; // Cegah tombol back keluar layar, cukup keluar fullscreen
      }
      
      // Jika tidak fullscreen, gunakan navigasi manual kita agar aplikasi tidak tertutup paksa
      handleUIBackPress();
      return true; // Beri tahu Android bahwa kita sudah menangani tombol back
    });
    return () => backHandler.remove();
  }, [isFullscreen, handleUIBackPress]);

  const loadEpisode = async (url: string) => {
    setLoading(true);
    setError(null);
    setPlayerMode('none');
    setWebviewUrl('');
    setNativeVideoUrl('');
    setActiveHost('');
    setActiveServerName('');
    setFallbackWebviewUrl('');
    setRetryCount(0);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    if (params.autoPlayHost && !preferredHostRef.current) {
      preferredHostRef.current = params.autoPlayHost as string;
    }

    try {
      const json = await scrapeVideo(url, signal);
      if (!isMounted.current || signal.aborted) return;
      if (json.status !== 'success') throw new Error(json.data?.judul || 'Gagal');

      const data = json.data;
      setTitle(data.judul);
      setNavPrev(data.nav_prev);
      setNavNext(data.nav_next);

      if (data.servers && data.servers.length > 0) {
        // Menggunakan metode Blacklist: Masukkan nama server yang pasti rusak/tidak didukung ke sini
        const blockedHosts = ['disabled_server_example'];
        
        let validServers = data.servers.filter(s => {
          const sn = getHostName(s);
          return !blockedHosts.some(h => sn.includes(h));
        });
        
        if (validServers.length === 0) {
          validServers = data.servers;
        }

        const prioritas = ['pucuk', 'kraken', 'wibufile'];
        validServers.sort((a, b) => {
          const snA = getHostName(a);
          const snB = getHostName(b);
          
          if (preferredHostRef.current) {
            if (snA === preferredHostRef.current && snB !== preferredHostRef.current) return -1;
            if (snB === preferredHostRef.current && snA !== preferredHostRef.current) return 1;
          }

          let idxA = prioritas.findIndex(p => snA.includes(p));
          let idxB = prioritas.findIndex(p => snB.includes(p));
          if (idxA === -1) idxA = 999;
          if (idxB === -1) idxB = 999;
          if (idxA !== idxB) return idxA - idxB;

          // Jika dari host yang sama, urutkan resolusi dari yang terbesar ke terkecil
          const resA = parseInt(a.nama.match(/(\d+)p/)?.[1] || '0', 10);
          const resB = parseInt(b.nama.match(/(\d+)p/)?.[1] || '0', 10);
          return resB - resA;
        });

        setServers(validServers);
        await simpanKeRiwayat(data.judul, url, params.seriUrl || '', params.gambar || '', 0, 0, preferredHostRef.current || undefined);

        if (preferredHostRef.current) {
          const prefHost = preferredHostRef.current;
          const preferredItems = validServers.filter(s => getHostName(s) === prefHost);
          if (preferredItems.length > 0) {
            const success = await attemptToPlayServers(preferredItems, url, signal);
            if (!isMounted.current || signal.aborted) return;
            if (!success) {
              setPlayerMode('none');
              setError(`Server ${prefHost} gagal dimuat di episode ini. Silakan pilih server secara manual.`);
            }
          } else {
            setPlayerMode('none');
            setError(`Server ${prefHost} tidak tersedia di episode ini. Silakan pilih server secara manual.`);
          }
        } else {
          setPlayerMode('none');
          setError('Silakan pilih server di bawah untuk memutar video.');
        }
      } else {
        setError('Tidak ada server video yang ditemukan.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat video');
    } finally {
      setLoading(false);
    }
  };

  const attemptToPlayServers = async (serverList: ServerItem[], episodeUrl: string, signal: AbortSignal): Promise<boolean> => {
    let firstIframeUrl = '';
    let firstServerName = '';

    for (const srv of serverList) {
      if (!isMounted.current || signal.aborted) return false;
      try {
        let iframeUrl = srv.iframeUrl;
        if (!iframeUrl) {
          const res = await resolveServer(episodeUrl, srv.nume, signal);
          if (!isMounted.current || signal.aborted) return false;
          if (res.data?.iframeUrl) {
            iframeUrl = res.data.iframeUrl;
            srv.iframeUrl = iframeUrl;
            srv.namaHost = srv.namaHost || res.data.namaHost;
          }
        }
        if (iframeUrl) {
          if (!firstIframeUrl) {
            firstIframeUrl = iframeUrl;
            firstServerName = srv.namaHost || srv.nama;
          }
          const success = await playServer(iframeUrl, srv.namaHost || srv.nama, true, signal);
          if (!isMounted.current || signal.aborted) return false;
          if (success) {
            const hName = getHostName(srv);
            setActiveHost(hName);
            setActiveServerName(srv.nama);
            return true;
          }
        }
      } catch { continue; }
    }
    
    if (!isMounted.current || signal.aborted) return false;
    if (firstIframeUrl) {
      await playServer(firstIframeUrl, firstServerName, false, signal);
      const fsrv = serverList.find(s => s.iframeUrl === firstIframeUrl);
      if (fsrv) {
        const hName = getHostName(fsrv);
        setActiveHost(hName);
        setActiveServerName(fsrv.nama);
      }
      return true;
    }
    return false;
  };

  const playServer = async (iframeUrl: string, serverName: string, isAutoPlay = false, signal: AbortSignal) => {
    setPlayerLoading(true);

    const isDirectVideo = iframeUrl.toLowerCase().match(/\.(mp4|mkv|m3u8)(?:\?|$)/);
    if (isDirectVideo) {
      setPlayerMode('native');
      setNativeVideoUrl(iframeUrl);
      setNativeVideoHeaders({ 'Referer': 'https://v2.samehadaku.how/' });
      setPlayerLoading(false);
      return true;
    }

    const serverLower = serverName.toLowerCase();
    const isBypassWebView = ['mega', 'bstation', 'bilibili'].some(n => serverLower.includes(n));
    if (isBypassWebView) {
      setPlayerMode('webview');
      setWebviewUrl(iframeUrl);
      setPlayerLoading(false);
      return true;
    }

    try {
      const result = await extractVideoUrl(iframeUrl, signal);
      if (!isMounted.current || signal.aborted) return false;
      
      if (result.success && result.url) {
        setPlayerMode('native');
        setNativeVideoUrl(result.url);
        setFallbackWebviewUrl(iframeUrl);
        
        let customHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0',
          'Referer': iframeUrl,
        };
        
        if (result.headers) {
           customHeaders = { ...customHeaders, ...result.headers };
        }
        
        setNativeVideoHeaders(customHeaders);
        setPlayerLoading(false);
        return true;
      }
    } catch {}

    if (isAutoPlay) return false;

    setPlayerMode('webview');
    setWebviewUrl(iframeUrl);
    setPlayerLoading(false);
    return true;
  };

  const handleSelectHost = (hostName: string, items: ServerItem[]) => {
    if (isSwitchingHost) return;
    setIsSwitchingHost(true);
    
    // Capture position from ALL available sources and pick the best one
    let pos = Math.max(lastKnownPositionRef.current, currentPosition);
    if (playerMode === 'native' && player) {
      try { 
        const playerTime = Math.floor(player.currentTime || 0);
        pos = Math.max(pos, playerTime);
      } catch {}
    }
    console.log(`[HostSwitch] pos=${pos}, lastRef=${lastKnownPositionRef.current}, currentPosition=${currentPosition}, playerMode=${playerMode}, targetHost=${hostName}`);
    
    stopAllMedia();
    saveCurrentProgress();
    if (pos > 5) {
      setSavedProgress(pos);
      setRestoredVideoUrl(''); // reset guard so new URL gets restored
    }
    
    setPlayerMode('none');
    setNativeVideoUrl('');
    setWebviewUrl('');
    setPlayerLoading(true);
    setError(null);
    setFallbackWebviewUrl('');
    setRetryCount(0);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const timeout = setTimeout(() => setIsSwitchingHost(false), 5000);
    
    preferredHostRef.current = hostName;
    
    attemptToPlayServers(items, params.url, signal).then(success => {
      if (!isMounted.current || signal.aborted) return;
      if (!success) {
        setPlayerMode('none');
        setError(`Gagal memutar server ${hostName}.`);
      }
    }).finally(() => {
      clearTimeout(timeout);
      setIsSwitchingHost(false);
    });
  };

  const handleSelectResolution = (srv: ServerItem) => {
    setShowResModal(false);
    
    // Capture position from ALL available sources and pick the best one
    let pos = Math.max(lastKnownPositionRef.current, currentPosition);
    if (playerMode === 'native' && player) {
      try { 
        const playerTime = Math.floor(player.currentTime || 0);
        pos = Math.max(pos, playerTime);
      } catch {}
    }
    console.log(`[ResSwitch] pos=${pos}, lastRef=${lastKnownPositionRef.current}, currentPosition=${currentPosition}, playerMode=${playerMode}`);
    
    stopAllMedia();
    saveCurrentProgress();
    if (pos > 5) {
      setSavedProgress(pos);
      setRestoredVideoUrl(''); // reset guard so new URL gets restored
    }

    setPlayerMode('none');
    setNativeVideoUrl('');
    setWebviewUrl('');
    setPlayerLoading(true);
    setError(null);
    setFallbackWebviewUrl('');
    setRetryCount(0);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    attemptToPlayServers([srv], params.url, signal).then(success => {
      if (!isMounted.current || signal.aborted) return;
      if (!success) {
        setPlayerMode('none');
        setError(`Gagal memutar server resolusi ini.`);
      }
    });
  };

  const navigateEpisode = (url: string) => {
    setShowEpisodesModal(false);
    saveCurrentProgress();
    stopAllMedia();

    // Gunakan router.replace agar episode sebelumnya tidak menumpuk (overlapping)
    // Teruskan status fullscreen agar layar tidak berputar balik ke portrait
    router.replace({
      pathname: '/player',
      params: { 
        url, 
        gambar: params.gambar, 
        seriUrl: params.seriUrl, 
        judul: '',
        autoPlayHost: preferredHostRef.current || activeHost,
        autoFullscreen: isFullscreen ? '1' : '0'
      }
    });
  };

  const enterFullscreen = async () => {
    setIsFullscreen(true);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    await NavigationBar.setVisibilityAsync('hidden').catch(() => {});
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    await NavigationBar.setVisibilityAsync('visible').catch(() => {});
    if (playerMode === 'webview' && webviewRef.current) {
      webviewRef.current.injectJavaScript(`if (document.fullscreenElement) { document.exitFullscreen().catch(()=>{}); } else if (document.webkitFullscreenElement) { document.webkitExitFullscreen().catch(()=>{}); }; true;`);
    }
  };

  // ----------------------------------------------------
  // AUTO-NEXT & SKIP LOGIC
  // ----------------------------------------------------
  useEffect(() => {
    if (totalDuration > 0 && currentPosition > 0 && navNext) {
      if (currentPosition >= totalDuration - 2) {
        console.log('[Auto-Next] Triggered navigateEpisode');
        navigateEpisode(navNext);
      }
    }
  }, [currentPosition, totalDuration, navNext]);

  const isSkipOPVisible = controlsVisible && totalDuration > 0 && currentPosition < 360; // First 6 minutes
  const isSkipEDVisible = controlsVisible && totalDuration > 0 && currentPosition >= totalDuration - 90 && currentPosition < totalDuration - 2;

  const handleSkipOP = (e: any) => {
    e.stopPropagation();
    if (playerMode === 'native' && player) {
      player.currentTime = Math.min(totalDuration, (player.currentTime || 0) + 90);
    } else if (playerMode === 'webview') {
      skipWebview(90);
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
    if (webviewControlsTimeoutRef.current) clearTimeout(webviewControlsTimeoutRef.current);
    webviewControlsTimeoutRef.current = setTimeout(() => setShowWebviewControls(false), 4000);
  };

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!controlsVisible && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  };
  const handleVideoTap = (evt: any) => {
    const now = Date.now();
    const { locationX } = evt.nativeEvent;
    
    // Gunakan playerLayoutWidth agar akurat di mode landscape maupun portrait
    const effectiveWidth = playerLayoutWidth || Dimensions.get('window').width;
    const side = locationX > effectiveWidth / 2 ? 'right' : 'left';

    // Deteksi double tap atau rentetan ketukan (waktu diperpendek agar harus diketuk cepat)
    if (lastTapRef.current && (now - lastTapRef.current.time < 250) && lastTapRef.current.side === side) {
      const addAmount = side === 'right' ? 10 : -10;
      
      const isCurrentlyPlaying = player.playing;
      if (isCurrentlyPlaying) {
          player.pause();
      }

      setSkipInfo(prev => ({
        side,
        amount: prev && prev.side === side ? prev.amount + addAmount : addAmount,
        wasPlaying: prev ? prev.wasPlaying : isCurrentlyPlaying
      }));

      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        setSkipInfo(prev => {
          if (prev) {
            player.currentTime = Math.max(0, player.currentTime + prev.amount);
            if (prev.wasPlaying) {
                player.play();
            }
          }
          return null;
        });
      }, 500); // Waktu eksekusi diperpendek dari 800ms menjadi 500ms

      lastTapRef.current = { time: now, side };
    } else {
      // Single tap -> toggle controls
      toggleControls();
      lastTapRef.current = { time: now, side };
    }
  };


  useEffect(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4000);
    } else {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  const screenWidth = Dimensions.get('window').width;
  const playerWrapperStyle = isFullscreen ? { flex: 1 } : { height: (screenWidth * 9) / 16 };

  const getResName = (nama: string) => {
    const p = nama.split('·');
    return p[0]?.trim() || 'Default';
  };

  return (
    <SafeAreaView style={styles.container} edges={isFullscreen ? [] : ['top']}>
      {isFullscreen && <StatusBar hidden />}
      
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleUIBackPress}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      )}

      <View style={[styles.playerWrapper, playerWrapperStyle]}>
        {(loading || playerLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.overlayText}>{loading ? 'Mencari server...' : 'Menyiapkan video...'}</Text>
          </View>
        )}

        {playerMode === 'native' && nativeVideoUrl ? (
          <View style={{ flex: 1 }}>
            <VideoView player={player} style={styles.video} nativeControls={false} />
            {playerError && (
               <View style={{position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(255,0,0,0.8)', padding: 10, borderRadius: 8}}>
                 <Text style={{color: 'white', fontSize: 12}}>{playerError.message || 'Unknown Player Error'}</Text>
               </View>
            )}
            <PlayerNativeControls
              player={player} title={title} isFullscreen={isFullscreen} controlsVisible={controlsVisible}
              isPlaying={isPlaying} currentPosition={currentPosition} totalDuration={totalDuration}
              playbackSpeed={playbackSpeed} activeServerName={activeServerName} activeHostItems={activeHostItems}
              episodes={episodes} navPrev={navPrev} navNext={navNext} skipInfo={skipInfo} rippleAnim={rippleAnim}
              isSkipOPVisible={isSkipOPVisible} isSkipEDVisible={isSkipEDVisible}
              handleVideoTap={handleVideoTap} setPlayerLayoutWidth={setPlayerLayoutWidth}
              exitFullscreen={exitFullscreen} enterFullscreen={enterFullscreen}
              setShowSpeedModal={setShowSpeedModal} setShowResModal={setShowResModal}
              setShowEpisodesModal={setShowEpisodesModal} getResName={getResName}
              navigateEpisode={navigateEpisode} formatDuration={formatDuration}
              controlsTimeoutRef={controlsTimeoutRef} setControlsVisible={setControlsVisible}
              handleSkipOP={handleSkipOP} handleSkipED={handleSkipED}
            />
          </View>
        ) : playerMode === 'webview' && webviewUrl ? (
          <PlayerWebView
            webviewRef={webviewRef} webviewUrl={webviewUrl} isBlogger={isBlogger} injectedJS={injectedJS}
            isFullscreen={isFullscreen} showWebviewControls={showWebviewControls}
            setShowWebviewControls={setShowWebviewControls} setPlayerMode={setPlayerMode}
            setNativeVideoUrl={setNativeVideoUrl} setWebviewUrl={setWebviewUrl}
            setCurrentPosition={setCurrentPosition} setTotalDuration={setTotalDuration}
            lastKnownPositionRef={lastKnownPositionRef} enterFullscreen={enterFullscreen}
            exitFullscreen={exitFullscreen} setPlayerLoading={setPlayerLoading}
            handleUIBackPress={handleUIBackPress} navPrev={navPrev} navNext={navNext}
            navigateEpisode={navigateEpisode} webviewControlsTimeoutRef={webviewControlsTimeoutRef}
            isSkipOPVisible={isSkipOPVisible} isSkipEDVisible={isSkipEDVisible}
            handleSkipOP={handleSkipOP} handleSkipED={handleSkipED}
          />
        ) : !loading && error ? (
          <View style={styles.playerError}>
            <Text style={styles.playerErrorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {!isFullscreen && (
        <ScrollView style={styles.controlsContainer} contentContainerStyle={styles.controlsContent}>
          {servers.length > 0 && (
            <ServerSelector 
              servers={servers} 
              activeHost={activeHost} 
              activeServerName={activeServerName}
              onSelectHost={handleSelectHost} 
              onSelectResolution={handleSelectResolution}
              disabled={isSwitchingHost} 
            />
          )}

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
        showEpisodesModal={showEpisodesModal} setShowEpisodesModal={setShowEpisodesModal}
        episodes={episodes} currentUrl={params.url as string} navigateEpisode={navigateEpisode}
        showResModal={showResModal} setShowResModal={setShowResModal} activeHost={activeHost}
        activeHostItems={activeHostItems} activeServerName={activeServerName}
        handleSelectResolution={handleSelectResolution} getResName={getResName}
        showSpeedModal={showSpeedModal} setShowSpeedModal={setShowSpeedModal}
        playbackSpeed={playbackSpeed} changeSpeed={changeSpeed}
      />

    </SafeAreaView>
  );
}
