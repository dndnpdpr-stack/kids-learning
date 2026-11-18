# 유아 학습 게임 (한글·숫자·ABC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4~5세 아이가 음성 안내만으로 혼자 한글 자모·숫자·알파벳 대문자를 "만나기 → 찾기 → 따라 쓰기"로 익히는 웹앱을 만들고, PWA와 Capacitor로 브라우저와 iOS/Android에서 모두 동작하게 한다.

**Architecture:** 프레임워크 없는 Vite + TypeScript SPA. 순수 로직(콘텐츠 데이터, 진도, 문제 생성, 한글 조합, 따라 쓰기 판정)은 DOM과 분리된 모듈로 두고 Vitest로 테스트한다. 화면은 `render(root, state)` 형태의 작은 모듈로 만들고 해시 라우터로 전환한다. 음성은 `speak()` 하나로 추상화한다.

**Tech Stack:** Vite 5, TypeScript 5 (strict), Vitest + jsdom, vite-plugin-pwa, @capacitor/core·cli·ios·android 6

**Spec:** `docs/superpowers/specs/2026-11-18-kids-learning-game-design.md`

## Global Constraints

- 모든 안내는 음성으로 한다. 진행에 글자 읽기가 필요하면 안 된다.
- 틀렸을 때 감점, 큰 X 표시, 경고음을 쓰지 않는다. "다시 들어볼까?"로 다시 시도하게 한다.
- 광고, 로그인, 외부 링크, 외부 분석 SDK를 넣지 않는다. 네트워크로 데이터를 보내지 않는다.
- 진도는 localStorage에만 저장한다 (키: `kidsgame.progress.v1`).
- 터치 영역은 최소 64px. 세로·가로 모두 지원한다.
- 첫 실행 이후 오프라인에서 동작한다.
- 부모 메뉴는 버튼을 3초 동안 길게 눌러야 열린다.
- 한 묶음에서 찾기를 3번 맞히면 다음 묶음이 열린다. 이미 열린 묶음은 다시 할 수 있다.
- 한글: 기본 자음 14개, 기본 모음 10개, 그다음 "자음+모음" 조합. ABC: 대문자 26개. 숫자: 1~10 확인 → 20까지 세기 → 많고 적음 비교 → 그림 더하기.

## Review Focus

1. **음성 미지원 / 한국어 음성 없음** — `speechSynthesis`가 없거나 ko-KR 음성이 없어도 앱이 멈추거나 에러를 내지 않고, 화면은 계속 진행된다. (Task 4 테스트)
2. **연타** — 아이가 정답을 빠르게 여러 번 누르면 별과 정답 횟수가 한 번만 오른다. (Task 8 테스트)
3. **localStorage 사용 불가 / 값 손상** — 사생활 보호 모드나 JSON이 깨진 경우 기본 진도로 시작하고 예외를 던지지 않는다. (Task 3 테스트)
4. **부모 버튼을 짧게 누르거나 중간에 손을 뗌** — 3초 전에 손을 떼거나 손가락이 버튼 밖으로 나가면 열리지 않는다. (Task 9 테스트)
5. **따라 쓰기 중 두 번째 손가락 / 화면 회전** — 첫 번째 포인터만 추적하고, 화면 크기가 바뀌면 진행을 초기화하되 에러는 나지 않는다. (Task 7 테스트 + Task 8 수동 확인)

---

## File Structure

```
index.html
vite.config.ts            # Vite + PWA + Vitest 설정
capacitor.config.ts
src/
  main.ts                 # 진입점: 라우터 시작
  router.ts               # 해시 라우팅
  content/types.ts        # LearnItem, World, Group 타입
  content/hangul.ts       # 자음/모음 데이터와 묶음
  content/alphabet.ts     # A~Z 데이터와 묶음
  content/numbers.ts      # 숫자 단계 정의
  content/index.ts        # getWorld(id)
  core/progress.ts        # 진도 저장/조회
  core/audio.ts           # speak() 추상화
  core/quiz.ts            # 찾기 문제, 숫자 문제 생성
  core/hangulCompose.ts   # 초성+중성 → 음절
  core/trace.ts           # 따라 쓰기 판정
  core/rng.ts             # 시드 가능한 난수
  ui/home.ts  ui/world.ts  ui/meet.ts  ui/find.ts  ui/trace.ts
  ui/numbers.ts  ui/parent.ts  ui/celebrate.ts
  ui/longPress.ts
  styles.css
tests/ (src와 같은 구조, *.test.ts)
```

