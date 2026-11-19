# 친구 키우기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배워서 얻은 ⭐로 강아지·고양이·병아리·나무를 돌봐 키우고, 다 자라면 친구 방으로 보내고 새 친구를 데려오는 기능을 만든다.

**Architecture:** 순수 상태 모듈(`src/pets/state.ts`)이 저장·잔액·돌봐 주기·성장 규칙을 맡는다. 그림 모듈(`src/pets/art.ts`)은 미리보기에서 승인된 SVG 그리기 함수와 친구별 대사를 옮겨 온 것이다. 화면 3개(`src/ui/friend*.ts`)는 기존 화면들과 같은 `render(root, route, deps)` 형태로 만든다.

**Tech Stack:** 기존과 같음 (Vite + TS strict + Vitest/jsdom)

**Spec:** `docs/superpowers/specs/2026-11-19-friends-care-design.md`

## Global Constraints
- 줄어들거나 나빠지는 표현 금지 (배고픔, 슬픔, 시듦, 작아짐 없음)
- ⭐는 찾기 정답으로만 얻는다. 돌봐 주기로는 ⭐를 얻을 수 없다.
- 유료 행동(밥, 목욕/햇빛, 놀기) = ⭐1, 성장 +1. 무료 행동(쓰다듬기, 잠자기) = 성장 없음.
- 성장 기준 `CARE_STEPS = [3, 5, 7]`. 단계는 0~3이고, 3이 다 자람이다.
- 저장 키 `kidsgame.pets.v1`. 저장 공간을 쓸 수 없거나 값이 깨졌으면 기본값으로 시작하고 예외를 던지지 않는다.
- 아이 화면은 음성 안내가 기본이고, 터치 영역은 64px 이상, 스크롤 없이 한 화면에 담는다 (가로가 낮은 화면 포함). 외부 네트워크는 쓰지 않는다.
- 테스트 모드(`deps.testMode`)에서는 돌봐 주기에 ⭐가 들지 않는다.
- 진도 초기화는 친구 키우기 기록도 함께 지운다.

## Review Focus
1. **⭐가 0일 때 유료 행동을 누르는 경우**: 성장하지 않고, ⭐ 흔들림과 "별을 모아 오면 줄 수 있어!"만 나와야 한다. 잔액이 음수가 되면 안 된다. (Task 1, 3)
2. **유료 행동을 빠르게 연타하는 경우**: 누른 횟수만큼 정확히 ⭐가 빠지고, 잔액 밖으로 빠지면 안 된다. 성장 연출이 겹쳐서 단계를 건너뛰면 안 된다. (Task 3)
3. **다 자란 뒤 계속 돌봐 주는 경우**: ⭐가 빠지지 않고 단계가 3을 넘지 않는다. (Task 1)
4. **진도 초기화 후 잔액**: `stars`가 0이 되어도 `spent`가 남아 있으면 잔액이 음수가 된다. 초기화할 때 친구 기록도 지워야 한다. (Task 3)
5. **화면 전환 중 연출 타이머**: 친구 화면을 떠날 때 모든 타이머와 연출이 정리돼야 한다. (Task 3)

---

### Task 1: 친구 상태 모듈

**Files:**
- Create: `src/pets/state.ts`
- Test: `tests/pets/state.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FriendKind = 'dog' | 'cat' | 'chick' | 'tree';
  export interface Friend { kind: FriendKind; stage: 0 | 1 | 2 | 3; care: number } // care = 현재 단계에서 쌓인 돌봐 주기
  export interface PetsState { spent: number; current: Friend | null; room: { kind: FriendKind }[] }
  export const PETS_KEY = 'kidsgame.pets.v1';
  export const CARE_STEPS = [3, 5, 7] as const;
  export function defaultPets(): PetsState;              // { spent: 0, current: null, room: [] }
  export function loadPets(storage?: Storage | null): PetsState;
  export function savePets(p: PetsState, storage?: Storage | null): void;
  export function starBalance(starsEarned: number, p: PetsState): number;   // max(0, earned - spent)
  export function startFriend(p: PetsState, kind: FriendKind): PetsState;    // current = {kind, stage 0, care 0}
  export type CareResult = { pets: PetsState; ok: boolean; grew: boolean; reason?: 'no-stars' | 'no-friend' };
  export function paidCare(p: PetsState, starsEarned: number, free: boolean): CareResult;
  //   free=true(테스트 모드)면 spent를 늘리지 않는다. 잔액 0이고 free=false면 ok=false, reason 'no-stars'.
  //   stage 3이면 ok=true, grew=false, spent와 care가 그대로다.
  //   care+1이 CARE_STEPS[stage] 이상이 되면 stage+1, care=0, grew=true.
  export function moveToRoom(p: PetsState): PetsState;  // stage 3일 때만: room에 추가하고 current=null. 아니면 그대로 반환
  export function careProgress(f: Friend): { done: number; total: number } | null; // stage 3이면 null
  ```
  `loadPets`는 모든 필드의 형태를 검증한다. kind 값, stage 0..3, 0 이상인 정수, 배열인지 확인하고 하나라도 맞지 않으면 기본값을 돌려준다. 저장 공간 접근은 `src/core/progress.ts`와 같은 패턴(try/catch)을 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - 기본값을 확인한다.
  - 저장 후 다시 불러오면 같은 값이다.
  - 깨진 JSON, 형태가 틀린 값, 접근 시 예외를 던지는 저장 공간 → 기본값이고 예외가 없다.
  - `starBalance(5, {spent: 7})` = 0
  - `paidCare` 잔액 0 → `{ok:false, reason:'no-stars'}`, pets가 바뀌지 않는다.
  - `paidCare` 3번 → 단계 0→1이 되고 3번째에 grew=true, spent=3
  - `paidCare` free=true → spent 0
  - 15번 → 단계 3. 그 뒤 `paidCare`는 spent가 늘지 않고 stage가 3에 머문다.
  - `moveToRoom`: 단계 3이면 room 길이 1, current null. 단계 2이면 그대로다.
  - `careProgress`: 단계 1에서 care 2 → `{done:2,total:5}`
  - current가 null일 때 `paidCare` → `{ok:false, reason:'no-friend'}`
