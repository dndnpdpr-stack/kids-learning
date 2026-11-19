import { getWorld, type WorldId } from './content';

export type Activity = 'meet' | 'find' | 'trace';

export type Route =
  | { name: 'home' }
  | { name: 'world'; world: WorldId }
  | { name: Activity; world: WorldId; group: string }
  | { name: 'parent' }
  | { name: 'setup' }
  | { name: 'friend' }
  | { name: 'friendPick' }
  | { name: 'friendRoom' };

const WORLDS: readonly WorldId[] = ['hangul', 'numbers', 'abc'];
const ACTIVITIES: readonly Activity[] = ['meet', 'find', 'trace'];

function isWorld(s: string | undefined): s is WorldId {
  return WORLDS.includes(s as WorldId);
}

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#?\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'parent') return { name: 'parent' };
  if (parts.length === 1 && parts[0] === 'setup') return { name: 'setup' };
  if (parts[0] === 'friend') {
    if (parts.length === 1) return { name: 'friend' };
    if (parts.length === 2 && parts[1] === 'pick') return { name: 'friendPick' };
    if (parts.length === 2 && parts[1] === 'room') return { name: 'friendRoom' };
    return { name: 'home' };
  }
  const [w, world, g, group, activity] = parts;
  if (w !== 'w' || !isWorld(world)) return { name: 'home' };
  if (parts.length === 2) return { name: 'world', world };
  if (
    parts.length === 5 &&
    g === 'g' &&
    ACTIVITIES.includes(activity as Activity) &&
    getWorld(world).groups.some((x) => x.id === group)
  ) {
    return { name: activity as Activity, world, group };
  }
  return { name: 'home' };
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'parent':
      return '#/parent';
    case 'setup':
      return '#/setup';
    case 'friend':
      return '#/friend';
    case 'friendPick':
      return '#/friend/pick';
    case 'friendRoom':
      return '#/friend/room';
    case 'world':
      return `#/w/${r.world}`;
    default:
      return `#/w/${r.world}/g/${r.group}/${r.name}`;
  }
}

let activeHandler: (() => void) | null = null;

export function go(r: Route): void {
  const hash = toHash(r);
  if (location.hash === hash) {
    // 주소가 같으면 hashchange가 오지 않는다(예: '#/'에서 이름 입력 후 홈으로). 직접 다시 그린다.
    activeHandler?.();
    return;
  }
  location.hash = hash;
}

/** 해시가 바뀔 때마다(그리고 처음 한 번) onRoute를 부른다. 리스너 해제 함수를 돌려준다. */
export function startRouter(onRoute: (r: Route) => void): () => void {
  const handler = () => onRoute(parseRoute(location.hash));
  activeHandler = handler;
  window.addEventListener('hashchange', handler);
  handler();
  return () => {
    window.removeEventListener('hashchange', handler);
    if (activeHandler === handler) activeHandler = null;
  };
}
