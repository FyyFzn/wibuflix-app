import { fetchSmartPlay, fetchUploadStatus, SmartPlayResponse } from './api';

export interface PollOptions {
  url: string;
  params: any;
  initialRes?: SmartPlayResponse | null;
  signal: AbortSignal;
  isMountedRef: { current: boolean };
  onProgress?: (msg: string) => void;
  onReady?: (pollRes: SmartPlayResponse) => void;
  maxAttempts?: number;
}

/**
 * Service murni untuk melakukan polling status stream Azure Blob
 * dengan algoritma exponential backoff.
 */
export async function pollSmartPlayUntilReady(options: PollOptions): Promise<boolean> {
  const {
    url,
    params,
    initialRes,
    signal,
    isMountedRef,
    onProgress,
    onReady,
    maxAttempts = 35
  } = options;

  let delay = 2000;
  for (let i = 0; i < maxAttempts; i++) {
    if (!isMountedRef.current || signal.aborted) return false;
    console.log(`[Smart-Play Poll] Attempt ${i + 1}/${maxAttempts} (delay ${delay}ms) for ${url}`);

    try {
      const pollRes = await fetchSmartPlay(
        url,
        params.seriUrl as string,
        initialRes?.nav_next || undefined,
        signal,
        params.seriJudul as string,
        (params.judul || initialRes?.judul) as string,
        params.uniqueId as string,
        params.urls as string,
      );
      if (!isMountedRef.current || signal.aborted) return false;

      try {
        const progRes = await fetchUploadStatus(url, params.seriUrl as string, params.seriJudul as string, params.uniqueId as string, signal);
        if (progRes && progRes.success && progRes.progressMessage && onProgress) {
          onProgress(progRes.progressMessage);
        }
      } catch (err) {}

      if (pollRes.success) {
        if (pollRes.status === 'READY' && pollRes.url) {
          if (onReady) onReady(pollRes);
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

    await new Promise<void>(res => {
      const timer = setTimeout(res, delay);
      if (signal.aborted) {
        clearTimeout(timer);
        res();
      } else {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          res();
        }, { once: true });
      }
    });
    delay = Math.min(delay * 1.5, 10000);
  }
  return false;
}
