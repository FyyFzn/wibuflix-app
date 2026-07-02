import { useEffect, useCallback } from 'react';
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

  // Progress tracking interval
  useEffect(() => {
    if (state.playerMode === 'native' && isPlaying) {
      if (state.progressIntervalRef.current) clearInterval(state.progressIntervalRef.current);
      state.progressIntervalRef.current = setInterval(() => {
        try {
          if (!player) return;
          const curr = Math.floor(player.currentTime || 0);
          state.setCurrentPosition(curr);
          state.lastKnownPositionRef.current = curr;
          if (curr > 0 && url) {
            updateProgress(url, curr, Math.floor(player.duration || 0));
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
  }, [state.playerMode, isPlaying, url, player]);

  // Auto-next logic when reaching end of video
  useEffect(() => {
    if (state.totalDuration > 0 && state.currentPosition > 0 && navNext) {
      if (state.currentPosition >= state.totalDuration - 2) {
        console.log('[Auto-Next] Triggered navigateEpisode');
        navigateEpisode(navNext);
      }
    }
  }, [state.currentPosition, state.totalDuration, navNext, navigateEpisode]);

  const saveCurrentProgress = useCallback(async () => {
    if (state.currentEpisodeUrlRef.current && state.lastKnownPositionRef.current > 0) {
      await updateProgress(state.currentEpisodeUrlRef.current, state.lastKnownPositionRef.current, state.totalDuration, state.activeHost);
    }
  }, [state.totalDuration, state.activeHost, state.currentEpisodeUrlRef, state.lastKnownPositionRef]);

  return { saveCurrentProgress };
}
