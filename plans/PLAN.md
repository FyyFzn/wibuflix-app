# PLAN: Frontend Code Quality & Performance Improvements (Findings 9–14)

## 1. Goal and Scope

Resolve 6 frontend findings from the code audit. In scope:
- wibuflix-app/app/player.tsx
- wibuflix-app/app/detail/[id].tsx
- wibuflix-app/hooks/useEpisodeNavigation.ts
- wibuflix-app/services/api.ts (barrel audit only — no deletion)
- wibuflix-app/store/animeStore.ts (read only — no change this plan)

Out of scope: backend files, scraper logic, API endpoint implementations, adding new features.
"Done" means all steps committed and `npx tsc --noEmit` passes from the wibuflix-app/ directory with no new errors.

---

## 2. Executor Rules

- Follow phases and steps in order, one at a time.
- Commit after each step: `git add -A && git commit -m "<type>(<scope>): <step description>"`.
- If the code does not match what a step describes, STOP and report the mismatch. Do not improvise or fix adjacent things.
- Do not add dependencies, rename things, or change behavior outside the step.
- Run the step's verification before moving on. If it fails, stop and report.
- For frontend steps: verify types compile with `npx tsc --noEmit` run from the `wibuflix-app/` directory before committing.

---

## 3. Findings

| ID | Status | File:Line | Description |
|----|--------|-----------|-------------|
| F9  | VERIFIED | wibuflix-app/app/player.tsx:286–292 | Inline BackHandler/useFocusEffect block; useTabBackHandler hook exists but is not used here |
| F10 | VERIFIED | wibuflix-app/app/detail/[id].tsx:32–49 | Inline BackHandler/useFocusEffect block identical in structure; useTabBackHandler not used here either |
| F11 | VERIFIED | wibuflix-app/services/api.ts:1–51 | Pure re-export barrel; some consumers import from api.ts, others import directly from endpoints/ — inconsistent |
| F12 | PARTIALLY TRUE | wibuflix-app/store/animeStore.ts | Store is 47 lines; progressMap/queuedUrls state lives in useAnimeDetailData hook — possible leak but no confirmed bug |
| F13 | VERIFIED | wibuflix-app/components/EpisodeItem.tsx:23 | Already wrapped in React.memo. keyExtractor in detail/[id].tsx:147 is stable. FlatList props (initialNumToRender, windowSize, removeClippedSubviews) already set. Finding was already addressed. |
| F14 | VERIFIED | wibuflix-app/app/detail/[id].tsx:76 | `list.reverse()` mutates the shallow-copy array in place inside useMemo |

---

## 4. Phases and Steps

### Phase 1 — Correctness fix (highest priority)

#### Step 1.1 — Fix in-place reverse in detail/[id].tsx

**Files:** `wibuflix-app/app/detail/[id].tsx`

**Change:** At line 76, inside the `filteredEpisodes` useMemo, change:
```js
list = list.reverse();
```
to:
```js
list = [...list].reverse();
```
This prevents mutation of the shallow copy, making the sort operation safe regardless of future refactors.

**Also update:** nothing else.

**Verify:** From `wibuflix-app/`: `npx tsc --noEmit` — no new errors. Confirm the change: `grep -n "reverse" app/detail/\[id\].tsx` — expected: `[...list].reverse()`.

**Rollback:** `git revert HEAD`

---

### Phase 2 — Back-handler deduplication

Note: `useTabBackHandler` is designed for tab screens (navigate to index, double-tap to exit). The back behavior in `detail/[id].tsx` and `player.tsx` is different — both need to go back in stack, not navigate to index. Do NOT use `useTabBackHandler` for these screens. Instead, extract a shared `useScreenBackHandler` hook for stack screens.

#### Step 2.1 — Create useScreenBackHandler hook

**Files:** `wibuflix-app/hooks/useScreenBackHandler.ts` (new)

**Change:** Create this file with the following content:

```ts
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

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
```

**Also update:** nothing yet — this step only creates the hook.

**Verify:** `npx tsc --noEmit` from wibuflix-app/ — no new errors.

**Rollback:** `git revert HEAD`

---

#### Step 2.2 — Use useScreenBackHandler in detail/[id].tsx

**Files:** `wibuflix-app/app/detail/[id].tsx`

**Change:**
1. Add import: `import { useScreenBackHandler } from '../../hooks/useScreenBackHandler';`
2. Remove the existing `useFocusEffect(useCallback(() => { const onBackPress = ...; const backHandler = BackHandler.addEventListener(...); return () => backHandler.remove(); }, [navigation, router]))` block (lines 32–49).
3. Remove `BackHandler` from the react-native import (line 13) if it is no longer used elsewhere in the file — check first.
4. Remove `useFocusEffect` and `useCallback` from imports if no longer used elsewhere in the file — check first.
5. Replace the removed block with: `useScreenBackHandler();`
6. Remove `useRouter` and `useNavigation` from imports only if they are no longer used anywhere else in the file — check first before removing.

