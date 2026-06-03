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
}

export default function PlayerWebView({
  webviewRef, webviewUrl, isBlogger, injectedJS, isFullscreen,
  showWebviewControls, setShowWebviewControls, setPlayerMode, setNativeVideoUrl,
  setWebviewUrl, setCurrentPosition, setTotalDuration, lastKnownPositionRef,
  enterFullscreen, exitFullscreen, setPlayerLoading, handleUIBackPress,
  navPrev, navNext, navigateEpisode, webviewControlsTimeoutRef,
  isSkipOPVisible, isSkipEDVisible, handleSkipOP, handleSkipED
}: PlayerWebViewProps) {
  const [showMiniNav, setShowMiniNav] = useState(false);
  const miniNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skipWebview = (amount: number) => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        try {
          const v = document.querySelector('video');
          if (v) {
            v.currentTime = Math.max(0, v.currentTime + (${amount}));
          }
        } catch(e){}
        true;
      `);
    }
    if (webviewControlsTimeoutRef.current) clearTimeout(webviewControlsTimeoutRef.current);
    webviewControlsTimeoutRef.current = setTimeout(() => setShowWebviewControls(false), 4000);
  };

  return (
    <View style={styles.flex1}>
      <WebView
        ref={webviewRef}
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
        allowsFullscreenVideo={false}
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
              if (!isBlogger) return;
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
