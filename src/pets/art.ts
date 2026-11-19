import type { FriendKind } from './state';

type Stage = 0 | 1 | 2 | 3;

/* ===== 공통 얼굴 부품: 눈(뜬/웃는/자는), 볼, 입(닫힌/벌린) ===== */
function eyes(cx: number, y: number, dx: number, r: number): string {
  return `
    <g class="eyes-open">
      <ellipse cx="${cx - dx}" cy="${y}" rx="${r * 0.75}" ry="${r}" fill="var(--nose)"/>
      <ellipse cx="${cx + dx}" cy="${y}" rx="${r * 0.75}" ry="${r}" fill="var(--nose)"/>
      <circle cx="${cx - dx + r * 0.3}" cy="${y - r * 0.4}" r="${r * 0.3}" fill="#fff"/>
      <circle cx="${cx + dx + r * 0.3}" cy="${y - r * 0.4}" r="${r * 0.3}" fill="#fff"/>
    </g>
    <g class="eyes-happy" fill="none" stroke="var(--nose)" stroke-width="${Math.max(2.4, r * 0.5)}" stroke-linecap="round">
      <path d="M${cx - dx - r} ${y + r * 0.3} q ${r} ${-r * 1.4} ${r * 2} 0"/>
      <path d="M${cx + dx - r} ${y + r * 0.3} q ${r} ${-r * 1.4} ${r * 2} 0"/>
    </g>
    <g class="eyes-sleep" fill="none" stroke="var(--nose)" stroke-width="${Math.max(2.2, r * 0.45)}" stroke-linecap="round">
      <path d="M${cx - dx - r} ${y} q ${r} ${r * 0.8} ${r * 2} 0"/>
      <path d="M${cx + dx - r} ${y} q ${r} ${r * 0.8} ${r * 2} 0"/>
    </g>`;
}
const cheeks = (cx: number, y: number, dx: number, r: number): string => `
  <circle cx="${cx - dx}" cy="${y}" r="${r}" fill="var(--pink)" opacity=".5"/>
  <circle cx="${cx + dx}" cy="${y}" r="${r}" fill="var(--pink)" opacity=".5"/>`;
const wMouth = (cx: number, y: number, w: number): string => `
  <path class="mouth-closed" d="M${cx - w} ${y} q ${w / 2} ${w * 0.55} ${w} 0 q ${w / 2} ${w * 0.55} ${w} 0" fill="none" stroke="var(--nose)" stroke-width="2.6" stroke-linecap="round"/>`;
const smile = (cx: number, y: number, w: number): string => `
  <path class="mouth-closed" d="M${cx - w} ${y} q ${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="var(--nose)" stroke-width="2.6" stroke-linecap="round"/>`;
const openMouth = (cx: number, y: number, rx: number, ry: number): string => `
  <g class="mouth-open">
    <ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="#7a2e3a"/>
    <ellipse cx="${cx}" cy="${y + ry * 0.45}" rx="${rx * 0.6}" ry="${ry * 0.45}" fill="var(--pink)"/>
  </g>`;
const crown = (x: number, y: number): string => `
  <g transform="translate(${x}, ${y})">
    <path d="M-16 6 L-16 -8 L-8 0 L0 -12 L8 0 L16 -8 L16 6 Z" fill="#ffd166" stroke="#e0a800" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="0" cy="-12" r="2.6" fill="#ff6b8b"/>
  </g>`;
const shadow = (cx: number, y: number, rx: number): string => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="6" fill="rgba(74,64,99,.10)"/>`;
const svgWrap = (kind: FriendKind, label: string, inner: string): string =>
  `<svg class="pet ${kind}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="${label}">${inner}</svg>`;

