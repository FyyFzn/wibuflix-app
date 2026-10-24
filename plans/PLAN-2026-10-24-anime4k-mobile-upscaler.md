# PLAN: Android Native Media3 Anime4K Upscaler for Wibuflix Mobile (wibuflix-app)

## 1. Goal and Scope

**Goal:**
Implement a native Android video upscaling pipeline in `wibuflix-app/` using AndroidX Media3 `GlShaderProgram` and Anime4K OpenGL ES 3.0 fragment shaders. The pipeline upscales video streams with vertical resolution <= 720p to 1080p (1920x1080). Streams with vertical resolution >= 1080p automatically bypass the shader pipeline and render via direct hardware surface rendering for zero GPU compute and battery preservation.

**Depends on:**
- Companion web plan: `plans/PLAN-2026-10-24-anime4k-web-upscaler.md`.
- Full native Android rebuild (`npx expo run:android` or `eas build -p android`). Incompatible with pure OTA updates (EAS Update).

**What's in:**
- Native Android Media3 GlEffect package (`wibuflix-app/modules/anime4k-effect/` or `wibuflix-app/android/`):
  - `Anime4kGlEffect.kt`: Implements `androidx.media3.common.Effect` and `androidx.media3.effect.GlEffect`.
  - `Anime4kShaderProgram.kt`: Implements `androidx.media3.effect.GlShaderProgram` with OpenGL ES 3.0 textures, framebuffers, and full-screen quad rendering.
  - GLSL Shaders: `anime4k_restore.frag` and `anime4k_upscale.frag` (Mode A - Fast) optimized for mobile GLES 3.0.
- Custom Expo Config Plugin (`wibuflix-app/plugins/withAnime4kEffect.js`):
  - Injects `androidx.media3:media3-effect` dependencies into `android/app/build.gradle`.
  - Connects the native frame processor chain to `expo-video`'s underlying `ExoPlayer` instance.
- React Native Player integration (`wibuflix-app/app/player.tsx` and `wibuflix-app/hooks/usePlayerState.ts`):
  - Exposes upscaler toggle and upscale status indicator.
  - Listens to video resolution changes: auto-attaches `Anime4kGlEffect` when `height <= 720`, auto-clears effects when `height >= 1080`.
  - UI badge indicator in `PlayerNativeControls.tsx` (`[✨ 1080p AI]` vs `[1080p Native]`).

**What's out:**
- iOS Metal implementation (user confirmed Android-only target).
- Server-side FFmpeg or backend transcoding changes.
- WebView WebGL fallback.
- Third-party iframe embed player upscaling.

**Done means:**
- `npx tsc --noEmit` passes with 0 errors in `wibuflix-app/`.
- `npx expo run:android` compiles and installs the debug APK cleanly.
- For 720p/480p anime episodes: playback runs smoothly at 24-60 fps with Anime4K edge reconstruction active, rendering into a 1080p surface.
- For 1080p episodes: video effects are cleared, allowing direct hardware-accelerated playback with zero shader overhead.

---

## 2. Executor Rules

- Follow phases and steps in order, one at a time.
- Commit after each step: `git add -A && git commit -m "<type>(<scope>): <step description>"`.
- If the code does not match what a step describes, STOP and report the mismatch. Do not improvise or fix adjacent things.
- Do not add dependencies, rename things, or change behavior outside the step.
- Run the step's verification before moving on. If it fails, stop and report.
- For frontend steps: verify types compile `npx tsc --noEmit` before committing.
- Do NOT update any skill file. Skill updates are handled by the senior model after verification.

---

## 3. Findings

