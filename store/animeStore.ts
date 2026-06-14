import { create } from 'zustand';
import { AnimeItem } from '../services/api';

interface AnimeStore {
  // Store untuk cache list per kategori agar tidak reload saat bolak balik
  catalogs: {
    anime: AnimeItem[];
    toku: AnimeItem[];
    all: AnimeItem[];
  };
  setCatalog: (category: 'anime' | 'toku' | 'all', data: AnimeItem[]) => void;
  
  // Store untuk data detail yang sedang diakses
  selectedAnime: AnimeItem | null;
  setSelectedAnime: (anime: AnimeItem | null) => void;
  
  // Method untuk mencari anime dari cache
  findAnimeByUrl: (url: string) => AnimeItem | undefined;
}

export const useAnimeStore = create<AnimeStore>((set, get) => ({
  catalogs: {
    anime: [],
    toku: [],
    all: [],
  },
  
  setCatalog: (category, data) => set((state) => ({
    catalogs: {
      ...state.catalogs,
      [category]: data,
    }
  })),
  
  selectedAnime: null,
  setSelectedAnime: (anime) => set({ selectedAnime: anime }),
  
  findAnimeByUrl: (url: string) => {
    const { catalogs } = get();
    // Cari di semua kategori
    for (const category of Object.values(catalogs)) {
      const found = category.find((item) => item.url === url);
      if (found) return found;
    }
    return undefined;
  }
}));
