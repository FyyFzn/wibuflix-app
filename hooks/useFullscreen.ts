import { useState, useEffect, useCallback } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

export function useFullscreen(initialState = false, webviewRef: React.RefObject<any> = { current: null }, playerMode = 'none') {
  const [isFullscreen, setIsFullscreen] = useState(initialState);

  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    await NavigationBar.setVisibilityAsync('hidden').catch(() => {});
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    await NavigationBar.setVisibilityAsync('visible').catch(() => {});
    if (playerMode === 'webview' && webviewRef.current) {
      webviewRef.current.injectJavaScript(`if (document.fullscreenElement) { document.exitFullscreen().catch(()=>{}); } else if (document.webkitFullscreenElement) { document.webkitExitFullscreen().catch(()=>{}); }; true;`);
    }
  }, [playerMode, webviewRef]);

  useEffect(() => {
    return () => {
      // Clean up orientation when the component using the hook unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  return {
    isFullscreen,
    setIsFullscreen,
    enterFullscreen,
    exitFullscreen
  };
}
