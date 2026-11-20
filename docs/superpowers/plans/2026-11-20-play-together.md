# 같이 놀기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free "같이 놀기" button on the friend screen that leads to two hands-on mini games, ball throw and hide-and-seek, each three turns long and ending with a shared end panel.

**Architecture:** Pure rules (who can fetch, toys, hiding spots, throw target math) live in `src/pets/play.ts`. There are three new hash routes, each with its own screen module under `src/ui/`. Each screen follows the existing screen pattern: a `render(root, route, deps) => Cleanup` function, `timers()` for all delays, and `say()` for speech. No pet state is written.

**Tech Stack:** Vite + TypeScript (strict, no framework), Vitest + jsdom, Pointer Events, CSS container queries.

**Spec:** `docs/superpowers/specs/2026-11-20-play-together-design.md`

## Global Constraints
- No stars spent or earned, no `care` change, no `progress` write, and no `deps.savePets` call anywhere in play screens.
- Three turns per game, then the end panel. The end panel says "재밌었어! 또 놀자!" and shows 🔁 또 하기 (`data-testid="again"`) and 🏠 돌아가기 (`data-testid="back-friend"`, goes to `{name:'friend'}`).
- Routes: `#/friend/play` → `{name:'friendPlay'}`, `#/friend/play/ball` → `{name:'friendBall'}`, `#/friend/play/hide` → `{name:'friendHide'}`.
- When there is no current friend, every play screen redirects with `go({name:'friendPick'},{replace:true})`.
- A friend cannot fetch when its kind is `tree`, or when it is a `chick` at stage 0. Such a friend skips the picker: `#/friend/play` redirects `replace` → `friendHide`, and `#/friend/play/ball` redirects `replace` → `friendHide`.
- Toys: dog ⚽, cat 🧶, chick 🐛.
- Fetch timings: flight `FLY_MS = 800`, run to the ball `RUN_MS = 1000`, return `BACK_MS = 1000`. After the return, say the count with `koreanCount(n)` + "!" (하나!/둘!/셋!).
- Hide-and-seek uses 3 spots, read from the child's learned hangul items. Learned means the group is unlocked and `correct ≥ 1`. The fallback set is 🌳 나무, 🏠 집, 🚗 자동차, 📦 상자, 🌷 꽃. Spots are distinct within one game. The hiding place is random and never the same as the previous turn's.
- Hide lines:
  - start: "숨을게! 찾아봐!" (tree: "나비가 숨었어! 찾아봐!")
  - tap: "<name>?"
  - wrong: "여기 없네!"
  - found: "까꿍!" (tree: "찾았다!")
  - hint: after 2 wrong taps in one turn, add the `hint` class to the right spot.
- Tree: 🦋 hides in place of the friend.
- No scrolling on any screen. Check at 760×840, 412×915, 915×412, 568×320 and 1280×800. Touch targets are ≥ 64px.
- Under reduced motion, the flight and run become short moves. The counting and finding flow is unchanged.
- Reuse `petNode(kind, stage)`. No new art.

## Review Focus
1. Tapping during a fetch must not start another throw. Covered by a Task 3 test.
2. A fast double tap on a hiding spot must count once. After "까꿍", taps are ignored until the next turn. Covered by a Task 4 test.
3. Leaving mid-animation (back button) must not let timers fire `go`/`say` afterwards. Covered by Task 3 and Task 4 cleanup tests.
4. A drag that ends outside the field, or a zero-length drag (treated as a tap), must still land inside the field. Covered by the Task 1 `throwTarget` tests.
5. A direct URL to `#/friend/play/ball` for a tree must redirect to hide, not draw a broken ball game. Covered by a Task 2 test.

---

### Task 1: Play rules (`src/pets/play.ts`)

**Files:**
- Create: `src/pets/play.ts`
- Test: `tests/pets/play.test.ts`

**Interfaces:**
- Produces:
  - `canFetch(f: Friend): boolean`
  - `toyFor(kind: FriendKind): string`
  - `interface HideSpot { emoji: string; name: string }`
  - `hideSpots(p: Progress, rng: Rng, n?: number /* default 3 */): HideSpot[]`
  - `nextHide(rng: Rng, n: number, last: number | null): number`
  - `interface Pt { x: number; y: number }`
  - `throwTarget(from: Pt, to: Pt, field: { w: number; h: number }, pad: number): Pt` (clamps `to` into `[pad, w-pad] × [pad, h-pad]`)
  - `dragTarget(ball: Pt, start: Pt, end: Pt, scale: number): Pt` (ball + (end − start) × scale; the caller then clamps it with throwTarget)

