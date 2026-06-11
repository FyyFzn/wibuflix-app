import { useState, useEffect } from 'react';
import { fetchEpisodes, EpisodeItem } from '../services/api';

export function useEpisodeNavigation(seriUrl: string | undefined, currentUrl: string | undefined, initialNavPrev: string | null, initialNavNext: string | null) {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [navPrev, setNavPrev] = useState<string | null>(initialNavPrev);
  const [navNext, setNavNext] = useState<string | null>(initialNavNext);

  useEffect(() => {
    if (seriUrl) {
      fetchEpisodes(seriUrl)
        .then(res => {
          const epList = res.data.daftar_episode || [];
          setEpisodes(epList);
        })
        .catch(() => {});
    }
  }, [seriUrl]);

  // Fallback: If backend fails to extract nav_prev/nav_next, calculate them from the episodes list
  useEffect(() => {
    if (episodes.length > 0 && currentUrl) {
      const currentIndex = episodes.findIndex(e => e.url === currentUrl);
      if (currentIndex !== -1) {
        setNavPrev(prev => prev || (currentIndex < episodes.length - 1 ? (episodes[currentIndex + 1].url || null) : null));
        setNavNext(prev => prev || (currentIndex > 0 ? (episodes[currentIndex - 1].url || null) : null));
      }
    }
  }, [episodes, currentUrl]);

  return {
    episodes,
    setEpisodes,
    navPrev,
    setNavPrev,
    navNext,
    setNavNext
  };
}
