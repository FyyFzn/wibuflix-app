import { scrapeVideo, fetchSmartPlay, ServerItem, fetchUploadStatus, fetchCancelStream, fetchReportBroken } from '../services/api';
import { simpanKeRiwayat } from '../services/storage';
import { formatEpisodeTitle } from './usePlayerState';

export function useServerPlayback(state: any, player: any) {
  
  const loadEpisode = async (url: string, params: any) => {
    state.setLoading(true);
    state.setError(null);
    state.setPlayerMode('none');
    state.setNativeVideoUrl('');
    state.setActiveHost('');
    state.setActiveServerName('');
    state.setRetryCount(0);
    const previousUrl = state.currentEpisodeUrlRef?.current;
    const previousParams = state.currentEpisodeParamsRef?.current;
    
    if (state.currentEpisodeUrlRef) state.currentEpisodeUrlRef.current = url;
    if (state.currentEpisodeParamsRef) state.currentEpisodeParamsRef.current = params;

    if (state.abortControllerRef.current) {
      state.abortControllerRef.current.abort();
      if (previousUrl && previousUrl !== url) {
        fetchCancelStream(previousUrl, previousParams?.seriUrl, previousParams?.seriJudul, previousParams?.uniqueId).catch(() => {});
      }
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
        params.uniqueId as string,
        params.urls as string,
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
         if (!params.judul && data.judul) state.setTitle(formatEpisodeTitle(data.judul));
         state.setServers(data.servers || []);
         
         await simpanKeRiwayat(
            formatEpisodeTitle((params.judul as string) || data.judul), url, params.seriUrl || '', params.gambar || '', 0, 0, 'Azure Cloud', params.seriJudul as string, params.uniqueId as string
         );
         
         state.setLoading(false); // Pastikan layar loading 'Mencari server' mati

         // PENTING: Setelah scrape selesai dan menemukan nextEpisodeUrl (nav_next),
         // langsung panggil smart-play di background untuk memicu prefetch window!
         if (data.nav_next && !signal.aborted) {
           console.log(`[Smart-Play] Scrape selesai, trigger prefetch window: nav_next=${data.nav_next}`);
           fetchSmartPlay(
             url,
             params.seriUrl as string,
             data.nav_next,
             new AbortController().signal, // sinyal terpisah agar tidak dibatalkan
             params.seriJudul as string,
             (params.judul || data.judul) as string,
             params.uniqueId as string,
             params.urls as string,
           ).catch(() => {}); // fire-and-forget
         }

         // Jika Smart-Play belum READY di awal (misalnya masih mengekstrak URL pertama kali), jalankan Polling dengan Exponential Backoff
         if (!isReady && !fallbackTriggered) {
            state.setPlayerLoading(true); // Pastikan UI menampilkan overlay progress
            
            const pollSmartPlay = async (maxAttempts = 35): Promise<boolean> => {
              let delay = 2000;
              for (let i = 0; i < maxAttempts; i++) {
                if (!state.isMounted.current || signal.aborted) return false;
                console.log(`[Smart-Play Poll] Attempt ${i + 1}/${maxAttempts} (delay ${delay}ms) for ${url}`);
                
                try {
                  const pollRes = await fetchSmartPlay(
                    url,
                    params.seriUrl as string,
                    data.nav_next || undefined,
                    signal,
                    params.seriJudul as string,
                    (params.judul || data.judul) as string,
                    params.uniqueId as string,
                    params.urls as string,
                  );
                  if (!state.isMounted.current || signal.aborted) return false;

                  // Cek progress upload secara real-time
                  try {
                    const progRes = await fetchUploadStatus(url, params.seriUrl as string, params.seriJudul as string, params.uniqueId as string, signal);
                    if (progRes && progRes.success && progRes.progressMessage) {
                      state.setUploadProgress(progRes.progressMessage);
                    }
                  } catch (err) {}

                  if (pollRes.success) {
                    if (pollRes.status === 'READY' && pollRes.url) {
                      state.setPlayerMode('native');
                      state.setNativeVideoUrl(pollRes.url);
                      state.setNativeVideoHeaders({}); // JANGAN kirim header kustom untuk Azure Blob
                      state.setActiveHost('Azure Cloud');
                      state.setActiveServerName('Premium Direct Link');
                      state.setPlayerLoading(false);
                      return true;
                    } else if (pollRes.status === 'FAILED') {
                      return false;
                    }
                  } else {
                    return false;
                  }
                } catch (e) {
                  if (signal.aborted) return false;
                  return false;
                }

                // Exponential backoff: 2s, 3s, 4.5s... max 10s untuk menghemat baterai & resource mobile
                await new Promise(res => setTimeout(res, delay));
                delay = Math.min(delay * 1.5, 10000);
              }
              return false;
            };

            const isSuccess = await pollSmartPlay();
            if (!isSuccess) {
              fallbackTriggered = true;
            } else {
              isReady = true;
            }
         }
         
         // Dalam arsitektur Server-Driven (Thin Client), kita TIDAK memutar direct link/webview eksternal.
         // Jika polling selesai dan file Azure belum siap, tampilkan pesan error yang jelas.
         if (fallbackTriggered && !isReady) {
            if (!signal.aborted && state.isMounted.current) {
              state.setError('Gagal memutar video dari Azure Cloud Storage. Silakan klik tombol Lapor Rusak untuk memicu failover otomatis di server.');
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
    state.setShowResModal(false);
    state.setActiveServerName(srv.nama);
    state.setActiveHost(srv.namaHost || 'Azure Cloud');
    // Dalam arsitektur Server-Driven (Thin Client), semua resolusi dan provider dilayani via Azure Blob.
    loadEpisode(params.url, params);
  };

  const handleReportBroken = async (params: any, stopAllMedia: () => void) => {
    stopAllMedia();
    state.setPlayerLoading(true);
    state.setError(null);
    
    const currentUrl = state.currentEpisodeUrlRef?.current || params.url;
    console.log(`[Report Broken V2] Melaporkan video rusak untuk URL: ${currentUrl}. Backend akan otomatis melakukan failover ke provider cadangan...`);

    // 1. Laporkan ke backend (V2 Server-Driven Failover)
    const reportRes = await fetchReportBroken(
      currentUrl,
      params.seriUrl,
      params.seriJudul,
      params.uniqueId,
      params.judul,
      state.activeServerName
    );

    if (reportRes && reportRes.success && reportRes.message) {
       console.log(`[Report Broken V2] Backend response: ${reportRes.message}`);
    }

    // 2. Muat ulang episode. Karena backend V2 sudah memulai re-ekstraksi dari provider alternatif (Nanime/Otakudesu) ke Azure Blob, loadEpisode akan otomatis memutar stream baru tersebut!
    loadEpisode(currentUrl, params);
  };

  return {
    loadEpisode,
    handleSelectHost,
    handleSelectResolution,
    handleReportBroken
  };
}