**Also update:** nothing else.

**Verify:** `npx tsc --noEmit` from wibuflix-app/ — no new errors. Confirm `BackHandler.addEventListener` no longer appears in detail/[id].tsx.

**Rollback:** `git revert HEAD`

---

#### Step 2.3 — Use useScreenBackHandler in player.tsx

**Files:** `wibuflix-app/app/player.tsx`

**Change:**
1. Add import: `import { useScreenBackHandler } from '../hooks/useScreenBackHandler';`
2. The existing player back-handler (lines 286–292) has custom logic: if fullscreen, exit fullscreen first; otherwise call `handleUIBackPressRef.current()`. This custom behavior must be preserved via the `onCustomBack` parameter.
3. Replace the `useFocusEffect(useCallback(() => { const backHandler = BackHandler.addEventListener('hardwareBackPress', () => { ... }); return () => backHandler.remove(); }, []))` block with:
   ```ts
   useScreenBackHandler(() => {
     if (isFullscreenRef.current) {
       exitFullscreenRef.current();
       return true;
     }
     handleUIBackPressRef.current();
     return true;
   });
   ```
4. Remove `BackHandler` from the react-native import (line 3) if it is no longer used elsewhere in the file — check first.
5. Do NOT remove `useFocusEffect` or `useCallback` — check if they are used elsewhere in the file before touching imports.

**Also update:** nothing else.

**Verify:** `npx tsc --noEmit` from wibuflix-app/ — no new errors. Confirm `BackHandler.addEventListener` no longer appears in player.tsx.

**Rollback:** `git revert HEAD`

---

### Phase 3 — Barrel import consistency

#### Step 3.1 — Standardize all consumers to import from services/api.ts

**Files:** `wibuflix-app/hooks/useServerPlayback.ts`, `wibuflix-app/services/streamPoller.ts`

**Change:** These two files import directly from `./api` (relative, same services/ folder) or `../services/api` — which already points to the barrel. No change needed for them.

Check: some files import from `./endpoints/catalogEndpoints` or similar directly. Find them:
- Run: `grep -rn "from.*endpoints/" wibuflix-app --include="*.ts" --include="*.tsx"`
- If any consumer imports directly from an `endpoints/` file (bypassing api.ts), change that import to point to `../services/api` (or `../../services/api` depending on depth) and use the same exported name.
- If no consumer imports directly from endpoints/, this step is a no-op — mark it done and commit a comment-only change to api.ts noting it is the canonical import point.

**Also update:** every file whose import path changes.

**Verify:** `grep -rn "from.*endpoints/" wibuflix-app/app wibuflix-app/hooks wibuflix-app/components wibuflix-app/store` — expected: no output (all consumers go through api.ts). Then `npx tsc --noEmit` — no new errors.

**Rollback:** `git revert HEAD`

---

## 5. Needs My Decision

1. **F12 — animeStore.ts scope:** progressMap and queuedUrls currently live in useAnimeDetailData hook state. Moving them to the Zustand store would make them persistent across navigation and avoid prop-drilling, but it is a larger refactor that could affect multiple screens. This plan does not include it. Decide whether to add a Phase 4 for this before executing.

2. **F13 — Already resolved:** EpisodeItem is already React.memo'd, keyExtractor is stable, FlatList props are set. No action needed. Confirmed by reading the file.

---

## 6. Risks

| Phase | Risk | How to notice |
|-------|------|---------------|
| Phase 1 (reverse fix) | None — purely additive spread | TypeScript compile error |
| Phase 2.1 (new hook) | Hook dependency array with useCallback may cause stale closure if onCustomBack changes identity | Back button behaves incorrectly; wrap caller's callback in useCallback |
| Phase 2.2/2.3 (replace back-handler) | Removing import of BackHandler/useFocusEffect while still used elsewhere causes compile error | tsc --noEmit fails |
| Phase 3 (barrel) | Changing import paths may break module resolution if path depth is wrong | tsc --noEmit fails with "cannot find module" |

---

## 7. Noticed but Out of Scope

- F12 (animeStore scope): deferred pending decision in Section 5.
- player.tsx is 464 lines and still owns inline `navigateEpisode` logic that touches state, refs, and routing — a larger refactor deferred.
- api.ts barrel could be deleted entirely in favor of direct endpoint imports — not done here to avoid touching 16+ import sites at once.
