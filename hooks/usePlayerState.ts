import { useState, useRef, useCallback, useEffect } from 'react';
import { ServerItem } from '../services/api';

export function formatEpisodeTitle(title?: string): string {
  if (!title) return 'Episode ?';
  if (title.toLowerCase().includes('batch')) return 'Batch';
  const typeMatch = title.match(/(OVA|OAD|Special|SP)\s*(\d+(\.\d+)?)/i);
  if (typeMatch) return `${typeMatch[1].toUpperCase()} ${typeMatch[2]}`;
  const epMatch = title.match(/(?:episode|ep|eps)\s*(\d+(?:\.\d+)?)/i);
  if (epMatch) return `Episode ${epMatch[1]}`;
  const fallback = title.match(/\b(\d+(\.\d+)?)\s*(?:\(End\))?\s*$/i);
  if (fallback) return `Episode ${fallback[1]}`;
  return title;
}

export function usePlayerState(initialTitle: string = '') {
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [nativeVideoHeaders, setNativeVideoHeaders] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(() => formatEpisodeTitle(initialTitle));

  useEffect(() => {
    if (initialTitle) {
      setTitle(formatEpisodeTitle(initialTitle));
    }
  }, [initialTitle]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverTab, setServerTab] = useState<string>('Samehadaku');
  
  // Active Server State
  const [activeHost, setActiveHost] = useState('');
  const [activeServerName, setActiveServerName] = useState('');

  // Enhanced UI State
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [restoredVideoUrl, setRestoredVideoUrl] = useState<string>('');
  const [savedProgress, setSavedProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSwitchingHost, setIsSwitchingHost] = useState(false);

  // Player state (100% Azure Blob / Native Cloud Player)
  const [playerMode, setPlayerMode] = useState<'native' | 'none'>('none');
  const [nativeVideoUrl, setNativeVideoUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Progress tracking
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Refs
  const preferredHostRef = useRef<string | null>(null);
  const currentEpisodeUrlRef = useRef<string | null>(null);
  const currentEpisodeParamsRef = useRef<any>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const progressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef<boolean>(true);

  // Reset player state
  const resetPlayerState = useCallback(() => {
    setPlayerMode('none');
    setNativeVideoUrl('');
    setPlayerLoading(true);
    setError(null);
    setRetryCount(0);
  }, []);

  // Capture position from sources
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
    playbackSpeed, setPlaybackSpeed,
    restoredVideoUrl, setRestoredVideoUrl,
    savedProgress, setSavedProgress,
    controlsVisible, setControlsVisible,
    isSwitchingHost, setIsSwitchingHost,
    playerMode, setPlayerMode,
    nativeVideoUrl, setNativeVideoUrl,
    retryCount, setRetryCount,
    currentPosition, setCurrentPosition,
    totalDuration, setTotalDuration,
    preferredHostRef,
    currentEpisodeUrlRef,
    currentEpisodeParamsRef,
    lastKnownPositionRef,
    progressIntervalRef,
    controlsTimeoutRef,
    abortControllerRef,
    isMounted,
    resetPlayerState,
    captureCurrentPosition
  };
}
