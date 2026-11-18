import '@fontsource/jua';
import './styles.css';
import { speak, stopSpeaking } from './core/audio';
import { loadChildName, saveChildName } from './core/profile';
import { loadProgress, saveProgress } from './core/progress';
import { isTestMode } from './core/devFlags';
import { seededRng } from './core/rng';
import { startRouter, type Route } from './router';
import { say, type Cleanup, type ScreenDeps } from './ui/dom';
import * as find from './ui/find';
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
};

function boot(root: HTMLElement): void {
  const deps: ScreenDeps = {
    progress: loadProgress(),
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
