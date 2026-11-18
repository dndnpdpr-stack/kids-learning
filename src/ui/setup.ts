import { NAME_MAX, normalizeName } from '../core/profile';
import { go, type Route } from '../router';
import { callName, el, say, type Cleanup, type ScreenDeps } from './dom';

/** 첫 실행 때 한 번: 부모가 아이 이름을 입력한다. 어른용이라 글자 안내를 쓴다. */
export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  let disposed = false;

  const input = el('input', 'name-input', [], {
    type: 'text',
    maxlength: String(NAME_MAX),
    placeholder: '예: 하늘',
    autocomplete: 'off',
    'aria-label': '아이 이름',
    'data-testid': 'name-input',
  });
  const start = el('button', 'btn name-start', ['시작하기 🚀'], {
    type: 'submit',
    'data-testid': 'name-start',
  });
  start.disabled = true;
  input.addEventListener('input', () => {
    start.disabled = normalizeName(input.value) === null;
  });

  const form = el('form', 'setup-form', [
    el('label', 'setup-label', ['아이 이름을 알려 주세요']),
    input,
    start,
    el('p', 'setup-note', ['이름은 이 기기에만 저장돼요.']),
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = normalizeName(input.value);
    if (!name) return;
    deps.saveName(name);
    start.disabled = true;
    void say(deps, `${callName(name)}, 반가워!`).then(() => {
      if (!disposed) go({ name: 'home' });
    });
  });

  root.append(
    el('section', 'screen setup', [el('div', 'setup-mascots', ['🐰 🐻 🦊']), el('h1', 'app-title', ['놀이 학교']), form]),
  );
  input.focus();

  return () => {
    disposed = true;
  };
}