---

### Task 1: 프로젝트 기반 설정

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm test` (vitest run, jsdom 환경), `npm run build`

- [ ] **Step 1:** `git init`을 실행하고 `.gitignore`(node_modules, dist, ios, android)를 만든다.
- [ ] **Step 2:** devDependencies에 `vite typescript vitest jsdom`을 설치한다. scripts: `dev: vite`, `build: tsc --noEmit && vite build`, `test: vitest run`.
- [ ] **Step 3:** 실패하는 smoke 테스트를 작성한다: `import { APP_NAME } from '../src/main'` → `expect(APP_NAME).toBe('놀이 학교')`.
- [ ] **Step 4:** `npm test`를 실행한다. Expected: FAIL (export 없음).
- [ ] **Step 5:** `src/main.ts`에 `export const APP_NAME = '놀이 학교'`를 추가한다. `index.html`에 `<div id="app">`, viewport meta(`width=device-width, initial-scale=1, user-scalable=no`)를 넣는다. `styles.css`에 기본 큰 버튼 스타일(`min-width/min-height: 64px`)을 넣는다.
- [ ] **Step 6:** `npm test`와 `npm run build`를 실행한다. Expected: PASS, 빌드 성공.
- [ ] **Step 7:** Commit: `chore: scaffold vite + ts + vitest`

### Task 2: 학습 콘텐츠 데이터

**Files:**
- Create: `src/content/types.ts`, `src/content/hangul.ts`, `src/content/alphabet.ts`, `src/content/numbers.ts`, `src/content/index.ts`
- Test: `tests/content/content.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type WorldId = 'hangul' | 'numbers' | 'abc';
  interface LearnItem { id: string; glyph: string; name: string; word: string; emoji: string; lang: 'ko-KR' | 'en-US'; }
  interface Group { id: string; items: LearnItem[]; }
  interface World { id: WorldId; title: string; mascot: string; groups: Group[]; }
  function getWorld(id: WorldId): World;
  ```
  숫자 세계의 groups: `count10`(1~10, 각 item.glyph = '1'..'10'), `count20`, `compare`, `add`. 마지막 세 묶음은 items가 비어 있고 문제는 Task 5의 생성기가 만든다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다:
  - hangul 자음 = `ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ`(14개), 모음 = `ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ`(10개)
  - hangul groups: 자음 4묶음(4·4·3·3), 모음 3묶음(4·3·3), 그 뒤 `compose` 묶음. 모든 item id가 유일하다.
  - abc: A~Z 26개, 묶음당 4~5개, `lang === 'en-US'`
  - 모든 item의 `word`, `emoji`가 비어 있지 않다.
  - `getWorld('numbers').groups.map(g => g.id)` = `['count10','count20','compare','add']`
- [ ] **Step 2:** `npm test`를 실행한다. Expected: FAIL.
- [ ] **Step 3:** 데이터를 작성한다. 그림 단어는 아이에게 익숙한 것으로 고른다 (예: ㄱ 기차🚂, ㄴ 나비🦋, ㄷ 다리🌉, ㅏ 아기👶, A apple🍎, B ball⚽). `name`은 읽는 이름이다 (기역, 아, "A").
- [ ] **Step 4:** `npm test`를 실행한다. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add learning content data`

### Task 3: 진도 저장

