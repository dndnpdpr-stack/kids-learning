import '@fontsource/jua';
import './styles.css';
import { speak, stopSpeaking } from './core/audio';
import { loadProgress, saveProgress } from './core/progress';
import { seededRng } from './core/rng';
import { startRouter, type Route } from './router';
import type { Cleanup, ScreenDeps } from './ui/dom';
import * as find from './ui/find';
import * as home from './ui/home';
import * as meet from './ui/meet';
import * as parent from './ui/parent';
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
};

function boot(root: HTMLElement): void {
  const deps: ScreenDeps = {
    progress: loadProgress(),
    save: (p) => saveProgress(p),
    speak,
    rng: seededRng(Date.now()),
  };
  let cleanup: Cleanup = () => {};
  startRouter((route) => {
    cleanup();
    stopSpeaking();
    root.replaceChildren();
    cleanup = SCREENS[route.name](root, route, deps);
  });
}

const root = document.getElementById('app');
if (root) boot(root);
