# PLAN: Mobile App Watch History Cloud Sync

## 1. Goal and Scope

**Goal:**
Integrate cloud synchronization into `wibuflix-app` watch history storage so that watch progress and history items are automatically mirrored to the backend MongoDB and retrieved when the history screen is loaded.

**Depends on:** `plans/PLAN-2026-10-22-backend-history-sync.md` (Backend `/api/history` must be implemented and running).

**What's in:**
- `wibuflix-app/services/apiClient.ts`: Add `API.history` endpoint and header injection.
- `wibuflix-app/services/storage.ts`:
  - Token persistence (`getSyncToken`, `setSyncToken` using `AsyncStorage`).
  - Outbound cloud sync hooks on `simpanKeRiwayat`, `updateProgress`, `hapusRiwayat`, and `clearAllHistory`.
  - Inbound reconciliation function `syncHistoryFromCloud()` merging remote and local entries.
- `wibuflix-app/app/(tabs)/history.tsx`:
  - Trigger `syncHistoryFromCloud()` on screen focus.
  - Add sync settings modal / token configuration button in header.

**What's out:**
- Changes to backend or web app.
- Native video player core alterations (progress hooks are already centralized in `useProgressSync`).

**Done means:**
- Watching an episode on mobile records progress locally and pushes to `/api/history`.
- History screen fetches latest records from `/api/history` and displays updated state.
- Sync token can be entered and persisted on mobile.
- `npx tsc --noEmit` runs with 0 type errors.

## 2. Executor Rules
- Follow phases and steps in order, one at a time.
- Commit after each step: `git add -A && git commit -m "<type>(<scope>): <step description>"`.
- If the code does not match what a step describes, STOP and report the mismatch.
  Do not improvise or fix adjacent things.
- Do not add dependencies, rename things, or change behavior outside the step.
- Run the step's verification before moving on. If it fails, stop and report.
- For backend steps: verify server starts with `node src/server.js` before committing.
- For frontend steps: verify types compile with `npx tsc --noEmit` before committing.
- Do NOT update any skill file. Skill updates are handled by the senior model after verification.

## 3. Findings

| ID | Status | File:Line | Description |
|---|---|---|---|
| F1 | VERIFIED | `wibuflix-app/services/apiClient.ts:12-19` | `API` object exports endpoints. Needs `API.history`. |
| F2 | VERIFIED | `wibuflix-app/services/storage.ts:13-24` | `WatchHistoryItem` interface and `HISTORY_KEY = 'wibuflix_riwayat'`. |
| F3 | VERIFIED | `wibuflix-app/services/storage.ts:68-128` | `simpanKeRiwayat()` handles upsert into `AsyncStorage`. |
| F4 | VERIFIED | `wibuflix-app/services/storage.ts:143-235` | `updateProgress()` handles debounced progress writes. |
| F5 | VERIFIED | `wibuflix-app/app/(tabs)/history.tsx:41-46` | `useFocusEffect` reloads history on tab focus. |

## 4. Phases and Steps

### Phase 1: Storage Layer Cloud Sync

**Step 0 — Commit the plan file**
- **Files:** `wibuflix-app/plans/PLAN-2026-10-22-mobile-history-sync.md`
- **Change:** No source code changes. Stage and commit the plan file alone.
- **Verify:** `git log --oneline -1` shows a commit with only the plan file.
- **Commit message:** `docs(plans): add PLAN-2026-10-22-mobile-history-sync.md`
- **Rollback:** `git revert HEAD`

**Step 1 — Register History API Endpoint and Token Management**
- **Files:** `wibuflix-app/services/apiClient.ts`, `wibuflix-app/services/storage.ts`
- **Change:**
  - In `wibuflix-app/services/apiClient.ts`:
    Add `history: `${API_BASE}/api/history`` to `API` object.
  - In `wibuflix-app/services/storage.ts`:
    Define `SYNC_TOKEN_KEY = 'wibuflix_sync_token'`.
    Export `getSyncToken(): Promise<string>` and `setSyncToken(token: string): Promise<void>`.
    Export `getSyncHeaders(): Promise<Record<string, string>>` injecting `x-sync-token` if present.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes.
- **Rollback:** `git checkout HEAD -- wibuflix-app/services/apiClient.ts wibuflix-app/services/storage.ts`
- **Commit message:** `feat(services): add sync token helpers and history API endpoint`

**Step 2 — Implement Outbound and Inbound History Synchronization**
- **Files:** `wibuflix-app/services/storage.ts`
- **Change:**
  - In `simpanKeRiwayat`: after writing to `AsyncStorage`, call async helper `pushHistoryToCloud(item)` with error suppression.
  - In `updateProgress`: when flushing progress, call async helper `pushProgressToCloud(url, progress, duration, host)` with error suppression.
  - Implement `syncHistoryFromCloud(): Promise<WatchHistoryItem[]>`:
    1. Fetch `GET ${API.history}` with `x-sync-token`.
    2. Read local items from `getRawRiwayat()`.
    3. Merge lists by series/url: if duplicate, item with higher `waktu` wins.
    4. Save merged result to `AsyncStorage`.
    5. Return deduplicated list.
  - In `hapusRiwayat`: call `DELETE ${API.history}/${encodeURIComponent(identifier)}`.
  - In `clearAllHistory`: call `DELETE ${API.history}`.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes.
- **Rollback:** `git checkout HEAD -- wibuflix-app/services/storage.ts`
- **Commit message:** `feat(storage): implement bidirectional history sync with backend`

### Phase 2: UI Integration in History Screen

**Step 3 — Trigger Sync and Add Token Modal to History Screen**
- **Files:** `wibuflix-app/app/(tabs)/history.tsx`
- **Change:**
  - In `useFocusEffect`: call `syncHistoryFromCloud()` in background, refreshing the displayed list.
  - Add a header action button (cloud icon) next to the "Hapus Semua" button.
  - Tapping the cloud icon opens a modal or alert prompt showing current sync token and allowing user to input/update their `SYNC_TOKEN`.
- **Verify:** `npx tsc --noEmit` in `wibuflix-app/` passes.
- **Rollback:** `git checkout HEAD -- wibuflix-app/app/(tabs)/history.tsx`
- **Commit message:** `feat(history): connect cloud sync and sync token UI modal`

## 5. Needs My Decision
None.

## 6. Risks
- **Network Failures:** All outbound cloud sync requests must be wrapped in `try/catch` and fire non-blocking (`.catch(() => {})`) so offline watching never lags or crashes the app.

## 7. Noticed but Out of Scope
- Direct push notifications on history changes.

## 8. After Execution
When all steps are committed, report back to the senior model (not the executor):
- State which plan file was executed.
- List any steps that were PARTIAL or had to deviate.
- Do not update the wibuflix skill or any skill file.
The senior model will run verify-plan, confirm correctness, then update the skill.
