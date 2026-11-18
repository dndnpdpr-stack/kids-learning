import { getWorld, type WorldId } from '../content';
import { NAME_MAX, normalizeName } from '../core/profile';
import { isGroupUnlocked, resetProgress } from '../core/progress';
import type { Route } from '../router';
import { button, el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';

const WORLD_ORDER: WorldId[] = ['hangul', 'numbers', 'abc'];
const RESET_LABEL = '진도 초기화';
const CONFIRM_LABEL = '한 번 더 누르면 초기화돼요';
const CONFIRM_MS = 3000;

/** 부모용 화면. 어른이 읽는 화면이라 글자를 쓴다. */
export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const t = timers();
  const info = el('ul', 'parent-info');
  const stars = el('p', 'parent-stars', [], { 'data-testid': 'parent-stars' });

  const refresh = () => {
    info.replaceChildren(
      ...WORLD_ORDER.map((id) => {
        const w = getWorld(id);
        const open = w.groups.filter((_, i) => isGroupUnlocked(deps.progress, w, i)).length;
        return el('li', '', [`${w.title}: 열린 묶음 ${open} / 전체 ${w.groups.length}`], {
          'data-world': id,
        });
      }),
    );
    stars.textContent = `⭐ ${deps.progress.stars}`;
  };

  const slider = el('input', 'volume-slider', [], {
    type: 'range',
    min: '0',
    max: '1',
    step: '0.1',
    'aria-label': '볼륨',
    'data-testid': 'volume',
  });
  slider.value = String(deps.progress.volume);
  slider.addEventListener('change', () => {
    deps.progress = { ...deps.progress, volume: Number(slider.value) };
    deps.save(deps.progress);
    void say(deps, '안녕!');
  });

  const nameInput = el('input', 'parent-name', [], {
    type: 'text',
    maxlength: String(NAME_MAX),
    'aria-label': '아이 이름',
    'data-testid': 'parent-name',
  });
  nameInput.value = deps.childName ?? '';
  const nameSave = button(
    '이름 저장',
    () => {
      const n = normalizeName(nameInput.value);
      if (!n) {
        nameInput.value = deps.childName ?? '';
        return;
      }
      deps.saveName(n);
      nameInput.value = n;
    },
    'name-save-btn',
    { 'data-testid': 'parent-name-save' },
  );

  let confirming = false;
  const resetBtn = button(
    RESET_LABEL,
    () => {
      if (!confirming) {
        confirming = true;
        resetBtn.textContent = CONFIRM_LABEL;
        t.after(CONFIRM_MS, () => {
          confirming = false;
          resetBtn.textContent = RESET_LABEL;
        });
        return;
      }
      t.clear();
      confirming = false;
      resetBtn.textContent = RESET_LABEL;
      deps.progress = { ...resetProgress(), volume: deps.progress.volume };
      deps.save(deps.progress);
      refresh();
    },
    'reset-btn',
    { 'data-testid': 'reset-btn' },
  );

  refresh();
  root.append(
    el('section', 'screen parent', [
      topBar(null),
      el('div', 'parent-panel', [
        el('label', 'parent-row parent-name-row', [el('span', 'parent-key', ['아이 이름']), nameInput, nameSave]),
        info,
        el('div', 'parent-row', [stars, el('label', 'parent-volume', [el('span', 'parent-key', ['볼륨']), slider])]),
        resetBtn,
      ]),
    ]),
  );

  return () => t.clear();
}