/* 네 발 동물(강아지/고양이) 공통 몸 치수 */
interface QuadSize { scale: number; head: number; bodyRx: number; bodyRy: number; ear: number; leg: number }
const QUAD: QuadSize[] = [
  { scale: 0.62, head: 40, bodyRx: 26, bodyRy: 20, ear: 0.9, leg: 9 },
  { scale: 0.76, head: 39, bodyRx: 31, bodyRy: 24, ear: 1.0, leg: 12 },
  { scale: 0.89, head: 37, bodyRx: 37, bodyRy: 28, ear: 1.1, leg: 15 },
  { scale: 1.0, head: 35, bodyRx: 43, bodyRy: 31, ear: 1.2, leg: 18 },
];
type PatchFn = (cx: number, cy: number, s: QuadSize) => string;
function quadBody(i: Stage, fur: string, belly: string, patch: PatchFn) {
  const s = QUAD[i], cx = 100, ground = 176;
  const legTop = ground - s.leg, bodyCy = legTop - s.bodyRy * 0.35, bodyTop = bodyCy - s.bodyRy;
  const H = s.head, hy = bodyTop - H * 0.35;
  const body = `
    <g class="body-g">
      <rect x="${cx - s.bodyRx * 0.62}" y="${legTop - 4}" width="13" height="${s.leg + 4}" rx="6.5" fill="${fur}"/>
      <rect x="${cx + s.bodyRx * 0.62 - 13}" y="${legTop - 4}" width="13" height="${s.leg + 4}" rx="6.5" fill="${fur}"/>
      <ellipse cx="${cx}" cy="${bodyCy}" rx="${s.bodyRx}" ry="${s.bodyRy}" fill="${fur}"/>
      <ellipse cx="${cx}" cy="${bodyCy + s.bodyRy * 0.25}" rx="${s.bodyRx * 0.55}" ry="${s.bodyRy * 0.6}" fill="${belly}"/>
      <ellipse cx="${cx - s.bodyRx * 0.55}" cy="${ground - 1}" rx="9" ry="5" fill="${belly}"/>
      <ellipse cx="${cx + s.bodyRx * 0.55}" cy="${ground - 1}" rx="9" ry="5" fill="${belly}"/>
      ${patch(cx, bodyCy, s)}
    </g>`;
  return { s, cx, ground, bodyCy, H, hy, body, tailX: cx + s.bodyRx * 0.85, tailY: bodyCy - s.bodyRy * 0.35 };
}

/* ===== 강아지 ===== */
function dog(i: Stage): string {
  const fur = '#f6dcae', dark = '#c98b5a', belly = '#fff1d6';
  const q = quadBody(i, fur, belly, (cx, cy, s) =>
    `<ellipse cx="${cx + s.bodyRx * 0.35}" cy="${cy - s.bodyRy * 0.45}" rx="${s.bodyRx * 0.28}" ry="${s.bodyRy * 0.3}" fill="${dark}" opacity=".55"/>`);
  const { s, cx, ground, H, hy } = q;
  const eyeY = hy + 2, earW = H * 0.42 * s.ear, earH = H * 0.78 * s.ear;
  const bone = i === 1 ? `
    <g transform="translate(${cx + s.bodyRx + 14}, ${ground - 6}) rotate(-12)" fill="#fffaf0" stroke="#e2d3b8" stroke-width="1.5">
      <rect x="-14" y="-3.5" width="28" height="7" rx="3.5"/>
      <circle cx="-14" cy="-4" r="5"/><circle cx="-14" cy="4" r="5"/><circle cx="14" cy="-4" r="5"/><circle cx="14" cy="4" r="5"/>
    </g>` : '';
  const collar = i >= 2 ? `
    <path d="M${cx - H * 0.62} ${hy + H * 0.78} Q ${cx} ${hy + H * 1.05} ${cx + H * 0.62} ${hy + H * 0.78}" fill="none" stroke="#ff6b8b" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${hy + H * 0.98}" r="6" fill="#ffd166" stroke="#e0a800" stroke-width="1.5"/>` : '';
  return svgWrap('dog', '강아지', `
    ${shadow(cx, ground + 4, s.bodyRx * s.scale + 18)}
    <g class="whole" transform="translate(${cx} ${ground}) scale(${s.scale}) translate(${-cx} ${-ground})">
      <g class="tail"><path d="M${q.tailX} ${q.tailY} q 14 -6 18 -22" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round"/></g>
      ${q.body}
      <g class="head-g">
        <g class="ear-l"><ellipse cx="${cx - H * 0.86}" cy="${hy - H * 0.1 + earH * 0.5}" rx="${earW}" ry="${earH * 0.5}" fill="${dark}" transform="rotate(18 ${cx - H * 0.86} ${hy - H * 0.1})"/></g>
        <g class="ear-r"><ellipse cx="${cx + H * 0.86}" cy="${hy - H * 0.1 + earH * 0.5}" rx="${earW}" ry="${earH * 0.5}" fill="${dark}" transform="rotate(-18 ${cx + H * 0.86} ${hy - H * 0.1})"/></g>
        <circle cx="${cx}" cy="${hy}" r="${H}" fill="${fur}"/>
        <ellipse cx="${cx + H * 0.4}" cy="${eyeY - 2}" rx="${H * 0.3}" ry="${H * 0.33}" fill="${dark}" opacity=".45"/>
        <ellipse cx="${cx}" cy="${hy + H * 0.42}" rx="${H * 0.46}" ry="${H * 0.34}" fill="${belly}"/>
        ${i === 3 ? crown(cx, hy - H * 0.98) : ''}
        ${eyes(cx, eyeY, H * 0.4, H * 0.16)}
        ${cheeks(cx, hy + H * 0.28, H * 0.62, H * 0.13)}
        <ellipse cx="${cx}" cy="${hy + H * 0.3}" rx="${H * 0.14}" ry="${H * 0.1}" fill="var(--nose)"/>
        ${wMouth(cx, hy + H * 0.48, 9)}
        ${openMouth(cx, hy + H * 0.55, H * 0.2, H * 0.17)}
        ${collar}
      </g>
      ${bone}
    </g>`);
}

