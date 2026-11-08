export function reviewPosition(after, actionCount, language, { compact = false } = {}) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (after < 0) return L('Початковий стан', 'Initial state');
  if (Number.isInteger(actionCount) && after >= actionCount)
    return L('Кінець запису', 'End of recording');
  return compact ? after + 1 : `${L('після дії', 'after action')} ${after + 1}`;
}

export function referenceReviewPosition(after, actionCount, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (after < 0)
    return L('Початковий стан еталонної перевірки', 'Instructor reference initial state');
  if (Number.isInteger(actionCount) && after >= actionCount)
    return L('Кінець еталонної перевірки', 'End of instructor reference check');
  return L(
    `Після дії еталонної перевірки №${after + 1}`,
    `After instructor reference action #${after + 1}`,
  );
}
