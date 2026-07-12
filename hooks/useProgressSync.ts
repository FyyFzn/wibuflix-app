import { useEffect, useCallback, useRef } from 'react';
import { updateProgress } from '../services/storage';

interface UseProgressSyncProps {
  status: string;
  player: any;
  isPlaying: boolean;
  state: any;
  url?: string;
  navNext?: string | null;
  navigateEpisode: (url: string) => void;
}

export function useProgressSync({
  status,
  player,
  isPlaying,
  state,
  url,
  navNext,
  navigateEpisode,
}: UseProgressSyncProps) {
  const autoNextTriggeredForUrlRef = useRef<string | null>(null);

  // Reset autoNext tracker when url changes
  useEffect(() => {
    autoNextTriggeredForUrlRef.current = null;
  }, [url]);

  // Restore saved progress on readyToPlay
  useEffect(() => {
    if (status === 'readyToPlay' && state.nativeVideoUrl) {
      if (player && player.duration) {
        state.setTotalDuration(Math.floor(player.duration));
      }

      if (state.restoredVideoUrl !== state.nativeVideoUrl && state.savedProgress > 5) {
        console.log(`[Resume] Seeking to ${state.savedProgress}s on ${state.nativeVideoUrl.substring(0, 60)}`);
        player.currentTime = state.savedProgress;
        state.setRestoredVideoUrl(state.nativeVideoUrl);

        const retryTimer = setTimeout(() => {
          try {
            if (player && Math.floor(player.currentTime) < state.savedProgress - 3) {
              console.log(`[Resume] Retry seek to ${state.savedProgress}s (was at ${Math.floor(player.currentTime)}s)`);
              player.currentTime = state.savedProgress;
            }
          } catch { }
        }, 1500);
        return () => clearTimeout(retryTimer);
      }
    }
  }, [status, player, state.savedProgress, state.restoredVideoUrl, state.nativeVideoUrl]);

  // Progress tracking & Throttled Disk Persistence
  useEffect(() => {
    let tickCount = 0;
    let isWritingToDisk = false;

    if (state.playerMode === 'native' && isPlaying) {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
      
      state.progressIntervalRef.current = setInterval(async () => {
        try {
          if (!player) return;
          const curr = Math.floor(player.currentTime || 0);
          const dur = Math.floor(player.duration || 0);
          
          // 1. Selalu perbarui posisi state di RAM (untuk UI slider tiap detik)
          state.setCurrentPosition(curr);
          state.lastKnownPositionRef.current = curr;
          if (dur > 0) state.setTotalDuration(dur);

          // 2. Throttling: Tulis ke disk AsyncStorage HANYA setiap 5 detik (dan jika tidak sedang menulis)
          tickCount++;
          if (tickCount % 5 === 0 && curr > 0 && dur > 0 && url && !isWritingToDisk) {
            isWritingToDisk = true;
            await updateProgress(url, curr, dur, state.activeHost).catch(() => {});
            isWritingToDisk = false;
          }
        } catch (e) {
          isWritingToDisk = false;
        }
      }, 1000);
    } else {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
      // Flush progres saat video di-pause atau dihentikan
      if (url && state.lastKnownPositionRef.current > 0 && state.totalDuration > 0) {
        updateProgress(url, state.lastKnownPositionRef.current, state.totalDuration, state.activeHost).catch(() => {});
      }
    }

    return () => {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
    };
  }, [state.playerMode, isPlaying, url, player, state.activeHost]);

  // Auto-next logic when reaching end of video
  useEffect(() => {
    if (state.totalDuration > 0 && state.currentPosition > 0 && navNext && url) {
      if (state.currentPosition >= state.totalDuration - 2) {
        if (autoNextTriggeredForUrlRef.current !== url && isPlaying) {
          autoNextTriggeredForUrlRef.current = url;
          console.log(`[Auto-Next] Triggered navigateEpisode from ${url} to ${navNext}`);
          // Reset progress memory immediately before navigating
          state.setCurrentPosition(0);
          state.setTotalDuration(0);
          navigateEpisode(navNext);
        }
      }
    }
  }, [state.currentPosition, state.totalDuration, navNext, navigateEpisode, url, isPlaying]);

  const saveCurrentProgress = useCallback(async () => {
    if (state.currentEpisodeUrlRef.current && state.lastKnownPositionRef.current > 0) {
      await updateProgress(state.currentEpisodeUrlRef.current, state.lastKnownPositionRef.current, state.totalDuration, state.activeHost);
    }
  }, [state.totalDuration, state.activeHost, state.currentEpisodeUrlRef, state.lastKnownPositionRef]);

  return { saveCurrentProgress };
}
