import type { ParkSpotId } from './play';

/**
 * 공원 숨바꼭질의 숨을 곳 그림 (직접 그린 SVG).
 * 숨은 친구(.peeker)는 이 그림 뒤에 깔리고, 그림이 몸 일부를 가린다. 어디가 보일지는 CSS(.spot-<id> .peeker)가 정한다.
 */
const TREE = `<svg viewBox="0 0 100 130" aria-hidden="true">
  <ellipse cx="50" cy="126" rx="34" ry="4" fill="rgba(60,90,40,.25)"/>
  <path d="M38 126 C40 104 40 90 37 72 L63 72 C60 90 60 104 62 126 Z" fill="#9a6a44"/>
  <path d="M45 120 C46 104 46 92 44 80" stroke="#7d5234" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M50 78 L36 62 M51 80 L66 64" stroke="#9a6a44" stroke-width="6" stroke-linecap="round"/>
  <circle cx="30" cy="52" r="22" fill="#5fb85a"/>
  <circle cx="70" cy="52" r="22" fill="#5fb85a"/>
  <circle cx="50" cy="34" r="27" fill="#6cc565"/>
  <circle cx="34" cy="30" r="15" fill="#7ad172"/>
  <circle cx="66" cy="66" r="16" fill="#58ad53"/>
  <circle cx="30" cy="70" r="13" fill="#58ad53"/>
  <circle cx="42" cy="22" r="5" fill="#a5e39b" opacity=".7"/>
  <circle cx="62" cy="40" r="4" fill="#ff7a7a"/><circle cx="36" cy="48" r="4" fill="#ff7a7a"/><circle cx="72" cy="58" r="3.5" fill="#ff7a7a"/>
</svg>`;

const SLIDE = `<svg viewBox="0 0 100 80" aria-hidden="true">
  <ellipse cx="55" cy="77" rx="44" ry="3" fill="rgba(60,90,40,.25)"/>
  <path d="M30 22 L92 74 L82 76 L24 28 Z" fill="#ffb347"/>
  <path d="M28 20 L94 72" stroke="#ff8f1f" stroke-width="3" stroke-linecap="round"/>
  <rect x="14" y="16" width="20" height="7" rx="2" fill="#4aa3df"/>
  <g stroke="#3b7fbf" stroke-width="4" stroke-linecap="round">
    <path d="M14 18 L10 78 M34 18 L32 78"/>
  </g>
  <g stroke="#6dbbea" stroke-width="3.5" stroke-linecap="round">
    <path d="M13 32 L33 32 M12 46 L33 46 M11 60 L32 60 M11 72 L32 72"/>
  </g>
  <path d="M12 16 L24 4 L36 16 Z" fill="#ff6b6b"/>
</svg>`;

const BENCH = `<svg viewBox="0 0 100 60" aria-hidden="true">
  <ellipse cx="50" cy="57" rx="46" ry="3" fill="rgba(60,90,40,.25)"/>
  <g fill="#c98b52">
    <rect x="6" y="4" width="88" height="7" rx="3"/>
    <rect x="6" y="13" width="88" height="7" rx="3"/>
    <rect x="2" y="26" width="96" height="8" rx="3"/>
  </g>
  <g fill="#555a6e">
    <rect x="12" y="20" width="5" height="8"/><rect x="83" y="20" width="5" height="8"/>
    <rect x="10" y="33" width="6" height="24" rx="2"/><rect x="84" y="33" width="6" height="24" rx="2"/>
  </g>
  <path d="M8 6 L92 6 M8 15 L92 15 M4 28 L96 28" stroke="#e0a56c" stroke-width="1.5"/>
</svg>`;

const BUSH = `<svg viewBox="0 0 100 60" aria-hidden="true">
  <ellipse cx="50" cy="57" rx="46" ry="3" fill="rgba(60,90,40,.25)"/>
  <circle cx="22" cy="38" r="18" fill="#4f9e4a"/>
  <circle cx="78" cy="38" r="18" fill="#4f9e4a"/>
  <circle cx="40" cy="28" r="20" fill="#5bb055"/>
  <circle cx="62" cy="26" r="20" fill="#63b95c"/>
  <rect x="8" y="36" width="84" height="22" rx="10" fill="#4f9e4a"/>
  <circle cx="34" cy="22" r="6" fill="#86d07c" opacity=".7"/>
  <circle cx="64" cy="18" r="5" fill="#86d07c" opacity=".7"/>
</svg>`;

const FLOWERS = `<svg viewBox="0 0 100 50" aria-hidden="true">
  <ellipse cx="50" cy="46" rx="48" ry="4" fill="#9a6a44" opacity=".55"/>
  <g fill="#4f9e4a">
    <path d="M6 46 C10 30 14 26 18 22 C18 32 16 40 14 46 Z"/>
    <path d="M26 46 C28 30 34 24 38 20 C38 32 34 40 32 46 Z"/>
    <path d="M50 46 C50 30 56 22 60 18 C60 30 58 40 56 46 Z"/>
    <path d="M70 46 C74 32 78 26 84 22 C82 34 80 40 78 46 Z"/>
    <path d="M88 46 C90 34 94 28 98 26 C96 36 94 42 94 46 Z"/>
    <rect x="2" y="34" width="96" height="12" rx="6"/>
  </g>
  <g>
    <circle cx="14" cy="22" r="6" fill="#ff7aa8"/><circle cx="14" cy="22" r="2.4" fill="#ffe066"/>
    <circle cx="34" cy="16" r="7" fill="#ffd23f"/><circle cx="34" cy="16" r="2.6" fill="#ff8f1f"/>
    <circle cx="58" cy="14" r="7" fill="#b28dff"/><circle cx="58" cy="14" r="2.6" fill="#ffe066"/>
    <circle cx="80" cy="20" r="6.5" fill="#ff6b6b"/><circle cx="80" cy="20" r="2.4" fill="#ffe066"/>
    <circle cx="94" cy="24" r="5" fill="#ff7aa8"/><circle cx="94" cy="24" r="2" fill="#ffe066"/>
  </g>
</svg>`;

const ART: Record<ParkSpotId, string> = { tree: TREE, slide: SLIDE, bench: BENCH, bush: BUSH, flowers: FLOWERS };

export function drawParkSpot(id: ParkSpotId): string {
  return ART[id];
}
