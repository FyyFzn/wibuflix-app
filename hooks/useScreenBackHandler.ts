import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useFocusEffect, useRouter } from 'expo-router';

/**
 * Shared back-handler for stack screens (detail, player).
 * onCustomBack: optional override — return true to consume the event, false to use default.
 */
export function useScreenBackHandler(onCustomBack?: () => boolean) {
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (onCustomBack) {
          const consumed = onCustomBack();
          if (consumed) return true;
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          router.replace('/');
        }
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [onCustomBack, navigation, router])
  );
}
