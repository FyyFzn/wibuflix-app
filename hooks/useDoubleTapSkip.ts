import { useState, useRef, useEffect } from 'react';
import { Animated, Easing, Dimensions } from 'react-native';

export function useDoubleTapSkip(player: any) {
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [skipInfo, setSkipInfo] = useState<{ side: 'left' | 'right', amount: number, wasPlaying?: boolean } | null>(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [playerLayoutWidth, setPlayerLayoutWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    if (skipInfo) {
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    }
  }, [skipInfo]);

  const handleDoubleTapSkip = (evt: any, controlsVisible: boolean, toggleControls: () => void) => {
    const now = Date.now();
    const { pageX } = evt.nativeEvent;
    
    // Gunakan pageX (koordinat absolut layar) agar selalu akurat mendeteksi separuh layar
    const screenWidth = Dimensions.get('window').width;
    const side = pageX > screenWidth / 2 ? 'right' : 'left';

    // Cek apakah ini kelanjutan combo yang sedang berjalan (skipInfo aktif di sisi yang sama)
    // ATAU double tap baru (tap dalam 250ms di sisi yang sama dengan lastTap)
    const isComboTap = lastTapRef.current &&
      (now - lastTapRef.current.time < 250) &&
      lastTapRef.current.side === side;

    if (isComboTap) {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      const addAmount = side === 'right' ? 10 : -10;
      
      // Pause hanya sekali saat combo BARU dimulai
      setSkipInfo(prev => {
        const isFirstDoubleTap = !prev || prev.side !== side;
        if (isFirstDoubleTap && player && player.playing) {
          player.pause();
        }
        return {
          side,
          amount: prev && prev.side === side ? prev.amount + addAmount : addAmount,
          wasPlaying: prev && prev.side === side ? prev.wasPlaying : (player ? player.playing : false)
        };
      });

      // Reset timeout eksekusi skip
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        setSkipInfo(prev => {
          if (prev && player) {
            player.currentTime = Math.max(0, player.currentTime + prev.amount);
            if (prev.wasPlaying) {
              player.play();
            }
          }
          return null;
        });
      }, 500);

      lastTapRef.current = { time: now, side };
    } else {
      // Single tap -> Delay toggleControls
      if (lastTapRef.current && lastTapRef.current.side !== side) {
        if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
        setSkipInfo(prev => {
          if (prev && player) {
            player.currentTime = Math.max(0, player.currentTime + prev.amount);
            if (prev.wasPlaying) player.play();
          }
          return null;
        });
      }

      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = setTimeout(() => {
        toggleControls();
      }, 250);

      lastTapRef.current = { time: now, side };
    }
  };

  return {
    skipInfo,
    setSkipInfo,
    rippleAnim,
    playerLayoutWidth,
    setPlayerLayoutWidth,
    handleDoubleTapSkip
  };
}