**Files:**
- Create: `src/core/progress.ts`
- Test: `tests/core/progress.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Progress { stars: number; correct: Record<string, number>; volume: number; } // correct 키 = `${worldId}/${groupId}`
  const STORAGE_KEY = 'kidsgame.progress.v1';
  const UNLOCK_THRESHOLD = 3;
  function loadProgress(storage?: Storage | null): Progress;
  function saveProgress(p: Progress, storage?: Storage | null): void;
  function recordCorrect(p: Progress, worldId: WorldId, groupId: string): Progress; // 새 객체, stars+1
  function isGroupUnlocked(p: Progress, world: World, groupIndex: number): boolean; // index 0은 항상 true
  function resetProgress(storage?: Storage | null): Progress;
  ```
  기본값: `{ stars: 0, correct: {}, volume: 1 }`. storage 인자를 주지 않으면 `window.localStorage`에 try/catch로 접근한다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다:
  - 빈 storage → 기본값
  - save 후 load하면 같은 값
  - JSON이 깨진 값(`'{oops'`) → 기본값, 예외 없음
  - `getItem`/`setItem`이 throw하는 storage → load는 기본값, save는 예외 없음
  - `storage = null` → 기본값
  - 묶음 0 정답 2회 → 묶음 1 잠김, 3회 → 열림
  - `recordCorrect`는 원본 객체를 바꾸지 않는다.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add local progress store`

### Task 4: 음성

**Files:**
- Create: `src/core/audio.ts`
- Test: `tests/core/audio.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface SpeakOptions { lang: 'ko-KR' | 'en-US'; rate?: number; volume?: number; }
  function speak(text: string, opts: SpeakOptions): Promise<void>; // 끝나면 resolve. 미지원/에러 시에도 resolve (reject 금지)
  function stopSpeaking(): void;
  function setClipResolver(fn: (text: string, lang: string) => string | null): void; // 녹음 파일 URL을 반환하면 그 파일을 우선 재생
  ```
  기본 rate는 ko-KR 0.9, en-US 0.85. 새로 `speak`를 호출하면 이전 발화를 취소한다. 음성 이벤트가 오지 않는 브라우저를 대비해 안전 타임아웃(글자 수×300ms + 1500ms) 뒤에 resolve한다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다 (`speechSynthesis` / `SpeechSynthesisUtterance`를 mock):
  - `speak('기역',{lang:'ko-KR'})` → utterance.lang `'ko-KR'`, rate 0.9로 `speak` 호출
  - 두 번째 speak 전에 `cancel` 호출
  - `window.speechSynthesis` 없음 → resolve, throw 없음
  - utterance `onerror` → resolve
  - `onend`가 오지 않음 → fake timer로 안전 타임아웃 뒤 resolve
  - clipResolver가 URL을 반환하면 `Audio(url).play()`를 쓰고 TTS는 호출하지 않는다.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다. 음성은 `getVoices()` 중 lang이 일치하는 첫 번째를 쓰고, 없으면 voice를 지정하지 않는다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add speech abstraction with safe fallbacks`

### Task 5: 문제 생성

**Files:**
- Create: `src/core/rng.ts`, `src/core/quiz.ts`
- Test: `tests/core/quiz.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Rng = () => number; function seededRng(seed: number): Rng;
  interface FindQuestion { target: LearnItem; choices: LearnItem[]; }
  function makeFindQuestion(pool: LearnItem[], rng: Rng, choiceCount?: 2 | 3): FindQuestion;
  interface NumberQuestion { kind: 'count' | 'compare' | 'add'; prompt: string; emoji: string; groups: number[]; choices: number[]; answer: number; }
  function makeNumberQuestion(kind: 'count10' | 'count20' | 'compare' | 'add', rng: Rng): NumberQuestion;
  ```
  규칙:
  - `choiceCount` 기본값 3. pool이 choiceCount보다 작으면 pool 크기에 맞춘다.
  - `count10`: groups=[n], n은 1~10. `count20`: n은 11~20.
  - `compare`: groups=[a,b], a≠b, 1~10, choices=[0,1] (어느 쪽 인덱스), answer는 더 많은 쪽.
  - `add`: groups=[a,b], a+b≤10, a,b≥1, answer=a+b.
  - count/add의 choices는 정답을 포함한 서로 다른 3개, 모두 ≥1, 섞어서 제공한다.
  - `prompt`는 음성 문장이다 (예: "사과가 몇 개야?", "어느 쪽이 더 많아?", "모두 몇 개야?").