- [ ] **Step 2:** `npx vitest run tests/pets/state.test.ts` → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 다시 실행 → PASS
- [ ] **Step 5:** 커밋 `feat(pets): friend state, star balance and growth rules`

### Task 2: 친구 그림과 대사 모듈

**Files:**
- Create: `src/pets/art.ts`, `src/pets/friends.ts`
- Modify: `src/styles.css` (미리보기의 `.pet …` 애니메이션과 `.fx`·`.bubble-say` 스타일을 옮긴다. 기존 클래스와 겹치지 않게 `pet-` 접두사를 쓴다: `.fx` → `.pet-fx`, `.bubble-say` → `.pet-say`)
- Test: `tests/pets/art.test.ts`

**Interfaces:**
- Consumes: `FriendKind` (Task 1)
- Produces:
  ```ts
  // art.ts — D:/myproject/pet-preview.html 의 dog/cat/chick/tree 그리기 함수와 공통 부품을 그대로 옮긴다
  export function drawFriend(kind: FriendKind, stage: 0 | 1 | 2 | 3): string; // <svg class="pet {kind}"> 문자열
  // friends.ts
  export type CareKind = 'eat' | 'wash' | 'play';
  export interface FriendInfo {
    kind: FriendKind; icon: string; name: string; stageNames: [string, string, string, string];
    hello: string;                          // 처음 들어올 때 인사 (강아지 "멍멍! 반가워!", 고양이 "야옹! 반가워!", 병아리 "삐약! 반가워!", 나무 "안녕! 반가워!")
    care: Record<CareKind, { icon: string; label: string; line: string }>;   // 미리보기 acts 표의 값을 그대로 쓴다
    pet: { line: string };                  // 쓰다듬기 대사
  }
  export const FRIENDS: Record<FriendKind, FriendInfo>;
  export const FRIEND_ORDER: FriendKind[];  // ['dog','cat','chick','tree']
  ```
  - 이름: 강아지, 고양이, 병아리, 나무
  - 단계 이름: 미리보기의 `stages` 값
- [ ] **Step 1: 실패하는 테스트 작성**
  - 친구 4 × 단계 4 = 16개 SVG에 `NaN`, `undefined`, `Infinity`가 없다.
  - 각 SVG가 부품 클래스를 모두 갖는다: `whole`, `body-g`, `head-g`, `eyes-open`, `eyes-happy`, `eyes-sleep`, `mouth-closed`, `mouth-open`
  - `FRIENDS` 값이 미리보기 표와 같다 (예: `FRIENDS.tree.care.eat.icon === '💧'`).
- [ ] **Step 2:** 실행 → FAIL
- [ ] **Step 3:** 미리보기에서 옮겨 구현한다. 그리는 결과는 바꾸지 않는다.
- [ ] **Step 4:** 실행 → PASS, `npm run build` 성공
- [ ] **Step 5:** 커밋 `feat(pets): friend SVG art and lines`

### Task 3: 친구 화면 3개 + 홈·부모 메뉴 연결

**Files:**
- Create: `src/ui/friendPick.ts`, `src/ui/friend.ts`, `src/ui/friendRoom.ts`, `src/ui/petFx.ts` (말풍선, 날아가는 효과, 반짝이 — 타이머는 `timers()`로 관리)
- Modify: `src/router.ts` (경로 `#/friend`, `#/friend/pick`, `#/friend/room` → Route 이름 `friend`, `friendPick`, `friendRoom`), `src/main.ts` (SCREENS, deps), `src/ui/dom.ts` (`ScreenDeps`에 `pets: PetsState; savePets(p: PetsState): void` 추가), `src/ui/home.ts` (⭐ 배지 = `starBalance`, 내 친구 버튼), `src/ui/parent.ts` (초기화할 때 `deps.pets = defaultPets(); deps.savePets(...)`), `src/styles.css`
- Test: `tests/ui/friend.test.ts`, 기존 UI 테스트의 deps 헬퍼에 `pets`/`savePets` 추가

