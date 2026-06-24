import { useState, useRef, useCallback } from 'react';
import { ServerItem } from '../services/api';

export function usePlayerState(initialTitle: string = '') {
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [nativeVideoHeaders, setNativeVideoHeaders] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(initialTitle);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverTab, setServerTab] = useState<string>('Samehadaku');
  
  // Active Server State
  const [activeHost, setActiveHost] = useState('');
  const [activeServerName, setActiveServerName] = useState('');

  // Enhanced UI State
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [showWebviewControls, setShowWebviewControls] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [restoredVideoUrl, setRestoredVideoUrl] = useState<string>('');
  const [savedProgress, setSavedProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSwitchingHost, setIsSwitchingHost] = useState(false);

  // Player state
  const [playerMode, setPlayerMode] = useState<'webview' | 'native' | 'none'>('none');
  const [webviewUrl, setWebviewUrl] = useState<string>('');
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string>('');
  const [fallbackWebviewUrl, setFallbackWebviewUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Progress tracking
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Refs
  const preferredHostRef = useRef<string | null>(null);
  const currentEpisodeUrlRef = useRef<string | null>(null);
  const currentEpisodeParamsRef = useRef<any>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const webviewControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef<boolean>(true);

  // Reset player state (Fix F6)
  const resetPlayerState = useCallback(() => {
    setPlayerMode('none');
    setNativeVideoUrl('');
    setWebviewUrl('');
    setPlayerLoading(true);
    setError(null);
    setFallbackWebviewUrl('');
    setRetryCount(0);
  }, []);

  // Capture position from sources (Fix F5)
  const captureCurrentPosition = useCallback((player: any) => {
    let pos = Math.max(lastKnownPositionRef.current, currentPosition);
    if (playerMode === 'native' && player) {
      try { 
        const playerTime = Math.floor(player.currentTime || 0);
        pos = Math.max(pos, playerTime);
      } catch {}
    }
    return pos;
  }, [currentPosition, playerMode]);

  return {
    loading, setLoading,
    playerLoading, setPlayerLoading,
    uploadProgress, setUploadProgress,
    error, setError,
    nativeVideoHeaders, setNativeVideoHeaders,
    title, setTitle,
    servers, setServers,
    serverTab, setServerTab,
    activeHost, setActiveHost,
    activeServerName, setActiveServerName,
    showEpisodesModal, setShowEpisodesModal,
    showSpeedModal, setShowSpeedModal,
    showResModal, setShowResModal,
    showWebviewControls, setShowWebviewControls,
    playbackSpeed, setPlaybackSpeed,
    restoredVideoUrl, setRestoredVideoUrl,
    savedProgress, setSavedProgress,
    controlsVisible, setControlsVisible,
    isSwitchingHost, setIsSwitchingHost,
    playerMode, setPlayerMode,
    webviewUrl, setWebviewUrl,
    nativeVideoUrl, setNativeVideoUrl,
    fallbackWebviewUrl, setFallbackWebviewUrl,
    retryCount, setRetryCount,
    currentPosition, setCurrentPosition,
    totalDuration, setTotalDuration,
    preferredHostRef,
    currentEpisodeUrlRef,
    currentEpisodeParamsRef,
    lastKnownPositionRef,
    webviewControlsTimeoutRef,
    progressIntervalRef,
    controlsTimeoutRef,
    abortControllerRef,
    isMounted,
    resetPlayerState,
    captureCurrentPosition
  };
}
