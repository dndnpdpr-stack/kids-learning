/** 오래 누르기. ms 동안 계속 누르면 onDone을 한 번 부른다. 해제 함수를 돌려준다. */
export function attachLongPress(el: HTMLElement, ms: number, onDone: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activePointer: number | null = null;

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    activePointer = null;
    el.classList.remove('pressing');
  };

  const onDown = (e: PointerEvent) => {
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    el.style.setProperty('--press-ms', `${ms}ms`);
    el.classList.add('pressing');
    timer = setTimeout(() => {
      cancel();
      onDone();
    }, ms);
  };
  const onEnd = (e: PointerEvent) => {
    if (e.pointerId === activePointer) cancel();
  };
  const onContext = (e: Event) => {
    e.preventDefault();
    cancel();
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onEnd);
  el.addEventListener('pointerleave', onEnd);
  el.addEventListener('pointercancel', onEnd);
  el.addEventListener('contextmenu', onContext);

  return () => {
    cancel();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerup', onEnd);
    el.removeEventListener('pointerleave', onEnd);
    el.removeEventListener('pointercancel', onEnd);
    el.removeEventListener('contextmenu', onContext);
  };
}
