import { scrapeVideo, fetchSmartPlay, ServerItem, fetchCancelStream, fetchReportBroken } from '../services/api';
import { simpanKeRiwayat } from '../services/storage';
import { formatEpisodeTitle } from './usePlayerState';
import { pollSmartPlayUntilReady } from '../services/streamPoller';

export function useServerPlayback(state: any, player: any) {
  
  const loadEpisode = async (url: string, params: any, isAutoRetry: boolean = false) => {
    state.setLoading(true);
    state.setError(null);
    state.setPlayerMode('none');
    state.setNativeVideoUrl('');
    state.setActiveHost('');
    state.setActiveServerName('');
    if (!isAutoRetry) {
      state.setRetryCount(0);
    }
    state.setCurrentPosition(0);
    state.setTotalDuration(0);
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
      if (params.seriJudul || params.judul) {
         simpanKeRiwayat(
            formatEpisodeTitle((params.judul as string) || 'Episode'), url, params.seriUrl || '', params.gambar || '', 0, 0, 'Azure Cloud', params.seriJudul as string, params.uniqueId as string
         ).catch(() => {});
      }

      const smartPlayRes = await fetchSmartPlay(
        url,
        params.seriUrl as string,
        undefined,
        signal,
        params.seriJudul as string,
        params.judul as string,
        params.uniqueId as string,
        params.urls as string,
      ).catch(e => {
        console.log('[Fast Smart-Play Error]', e.message);
        return null;
      });

      if (!state.isMounted.current || signal.aborted) return;

      let isReady = false;
      let fallbackTriggered = false;

      if (smartPlayRes && smartPlayRes.success) {
        if (!params.judul && smartPlayRes.judul) state.setTitle(formatEpisodeTitle(smartPlayRes.judul));
        if (smartPlayRes.servers && smartPlayRes.servers.length > 0) {
          state.setServers(smartPlayRes.servers);
        }

        if (smartPlayRes.status === 'READY' && smartPlayRes.url) {
          console.log('[Fast Smart-Play] Video ditemukan! Langsung memutar dari Azure Blob Storage.');
          isReady = true;
          state.setPlayerMode('native');
          state.setNativeVideoUrl(smartPlayRes.url);
          state.setNativeVideoHeaders({});
          state.setActiveHost('Azure Cloud');
          state.setActiveServerName('Premium Direct Link');
          state.setLoading(false);
          state.setPlayerLoading(false);
        } else if (smartPlayRes.status === 'FAILED') {
          fallbackTriggered = true;
        }

        await simpanKeRiwayat(
          formatEpisodeTitle((params.judul as string) || smartPlayRes.judul || 'Episode'), url, params.seriUrl || '', params.gambar || '', 0, 0, 'Azure Cloud', params.seriJudul as string, params.uniqueId as string
        );

        if (smartPlayRes.nav_next && !signal.aborted) {
          console.log(`[Smart-Play] Enriched metadata memiliki nav_next=${smartPlayRes.nav_next}, trigger prefetch window...`);
          fetchSmartPlay(
            url,
            params.seriUrl as string,
            smartPlayRes.nav_next,
            new AbortController().signal,
            params.seriJudul as string,
            (params.judul || smartPlayRes.judul) as string,
            params.uniqueId as string,
            params.urls as string,
          ).catch(() => {});
        }
      }

      if ((!smartPlayRes || !smartPlayRes.servers || smartPlayRes.servers.length === 0) && !signal.aborted) {
        console.log('[Smart-Play Fallback] Metadata server kosong di V2 Stream, memuat dari Scrape UI...');
        const json = await scrapeVideo(url, params.seriJudul as string, params.judul as string, signal, params.urls as string).catch(() => null);
        if (json && json.status === 'success' && state.isMounted.current && !signal.aborted) {
          const data = json.data;
          if (!params.judul && data.judul) state.setTitle(formatEpisodeTitle(data.judul));
          state.setServers(data.servers || []);
          if (data.nav_next) {
            fetchSmartPlay(
              url,
              params.seriUrl as string,
              data.nav_next,
              new AbortController().signal,
              params.seriJudul as string,
              (params.judul || data.judul) as string,
              params.uniqueId as string,
              params.urls as string,
            ).catch(() => {});
          }
        }
      }

      if (state.isMounted.current && !signal.aborted) {
        state.setLoading(false);
      }

      if (!isReady && !fallbackTriggered) {
        state.setPlayerLoading(true);
        
        const isSuccess = await pollSmartPlayUntilReady({
          url,
          params,
          initialRes: smartPlayRes,
          signal,
          isMountedRef: state.isMounted,
          onProgress: (msg) => state.setUploadProgress(msg),
          onReady: (pollRes) => {
            state.setPlayerMode('native');
            state.setNativeVideoUrl(pollRes.url);
            state.setNativeVideoHeaders({});
            state.setActiveHost('Azure Cloud');
            state.setActiveServerName('Premium Direct Link');
            state.setPlayerLoading(false);
          }
        });

        if (!isSuccess) {
          fallbackTriggered = true;
        } else {
          isReady = true;
        }
      }
      
      if (fallbackTriggered && !isReady) {
        if (!signal.aborted && state.isMounted.current) {
          console.warn('[Auto-Failover] Video gagal diproses di Azure Blob. Memicu failover otomatis ke provider alternatif...');
          state.setError('Mendeteksi kendala pada stream cloud. Sedang memproses failover otomatis ke server alternatif...');
          fetchReportBroken(
            url,
            params.seriUrl as string,
            params.seriJudul as string,
            params.uniqueId as string,
            params.judul as string,
            state.activeServerName
          ).then(() => {
            if (state.isMounted.current && !signal.aborted && state.retryCount < 1) {
              state.setRetryCount(1);
              loadEpisode(url, params, true);
            } else if (state.isMounted.current) {
              state.setError('Gagal memutar video dari semua server cadangan. Silakan coba beberapa saat lagi.');
              state.setPlayerLoading(false);
            }
          });
        }
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
    loadEpisode(params.url, params);
  };

  const handleReportBroken = async (params: any, stopAllMedia: () => void) => {
    stopAllMedia();
    state.setPlayerLoading(true);
    state.setError(null);
    
    const currentUrl = state.currentEpisodeUrlRef?.current || params.url;
    console.log(`[Report Broken V2] Melaporkan video rusak untuk URL: ${currentUrl}. Backend akan otomatis melakukan failover ke provider cadangan...`);

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

    loadEpisode(currentUrl, params);
  };

  return {
    loadEpisode,
    handleSelectHost,
    handleSelectResolution,
    handleReportBroken
  };
}
