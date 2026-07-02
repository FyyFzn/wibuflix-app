import { ServerItem } from '../services/api';

export const getHostName = (srv: ServerItem): string => {
  if (srv.namaHost) return srv.namaHost.toLowerCase();
  const nama = srv.nama || '';
  const parts = nama.split('·');
  let candidate = (parts[parts.length - 1].trim().split(' ')[0] || 'unknown').toLowerCase();

  if (candidate === 'server' || candidate === 'unknown') {
    candidate = 'alternatif';
  }

  if (srv.source && srv.source === 'Otakudesu') {
    candidate = `[otaku] ${candidate}`;
  }

  return candidate;
};

interface GenerateScriptOptions {
  activeHost: string;
  savedProgress: number;
}

export const generateInjectedJS = ({ activeHost, savedProgress }: GenerateScriptOptions): {
  injectedJS: string;
  isBlogger: boolean;
  isVidhide: boolean;
  isGdrive: boolean;
  isMega: boolean;
} => {
  const hostLower = activeHost.toLowerCase();
  const isBlogger = hostLower.includes('blog');
  const isVidhide = hostLower.includes('vidhide') || hostLower.includes('vidlion');
  const isGdrive = hostLower.includes('drive') || hostLower.includes('gdrive');
  const isMega = hostLower.includes('mega');

  let injectedJS = `
    window.open = function() { return null; };
    window.hasRestoredProgress = false;
    document.addEventListener('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'webviewClick'}));
    }, true);
    document.addEventListener('touchstart', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webviewClick' }));
    }, {passive: true, capture: true});

    ['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
      document.addEventListener(evt, () => {
        const isFS = document.fullscreenElement || document.webkitFullscreenElement;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: isFS ? 'fullscreen' : 'exitFullscreen' }));
      });
    });
  `;

  if (isBlogger || isGdrive) {
    injectedJS += `
      let extracted = false;
      setInterval(() => {
        if(extracted) return;
        try {
          const playBtn = document.querySelector('.ytp-large-play-button, .play-button, button, .ndfHFb-c4YZDc-Wrql6b, [role="button"]');
          if (playBtn) playBtn.click();
          
          const v = document.querySelector('video');
          if (v && v.src && v.src.startsWith('http') && !v.src.startsWith('blob:')) {
            extracted = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoUrl', url: v.src }));
          }
        } catch(e){}
      }, 500);
    `;
  }

  if (isVidhide) {
    injectedJS += `
      setInterval(() => {
        try {
          const overlays = document.querySelectorAll('div, iframe');
          overlays.forEach(o => {
             const z = window.getComputedStyle(o).zIndex;
             if (z && !isNaN(z) && parseInt(z) > 1000 && o.id !== 'vjs_video_3') {
                o.style.display = 'none';
              }
          });
        } catch(e){}
      }, 1000);
    `;
  }

  if (isMega) {
    injectedJS += `
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    `;
  }

  if (!isBlogger && !isGdrive) {
    injectedJS += `
      console.log('[InjectedJS] savedProgress=${savedProgress}');
      setInterval(() => {
        try {
          const v = document.querySelector('video');
          if (v) {
             if (v.paused) {
                v.play().catch(()=>{});
             }
             if (!window.hasRestoredProgress && ${savedProgress} > 5 && v.readyState >= 1) {
                v.currentTime = ${savedProgress};
                window.hasRestoredProgress = true;
             }
             if (v.currentTime > 5 && v.duration > 0 && !v.paused) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ 
                   type: 'progress', 
                   currentTime: v.currentTime, 
                   duration: v.duration 
                }));
             }
          }
        } catch(e){}
      }, 1000);
    `;
  }

  injectedJS += "true;";

  return { injectedJS, isBlogger, isVidhide, isGdrive, isMega };
};
