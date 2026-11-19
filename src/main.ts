import '@fontsource/jua';
// 부모 메뉴(어른용 화면)는 읽기 편한 고딕체를 쓴다. 보통·굵게 두 굵기만 포함.
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';
import './styles.css';
import { speak, stopSpeaking } from './core/audio';
import { loadChildName, saveChildName } from './core/profile';
import { loadProgress, saveProgress } from './core/progress';
import { isTestMode } from './core/devFlags';
import { useNativeTtsInApp } from './core/nativeTts';
import { seededRng } from './core/rng';
import { loadPets, reconcileSpent, savePets } from './pets/state';
import { startRouter, type Route } from './router';
import { say, type Cleanup, type ScreenDeps } from './ui/dom';
import * as find from './ui/find';
import * as friend from './ui/friend';
import * as friendPick from './ui/friendPick';
import * as friendRoom from './ui/friendRoom';
import * as home from './ui/home';
import * as meet from './ui/meet';
import * as parent from './ui/parent';
import * as setup from './ui/setup';
import * as trace from './ui/trace';
import * as world from './ui/world';

export { APP_NAME } from './ui/home';

type Screen = (root: HTMLElement, route: Route, deps: ScreenDeps) => Cleanup;

const SCREENS: Record<Route['name'], Screen> = {
  home: home.render,
  world: world.render,
  meet: meet.render,
  find: find.render,
  trace: trace.render,
  parent: parent.render,
  setup: setup.render,
  friend: friend.render,
  friendPick: friendPick.render,
  friendRoom: friendRoom.render,
};

function boot(root: HTMLElement): void {
  // 앱(APK)에서는 WebView 음성이 안 나오므로 휴대폰 음성 엔진을 쓴다. 브라우저에선 아무 일도 안 함.
  useNativeTtsInApp();
  const progress = loadProgress();
  // 진도 기록만 사라진 경우 쓴 별이 모은 별보다 클 수 없다.
  const loadedPets = loadPets();
  const pets = reconcileSpent(loadedPets, progress.stars);
  if (pets !== loadedPets) savePets(pets);
  const deps: ScreenDeps = {
    progress,
    save: (p) => saveProgress(p),
    speak,
    rng: seededRng(Date.now()),
    childName: loadChildName(),
    announce: null,
    testMode: isTestMode(import.meta.env),
    saveName: (name) => {
      saveChildName(name);
      deps.childName = name;
    },
    pets,
    savePets: (p) => savePets(p),
  };
  let cleanup: Cleanup = () => {};
  startRouter((route) => {
    cleanup();
    stopSpeaking();
    root.replaceChildren();
    // 이름이 없으면(첫 실행) 어떤 주소로 들어와도 이름 입력 화면을 먼저 보여 준다.
    const r: Route = deps.childName ? route : { name: 'setup' };
    cleanup = SCREENS[r.name](root, r, deps);
    // 이전 화면이 남긴 안내(인사, 세계 이름)를 새 화면이 뜬 뒤에 말한다.
    const text = deps.announce;
    deps.announce = null;
    if (text) void say(deps, text);
  });
}

const root = document.getElementById('app');
if (root) boot(root);
