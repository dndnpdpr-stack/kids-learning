import { drawFriend } from '../pets/art';
import type { CareKind } from '../pets/friends';
import type { FriendKind, Stage } from '../pets/state';
import type { timers } from './dom';

type Timers = ReturnType<typeof timers>;

/** 친구 그림 SVG 요소. */
export function petNode(kind: FriendKind, stage: Stage): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = drawFriend(kind, stage).trim();
  return tpl.content.firstElementChild as SVGSVGElement;
}

const BUBBLE_MS = 1500;
const SPARKS = 10;

export interface PetFx {
  /** 그림을 (다시) 그린다. 자는 중이면 자는 모습을 유지한다. */
  draw(stage: Stage): void;
  /** 말풍선 */
  bubble(text: string): void;
  /** 밥/목욕(햇빛)/놀기 연출. onLine은 대사를 말할 때 부른다. */
  care(act: CareKind, icon: string, onLine: () => void): void;
  /** 쓰다듬기 연출 */
  pet(): void;
  /** 잠자기 켜고 끄기. 켜졌으면 true. */
  toggleSleep(): boolean;
  wake(): void;
  /** 자라기 반짝이 */
  sparkle(): void;
  /** 자란 직후 그림 반응 */
  grownPop(): void;
}

/**
 * 미리보기(pet-preview.html)의 연출을 그대로 옮긴 것.
 * stage는 position:relative 상자이고, 모든 타이머는 t에 넣어 화면을 떠날 때 함께 지운다.
 */
export function petFx(stage: HTMLElement, t: Timers, kind: FriendKind, rand: () => number): PetFx {
  let sleeping = false;
  let say: HTMLElement | null = null;
  const pet = () => stage.querySelector<SVGSVGElement>('svg.pet');

  const fx = (cls: string, text: string, left: number, top: number, delay = 0, life = 1900, vars: Record<string, string> = {}) => {
    t.after(delay, () => {
      const e = document.createElement('div');
      e.className = `pet-fx ${cls}`;
      e.textContent = text;
      e.style.left = `${left}%`;
      e.style.top = `${top}%`;
      for (const [k, v] of Object.entries(vars)) e.style.setProperty(k, v);
      stage.append(e);
      t.after(life, () => e.remove());
    });
  };

  const mood = (cls: string, ms: number) => {
    pet()?.classList.add(cls);
    t.after(ms, () => pet()?.classList.remove(cls));
  };

  const wake = () => {
    if (!sleeping) return;
    sleeping = false;
    pet()?.classList.remove('sleeping');
  };

  return {
    draw(s) {
      pet()?.remove();
      const node = petNode(kind, s);
      if (sleeping) node.classList.add('sleeping');
      stage.prepend(node);
    },
    bubble(text) {
      say?.remove();
      const b = document.createElement('div');
      b.className = 'pet-say';
      b.textContent = text;
      stage.append(b);
      say = b;
      t.after(BUBBLE_MS, () => b.remove());
    },
    care(act, icon, onLine) {
      wake();
      if (act === 'eat') {
        fx('food', icon, 46, 40, 0, 750);
        t.after(600, () => {
          mood('eating', 1300);
          onLine();
        });
        t.after(1900, () => mood('happy', 1200));
      } else if (act === 'wash') {
        if (kind === 'tree') {
          fx('sun', icon, 70, 6, 0, 1850);
          for (let k = 0; k < 6; k++) fx('float', '✨', 25 + rand() * 50, 30 + rand() * 30, 300 + k * 160, 1600);
          mood('happy', 1800);
        } else {
          mood('shaking', 1000);
          for (let k = 0; k < 9; k++) fx('float', '🫧', 20 + rand() * 60, 45 + rand() * 25, k * 140, 1700);
          t.after(1100, () => mood('happy', 1000));
        }
        onLine();
      } else {
        if (kind === 'chick') {
          for (let k = 0; k < 4; k++) fx('float', ['🎵', '🎶'][k % 2], 30 + k * 12, 30, k * 220, 1600);
        } else {
          fx('cross', icon, 50, kind === 'tree' ? 30 : 70, 0, 1250);
        }
        t.after(250, () => {
          mood('jumping', 1150);
          mood('happy', 1400);
        });
        onLine();
      }
    },
    pet() {
      wake();
      mood('happy', 2000);
      for (let k = 0; k < 6; k++) fx('float', ['❤️', '💕', '💖'][k % 3], 30 + rand() * 40, 35 + rand() * 15, k * 180, 1600);
    },
    toggleSleep() {
      sleeping = !sleeping;
      pet()?.classList.toggle('sleeping', sleeping);
      if (sleeping) for (let k = 0; k < 3; k++) fx('zzz', 'Z', 60, 30, k * 600, 2300);
      return sleeping;
    },
    wake,
    sparkle() {
      for (let k = 0; k < SPARKS; k++) {
        const a = (k / SPARKS) * Math.PI * 2;
        fx('spark', '✨', 46, 45, 0, 950, { '--dx': `${Math.cos(a) * 160}%`, '--dy': `${Math.sin(a) * 160}%` });
      }
    },
    grownPop() {
      mood('growing', 800);
      mood('happy', 1800);
    },
  };
}
