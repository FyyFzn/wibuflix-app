import { useState, useEffect } from 'react';
import { fetchEpisodes, EpisodeItem } from '../services/api';

export function useEpisodeNavigation(seriUrl: string | undefined, currentUrl: string | undefined, initialNavPrev: string | null, initialNavNext: string | null) {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [navPrev, setNavPrev] = useState<string | null>(initialNavPrev);
  const [navNext, setNavNext] = useState<string | null>(initialNavNext);
  const [navNextNext, setNavNextNext] = useState<string | null>(null); // Episode N+2

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
        // Episode list biasanya urut dari terbaru → terlama (index 0 = terbaru)
        // navPrev = episode yang lebih lama (index lebih besar)
        // navNext = episode yang lebih baru (index lebih kecil)
        setNavPrev(prev => prev || (currentIndex < episodes.length - 1 ? (episodes[currentIndex + 1].url || null) : null));
        setNavNext(prev => prev || (currentIndex > 0 ? (episodes[currentIndex - 1].url || null) : null));
        // N+2: dua episode lebih baru dari yang sedang diputar
        setNavNextNext(currentIndex > 1 ? (episodes[currentIndex - 2].url || null) : null);
      }
    }
  }, [episodes, currentUrl]);

  return {
    episodes,
    setEpisodes,
    navPrev,
    setNavPrev,
    navNext,
    setNavNext,
    navNextNext,
    setNavNextNext,
  };
}