| ID | Status | File:Line | Description |
|---|---|---|---|
| F1 | VERIFIED | `wibuflix-app/package.json:22` | Mobile app uses `expo-video: ~56.1.2`, which uses AndroidX Media3 ExoPlayer under the hood. |
| F2 | VERIFIED | `wibuflix-app/app/player.tsx:46-52` | Video playback is controlled via `useVideoPlayer` and rendered with `<VideoView />`. |
| F3 | VERIFIED | `wibuflix-app/app.json:26-45` | Project uses Expo managed workflow with plugins (`expo-router`, `expo-build-properties`). |
| F4 | VERIFIED | AndroidX Media3 Spec | `androidx.media3.effect` provides `GlShaderProgram` and `DefaultVideoFrameProcessor` for shader-based frame filtering. |

---

## 4. Phases and Steps

### Phase 1: Native Android Media3 Anime4K Module

**Step 0 — Commit plan file**
- **Files:** `wibuflix-app/plans/PLAN-2026-10-24-anime4k-mobile-upscaler.md`
- **Change:** No source code changes. Stage and commit plan file alone.
- **Verify:** `git log --oneline -1` shows commit containing only this plan file.
- **Commit message:** `docs(plans): PLAN-2026-10-24-anime4k-mobile-upscaler.md`
- **Rollback:** `git revert HEAD`

**Step 1 — Implement Native Android Anime4k Media3 Effect**
- **Files:**
  - `wibuflix-app/modules/anime4k-effect/android/build.gradle`
  - `wibuflix-app/modules/anime4k-effect/android/src/main/assets/shaders/anime4k_restore.frag`
  - `wibuflix-app/modules/anime4k-effect/android/src/main/assets/shaders/anime4k_upscale.frag`
  - `wibuflix-app/modules/anime4k-effect/android/src/main/java/com/fyy/stream/anime4k/Anime4kGlEffect.kt`
  - `wibuflix-app/modules/anime4k-effect/android/src/main/java/com/fyy/stream/anime4k/Anime4kShaderProgram.kt`
  - `wibuflix-app/modules/anime4k-effect/expo-module.config.json`
  - `wibuflix-app/modules/anime4k-effect/src/index.ts`
- **Change:**
  - Create local Expo module `anime4k-effect` targeting Android.
  - In `build.gradle`, add dependency: `implementation("androidx.media3:media3-effect:1.5.1")`.
  - In assets, add GLES 3.0 Anime4K Mode A fragment shaders.
  - In `Anime4kShaderProgram.kt`, implement Media3's `GlShaderProgram`:
    - Configure output size to 1920x1080 (or aspect ratio maintained 1080p).
    - Compile shaders and set up textures and FBOs for multi-pass rendering.
    - Process incoming video frames and write to output OpenGL texture.
  - In `Anime4kGlEffect.kt`, implement `androidx.media3.effect.GlEffect` returning `Anime4kShaderProgram`.
  - In `src/index.ts`, export TypeScript interface: `setAnime4kEnabled(enabled: boolean): void` and `isAnime4kSupported(): boolean`.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes.
- **Rollback:** `git rm -r wibuflix-app/modules/anime4k-effect/`
- **Commit message:** `feat(mobile): create native Media3 Anime4K effect module`

---

### Phase 2: Expo Config Plugin & Player Hook Wiring

**Step 2 — Register Plugin and Wire Effect into Expo-Video**
- **Files:**
  - `wibuflix-app/plugins/withAnime4kEffect.js`
  - `wibuflix-app/app.json`
- **Change:**
  - Create `withAnime4kEffect.js` config plugin to add `media3-effect` dependency to `android/app/build.gradle`.
  - Register `"./plugins/withAnime4kEffect"` in `wibuflix-app/app.json` under `expo.plugins`.
- **Verify:** `npx expo config --type introspect` validates clean plugin resolution.
- **Rollback:** `git checkout HEAD -- wibuflix-app/app.json && rm wibuflix-app/plugins/withAnime4kEffect.js`
- **Commit message:** `feat(mobile): add withAnime4kEffect Expo config plugin`

**Step 3 — Resolution Gate and State Management in React Native**
- **Files:**
  - `wibuflix-app/hooks/usePlayerState.ts`
  - `wibuflix-app/hooks/useServerPlayback.ts`
