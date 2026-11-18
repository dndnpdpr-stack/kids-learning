import type { Route } from '../router';
import { el, topBar, type Cleanup, type ScreenDeps } from './dom';

/** 임시 부모 화면. Task 9에서 실제 부모 메뉴로 바뀐다. */
export function render(root: HTMLElement, _route: Route, _deps: ScreenDeps): Cleanup {
  root.append(el('section', 'screen parent', [topBar(null), el('div', 'placeholder', ['🔒'])]));
  return () => {};
}
