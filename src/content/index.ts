import { alphabet } from './alphabet';
import { hangul } from './hangul';
import { numbers } from './numbers';
import type { World, WorldId } from './types';

export type { Group, LearnItem, World, WorldId } from './types';

const worlds: Record<WorldId, World> = { hangul, numbers, abc: alphabet };

export function getWorld(id: WorldId): World {
  return worlds[id];
}