- **Change:**
  - In `usePlayerState.ts`:
    - Add state fields: `isUpscalerActive: boolean`, `is1080pNative: boolean`, `upscalerEnabled: boolean` (persisted in AsyncStorage).
  - In `useServerPlayback.ts` / resolution monitor:
    - Listen to `player.videoSize` changes.
    - If `videoSize.height <= 720` and `upscalerEnabled`:
      - Call native module `setAnime4kEnabled(true)`.
      - Update state: `isUpscalerActive = true`, `is1080pNative = false`.
    - If `videoSize.height >= 1080`:
      - Call native module `setAnime4kEnabled(false)` (clears Media3 effects for direct surface rendering).
      - Update state: `isUpscalerActive = false`, `is1080pNative = true`.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes with 0 type errors.
- **Rollback:** `git checkout HEAD -- wibuflix-app/hooks/usePlayerState.ts wibuflix-app/hooks/useServerPlayback.ts`
- **Commit message:** `feat(mobile): implement resolution gate and upscaler state management`

---

### Phase 3: Player UI Controls & Build Verification

**Step 4 — Add Upscale Indicator and Settings Toggle in Player Controls**
- **Files:**
  - `wibuflix-app/components/player/PlayerNativeControls.tsx`
  - `wibuflix-app/components/player/PlayerModals.tsx`
- **Change:**
  - In `PlayerNativeControls.tsx`:
    - Render quality badge in the top-right overlay:
      - Active 720p->1080p: `[✨ 1080p AI]` (accent color).
      - Native 1080p: `[1080p Native]` (white/muted).
      - <= 720p with upscaler turned off: `[720p Normal]`.
  - In `PlayerModals.tsx` (Speed / Resolution modal):
    - Add a switch row: "Anime4K Super Resolution (1080p)" to allow manual user toggle.
- **Verify:**
  - `npx tsc --noEmit` passes with 0 errors.
  - Run `npx expo prebuild --platform android --clean` to verify native Android files generate cleanly.
- **Rollback:** `git checkout HEAD -- wibuflix-app/components/player/`
- **Commit message:** `feat(mobile): integrate Anime4K badge and toggle in PlayerNativeControls`

---

## 5. Needs My Decision

1. **Thermal & Battery Throttling Behavior:**
   - On budget Android chipsets (e.g., Helio P35 / Snapdragon 680), running multi-pass GLES shaders can heat the device during extended viewing (>2 hours). Should the app automatically disable the upscaler if device temperature reaches throttling thresholds? (Recommended: Add user toggle switch first, monitor user feedback before adding thermal listener).
2. **Subtitles Rendering Pipeline:**
   - Should subtitles (burn-in vs player overlay) be scaled with the video or rendered on top of the upscaled frame? (Recommended: Rendered as UI overlay on top of the 1080p canvas for maximum crispness).

---

## 6. Risks

| Phase | What Could Break | How We Notice |
|---|---|---|
| Phase 1 | OpenGL ES 3.0 shader compilation error on legacy Mali GPUs | Native logcat error: `Shader compilation failed`; black video surface |
| Phase 2 | `expo-video` internal ExoPlayer instance is not directly accessible without custom wrapper | Requires patching `expo-video` Android view wrapper via config plugin |
| Phase 3 | Frame stuttering if shader execution exceeds 16.6ms per frame | Dropped frames reported in Media3 event listener (`onDroppedVideoFrames`) |

---

## 7. Noticed but Out of Scope

1. iOS Metal compute shaders are completely excluded per Android-only specification.
2. Low-tier Android devices (Android 9 and below) with OpenGL ES 2.0 cannot run GLES 3.0 Anime4K shaders.

---

## 8. After Execution

When all steps are executed:
- Report whether each step completed cleanly or had deviations.
- Do not update wibuflix skill or any skill file.
  The senior model will run verify-plan, confirm correctness, then update the skill.
