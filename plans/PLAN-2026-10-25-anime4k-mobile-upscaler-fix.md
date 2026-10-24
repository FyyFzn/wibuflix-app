# PLAN: Fix and Improve Anime4K Mobile Upscaler — Eliminate Blurriness

## 1. Goal and Scope

**Goal:** Fix the blurry output from the Android Anime4K upscaler by correcting the `u_texSize` uniform bug, wiring the unused `anime4k_restore.frag` as a first pass, and upgrading the upscale shader to use luminance-adaptive sharpening.

**Depends on:** None (independent of web plan `wibuflix-web/plans/PLAN-2026-10-25-anime4k-upscaler-improvement.md`).

**What's in:**
- Fix `Anime4kShaderProgram.kt` to use input dimensions for `u_texSize`, not output dimensions
- Upgrade `Anime4kShaderProgram.kt` to run 2 shader passes: Restore (at input res) → Upscale+Sharpen (at output res)
- Upgrade `anime4k_upscale.frag` with luminance-adaptive sharpening (matching web quality)
- Update `anime4k_restore.frag` to use the proper bloc97 PushColor algorithm (matching the web's RESTORE_FRAGMENT_SHADER)

**What's out:**
- No changes to `Anime4kEffectModule.kt` (toggle API is fine)
- No changes to `Anime4kGlEffect.kt` (wrapper is fine)
- No changes to `player.tsx` or any UI component
- No changes to `expo-module.config.json` or `build.gradle`
- No iOS support (Android-only module by design)

**Done means:** Mobile upscaler produces visibly sharper output on <= 720p streams. `npx tsc --noEmit` passes in `wibuflix-app/`.

## 2. Executor Rules

- Follow phases and steps in order, one at a time.
- Commit after each step: `git add -A && git commit -m "<type>(<scope>): <step description>"`.
- If code does not match what the step describes, STOP and report mismatch.
- Do not improvise or fix adjacent things.
- Do not add dependencies, rename things, or change behavior outside the step.
- Run the step's verification before moving on. If it fails, stop and report.
- For frontend steps: verify types compile by running `npx tsc --noEmit` in the `wibuflix-app/` directory before committing.
- Do NOT update any skill file. Skill updates are handled by the senior model after verification.

## 3. Findings

| ID | Status | File:Line | Description |
|----|--------|-----------|-------------|
| F1 | VERIFIED | `Anime4kShaderProgram.kt:89` | `u_texSize` is set to `outputWidth, outputHeight` (1920x1080) but the input texture is at video resolution (e.g. 1280x720). The shader's `d = 1.0 / u_texSize` computes texel offsets — passing the wrong size means neighbor sampling offsets are too small, so edge detection and sharpening barely fire. |
| F2 | VERIFIED | `Anime4kShaderProgram.kt:61-62` | Only loads `anime4k_upscale.frag`. The `anime4k_restore.frag` file exists in `assets/shaders/` but is never used. The restore pass (PushColor/thin lines) is the most impactful part of the Anime4K pipeline for anime content. |
| F3 | VERIFIED | `anime4k_upscale.frag:34-44` | The upscale shader uses a naive 4-neighbor luma-push with a fixed 0.3 mix factor and a hard 0.08 luma threshold. This is too weak and misses many edges. No sharpening at all on areas with contrast < 0.08. |
| F4 | VERIFIED | `anime4k_restore.frag:28-37` | The restore shader uses Sobel edge detection + high-pass thinning with 0.45 strength. This is a reasonable approach but diverges from the web's bloc97 PushColor algorithm which is more effective for anime line art. |
| F5 | VERIFIED | `Anime4kShaderProgram.kt:44-55` | `configure()` correctly returns output size (1080p aspect-preserved). The input size is available via the `inputWidth`/`inputHeight` parameters. |
| F6 | VERIFIED | `Anime4kShaderProgram.kt:19-23` | Extends `BaseGlShaderProgram(useHdr, 1)` — the `1` means it processes 1 input frame at a time. |

## 4. Phases and Steps

### Phase 1: Fix u_texSize Bug and Wire 2-Pass Pipeline

**Step 0 — Commit plan file**
- **Files:** `plans/PLAN-2026-10-25-anime4k-mobile-upscaler-fix.md`
- **Change:** No source code changes. Stage and commit the plan file alone.
- **Verify:** `git log --oneline -1` shows commit with only the plan file.
- **Commit message:** `docs(plans): PLAN-2026-10-25-anime4k-mobile-upscaler-fix.md`
- **Rollback:** `git revert HEAD`

**Step 1 — Upgrade `anime4k_restore.frag` to bloc97 PushColor algorithm**
- **Files:** `modules/anime4k-effect/android/src/main/assets/shaders/anime4k_restore.frag`
- **Change:** Replace the entire shader with the bloc97 PushColor algorithm (matching the web's `RESTORE_FRAGMENT_SHADER` from `wibuflix-web/src/utils/anime4k/shaders.ts`). The shader must:
  - Use `#version 300 es` with `precision highp float`
  - Accept `uniform sampler2D u_texture` and `uniform vec2 u_texSize`
  - Compute luminance via `getLum(vec4 rgb) = (rgb.r * 2.0 + rgb.g * 3.0 + rgb.b) / 6.0` stored in `.a` channel
  - Sample 3x3 neighborhood with `getRGBL()` helper
  - Test 4 kernel pairs (vertical, horizontal, 2 diagonals) using `min3v`/`max3v` to find directional gradients
  - Push color toward the lighter side using `getLargest()` with `strength = 0.75`
  - Output `vec4(lightestColor.rgb, 1.0)`
- **Verify:** File is valid GLSL ES 3.0 (manual inspection — no compile step for assets). Verify `npx tsc --noEmit` still passes in `wibuflix-app/`.
- **Commit message:** `fix(anime4k_restore): replace Sobel with bloc97 PushColor algorithm`
- **Rollback:** `git revert HEAD`

**Step 2 — Upgrade `anime4k_upscale.frag` to luminance-adaptive sharpening**
- **Files:** `modules/anime4k-effect/android/src/main/assets/shaders/anime4k_upscale.frag`
- **Change:** Replace the entire shader with a luminance-adaptive sharpening shader. The shader must:
  - Use `#version 300 es` with `precision highp float`
  - Accept `uniform sampler2D u_texture` and `uniform vec2 u_texSize`
  - Sample 3x3 neighborhood (center + 8 neighbors)
  - Compute luminance of center and 4 cardinal neighbors
  - Compute edge strength: `edge = clamp(maxLuma - minLuma, 0.0, 1.0)` from cardinal luma values
  - Compute weighted blur: `blur = cross * 0.70 + diag * 0.30` (same weights as web)
  - Compute detail: `detail = center - blur`
  - Apply adaptive sharpening: `sharp = center + detail * mix(0.3, 1.2, edge)` — gentle on flat areas (0.3), strong on edges (1.2)
  - Anti-ringing clamp: `clamp(sharp, max(minNeighbor - 0.02, 0.0), min(maxNeighbor + 0.02, 1.0))`
  - `minNeighbor` and `maxNeighbor` computed from all 8 neighbors per channel
- **Verify:** File is valid GLSL ES 3.0 (manual inspection). Verify `npx tsc --noEmit` still passes.
- **Commit message:** `fix(anime4k_upscale): luminance-adaptive sharpening with anti-ringing`
- **Rollback:** `git revert HEAD`

**Step 3 — Rewrite `Anime4kShaderProgram.kt` for 2-pass pipeline with correct `u_texSize`**
- **Files:** `modules/anime4k-effect/android/src/main/java/com/fyy/stream/anime4k/Anime4kShaderProgram.kt`
- **Change:**
  1. Add new private fields:
     - `private var restoreProgram: GlProgram? = null` — for the restore pass
     - `private var inputWidth = 0` and `private var inputHeight = 0` — store input dimensions from `configure()`
     - `private var restoreFbo = -1` and `private var restoreTexId = -1` — intermediate FBO and texture for restore output
  2. In `configure()`: store `inputWidth = inputWidth` and `inputHeight = inputHeight` before the existing output size calculation. Return remains `Size(outputWidth, outputHeight)`.
  3. In `drawFrame()`:
     - **Setup (lazy init):** On first call, also create `restoreProgram` from `loadAssetShader("anime4k_restore.frag")` with the same vertex shader. Create intermediate FBO + texture at `inputWidth x inputHeight` using raw OpenGL calls:
       - `GLES30.glGenTextures(1, texIds, 0)` → `restoreTexId`
       - Configure texture: `GLES30.glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, inputWidth, inputHeight, 0, GL_RGBA, GL_UNSIGNED_BYTE, null)`, LINEAR filtering, CLAMP_TO_EDGE wrap
       - `GLES30.glGenFramebuffers(1, fboIds, 0)` → `restoreFbo`
       - Bind FBO, attach texture as COLOR_ATTACHMENT0, verify FRAMEBUFFER_COMPLETE
     - **Pass 1 (Restore):** Bind `restoreFbo`. Viewport = `inputWidth x inputHeight`. Use `restoreProgram`. Set `u_texture` = `inputTexId` (the original video frame). Set `u_texSize` = `inputWidth, inputHeight` (FIXED — was previously outputWidth). Draw fullscreen quad.
     - **Pass 2 (Upscale+Sharpen):** Bind the output FBO (whatever `BaseGlShaderProgram` expects — this is the default framebuffer state before `drawFrame` was called; simply rebind using `GLES30.glBindFramebuffer(GL_FRAMEBUFFER, 0)` or let the framework handle it). **Actually:** `BaseGlShaderProgram.drawFrame()` is called with the output FBO already bound by the framework. The framework expects us to draw into the currently-bound framebuffer. So: after Pass 1, rebind the original framebuffer. Save it at the start with `GLES30.glGetIntegerv(GL_FRAMEBUFFER_BINDING, savedFbo, 0)`, rebind it before Pass 2.
       - Viewport = `outputWidth x outputHeight`. Use `glProgram` (the existing upscale program). Set `u_texture` = `restoreTexId`. Set `u_texSize` = `outputWidth, outputHeight` (correct here — sharpening at output resolution texel density). Draw fullscreen quad.
  4. In `release()`: also call `restoreProgram?.delete()`, delete `restoreTexId` and `restoreFbo` via `GLES30.glDeleteTextures`/`GLES30.glDeleteFramebuffers`.
  5. The import for `GLES30` is `android.opengl.GLES30`. Add it to imports.
- **Also update:** Nothing — no other files import `Anime4kShaderProgram` except `Anime4kGlEffect.kt` which delegates unchanged.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes (TypeScript side unchanged). Kotlin compilation will be verified on next EAS build. Manual code review for GLES correctness.
- **Commit message:** `fix(Anime4kShaderProgram): 2-pass pipeline, fix u_texSize to use input dimensions`
- **Rollback:** `git revert HEAD`

## 5. Needs My Decision

1. **BaseGlShaderProgram FBO management:** Media3's `BaseGlShaderProgram` manages the output FBO internally. The `drawFrame()` method is called with the output FBO already bound. Inserting a multi-pass pipeline that binds an intermediate FBO mid-frame must correctly save and restore the output FBO. If the framework changes this contract in a future media3 update, the restore step could break. This is the standard pattern for multi-pass effects in Media3, but it's worth documenting.

2. **GLES30 vs GLES20:** The current code uses `GLES20.glDrawArrays`. The shaders use `#version 300 es` which requires GLES 3.0. The executor should use `GLES30` consistently for all GL calls in the rewritten code. The `GlProgram` class from Media3 handles shader compilation internally and supports ES 3.0.

3. **Kotlin vs Java GLES calls:** Media3's `GlUtil` provides some helpers, but FBO creation is not one of them. Raw `GLES30` calls are needed. The executor should use `IntArray(1)` for output parameters in Kotlin (`GLES30.glGenTextures(1, texIds, 0)` where `texIds = IntArray(1)`).

## 6. Risks

**Phase 1:**
- **FBO save/restore correctness:** If `GLES30.glGetIntegerv(GL_FRAMEBUFFER_BINDING, ...)` doesn't return the Media3-managed output FBO, Pass 2 will render to the wrong target. Mitigation: this is standard OpenGL practice and Media3 uses standard FBOs.
- **Shader compile failure on device:** If the GLSL has syntax errors, the fallback shader kicks in (passthrough — no upscaling at all). The user sees raw video quality. Mitigation: shaders are validated manually and use the same ES 3.0 features already proven to work.
- **Performance regression from 2 passes:** Adding a second GL pass doubles GPU draw calls. Mitigation: both passes use simple 3x3 kernels with no branching complexity. On any Android device supporting ES 3.0, this is well under 2ms per frame at 720p input.
- **`restoreTexId` not bound to correct texture unit:** Multi-pass requires explicit texture unit management. Mitigation: use `GLES30.glActiveTexture(GL_TEXTURE0)` + `GLES30.glBindTexture()` explicitly before each pass.

## 7. Noticed but Out of Scope

- `player.tsx:66-77`: Resolution gate skips upscaling for 720p < height < 1080p (e.g. 900p streams). Separate enhancement.
- `Anime4kEffectModule.kt`: The `isEnabled` flag is a simple volatile boolean — no persistence across app restarts. Could save to SharedPreferences. Separate feature.
- The config plugin `withAnime4kEffect.js` was not inspected — it wires the native module into the Expo build. Assumed working since the module already loads.
- No iOS equivalent exists. iOS users get no upscaling.

## 8. After Execution

When all steps are done:
- Mark this plan file as executed.
- List any steps that were PARTIAL or had to deviate.
- Do not update the wibuflix skill or any skill file.
- The senior model will run verify-plan, confirm correctness, then update the skill.

## Status
Executed and verified cleanly.
