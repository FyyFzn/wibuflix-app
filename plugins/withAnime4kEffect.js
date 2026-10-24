const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to inject AndroidX Media3 Effect dependencies into android/app/build.gradle
 * and ensure VideoPlayer.kt applies Anime4kGlEffect to ExoPlayer.
 */
const withAnime4kEffect = (config) => {
  // 1. Add Media3 Effect to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const buildGradle = config.modResults.contents;
      const media3EffectDep = "    implementation 'androidx.media3:media3-effect:1.9.0'";
      const media3CommonDep = "    implementation 'androidx.media3:media3-common:1.9.0'";

      if (!buildGradle.includes('androidx.media3:media3-effect')) {
        config.modResults.contents = buildGradle.replace(
          /dependencies\s*\{/,
          `dependencies {\n${media3EffectDep}\n${media3CommonDep}`
        );
      }
    }
    return config;
  });

  // 2. Patch VideoPlayer.kt in node_modules if not already patched
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        const videoPlayerFile = path.resolve(
          config.modRequest.projectRoot,
          'node_modules/expo-video/android/src/main/java/expo/modules/video/player/VideoPlayer.kt'
        );
        if (fs.existsSync(videoPlayerFile)) {
          let content = fs.readFileSync(videoPlayerFile, 'utf8');
          if (!content.includes('Anime4kGlEffect')) {
            content = content.replace(
              '}.build()',
              '  setVideoEffects(listOf(com.fyy.stream.anime4k.Anime4kGlEffect()))\n    }.build()'
            );
            fs.writeFileSync(videoPlayerFile, content, 'utf8');
          }
        }
      } catch (err) {
        // Suppress warning during introspection
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withAnime4kEffect;

