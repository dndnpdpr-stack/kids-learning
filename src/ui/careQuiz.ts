import type { CareQuiz } from '../pets/careQuiz';
import { CELEBRATE_SMALL_MS, celebrate } from './celebrate';
import { button, el, objectJosa, say, shake, timers, type ScreenDeps } from './dom';
import { renderNumberQuestion } from './numbers';

export const QUIZ_INTRO = '문제를 맞히면 바로 해 줄게!';

/**
 * 친구 화면 위에 퀴즈 한 문제를 띄운다. 맞히면 칭찬 뒤 닫고 onSolved, ✖를 누르면 닫고 onClose.
 * 틀리면 흔들고 같은 문제를 다시 읽어 준다. 반환 함수는 콜백 없이 조용히 치운다 (화면을 떠날 때).
 */
export function openCareQuiz(
  host: HTMLElement,
  deps: ScreenDeps,
  quiz: CareQuiz,
  opts: { face: string; onSolved: () => void; onClose: () => void },
): () => void {
  const t = timers();
  let done = false;
  let seq = 0;
  let stopCelebrate: () => void = () => {};

  const prompt = (): Promise<void> => {
    if (quiz.type === 'number') return say(deps, quiz.q.prompt);
    const target = quiz.q.target;
    if (target.lang === 'en-US') return say(deps, target.name, 'en-US').then(() => say(deps, '찾아봐!'));
    return say(deps, `${objectJosa(target.name)} 찾아봐!`);
  };
  /** 앞선 말이 끝나면 이어서 말한다. 그사이 다른 말이 시작됐거나 창이 닫혔으면 그만둔다. */
  const speakThen = (first: Promise<void>, next: () => Promise<void>) => {
    const s = ++seq;
    void first.then(() => (!done && s === seq ? next() : undefined));
  };
  const replay = () => {
    seq++;
    void prompt();
  };

  const dispose = () => {
    done = true;
    t.clear();
    stopCelebrate();
    layer.remove();
  };

  function answer(ok: boolean, node: HTMLElement) {
    if (done) return;
    if (!ok) {
      shake(node);
      speakThen(say(deps, '다시 들어볼까?'), prompt);
      return;
    }
    done = true;
    seq++;
    node.classList.add('correct');
    stopCelebrate = celebrate(panel);
    void say(deps, '맞았어!');
    t.after(CELEBRATE_SMALL_MS, () => {
      dispose();
      opts.onSolved();
    });
  }

  const question =
    quiz.type === 'number'
      ? renderNumberQuestion(quiz.q, (choice, node) => answer(choice === quiz.q.answer, node))
      : el(
          'div',
          'choices',
          quiz.q.choices.map((c) => {
            const b = button(c.glyph, () => answer(c.id === quiz.q.target.id, b), 'choice-btn glyph-choice', {
              'data-choice': c.id,
            });
            return b;
          }),
        );

  const panel = el('div', `care-quiz-panel world-${quiz.world}`, [
    el('div', 'care-quiz-bar', [
      button('✖', () => {
        if (done) return;
        dispose();
        opts.onClose();
      }, 'icon-btn', { 'data-testid': 'quiz-close', 'aria-label': '닫기' }),
      el('span', 'care-quiz-face', [opts.face], { 'aria-hidden': 'true' }),
      button('🔊', () => !done && replay(), 'icon-btn', { 'aria-label': '다시 듣기' }),
    ]),
    el('div', 'find-stage', [question]),
  ]);
  const layer = el('div', 'care-quiz', [panel], { role: 'dialog', 'aria-label': '퀴즈' });
  host.append(layer);

  speakThen(say(deps, QUIZ_INTRO), prompt);
  return dispose;
}