- [ ] **Step 1: Write the failing tests**
  - `canFetch`:
    - dog stage 0 → true
    - chick stage 0 → false
    - chick stage 1 → true
    - tree stage 2 → false
  - `toyFor`: dog → '⚽', cat → '🧶', chick → '🐛'.
  - `hideSpots`:
    - Empty progress → 3 distinct items, all from the fallback emoji set.
    - `{'hangul/c1':1}` → every spot is one of c1's `{emoji, name: word}`; checked over 50 seeds.
    - Names are distinct in every case.
  - `nextHide`: over 100 seeds with `n=3, last=1`, the result is never 1 and always in [0,3). With `last=null`, the result is in range.
  - `throwTarget`:
    - `to` (−50, 900) in field 400×300 with pad 32 → (32, 268).
    - An inside point is returned unchanged.
  - `dragTarget`: ball (200,250), start (200,250), end (260,200), scale 3 → (380,100).
- [ ] **Step 2:** Run `npx vitest run tests/pets/play.test.ts`. Expect a FAIL (module missing).
- [ ] **Step 3:** Implement. For `hideSpots`, reuse `quizSources` from `src/pets/careQuiz.ts` filtered to world `hangul`. Map each item to `{ emoji: item.emoji, name: item.word }`, de-duplicate by name, shuffle, and take n. If fewer than n remain, top up from the fallback set without repeating a name.
- [ ] **Step 4:** Run the test again. Expect PASS.
- [ ] **Step 5:** Commit `feat(play): rules for play-together (who can fetch, toys, hiding spots, throw target)`.

### Task 2: Routes, 같이 놀기 button, picker screen

**Files:**
- Modify: `src/router.ts`
- Modify: `src/main.ts` (SCREENS)
- Modify: `src/ui/friend.ts` (add a free 🎈 button `data-free="play-together"`, label "같이 놀기", aria-label "같이 놀기", appended after the sleep button. It ignores taps while `busy`, then calls `go({name:'friendPlay'})`.)
- Create: `src/ui/friendPlay.ts`
- Test: `tests/router.test.ts`, `tests/ui/play.test.ts` (new; copy `makeDeps`/`tap` helpers from `tests/ui/friend.test.ts`)

**Interfaces:**
- Consumes: `canFetch` (Task 1)
- Produces:
  - Route members `{name:'friendPlay'}`, `{name:'friendBall'}`, `{name:'friendHide'}`
  - Picker buttons `data-testid="play-ball"` and `data-testid="play-hide"`

- [ ] **Step 1: Failing tests**
  - Router round-trip for the 3 hashes. `#/friend/play/x` → home.
  - The friend screen has a `[data-free="play-together"]` button with no `.star-cost`. Tapping it sets `location.hash` to `#/friend/play`. Tapping it while busy (right after `eat` with stars) does nothing.
  - Picker with a dog: both buttons exist. Tapping `play-ball` sets the hash to `#/friend/play/ball`.
  - Picker with a tree, and with a chick at stage 0: `location.hash` becomes `#/friend/play/hide`.
  - Picker with no friend: the hash becomes `#/friend/pick`.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement. The picker shows `topBar(null)` and two big buttons, each with a `petNode` of the friend plus an icon. It says "뭐 하고 놀까?".
- [ ] **Step 4:** Run `npm test`. Expect all PASS. Run `npx tsc --noEmit`. Expect it clean.
- [ ] **Step 5:** Commit `feat(play): 같이 놀기 button and game picker`.

### Task 3: Ball throw screen + shared end panel

**Files:**
- Create: `src/ui/playEnd.ts` — `showPlayEnd(host: HTMLElement, deps: ScreenDeps, kind: FriendKind, stage: Stage, onAgain: () => void): void`. It replaces the host's children with a happy friend, says the end line, and shows the two buttons from Global Constraints.
- Create: `src/ui/friendBall.ts`
- Modify: `src/main.ts`, `src/styles.css`
- Test: `tests/ui/play.test.ts`

**Interfaces:**
- Consumes: `canFetch`, `toyFor`, `throwTarget`, `dragTarget` (Task 1); route names (Task 2)
- Produces:
  - `FLY_MS`, `RUN_MS`, `BACK_MS` exported from `friendBall.ts`
  - Field element `data-testid="ball-field"`, toy `data-testid="toy"`, three counter dots `.fetch-dot` (`.on` when counted)

