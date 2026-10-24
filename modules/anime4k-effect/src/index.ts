import { requireNativeModule } from 'expo-modules-core';

interface Anime4kNativeModule {
  isAnime4kSupported(): boolean;
  setAnime4kEnabled(enabled: boolean): void;
  isAnime4kEnabled(): boolean;
}

const Anime4kModule: Anime4kNativeModule | null = (() => {
  try {
    return requireNativeModule<Anime4kNativeModule>('Anime4kEffect');
  } catch {
    return null;
  }
})();

export function isAnime4kSupported(): boolean {
  return Anime4kModule ? Anime4kModule.isAnime4kSupported() : false;
}

export function setAnime4kEnabled(enabled: boolean): void {
  if (Anime4kModule) {
    Anime4kModule.setAnime4kEnabled(enabled);
  }
}

export function isAnime4kEnabled(): boolean {
  return Anime4kModule ? Anime4kModule.isAnime4kEnabled() : false;
}
