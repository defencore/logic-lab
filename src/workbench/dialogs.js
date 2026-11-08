import { $, $$, esc } from '../ui-utils.js';
import { icon } from '../icons.js';

const focusSelector = 'button,input,select,textarea,a[href],summary,[tabindex]';

export function focusableElements(container) {
  return $$(focusSelector, container).filter(
    (element) =>
      !element.disabled &&
      element.tabIndex >= 0 &&
      !element.closest('[hidden],[inert]') &&
      element.getClientRects().length,
  );
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab') return;
  const elements = focusableElements(container);
  const first = elements[0],
    last = elements.at(-1);
  if (!first) {
    event.preventDefault();
    container.focus();
  } else if (
    !container.contains(document.activeElement) ||
    (event.shiftKey && document.activeElement === first)
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function createDialogs({ t, beforeOpen, disposeContent }) {
  let opener = null;
  const container = () => $('#modal-root');
  const isOpen = () => !!container()?.querySelector('.modal');
  function setBackgroundInert(inert) {
    for (const element of $$('.app-header,.app-body')) element.inert = inert;
  }
  function close() {
    disposeContent();
    container()?.replaceChildren();
    setBackgroundInert(false);
    const destination =
      opener?.isConnected && opener.getClientRects().length ? opener : $('#viewport');
    destination?.focus({ preventScroll: true });
    opener = null;
  }
  function open(html, wide = false) {
    if (!isOpen()) opener = document.activeElement;
    beforeOpen();
    disposeContent();
    container().innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button id="close-modal" class="icon-btn modal-close" aria-label="${esc(t('cancel'))}">${icon('close')}</button>${html}</section></div>`;
    const dialog = container()?.querySelector('.modal');
    const heading = $('h2', dialog);
    if (heading) heading.id = 'modal-title';
    else dialog.setAttribute('aria-label', t('help'));
    $('#close-modal').onclick = close;
    $('.modal-backdrop').onclick = (event) => {
      if (event.target === event.currentTarget) close();
    };
    setBackgroundInert(true);
    (focusableElements(dialog)[0] || dialog).focus({ preventScroll: true });
  }
  function handleKey(event) {
    const dialog = $('.modal', container());
    if (!dialog) return false;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else trapFocus(event, dialog);
    return true;
  }
  return { open, close, isOpen, handleKey };
}
