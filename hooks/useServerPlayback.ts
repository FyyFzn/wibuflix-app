import { scrapeVideo, fetchSmartPlay, ServerItem, resolveServer, extractVideoUrl, fetchUploadStatus } from '../services/api';
import { simpanKeRiwayat } from '../services/storage';

export function useServerPlayback(state: any, player: any) {
  
  const playServer = async (iframeUrl: string, serverName: string, isAutoPlay = false, signal: AbortSignal) => {
    state.setPlayerMode('none');
    state.setWebviewUrl('');
    state.setNativeVideoUrl('');
    state.setPlayerLoading(true);
    state.setActiveServerName(serverName);

    try {
      const extractRes = await extractVideoUrl(iframeUrl, signal);
      if (!state.isMounted.current || signal.aborted) return false;

      if (extractRes.success && extractRes.url) {
        state.setPlayerMode('native');
        state.setNativeVideoUrl(extractRes.url);
        state.setNativeVideoHeaders(extractRes.headers || {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/120.0.0.0',
        });
        state.setPlayerLoading(false);
        return true;
      }
    } catch (e) {
      console.log('Native extract error', e);
    }
    
    if (!state.isMounted.current || signal.aborted) return false;
    state.setPlayerMode('webview');
    state.setWebviewUrl(iframeUrl);
    state.setPlayerLoading(false);
    return true;
  };

  const attemptToPlayServers = async (serverList: ServerItem[], episodeUrl: string, signal: AbortSignal): Promise<boolean> => {
    state.setServers(serverList);
    const activeServers = serverList.filter(s => s.aktif);
    if (activeServers.length === 0) return false;

    // Try first active server
    const srv = activeServers[0];
    state.setActiveHost(srv.namaHost || 'Alternatif');
    
    try {
      let iframeUrl = srv.iframeUrl;
      if (!iframeUrl) {
         const res = await resolveServer(episodeUrl, srv.nume, signal);
         if (signal.aborted) return false;
         iframeUrl = res.data.iframeUrl;
      }
      
      if (iframeUrl) {
        return await playServer(iframeUrl, srv.nama, true, signal);
      }
    } catch(e) {
      console.log('Failed to resolve server', e);
    }
    return false;
  };

  const loadEpisode = async (url: string, params: any) => {
    state.setLoading(true);
    state.setError(null);
    state.setPlayerMode('none');
    state.setWebviewUrl('');
    state.setNativeVideoUrl('');
    state.setActiveHost('');
    state.setActiveServerName('');
    state.setFallbackWebviewUrl('');
    state.setRetryCount(0);
    state.currentEpisodeUrlRef.current = url;

    if (state.abortControllerRef.current) {
      state.abortControllerRef.current.abort();
    }
    state.abortControllerRef.current = new AbortController();
    const signal = state.abortControllerRef.current.signal;

    try {
      // 1. Eksekusi Smart-Play secepat kilat TANPA menunggu Scrape UI selesai
      const smartPlayPromise = fetchSmartPlay(
        url,
        params.seriUrl as string,
        undefined, // nextEpisodeUrl (belum tahu karena belum di-scrape)
        signal,
        params.seriJudul as string,
        params.judul as string,
      ).catch(e => {
        console.log('[Fast Smart-Play Error]', e.message);
        return null;
      });

      // 2. Eksekusi Scrape UI (untuk memuat daftar server & tombol Next) di Background
      const scrapePromise = scrapeVideo(url, params.seriJudul as string, params.judul as string, signal, params.urls as string).catch(e => {
        console.log('[Background Scrape Error]', e.message);
        return null;
      });

      let isReady = false;
      let fallbackTriggered = false;

      // Tunggu hasil Smart-Play pertama kali (biasanya instan 50-100ms jika sudah READY/UPLOADING)
      const smartPlayRes = await smartPlayPromise;
      if (!state.isMounted.current || signal.aborted) return;

      if (smartPlayRes && smartPlayRes.success && smartPlayRes.status === 'READY' && smartPlayRes.url) {
        console.log('[Fast Smart-Play] Video ditemukan! Langsung memutar tanpa menunggu scrape selesai.');
        isReady = true;
        state.setPlayerMode('native');
        state.setNativeVideoUrl(smartPlayRes.url);
        state.setNativeVideoHeaders({}); // JANGAN kirim header kustom untuk Azure Blob (Mencegah CORS Preflight)
        state.setActiveHost('Azure Cloud');
        state.setActiveServerName('Premium Direct Link');
        state.setLoading(false); // Sembunyikan tulisan "Mencari server..."
        state.setPlayerLoading(false); // Sembunyikan tulisan "Menyiapkan video..."
      } else if (smartPlayRes && smartPlayRes.success && smartPlayRes.status === 'FAILED') {
        fallbackTriggered = true;
      }

      // 3. Setelah Video Menyala (Atau Gagal), Barulah Tunggu Hasil Scrape UI
      const json = await scrapePromise;
      if (!state.isMounted.current || signal.aborted) return;

      if (!json || json.status !== 'success') {
         if (!isReady) throw new Error(json?.data?.judul || 'Gagal memuat metadata episode.');
      } else {
         const data = json.data;
         if (!params.judul && data.judul) state.setTitle(data.judul);
         state.setServers(data.servers || []);
         
         await simpanKeRiwayat(
            (params.judul as string) || data.judul, url, params.seriUrl || '', params.gambar || '', 0, 0, 'Azure Cloud', params.seriJudul as string
         );
         
         state.setLoading(false); // Pastikan layar loading 'Mencari server' mati

         // ═══════════════════════════════════════════════════════════════
         // PENTING: Jika episode sudah READY dari awal (fast-path),
         // smart-play pertama dipanggil SEBELUM scrape selesai sehingga
         // nextEpisodeUrl belum diketahui → prefetch
         // tidak terpicu! Perbaikan: panggil smart-play sekali lagi di
         // background setelah scrape selesai untuk memastikan prefetch jalan.
         // ═══════════════════════════════════════════════════════════════
         if (isReady && data.nav_next && !signal.aborted) {
           console.log(`[Smart-Play] Episode READY, trigger prefetch window: nav_next=${data.nav_next}`);
           fetchSmartPlay(
             url,
             params.seriUrl as string,
             data.nav_next,
             new AbortController().signal, // sinyal terpisah agar tidak dibatalkan
             params.seriJudul as string,
             (params.judul || data.judul) as string,
           ).catch(() => {}); // fire-and-forget
         }

         // Jika Smart-Play belum READY di awal (misalnya masih mengekstrak URL pertama kali), jalankan Polling
         if (!isReady && !fallbackTriggered) {
            state.setPlayerLoading(true); // Pastikan UI menampilkan overlay progress
            let pollCount = 0;
            const maxPolls = 150;
            while (!isReady && pollCount < maxPolls) {
              if (!state.isMounted.current || signal.aborted) return;
              console.log(`[Smart-Play Poll] Attempt ${pollCount + 1}/${maxPolls} for ${url}`);
              try {
                 const pollRes = await fetchSmartPlay(
                  url,
                  params.seriUrl as string,
                  data.nav_next || undefined,
                  signal,
                  params.seriJudul as string,
                  (params.judul || data.judul) as string,
                );
                if (!state.isMounted.current || signal.aborted) return;
                
                // Cek progress upload secara real-time
                try {
                  const progRes = await fetchUploadStatus(url, params.seriUrl as string, signal);
                  if (progRes && progRes.success && progRes.progressMessage) {
                    state.setUploadProgress(progRes.progressMessage);
                  }
                } catch (err) {}
                
                if (pollRes.success) {
                  if (pollRes.status === 'READY' && pollRes.url) {
                    isReady = true;
                    state.setPlayerMode('native');
                    state.setNativeVideoUrl(pollRes.url);
                    state.setNativeVideoHeaders({}); // JANGAN kirim header kustom untuk Azure Blob
                    state.setActiveHost('Azure Cloud');
                    state.setActiveServerName('Premium Direct Link');
                    state.setPlayerLoading(false);
                    break;
                  } else if (pollRes.status === 'FAILED') {
                    fallbackTriggered = true;
                    break;
                  }
                } else {
                  fallbackTriggered = true;
                  break;
                }
              } catch (e) {
                if (signal.aborted) return;
                fallbackTriggered = true;
                break;
              }
              pollCount++;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            if (!isReady && pollCount >= maxPolls) fallbackTriggered = true;
         }
         
         // FALLBACK
         if (fallbackTriggered && !isReady) {
            const played = await attemptToPlayServers(data.servers || [], url, signal);
            if (!played && !signal.aborted && state.isMounted.current) {
              state.setError('Gagal memproses video dari Azure dan Fallback Server tidak tersedia.');
              state.setPlayerLoading(false);
            }
         }
         
         return data;
      }

    } catch (err: any) {
      if (signal.aborted) return;
      state.setError(err.message || 'Gagal memuat video');
      state.setLoading(false);
      state.setPlayerLoading(false);
    }
  };

  const handleSelectHost = (hostName: string, items: ServerItem[], params: any, stopAllMedia: () => void, saveCurrentProgress: () => void) => {
    state.setActiveHost(hostName);
  };

  const handleSelectResolution = async (srv: ServerItem, params: any, stopAllMedia: () => void, saveCurrentProgress: () => void) => {
    stopAllMedia();
    saveCurrentProgress();
    
    if (state.abortControllerRef.current) state.abortControllerRef.current.abort();
    state.abortControllerRef.current = new AbortController();
    const signal = state.abortControllerRef.current.signal;
    
    state.setShowResModal(false);
    state.setPlayerLoading(true);
    state.setError(null);
    state.setActiveHost(srv.namaHost || 'Alternatif');

    try {
      let iframeUrl = srv.iframeUrl;
      if (!iframeUrl) {
         const res = await resolveServer(params.url, srv.nume, signal);
         if (signal.aborted) return;
         iframeUrl = res.data.iframeUrl;
      }
      if (iframeUrl) {
         await playServer(iframeUrl, srv.nama, false, signal);
      } else {
         state.setError('Gagal mendapatkan link video untuk server ini.');
         state.setPlayerLoading(false);
      }
    } catch(e: any) {
      if (signal.aborted) return;
      state.setError(e.message || 'Gagal memuat server.');
      state.setPlayerLoading(false);
    }
  };

  return {
    playServer,
    attemptToPlayServers,
    loadEpisode,
    handleSelectHost,
    handleSelectResolution
  };
}
