import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../styles/playerStyles';
import { Colors, Spacing, BorderRadius, FontSize } from '../../styles/theme';

interface PlayerWebViewProps {
  webviewRef: React.RefObject<any>;
  webviewUrl: string;
  isBlogger: boolean;
  injectedJS: string;
  isFullscreen: boolean;
  showWebviewControls: boolean;
  setShowWebviewControls: (val: boolean) => void;
  setPlayerMode: (val: any) => void;
  setNativeVideoUrl: (url: string) => void;
  setWebviewUrl: (url: string) => void;
  setCurrentPosition: (val: number) => void;
  setTotalDuration: (val: number) => void;
  lastKnownPositionRef: React.MutableRefObject<number>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  setPlayerLoading: (val: boolean) => void;
  handleUIBackPress: () => void;
  navPrev: string | null;
  navNext: string | null;
  navigateEpisode: (url: string) => void;
  webviewControlsTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isSkipOPVisible: boolean;
  isSkipEDVisible: boolean;
  handleSkipOP: (e: any) => void;
  handleSkipED: (e: any) => void;
  playbackSpeed: number;
  setShowSpeedModal: (val: boolean) => void;
}

export default function PlayerWebView({
  webviewRef, webviewUrl, isBlogger, injectedJS, isFullscreen,
  showWebviewControls, setShowWebviewControls, setPlayerMode, setNativeVideoUrl,
  setWebviewUrl, setCurrentPosition, setTotalDuration, lastKnownPositionRef,
  enterFullscreen, exitFullscreen, setPlayerLoading, handleUIBackPress,
  navPrev, navNext, navigateEpisode, webviewControlsTimeoutRef,
  isSkipOPVisible, isSkipEDVisible, handleSkipOP, handleSkipED,
  playbackSpeed, setShowSpeedModal
}: PlayerWebViewProps) {
  const [showMiniNav, setShowMiniNav] = useState(false);
  const miniNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (webviewUrl.includes('vidhide')) {
    injectedJS += `
      setInterval(() => {
        try {
          const overlays = document.querySelectorAll('div:not([data-cleaned]), iframe:not([data-cleaned])');
          overlays.forEach(o => {
             const z = window.getComputedStyle(o).zIndex;
             if (z && !isNaN(z) && parseInt(z) > 1000 && o.id !== 'vjs_video_3') {
                o.style.display = 'none';
                o.setAttribute('data-cleaned', '1');
             }
          });
        } catch(e){}
      }, 1000);
    `;
  }

  if (webviewUrl.includes('acefile') || webviewUrl.includes('filedon') || webviewUrl.includes('pucuk')) {
    injectedJS += `
      setInterval(() => {
        try {
          // Hapus popup "Klik Disini" dan Copyright (khusus acefile)
          if (window.location.href.includes('acefile')) {
            const texts = document.querySelectorAll('div:not([data-cleaned]), span:not([data-cleaned]), p:not([data-cleaned])');
            for (const el of texts) {
              if (el.innerText && (el.innerText.includes('untuk menyalin dan memutar') || el.innerText.includes('Copyright ©') || el.innerText.includes('login terlebih dahulu'))) {
                if (!el.querySelector('video') && !el.querySelector('iframe')) {
                  el.style.display = 'none';
                  el.style.pointerEvents = 'none';
                  el.setAttribute('data-cleaned', '1');
                }
              }
            }
          }
          // Jika video (Default server) sedang berjalan, paksa fullscreen
          const v = document.querySelector('video');
          if (v && v.currentTime > 0 && !v.dataset.fsFixed) {
            v.style.position = 'fixed';
            v.style.top = '0px';
            v.style.left = '0px';
            v.style.width = '100vw';
            v.style.height = '100vh';
            v.style.zIndex = '2147483647';
            v.style.background = 'black';
            v.style.objectFit = 'contain';
            v.dataset.fsFixed = '1';
          }
          // Jika menggunakan Mirror 2 (muncul iframe player baru), paksa iframe tersebut fullscreen
          const iframes = document.querySelectorAll('iframe:not([data-fs-fixed])');
          for (const frame of Array.from(iframes)) {
             const h = frame.getAttribute('height');
             const w = frame.getAttribute('width');
             // Abaikan iframe tracking/invisible
             if (h !== '1' && w !== '1' && frame.style.visibility !== 'hidden' && frame.style.display !== 'none') {
                frame.style.position = 'fixed';
                frame.style.top = '0px';
                frame.style.left = '0px';
                frame.style.width = '100vw';
                frame.style.height = '100vh';
                frame.style.zIndex = '2147483646';
                frame.style.background = 'black';
                frame.style.border = 'none';
                frame.setAttribute('data-fs-fixed', '1');
             }
          }
        } catch(e){}
      }, 1000);
    `;
  }

  React.useEffect(() => {
    return () => {
      // GARBAGE COLLECTION: Stop all media and clear WebView to prevent memory leaks / ghost audio
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          try {
            var mediaElements = document.querySelectorAll('video, audio');
            for (var i = 0; i < mediaElements.length; i++) {
              mediaElements[i].pause();
              mediaElements[i].removeAttribute('src');
              mediaElements[i].load();
            }
            document.body.innerHTML = '';
            window.location.href = 'about:blank';
          } catch(e) {}
          true;
        `);
      }
    };
  }, []);

  React.useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        try {
          if (typeof jwplayer === 'function' && jwplayer().setPlaybackRate) {
            jwplayer().setPlaybackRate(${playbackSpeed});
          }
          const v = document.querySelector('video');
          if (v) v.playbackRate = ${playbackSpeed};
          // Coba ubah di dalam iframe jika se-domain (tidak akan jalan untuk iframe lintas domain seperti Mirror 2 karena CORS)
          const iframes = document.querySelectorAll('iframe');
          for (const f of Array.from(iframes)) {
             try {
               const v2 = f.contentDocument && f.contentDocument.querySelector('video');
               if (v2) v2.playbackRate = ${playbackSpeed};
             } catch(e) {}
          }
        } catch(e) {}
        true;
      `);
    }
  }, [playbackSpeed]);

  const skipWebview = (amount: number) => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        try {
          if (typeof jwplayer === 'function' && jwplayer().seek && jwplayer().getPosition) {
            jwplayer().seek(jwplayer().getPosition() + (${amount}));
          } else {
            const v = document.querySelector('video');
            if (v) {
              v.currentTime = Math.max(0, v.currentTime + (${amount}));
            }
          }
        } catch(e){}
        true;
      `);
    }
    if (webviewControlsTimeoutRef.current) clearTimeout(webviewControlsTimeoutRef.current);
    webviewControlsTimeoutRef.current = setTimeout(() => setShowWebviewControls(false), 4000);
  };

  const isMega = webviewUrl.toLowerCase().includes('mega');
  const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

  return (
    <View style={styles.flex1}>
      <WebView
        ref={webviewRef}
        userAgent={isMega ? desktopUA : undefined}
        source={
          webviewUrl.toLowerCase().includes('wibufile')
            ? {
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: black; overflow: hidden; }</style>
                  </head>
                  <body>
                    <iframe src="${webviewUrl}" width="100%" height="100%" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"></iframe>
                  </body>
                  </html>
                `,
                baseUrl: 'https://v2.samehadaku.how/'
              }
            : { uri: webviewUrl, headers: { Referer: 'https://v2.samehadaku.how/' } }
        }
        style={styles.webview}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        setSupportMultipleWindows={false}
        injectedJavaScript={`
          const style = document.createElement('style');
          style.innerHTML = '.vjs-fullscreen-control, .jw-icon-fullscreen, .plyr__control[data-plyr="fullscreen"], .fp-fullscreen { display: none !important; } html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; } #kelik, #btmx, #dloadmen { display: none !important; pointer-events: none !important; }';
          document.head.appendChild(style);
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
          document.head.appendChild(meta);
          window.addEventListener('resize', () => {
            document.body.style.height = window.innerHeight + 'px';
            document.body.style.width = window.innerWidth + 'px';
          });
          ${injectedJS}
        `}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'videoUrl') {
              if (!isBlogger && !webviewUrl.includes('drive.google.com')) return;
              setWebviewUrl('');
              setNativeVideoUrl(data.url);
              setPlayerMode('native');
            } else if (data.type === 'webviewClick') {
              setShowMiniNav(true);
              if (miniNavTimeoutRef.current) clearTimeout(miniNavTimeoutRef.current);
              miniNavTimeoutRef.current = setTimeout(() => setShowMiniNav(false), 4000);
            } else if (data.type === 'progress') {
              const t = Math.floor(data.currentTime);
              setCurrentPosition(t);
              lastKnownPositionRef.current = t;
              setTotalDuration(Math.floor(data.duration));
            } else if (data.type === 'fullscreen') {
              enterFullscreen();
            } else if (data.type === 'exitFullscreen') {
              exitFullscreen();
            }
          } catch(e){}
        }}
        onLoadEnd={() => setPlayerLoading(false)}
      />
      {/* Tombol Darurat / Floating Menu saat terjebak di cross-origin iframe */}
      {!showWebviewControls && !showMiniNav && (
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: isFullscreen ? Spacing.xl : Spacing.md,
            left: isFullscreen ? Spacing.xl : Spacing.md,
            padding: 8,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            zIndex: 9999
          }}
          onPress={() => {
            setShowMiniNav(true);
            if (miniNavTimeoutRef.current) clearTimeout(miniNavTimeoutRef.current);
            miniNavTimeoutRef.current = setTimeout(() => setShowMiniNav(false), 4000);
          }}
        >
          <Ionicons name="grid" size={24} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      )}

      {/* Mini Nav Controls (Applies to both modes) */}
      {!showWebviewControls && showMiniNav && (
        <>
          <TouchableOpacity 
            style={styles.wvPermExitBtn} 
            onPress={isFullscreen ? exitFullscreen : handleUIBackPress}
          >
            <Ionicons name={isFullscreen ? "contract" : "arrow-back"} size={24} color={Colors.white} />
            <Text style={[styles.wvPermExitText, { marginLeft: 8, fontSize: 16 }]}>{isFullscreen ? 'Keluar' : 'Kembali'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.wvPermExitBtn, { left: undefined, right: Spacing.xl }]} 
            onPress={() => {
              setShowMiniNav(false);
              setShowWebviewControls(true);
              if (webviewControlsTimeoutRef.current) clearTimeout(webviewControlsTimeoutRef.current);
              webviewControlsTimeoutRef.current = setTimeout(() => setShowWebviewControls(false), 4000);
            }}
          >
            <Ionicons name="menu" size={24} color={Colors.white} />
            <Text style={[styles.wvPermExitText, { marginLeft: 8, fontSize: 16 }]}>Menu Navigasi</Text>
          </TouchableOpacity>
        </>
      )}

      {showWebviewControls && (
        <Pressable 
          style={styles.wvTouchOverlay} 
          onPress={() => setShowWebviewControls(false)}
        >
          <TouchableOpacity 
            style={styles.wvBackBtn} 
            onPress={(e) => { e.stopPropagation(); isFullscreen ? exitFullscreen() : handleUIBackPress(); }}
          >
            <Text style={styles.wvPermExitText}>←</Text>
            <Text style={styles.wvBackText}>Kembali / Keluar</Text>
          </TouchableOpacity>

          <View style={styles.wvControlsGroup}>
            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); navPrev && navigateEpisode(navPrev); }} disabled={!navPrev}>
              <Text style={[styles.wvCtrlIcon, !navPrev && styles.opacity30]}>⏮</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); skipWebview(-10); }}>
              <Ionicons name="play-back" size={36} color={Colors.white} />
              <Text style={styles.wvCtrlText}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); isFullscreen ? exitFullscreen() : enterFullscreen(); }}>
              <Ionicons name={isFullscreen ? "contract" : "expand"} size={36} color={Colors.white} />
              <Text style={styles.wvCtrlText}>{isFullscreen ? 'Perkecil' : 'Penuh'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); skipWebview(10); }}>
              <Ionicons name="play-forward" size={36} color={Colors.white} />
              <Text style={styles.wvCtrlText}>+10s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); setShowSpeedModal(true); }}>
              <Ionicons name="speedometer-outline" size={36} color={Colors.white} />
              <Text style={styles.wvCtrlText}>{playbackSpeed}x</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.wvCtrlBtn} onPress={(e) => { e.stopPropagation(); navNext && navigateEpisode(navNext); }} disabled={!navNext}>
              <Text style={[styles.wvCtrlIcon, !navNext && styles.opacity30]}>⏭</Text>
            </TouchableOpacity>
          </View>

          {/* Webview Skip Overlays */}
          {isSkipOPVisible && (
            <TouchableOpacity style={styles.skipOpBtn} onPress={handleSkipOP}>
              <Text style={styles.skipOpText}>Skip Opening ⇥</Text>
            </TouchableOpacity>
          )}
          {isSkipEDVisible && navNext && (
            <TouchableOpacity style={styles.skipEdBtn} onPress={handleSkipED}>
              <Text style={styles.skipOpText}>Episode Selanjutnya ⏭</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      )}
    </View>
  );
}
