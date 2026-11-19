import type { FriendKind } from './state';

export type CareKind = 'eat' | 'wash' | 'play';

export interface FriendInfo {
  kind: FriendKind;
  icon: string;
  name: string;
  stageNames: [string, string, string, string];
  hello: string;
  care: Record<CareKind, { icon: string; label: string; line: string }>;
  pet: { line: string };
}

export const FRIENDS: Record<FriendKind, FriendInfo> = {
  dog: {
    kind: 'dog', icon: '🐶', name: '강아지', stageNames: ['아기', '꼬마', '어린이', '다 자람'],
    hello: '멍멍! 반가워!',
    care: {
      eat: { icon: '🍖', label: '밥', line: '냠냠! 맛있어!' },
      wash: { icon: '🫧', label: '목욕', line: '뽀득뽀득!' },
      play: { icon: '⚽', label: '놀기', line: '신난다!' },
    },
    pet: { line: '헤헤, 좋아!' },
  },
  cat: {
    kind: 'cat', icon: '🐱', name: '고양이', stageNames: ['아기', '꼬마', '어린이', '다 자람'],
    hello: '야옹! 반가워!',
    care: {
      eat: { icon: '🐟', label: '밥', line: '냠냠! 야옹~' },
      wash: { icon: '🫧', label: '목욕', line: '뽀득뽀득!' },
      play: { icon: '🧶', label: '놀기', line: '야옹! 잡았다!' },
    },
    pet: { line: '가르릉~' },
  },
  chick: {
    kind: 'chick', icon: '🐥', name: '병아리', stageNames: ['알', '아기 병아리', '병아리', '닭'],
    hello: '삐약! 반가워!',
    care: {
      eat: { icon: '🌽', label: '모이', line: '콕콕! 삐약!' },
      wash: { icon: '🫧', label: '목욕', line: '보송보송!' },
      play: { icon: '🎵', label: '노래', line: '랄랄라~' },
    },
    pet: { line: '삐약삐약!' },
  },
  tree: {
    kind: 'tree', icon: '🌳', name: '나무', stageNames: ['씨앗', '새싹', '어린 나무', '큰 나무'],
    hello: '안녕! 반가워!',
    care: {
      eat: { icon: '💧', label: '물', line: '꿀꺽꿀꺽! 시원해!' },
      wash: { icon: '☀️', label: '햇빛', line: '따뜻해!' },
      play: { icon: '🦋', label: '나비', line: '나비야 안녕!' },
    },
    pet: { line: '간지러워!' },
  },
};

export const FRIEND_ORDER: FriendKind[] = ['dog', 'cat', 'chick', 'tree'];