**Interfaces:**
- Consumes: Task 1, Task 2 전부. 기존 `say`, `topBar`, `timers`, `go`, `button`, `el`
- Produces: 화면 3개의 `render(root, route, deps): Cleanup`

**동작:**
- **홈**
  - ⭐ 배지는 `starBalance(progress.stars, pets)`를 보여 준다.
  - 세계 목록 아래에 `data-testid="friend-btn"` 버튼을 둔다. 친구가 있으면 그 친구의 현재 단계 SVG를, 없으면 🥚를 넣는다.
  - 누르면 친구가 있을 때 `friend`로, 없을 때 `friendPick`으로 간다.
- **친구 고르기**
  - 4친구의 단계 0 그림 버튼(`data-kind`)을 보여 주고, 들어오면 "누구랑 친구 할까?"라고 말한다.
  - 누르면 `startFriend` → 저장 → `deps.announce = FRIENDS[kind].hello` → `friend`로 간다.
- **친구 화면**
  - 친구가 없으면 `friendPick`으로 보낸다.
  - 윗줄: 🏠, ⭐ 잔액(`data-testid="balance"`), 🏡(친구 방)
  - 그림, 성장 점(`data-testid="growth"`): 다음 단계까지 total개 점 중 done개를 채운다. 다 자랐으면 👑
  - 행동 버튼 5개: `data-care="eat|wash|play"`, `data-free="pet|sleep"`
  - **유료 행동**
    - `paidCare(deps.pets, progress.stars, deps.testMode)`를 부른다.
    - ok면: 저장 → 미리보기와 같은 연출 → grew면 반짝이 연출 후 그림을 다시 그리고 "와! {이름}가 자랐어!"(받침에 맞게 이/가)라고 말한다.
    - `no-stars`면: 잔액 표시에 흔들기 클래스를 주고 "별을 모아 오면 줄 수 있어!"라고 말한다.
  - **연타 처리**: 성장 연출 중(약 1초)에는 유료 행동 입력을 잠근다. 그 외에는 누를 때마다 바로 반영한다.
  - **다 자랐을 때**(stage 3): 🏡 이사 버튼(`data-testid="move-btn"`)을 크게 보여 준다. 누르면 `moveToRoom` → 저장 → "새 친구를 데려오자!"라고 말하고 `friendPick`으로 간다.
  - 떠날 때 모든 타이머와 연출을 정리한다.
- **친구 방**
  - room의 친구들을 다 자란 그림으로 나란히 보여 준다 (격자, 스크롤 없음, 많으면 작게).
  - 누르면 쓰다듬기 반응을 한다.
  - 비었으면 "친구를 다 키우면 여기로 와요"라고 말한다.
  - 🏠, ⬅(친구 화면) 버튼을 둔다.
- **부모 메뉴 초기화**: 친구 기록도 기본값으로 되돌린다.

- [ ] **Step 1: 실패하는 테스트 작성**
  - 홈 배지 = 잔액 (stars 5, spent 2 → "⭐ 3")
  - 친구가 없을 때 friend-btn → `#/friend/pick`
  - 고르기에서 dog를 누르면 `pets.current.kind === 'dog'`, 저장되고 `#/friend`로 간다.
  - 친구 화면에서 잔액 0일 때 eat → stage, spent가 그대로이고 "별을 모아 오면 줄 수 있어!"를 말한다.
  - 잔액 3일 때 eat ×3 → stage 1, spent 3. 성장 잠금 중의 4번째 클릭은 무시한다.
  - testMode면 잔액 0이어도 eat이 성장시키고 spent는 0이다.
  - stage 3이면 move-btn이 있다. 누르면 room 1, current null, `#/friend/pick`
  - 부모 메뉴 초기화 → pets가 기본값이다.
  - 떠난 뒤(cleanup) 남은 타이머가 없다 (fake timers로 확인).
- [ ] **Step 2:** 실행 → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `npm test`, `npm run build` → PASS
- [ ] **Step 5:** 커밋 `feat(pets): pick, care and room screens wired into home and parent menu`

### Task 4: 정리

**Files:**
- Delete: `pet-preview.html` (git 추적 대상이 아님. `.git/info/exclude`에 들어 있다)
- Modify: `docs/superpowers/specs/2026-11-19-ai-voice-clips-design.md`의 문장 목록 항목에 "친구 대사"를 추가한다.

- [ ] **Step 1:** 미리보기 파일을 지우고, 음성 설계 문서에 한 줄을 추가한다.
- [ ] **Step 2:** `npm test`, `npm run build` → PASS
- [ ] **Step 3:** 커밋 `chore(pets): remove preview page, note friend lines for voice clips`