- [ ] **Step 1:** 실패하는 테스트를 작성한다. seededRng(1..200)로 반복하면서 위 규칙을 모두 assert한다: choices에 target 포함, 중복 없음, pool 크기 1·2일 때 동작, 같은 seed면 같은 결과.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다 (seededRng는 mulberry32).
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add quiz generators`

### Task 6: 한글 조합

**Files:**
- Create: `src/core/hangulCompose.ts`
- Test: `tests/core/hangulCompose.test.ts`

**Interfaces:**
- Produces: `function composeSyllable(cho: string, jung: string): string | null;` 기본 자음 14개 × 기본 모음 10개만 지원하고, 그 밖의 입력이면 null을 반환한다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다: `ㄱ+ㅏ='가'`, `ㄴ+ㅓ='너'`, `ㅎ+ㅣ='히'`, `ㅇ+ㅠ='유'`, `ㄲ+ㅏ=null`, `ㄱ+ㄴ=null`, `'a'+ㅏ=null`.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다: `0xAC00 + (초성인덱스*21 + 중성인덱스)*28`. 초성 인덱스는 유니코드 초성 순서(ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ)를 따르고, 중성 인덱스도 유니코드 순서를 따른다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add hangul syllable composition`

### Task 7: 따라 쓰기 판정

**Files:**
- Create: `src/core/trace.ts`
- Test: `tests/core/trace.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Pt = { x: number; y: number }; // 0~1 정규화 좌표
  interface Stroke { points: Pt[]; } // 체크포인트
  interface TraceState { strokeIndex: number; pointIndex: number; done: boolean; }
  const TRACE_TOLERANCE = 0.12;
  function newTrace(): TraceState;
  function advanceTrace(s: TraceState, strokes: Stroke[], p: Pt): TraceState; // 다음 체크포인트와의 거리 ≤ TOLERANCE면 전진
  function endStroke(s: TraceState, strokes: Stroke[]): TraceState; // 획 중간에 손을 떼면 그 획을 처음부터 다시
  function getStrokes(glyph: string): Stroke[]; // 첫 버전: 자음 14, 모음 10, A~Z, 숫자 0~9
  ```
  `getStrokes`의 데이터는 `src/core/strokes.ts`에 손으로 작성한 체크포인트(획당 3~8개)로 넣는다. 데이터가 없는 glyph는 `[]`를 반환하고, UI에서는 따라 쓰기를 건너뛴다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다:
  - 체크포인트를 순서대로 지나가면 done
  - 순서를 건너뛴 점은 무시한다 (전진하지 않음).
  - 허용 거리 밖이면 무시한다.
  - 획 중간에 `endStroke`를 부르면 pointIndex가 0으로 돌아간다. 이미 끝낸 획은 유지한다.
  - done 이후 advance는 상태를 바꾸지 않는다.
  - `getStrokes`: 지원 목록의 모든 glyph가 1개 이상의 획을 갖고, 모든 좌표가 0~1 범위다.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현하고 획 데이터를 작성한다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add tracing judge and stroke data`

### Task 8: 화면 (홈, 세계, 만나기, 찾기, 따라 쓰기, 숫자, 축하)

**Files:**
- Create: `src/router.ts`, `src/ui/home.ts`, `src/ui/world.ts`, `src/ui/meet.ts`, `src/ui/find.ts`, `src/ui/trace.ts`, `src/ui/numbers.ts`, `src/ui/celebrate.ts`
- Modify: `src/main.ts`, `src/styles.css`
- Test: `tests/ui/screens.test.ts`

**Interfaces:**
- Consumes: Task 2~7의 모든 export
- Produces:
  ```ts
  type Route = { name: 'home' } | { name: 'world'; world: WorldId } | { name: 'meet' | 'find' | 'trace'; world: WorldId; group: string } | { name: 'parent' };
  function parseRoute(hash: string): Route; function go(r: Route): void;
  // 각 화면: export function render(root: HTMLElement, route, deps: { progress: Progress; save(p: Progress): void; speak: typeof speak; rng: Rng }): () => void  // 정리 함수 반환
  ```
  해시 형식: `#/`, `#/w/hangul`, `#/w/hangul/g/c1/find`, `#/parent`. 모르는 해시는 home으로 간다.
  동작:
  - 홈: 세계 버튼 3개(마스코트 이모지만, 글자 없음)와 별 개수. 버튼을 누르면 세계 이름을 말한다.
  - 세계: 묶음 카드. 잠긴 묶음은 자물쇠로 표시하고, 누르면 "조금 더 하면 열려!"라고 말한다.
  - 찾기: 문제를 말하고, 다시 듣기 🔊 버튼을 둔다. 정답이면 `recordCorrect` → 저장 → 축하 → 다음 문제. 오답이면 그 보기만 살짝 흔들고 "다시 들어볼까?"라고 말한다. **정답 처리 중에는 입력을 잠가서 한 번만 반영한다.**
  - 숫자 세계의 찾기는 `makeNumberQuestion`으로 이모지 묶음을 그리고, 보기는 숫자 버튼이다.
  - 한글 `compose` 묶음: 자음과 모음 하나씩 보여 주고 합쳐지는 애니메이션과 함께 음절을 말한다. 찾기는 음절 3개 중에서 고른다.
  - 따라 쓰기: canvas와 pointer events를 쓴다. 첫 `pointerId`만 추적하고, `resize`가 오면 `newTrace()`로 초기화한다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다 (jsdom, speak는 mock):
  - `parseRoute`: 각 형식과 모르는 해시를 확인한다.
  - 홈: 세계 버튼 3개를 렌더한다.
  - 세계: 진도가 0이면 첫 묶음만 열려 있다.
  - 찾기: 정답 버튼을 같은 틱에 5번 클릭해도 `progress.stars`는 1 증가, save는 1회 호출된다.
  - 찾기: 오답을 클릭하면 stars는 그대로이고 speak가 '다시 들어볼까?'로 호출된다.
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** `npm run dev`를 실행하고 브라우저 모바일 에뮬레이션(세로·가로)으로 확인한다. 세 세계 모두 만나기 → 찾기 → 따라 쓰기가 끝까지 되는지, 따라 쓰기 중 회전해도 에러가 없는지 본다.
- [ ] **Step 6:** Commit: `feat: add game screens`