- [ ] **Step 1: Failing tests.** Use fake timers and the jsdom field size 0×0. `throwTarget` clamps, so this is fine.
  - Dispatch `pointerdown` + `pointerup` at the same point on `ball-field`. Before `FLY_MS+RUN_MS+BACK_MS` passes, "하나!" has not been spoken. After it passes, "하나!" has been spoken and one `.fetch-dot.on` exists.
  - A second tap during the fetch is ignored: after one full fetch time, only one dot is on.
  - After 3 fetches, the `[data-testid="again"]` and `[data-testid="back-friend"]` buttons exist and "재밌었어! 또 놀자!" has been spoken. `again` resets to 0 dots. `back-friend` sets the hash to `#/friend`.
  - Cleanup mid-flight, then advancing the timers 5000 ms: "하나!" is never spoken.
  - With a tree, rendering redirects to `#/friend/play/hide`.
  - `deps.savePets` is never called.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
  - Pointer handling: on `pointerdown` on the toy, record `start`. On `pointerup` anywhere in the field, decide the target:
    - If the drag started on the toy and moved more than 12px, use `dragTarget` with scale 3.
    - Otherwise use the pointer position.
    - Then clamp with `throwTarget` (pad = half of the toy size).
  - Movement: move the toy with CSS `transform` transitions. Fly takes `FLY_MS`, using a CSS keyframe for the arc on an inner element. The friend runs to the target over `RUN_MS`, then both return over `BACK_MS`. Keep all delays on `timers()`.
  - Reduced motion: a `@media (prefers-reduced-motion: reduce)` rule shortens the transitions to 0.2s. The JS timings stay the same.
- [ ] **Step 4:** Run `npm test`. Expect PASS.
- [ ] **Step 5:** Commit `feat(play): ball throw game`.

### Task 4: Hide-and-seek screen

**Files:**
- Create: `src/ui/friendHide.ts`
- Modify: `src/main.ts`, `src/styles.css`
- Test: `tests/ui/play.test.ts`

**Interfaces:**
- Consumes: `hideSpots`, `nextHide` (Task 1); `showPlayEnd` (Task 3)
- Produces: spots `[data-spot="<index>"]`. The hidden spot carries no marker in the DOM, so a child can't find it by inspecting the page. To find it, tests tap each spot in order until "까꿍!" is spoken (with `deps.rng = seededRng(...)`).

- [ ] **Step 1: Failing tests**
  - Start: "숨을게! 찾아봐!" is spoken and 3 `[data-spot]` exist.
  - A wrong tap speaks "<name>?" then "여기 없네!" and adds `shake`.
  - After 2 wrong taps in one turn, the remaining correct spot has the class `hint`.
  - The right tap speaks "까꿍!". A second tap on the same spot right away does not speak "까꿍!" again.
  - Over 3 turns, the hidden index never repeats back-to-back. Record the found index per turn.
  - After the 3rd find, the end panel is shown.
  - With a tree: "나비가 숨었어! 찾아봐!", and the found line is "찾았다!".
  - Cleanup mid-turn, then advancing the timers 5000 ms: nothing more is spoken.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
  - Hiding: the friend (or 🦋) shrinks into the chosen spot over about 600 ms. Taps are locked until then.
  - Found: the friend pops out above the spot. After 1500 ms, the next turn starts.
  - Layout: one row, or a triangle when the screen is narrow portrait (`max-aspect-ratio: 4/5`).
- [ ] **Step 4:** Run `npm test`. Expect PASS.
- [ ] **Step 5:** Commit `feat(play): hide-and-seek game`.

### Task 5: Layout check, APK, push

- [ ] **Step 1:** `npm run build`, then a temporary `vite preview --port 4180`. Run a headless-Chrome check like `quiz-check.mjs` on the picker, ball and hide screens at the 5 sizes from Global Constraints. Check: nothing offscreen, no overlap, targets ≥ 64px. Take a screenshot of each at 760×840 and 412×915. Stop the server.
- [ ] **Step 2:** Fix any FAIL and re-run until all OK.
- [ ] **Step 3:** Run `npm run apk`. Expect `BUILD SUCCESSFUL`.
- [ ] **Step 4:** Commit. Fast-forward master and push both branches.
