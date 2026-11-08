/** A native control holds one source until its physical press finishes. */
export function bindMomentaryButton(
  element,
  {
    press,
    release,
    blocked = () => false,
    allowSecondaryPointers = false,
    retainPointerOnBlur = () => false,
  },
) {
  let pointer = null,
    key = null,
    active = false;
  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  function finish() {
    if (!active) return;
    active = false;
    pointer = null;
    key = null;
    window.removeEventListener('pointerup', pointerEnd);
    window.removeEventListener('pointercancel', pointerEnd);
    window.removeEventListener('blur', finish);
    document.removeEventListener('visibilitychange', hidden);
    release();
  }
  function begin() {
    if (active || element.disabled || blocked()) return false;
    active = press() === true;
    if (active) {
      window.addEventListener('blur', finish);
      document.addEventListener('visibilitychange', hidden);
    }
    return active;
  }
  function hidden() {
    if (document.hidden) finish();
  }
  function pointerEnd(event) {
    if (pointer !== null && event.pointerId === pointer) finish();
  }
  const handlers = {
    pointerdown(event) {
      if (event.button !== 0 || (event.isPrimary === false && !allowSecondaryPointers)) return;
      stop(event);
      if (!begin()) return;
      pointer = event.pointerId;
      element.focus({ preventScroll: true });
      element.setPointerCapture?.(pointer);
      window.addEventListener('pointerup', pointerEnd);
      window.addEventListener('pointercancel', pointerEnd);
    },
    pointerup: pointerEnd,
    pointercancel: pointerEnd,
    lostpointercapture: pointerEnd,
    keydown(event) {
      const arrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
      if (
        arrow ||
        ['Delete', 'Backspace'].includes(event.key) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd')
      ) {
        event.stopPropagation();
        if (!arrow) event.preventDefault();
        return;
      }
      if (![' ', 'Enter'].includes(event.key)) return;
      stop(event);
      if (event.repeat || active) return;
      if (begin()) key = event.key;
    },
    keyup(event) {
      if (![' ', 'Enter'].includes(event.key)) return;
      stop(event);
      if (key === event.key) finish();
    },
    blur(event) {
      if (pointer === null || !retainPointerOnBlur(event)) finish();
    },
    click(event) {
      stop(event);
      if (event.detail === 0 && begin()) finish();
    },
  };
  for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler);
  return () => {
    finish();
    for (const [type, handler] of Object.entries(handlers))
      element.removeEventListener(type, handler);
  };
}
