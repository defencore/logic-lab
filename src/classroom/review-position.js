export function reviewPosition(after, actionCount, language, { compact = false } = {}) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (after < 0) return L('Початковий стан', 'Initial state');
  if (Number.isInteger(actionCount) && after >= actionCount)
    return L('Кінець запису', 'End of recording');
  return compact ? after + 1 : `${L('після дії', 'after action')} ${after + 1}`;
}