/* ===== 고양이 ===== */
function cat(i: Stage): string {
  const fur = '#ffcf9e', dark = '#f0a35e', belly = '#fff4e6';
  const q = quadBody(i, fur, belly, (cx, cy, s) => [-0.25, 0, 0.25].map((d) =>
    `<path d="M${cx + s.bodyRx * d - 5} ${cy - s.bodyRy * 0.95} q 5 6 10 0" fill="none" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>`).join(''));
  const { s, cx, ground, H, hy } = q;
  const eyeY = hy + 2, e = 1 + (s.ear - 1) * 0.6;
  const ear = (side: number): string => {
    const x0 = cx + side * H * 0.92, x1 = cx + side * H * 0.62, x2 = cx + side * H * 0.18;
    const yb = hy - H * 0.35, yt = hy - H * 1.18 * e;
    return `<g class="${side < 0 ? 'ear-l' : 'ear-r'}">
      <path d="M${x0} ${yb} L${x1} ${yt} L${x2} ${hy - H * 0.82} Z" fill="${fur}" stroke="${fur}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M${cx + side * H * 0.8} ${yb - 4} L${x1} ${yt + 12} L${cx + side * H * 0.32} ${hy - H * 0.8} Z" fill="var(--pink)" opacity=".7"/>
    </g>`;
  };
  const whiskers = [-1, 1].map((side) => [-4, 3].map((dy) =>
    `<path d="M${cx + side * H * 0.4} ${hy + H * 0.36 + dy} l ${side * H * 0.5} ${dy * 0.8}" stroke="${dark}" stroke-width="2" stroke-linecap="round"/>`).join('')).join('');
  const yarn = i === 1 ? `
    <g transform="translate(${cx + s.bodyRx + 16}, ${ground - 9})">
      <circle r="10" fill="#b9a8ff"/>
      <path d="M-8 -4 q 8 6 16 0 M-9 3 q 9 6 18 0 M-3 -9 q 6 9 2 18" fill="none" stroke="#8b78e6" stroke-width="1.6"/>
      <path d="M10 2 q 10 4 14 -2" fill="none" stroke="#8b78e6" stroke-width="1.6"/>
    </g>` : '';
  const bell = i >= 2 ? `
    <path d="M${cx - H * 0.62} ${hy + H * 0.8} Q ${cx} ${hy + H * 1.05} ${cx + H * 0.62} ${hy + H * 0.8}" fill="none" stroke="#5aa9ff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${hy + H * 1.0}" r="6.5" fill="#ffd166" stroke="#e0a800" stroke-width="1.5"/>
    <path d="M${cx - 3} ${hy + H * 1.0 + 1} h 6" stroke="#e0a800" stroke-width="1.5"/>` : '';
  return svgWrap('cat', '고양이', `
    ${shadow(cx, ground + 4, s.bodyRx * s.scale + 18)}
    <g class="whole" transform="translate(${cx} ${ground}) scale(${s.scale}) translate(${-cx} ${-ground})">
      <g class="tail"><path d="M${q.tailX} ${q.tailY + 6} c 22 -4 26 -30 12 -46" fill="none" stroke="${fur}" stroke-width="9" stroke-linecap="round"/>
        <path d="M${q.tailX + 33} ${q.tailY - 25} l -3 -8" stroke="${dark}" stroke-width="9" stroke-linecap="round"/></g>
      ${q.body}
      <g class="head-g">
        ${ear(-1)}${ear(1)}
        <ellipse cx="${cx}" cy="${hy}" rx="${H * 1.05}" ry="${H * 0.95}" fill="${fur}"/>
        ${[-0.3, 0, 0.3].map((d) => `<path d="M${cx + H * d} ${hy - H * 0.9} v ${H * 0.25}" stroke="${dark}" stroke-width="3.5" stroke-linecap="round"/>`).join('')}
        <ellipse cx="${cx}" cy="${hy + H * 0.42}" rx="${H * 0.4}" ry="${H * 0.28}" fill="${belly}"/>
        ${i === 3 ? crown(cx, hy - H * 1.05) : ''}
        ${eyes(cx, eyeY, H * 0.42, H * 0.17)}
        ${cheeks(cx, hy + H * 0.3, H * 0.66, H * 0.12)}
        ${whiskers}
        <path d="M${cx - 5} ${hy + H * 0.25} h 10 l -5 6 z" fill="#ff7a9a" stroke="#ff7a9a" stroke-width="2" stroke-linejoin="round"/>
        ${wMouth(cx, hy + H * 0.45, 8)}
        ${openMouth(cx, hy + H * 0.52, H * 0.18, H * 0.15)}
        ${bell}
      </g>
      ${yarn}
    </g>`);
}

