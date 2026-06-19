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
      const decodedCurrent = decodeURIComponent(currentUrl);

      // Helper: dapatkan URL representatif dari episode (support mode merge & legacy)
      const getEpUrl = (ep: EpisodeItem): string => {
        const raw = ep.url || ep.urls?.samehadaku || ep.urls?.otakudesu || ep.urls?.neosatsu || ep.urls?.kuronime || '';
        return decodeURIComponent(raw);
      };

      const currentIndex = episodes.findIndex(e => {
        const epUrl = getEpUrl(e);
        if (epUrl === decodedCurrent) return true;
        // Handle neosatsu #fragment URL
        if (epUrl.includes('#neosatsu_ep_') && decodedCurrent.includes('#neosatsu_ep_')) {
          return epUrl.split('#')[1] === decodedCurrent.split('#')[1];
        }
        return false;
      });
      
      if (currentIndex !== -1) {
        // Cek arah urutan episode (Ascending vs Descending)
        let isAscending = false;
        if (episodes.length > 1) {
          const extractEpNum = (title: string) => {
            const match = title.match(/(?:episode|ep|eps)\s*(\d+(?:\.\d+)?)/i) || title.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
          };
          const numFirst = extractEpNum(episodes[0].judul);
          const numLast = extractEpNum(episodes[episodes.length - 1].judul);
          if (numFirst !== null && numLast !== null && numLast > numFirst) {
            isAscending = true;
          }
        }

        if (isAscending) {
          // Ascending: Index 0 = Ep 1, Index 1 = Ep 2
          setNavPrev(prev => prev || (currentIndex > 0 ? (getEpUrl(episodes[currentIndex - 1]) || null) : null));
          setNavNext(prev => prev || (currentIndex < episodes.length - 1 ? (getEpUrl(episodes[currentIndex + 1]) || null) : null));
        } else {
          // Descending: Index 0 = Ep 12, Index 11 = Ep 1
          setNavPrev(prev => prev || (currentIndex < episodes.length - 1 ? (getEpUrl(episodes[currentIndex + 1]) || null) : null));
          setNavNext(prev => prev || (currentIndex > 0 ? (getEpUrl(episodes[currentIndex - 1]) || null) : null));
        }
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
  };
}
