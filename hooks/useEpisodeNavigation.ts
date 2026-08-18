import { useState, useEffect } from 'react';
import { getPrimaryUrl } from '../utils/urlFallbackHelper';
import { fetchEpisodes, EpisodeItem } from '../services/api';

export function useEpisodeNavigation(seriUrl: string | undefined, currentUrl: string | undefined, initialNavPrev: string | null, initialNavNext: string | null, urlsString?: string) {
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [navPrev, setNavPrev] = useState<string | null>(initialNavPrev);
  const [navNext, setNavNext] = useState<string | null>(initialNavNext);

  useEffect(() => {
    if (seriUrl) {
      let urlsObj = undefined;
      try {
        if (urlsString) urlsObj = JSON.parse(urlsString);
      } catch (e) { }

      fetchEpisodes(seriUrl, urlsObj)
        .then(res => {
          const epList = res.data.daftar_episode || [];
          setEpisodes(epList);
        })
        .catch(() => { });
    }
  }, [seriUrl, urlsString]);

  // Fallback: If backend fails to extract nav_prev/nav_next, calculate them from the episodes list
  useEffect(() => {
    if (episodes.length > 0 && currentUrl) {
      const decodedCurrent = decodeURIComponent(currentUrl);

      // Helper: dapatkan URL representatif dari episode (support mode merge & legacy)
      const getEpUrl = (ep: EpisodeItem): string => {
        const raw = getPrimaryUrl(ep);
        return decodeURIComponent(raw || '');
      };

      const cleanEpUrl = (u?: string) => {
        if (!u) return '';
        let str = decodeURIComponent(u);
        if (str.includes('?url=')) str = decodeURIComponent(str.split('?url=')[1]);
        return str.replace(/\/$/, '');
      };

      const targetNorm = cleanEpUrl(decodedCurrent);
      const currentIndex = episodes.findIndex(e => {
        const urlsToCheck = [
          getPrimaryUrl(e)
        ].filter(Boolean).map(u => decodeURIComponent(u as string));

        return urlsToCheck.some(url => {
          if (cleanEpUrl(url) === targetNorm) return true;
          // Handle neosatsu #fragment URL
          if (url.includes('#neosatsu_ep_') && decodedCurrent.includes('#neosatsu_ep_')) {
            return url.split('#')[1] === decodedCurrent.split('#')[1];
          }
          return false;
        });
      });

      if (currentIndex !== -1) {
        // Cek arah urutan episode (Ascending vs Descending)
        let isAscending = false;
        if (episodes.length > 1) {
          const extractEpNum = (title: string) => {
            const match = title.match(/(?:episode|ep|eps)[\s-_]*0*(\d+(?:\.\d+)?)/i);
            if (match) return parseFloat(match[1]);
            const fallback = title.match(/(?:--|__|-\s*|\s+-\s*|\[|\()[\s-_]*0*(\d+(?:\.\d+)?)(?:\b|\s|[-_\]\)\.]|$)/) || title.match(/\b0*(\d+(?:\.\d+)?)\s*(?:\(End\))?\s*$/i);
            return fallback ? parseFloat(fallback[1]) : null;
          };
          const numberedEps = episodes.filter(e => extractEpNum(e.judul) !== null);
          if (numberedEps.length > 1) {
            const numFirst = extractEpNum(numberedEps[0].judul) as number;
            const numLast = extractEpNum(numberedEps[numberedEps.length - 1].judul) as number;
            if (numLast > numFirst) {
              isAscending = true;
            }
          }
        }

        if (isAscending) {
          // Ascending: Index 0 = Ep 1, Index 1 = Ep 2
          setNavPrev(prev => (currentIndex > 0 ? (getEpUrl(episodes[currentIndex - 1]) || null) : prev));
          setNavNext(prev => (currentIndex < episodes.length - 1 ? (getEpUrl(episodes[currentIndex + 1]) || null) : prev));
        } else {
          // Descending: Index 0 = Ep 12, Index 11 = Ep 1
          setNavPrev(prev => (currentIndex < episodes.length - 1 ? (getEpUrl(episodes[currentIndex + 1]) || null) : prev));
          setNavNext(prev => (currentIndex > 0 ? (getEpUrl(episodes[currentIndex - 1]) || null) : prev));
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
