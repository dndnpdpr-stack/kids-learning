import { el } from './dom';

export const CELEBRATE_SMALL_MS = 900;
export const CELEBRATE_BIG_MS = 2200;

/**
 * 별이 터지는 축하 오버레이를 띄우고 시간이 지나면 스스로 사라진다.
 * 반환 함수로 미리 지울 수 있다. big이면 별이 더 많고 가운데에 마스코트가 뜬다.
 */
export function celebrate(host: HTMLElement, opts: { big?: boolean; mascot?: string } = {}): () => void {
  const count = opts.big ? 16 : 8;
  const layer = el('div', `celebrate${opts.big ? ' big' : ''}`, [], { 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    const star = el('span', 'burst-star', ['⭐']);
    star.style.setProperty('--angle', `${angle}deg`);
    star.style.setProperty('--delay', `${(i % 4) * 40}ms`);
    layer.append(star);
  }
  if (opts.big) layer.append(el('div', 'celebrate-mascot', [opts.mascot ?? '🎉']));
  host.append(layer);
  const id = setTimeout(() => layer.remove(), opts.big ? CELEBRATE_BIG_MS : CELEBRATE_SMALL_MS);
  return () => {
    clearTimeout(id);
    layer.remove();
  };
}