/* ===== 병아리 (알 → 아기 병아리 → 병아리 → 닭) ===== */
function chick(i: Stage): string {
  const cx = 100, ground = 176, yel = '#ffe066', yelDark = '#f5c400', beak = '#ff9f43';
  if (i === 0) {
    const ey = 132;
    return svgWrap('chick', '알', `
      ${shadow(cx, ground + 4, 34)}
      <g class="whole">
        <g class="body-g">
          <ellipse cx="${cx}" cy="${ground - 40}" rx="33" ry="41" fill="#fffaf0" stroke="#efe4cf" stroke-width="2"/>
          <path d="M${cx - 30} ${ground - 50} l 10 -8 l 10 8 l 10 -8 l 10 8 l 10 -8 l 10 8" fill="none" stroke="#e2d3b8" stroke-width="2.5" stroke-linejoin="round"/>
          <ellipse cx="${cx + 14}" cy="${ground - 66}" rx="6" ry="4" fill="#fff" opacity=".8"/>
        </g>
        <g class="head-g">
          <path d="M${cx - 4} ${ground - 82} q 2 -10 6 -2 q 3 -8 5 2" fill="${yel}" stroke="${yelDark}" stroke-width="1.5"/>
          ${eyes(cx, ey, 11, 4.5)}
          ${cheeks(cx, ey + 8, 18, 4)}
          ${smile(cx, ey + 10, 5)}
          ${openMouth(cx, ey + 13, 5, 4)}
        </g>
      </g>`);
  }
  const R = [0, 30, 37, 44][i], bodyCy = ground - 8 - R, scale = 1;
  const hy = bodyCy - R * 0.2, ey = hy - R * 0.12;
  const shell = i === 1 ? `
    <path d="M${cx - R - 4} ${bodyCy + R * 0.25} l 9 -9 l 9 9 l 9 -9 l 9 9 l 9 -9 l 9 9 l 9 -9 l ${R * 2 + 8 - 72} 9
             L ${cx + R + 4} ${ground - 2} Q ${cx} ${ground + 6} ${cx - R - 4} ${ground - 2} Z" fill="#fffaf0" stroke="#e2d3b8" stroke-width="2" stroke-linejoin="round"/>` : '';
  const comb = i === 3 ? `
    <path d="M${cx - 12} ${bodyCy - R + 4} q -2 -14 8 -10 q 2 -12 10 -2 q 8 -8 8 6 z" fill="#ff5a6e"/>
    <ellipse cx="${cx}" cy="${hy + R * 0.42}" rx="5" ry="7" fill="#ff5a6e"/>` : `
    <path d="M${cx - 3} ${bodyCy - R + 2} q 0 -12 6 -4 q 4 -10 6 2" fill="${yel}" stroke="${yelDark}" stroke-width="1.5"/>`;
  const feet = [-1, 1].map((sd) => `
    <path d="M${cx + sd * R * 0.35} ${ground - 8} v 8 m 0 0 l -6 4 m 6 -4 l 0 6 m 0 -6 l 6 4" fill="none" stroke="${beak}" stroke-width="3" stroke-linecap="round"/>`).join('');
  const wing = (sd: number): string => `
    <g class="${sd < 0 ? 'wing-l' : 'wing-r'}">
      <ellipse cx="${cx + sd * R * 0.92}" cy="${bodyCy + R * 0.15}" rx="${R * 0.28}" ry="${R * 0.42}" fill="${yelDark}" transform="rotate(${sd * 20} ${cx + sd * R * 0.92} ${bodyCy + R * 0.15})"/>
    </g>`;
  return svgWrap('chick', ['', '아기 병아리', '병아리', '닭'][i], `
    ${shadow(cx, ground + 4, R + 6)}
    <g class="whole" transform="scale(${scale})">
      ${i === 3 ? `<g class="tail"><path d="M${cx + R * 0.8} ${bodyCy - R * 0.3} q 18 -14 14 -30 M${cx + R * 0.85} ${bodyCy - R * 0.1} q 22 -8 22 -24" fill="none" stroke="#ff9f43" stroke-width="6" stroke-linecap="round"/></g>` : `<g class="tail"><path d="M${cx + R * 0.9} ${bodyCy + R * 0.1} l 10 -6 l -2 10 z" fill="${yelDark}"/></g>`}
      ${feet}
      <g class="body-g">
        ${wing(-1)}${wing(1)}
        <circle cx="${cx}" cy="${bodyCy}" r="${R}" fill="${yel}"/>
        <ellipse cx="${cx}" cy="${bodyCy + R * 0.45}" rx="${R * 0.55}" ry="${R * 0.35}" fill="#fff3a6"/>
      </g>
      <g class="head-g">
        ${comb}
        ${i === 3 ? crown(cx + R * 0.05, bodyCy - R - 14) : ''}
        ${eyes(cx, ey, R * 0.36, Math.max(4, R * 0.13))}
        ${cheeks(cx, ey + R * 0.25, R * 0.58, R * 0.11)}
        <path class="mouth-closed" d="M${cx - 7} ${ey + R * 0.2} L${cx + 7} ${ey + R * 0.2} L${cx} ${ey + R * 0.2 + 9} Z" fill="${beak}" stroke="${beak}" stroke-width="2" stroke-linejoin="round"/>
        <g class="mouth-open">
          <path d="M${cx - 8} ${ey + R * 0.16} L${cx + 8} ${ey + R * 0.16} L${cx} ${ey + R * 0.16 - 6} Z" fill="${beak}" stroke="${beak}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M${cx - 7} ${ey + R * 0.28} L${cx + 7} ${ey + R * 0.28} L${cx} ${ey + R * 0.28 + 8} Z" fill="${beak}" stroke="${beak}" stroke-width="2" stroke-linejoin="round"/>
        </g>
      </g>
      ${shell}
    </g>`);
}