### Task 9: 부모 메뉴

**Files:**
- Create: `src/ui/longPress.ts`, `src/ui/parent.ts`
- Modify: `src/ui/home.ts`
- Test: `tests/ui/parent.test.ts`

**Interfaces:**
- Produces: `function attachLongPress(el: HTMLElement, ms: number, onDone: () => void): () => void;` (`pointerdown`에서 시작, `pointerup`/`pointerleave`/`pointercancel`이면 취소). 부모 화면에서는 세계별 열린 묶음 수, 볼륨(0~1 슬라이더, `Progress.volume`), "진도 초기화"(두 번 눌러 확인)를 제공한다.

- [ ] **Step 1:** 실패하는 테스트를 작성한다 (fake timers):
  - 3000ms 누르기 → onDone 1회
  - 2999ms에 pointerup → onDone 호출 없음
  - 1000ms에 pointerleave → 호출 없음
  - 초기화를 한 번만 누르면 진도 유지, 두 번 누르면 기본값
- [ ] **Step 2:** 실행. Expected: FAIL.
- [ ] **Step 3:** 구현한다. 홈의 🔒 버튼에 `attachLongPress(btn, 3000, () => go({name:'parent'}))`를 붙인다. 누르는 동안 테두리가 차오르는 진행 표시를 보여 준다.
- [ ] **Step 4:** 실행. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: add parent menu with long-press lock`

### Task 10: 오프라인(PWA)과 앱 포장(Capacitor)

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `capacitor.config.ts`, `public/icon-192.png`, `public/icon-512.png`

**Interfaces:**
- Produces: `npm run build`가 manifest와 service worker를 생성한다. `npx cap sync`로 `ios/`, `android/` 프로젝트를 만든다.

- [ ] **Step 1:** `vite-plugin-pwa`를 설치하고 `registerType: 'autoUpdate'`로 설정한다. manifest: `name: '놀이 학교'`, `display: 'standalone'`, `orientation: 'any'`. 빌드 결과 전체를 precache한다.
- [ ] **Step 2:** `npm run build && npx vite preview`를 실행한다. 브라우저 DevTools에서 Offline으로 바꾼 뒤 새로고침해도 앱이 뜨는지 확인한다.
- [ ] **Step 3:** `@capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`를 설치한다. `capacitor.config.ts`: `appId: 'com.family.noriSchool'`, `appName: '놀이 학교'`, `webDir: 'dist'`. 그다음 `npx cap add android`를 실행하고(가능하면 `ios`도) `npx cap sync`를 실행한다.
- [ ] **Step 4:** 네트워크 요청이 없는지 확인한다: `grep -r "http" dist/assets`에서 외부 도메인 호출이 나오지 않아야 한다.
- [ ] **Step 5:** Commit: `feat: add PWA offline support and capacitor shells`
