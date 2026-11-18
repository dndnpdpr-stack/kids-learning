import type { WorldId } from '../content';
import type { speak } from '../core/audio';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { go } from '../router';

export interface ScreenDeps {
  progress: Progress;
  save(p: Progress): void;
  speak: typeof speak;
  rng: Rng;
  /** 아이 이름 (첫 실행 때 입력). 없으면 null. */
  childName: string | null;
  /** 다음 화면이 그려진 직후 말할 문장. 화면 전환을 음성 끝까지 기다리지 않게 한다. */
  announce: string | null;
  /** 개발용 테스트 모드 (npm run dev:test). 모든 묶음 열림, 부모 메뉴 한 번 눌러 열기. */
  testMode: boolean;
  /** 이름을 저장하고 childName을 갱신한다. */
  saveName(name: string): void;
}

export type Cleanup = () => void;

type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  children: Child[] = [],
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

export function button(
  content: Child | Child[],
  onClick: () => void,
  cls = '',
  attrs: Record<string, string> = {},
): HTMLButtonElement {
  const b = el('button', `btn ${cls}`.trim(), Array.isArray(content) ? content : [content], {
    type: 'button',
    ...attrs,
  });
  b.addEventListener('click', onClick);
  return b;
}

/** 화면 위쪽 아이콘 버튼 줄: 🏠, 세계가 주어지면 ⬅(세계로), 그리고 덧붙일 것들. */
export function topBar(world: WorldId | null, ...extra: HTMLElement[]): HTMLElement {
  const items = [button('🏠', () => go({ name: 'home' }), 'icon-btn', { 'aria-label': '처음으로' })];
  if (world) items.push(button('⬅', () => go({ name: 'world', world }), 'icon-btn', { 'aria-label': '뒤로' }));
  return el('nav', 'topbar', [...items, ...extra]);
}

/** 한 번만 흔들기. 연속으로 눌러도 애니메이션을 다시 시작한다. */
export function shake(node: HTMLElement): void {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

/** 마지막 글자가 받침 있는 한글 음절인지. */
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 목적격 조사 을/를을 붙인다. */
export function objectJosa(word: string): string {
  return `${word}${hasBatchim(word) ? '을' : '를'}`;
}

/** 부르는 말: 받침 있으면 "아", 없으면 "야" (한글이 아니면 그대로). */
export function callName(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return name;
  return `${name}${hasBatchim(name) ? '아' : '야'}`;
}

export function say(deps: ScreenDeps, text: string, lang: 'ko-KR' | 'en-US' = 'ko-KR'): Promise<void> {
  return Promise.resolve(deps.speak(text, { lang, volume: deps.progress.volume }));
}

/** 정리 함수가 한꺼번에 지울 수 있는 setTimeout 모음. */
export function timers() {
  const ids = new Set<ReturnType<typeof setTimeout>>();
  return {
    after(ms: number, fn: () => void) {
      const id = setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    },
    clear() {
      ids.forEach(clearTimeout);
      ids.clear();
    },
  };
}