/* ===== 나무 (씨앗 → 새싹 → 어린 나무 → 큰 나무) ===== */
function tree(i: Stage): string {
  const cx = 100, ground = 176, leaf = '#7bd389', leafDark = '#4fb36a', bark = '#b07a4f';
  const soil = `<ellipse cx="${cx}" cy="${ground}" rx="56" ry="12" fill="#c99a6b"/><ellipse cx="${cx}" cy="${ground - 3}" rx="48" ry="7" fill="#d9ad7f"/>`;
  if (i === 0) {
    const sy = ground - 18;
    return svgWrap('tree', '씨앗', `
      <g class="whole">
        ${soil}
        <g class="body-g">
          <ellipse cx="${cx}" cy="${sy}" rx="24" ry="20" fill="#c98b5a"/>
          <ellipse cx="${cx - 8}" cy="${sy - 9}" rx="6" ry="4" fill="#e0aa7a"/>
        </g>
        <g class="head-g">
          <g class="ear-r"><path d="M${cx} ${sy - 20} q 2 -14 14 -16 q -2 12 -14 16" fill="${leaf}" stroke="${leafDark}" stroke-width="1.5"/></g>
          ${eyes(cx, sy - 2, 9, 3.8)}
          ${cheeks(cx, sy + 6, 15, 3.5)}
          ${smile(cx, sy + 8, 4.5)}
          ${openMouth(cx, sy + 10, 4.5, 3.6)}
        </g>
      </g>`);
  }
  const C = [0, 26, 40, 52][i];                    // 잎 덩어리(머리) 반지름
  const trunkH = [0, 26, 44, 56][i], trunkW = [0, 6, 14, 22][i];
  const hy = ground - 6 - trunkH - C * 0.7;
  const trunk = i === 1
    ? `<path d="M${cx} ${ground - 4} q -3 ${-trunkH / 2} 0 ${-trunkH - 4}" fill="none" stroke="${leafDark}" stroke-width="6" stroke-linecap="round"/>`
    : `<path d="M${cx - trunkW / 2} ${ground - 4} q 2 ${-trunkH / 2} ${trunkW * 0.15} ${-trunkH - 6} h ${trunkW * 0.7} q 0 ${trunkH / 2} ${trunkW * 0.15} ${trunkH + 6} z" fill="${bark}"/>
       <path d="M${cx - trunkW * 0.15} ${ground - trunkH * 0.5} q 4 -4 2 -10" fill="none" stroke="#8a5a36" stroke-width="2" stroke-linecap="round"/>`;
  const puffs = i === 1
    ? `<g class="ear-l"><ellipse cx="${cx - C * 0.95}" cy="${hy + C * 0.15}" rx="${C * 0.55}" ry="${C * 0.32}" fill="${leaf}" stroke="${leafDark}" stroke-width="1.5" transform="rotate(-25 ${cx - C * 0.95} ${hy + C * 0.15})"/></g>
       <g class="ear-r"><ellipse cx="${cx + C * 0.95}" cy="${hy + C * 0.15}" rx="${C * 0.55}" ry="${C * 0.32}" fill="${leaf}" stroke="${leafDark}" stroke-width="1.5" transform="rotate(25 ${cx + C * 0.95} ${hy + C * 0.15})"/></g>`
    : `<g class="ear-l"><circle cx="${cx - C * 0.78}" cy="${hy + C * 0.25}" r="${C * 0.55}" fill="${leafDark}"/></g>
       <g class="ear-r"><circle cx="${cx + C * 0.78}" cy="${hy + C * 0.25}" r="${C * 0.55}" fill="${leafDark}"/></g>
       <circle cx="${cx - C * 0.35}" cy="${hy - C * 0.62}" r="${C * 0.5}" fill="${leaf}"/>
       <circle cx="${cx + C * 0.4}" cy="${hy - C * 0.58}" r="${C * 0.48}" fill="${leaf}"/>`;
  const fruits = i === 3 ? [[-0.75, 0.35], [0.7, 0.45], [-0.3, -0.75], [0.55, -0.55], [0.05, 0.75]].map(([dx, dy]) =>
    `<circle cx="${cx + C * dx}" cy="${hy + C * dy}" r="6" fill="#ff5a6e"/><path d="M${cx + C * dx} ${hy + C * dy - 6} l 2 -4" stroke="#8a5a36" stroke-width="1.5"/>`).join('')
    + [[-0.95, -0.2], [0.95, -0.05]].map(([dx, dy]) => `<circle cx="${cx + C * dx}" cy="${hy + C * dy}" r="5" fill="#ffc2d6"/><circle cx="${cx + C * dx}" cy="${hy + C * dy}" r="2" fill="#ffd166"/>`).join('')
    : '';
  const flower = i === 2 ? `<circle cx="${cx + C * 0.72}" cy="${hy - C * 0.35}" r="5" fill="#ffc2d6"/><circle cx="${cx + C * 0.72}" cy="${hy - C * 0.35}" r="2" fill="#ffd166"/>` : '';
  return svgWrap('tree', ['', '새싹', '어린 나무', '큰 나무'][i], `
    <g class="whole">
      ${soil}
      <g class="body-g">${trunk}</g>
      <g class="head-g">
        ${puffs}
        <circle cx="${cx}" cy="${hy}" r="${C}" fill="${leaf}"/>
        ${fruits}${flower}
        ${eyes(cx, hy, C * 0.36, Math.max(3.8, C * 0.12))}
        ${cheeks(cx, hy + C * 0.25, C * 0.58, C * 0.11)}
        ${smile(cx, hy + C * 0.3, Math.max(4.5, C * 0.14))}
        ${openMouth(cx, hy + C * 0.36, Math.max(4.5, C * 0.16), Math.max(3.6, C * 0.13))}
      </g>
    </g>`);
}

const DRAW: Record<FriendKind, (i: Stage) => string> = { dog, cat, chick, tree };

export function drawFriend(kind: FriendKind, stage: Stage): string {
  return DRAW[kind](stage);
}
