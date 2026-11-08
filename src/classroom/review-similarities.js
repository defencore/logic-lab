import { esc } from '../shared/ui.js';
import { REVIEW_PAGE_SIZES, pageRange } from './review-detail-state.js';
import { reviewPagination } from './review-pagination.js';

export function meaningfulReviewPairs(pairs = []) {
  return pairs
    .map((pair, index) => ({ pair, index }))
    .filter(
      ({ pair }) =>
        pair.sharedAttempt ||
        pair.sharedVariant ||
        pair.topologyExact ||
        pair.actionsExact ||
        pair.suspected ||
        (pair.reasons?.length || 0) > Number(!!pair.resultsExact),
    );
}

export function setReviewPairPage(state, requested) {
  state.reviewPairPage = pageRange(
    meaningfulReviewPairs(state.pairs).length,
    REVIEW_PAGE_SIZES.pairs,
    requested,
  ).page;
}

function pairMarkup({ pair, index }, { L, state, studentLabel }) {
  const left = studentLabel(state.batch?.[pair.a]?.submission, pair.a);
  const right = studentLabel(state.batch?.[pair.b]?.submission, pair.b);
  const reasons = [];
  if (pair.sharedAttempt)
    reasons.push(
      L('Однаковий ідентифікатор спроби.', 'The submissions share an attempt identifier.'),
    );
  if (pair.sharedVariant)
    reasons.push(
      L('Використано один і той самий виданий варіант.', 'The same issued variant was used.'),
    );
  if (pair.topologyExact)
    reasons.push(
      L(
        'Структура схем і параметри елементів однакові, навіть після перейменування, пересування та зміни форми проводів.',
        'Circuit structure and component parameters match despite renaming, repositioning and wire routing changes.',
      ),
    );
  else if (Number.isFinite(pair.topologySimilarity))
    reasons.push(
      `${L('Схожість доданих елементів і з’єднань', 'Similarity of added components and connections')}: ${Math.round(pair.topologySimilarity * 100)}%.`,
    );
  if (pair.actionsExact)
    reasons.push(
      L(
        'Послідовність значень входів і час дій збігаються.',
        'The ordered input values and action times match.',
      ),
    );
  if (pair.resultsExact)
    reasons.push(
      L(
        'Записані результати та час вимірювань збігаються.',
        'Recorded results and observation times match.',
      ),
    );
  if (pair.topologyUndetermined)
    reasons.push(
      L(
        'Точне зіставлення цієї великої схеми не завершено; оцінка схожості орієнтовна.',
        'Exact matching of this large circuit was not completed; the similarity estimate is approximate.',
      ),
    );
  return `<article data-review-pair="${index}" data-review-pair-a="${pair.a}" data-review-pair-b="${pair.b}"><strong>${esc(left)} ↔ ${esc(right)}</strong><p>${pair.suspected ? L('Потребує індивідуального обговорення.', 'Discuss the work individually.') : L('Є спільні ознаки для перегляду.', 'There are shared features to review.')}</p><ul>${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul><p class="classroom-hint">${L('Правильні розв’язання можуть мати спільну структуру й однакові результати. Ці збіги не доводять списування; запропонуйте пояснити схему або виконати змінений дослід.', 'Correct solutions can share structure and results. These matches do not prove copying; ask the student to explain the circuit or perform a modified experiment.')}</p></article>`;
}

export function reviewSimilaritiesMarkup({ state, language, studentLabel }) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (state.reviewCancelled)
    return `<p>${L('Порівняння цього набору робіт не завершено.', 'Comparison of this batch was not completed.')}</p>`;
  if (state.busy)
    return `<p>${L('Порівняння схожості буде готове після перевірки всіх файлів.', 'Similarity comparison will be available after every file is checked.')}</p>`;
  const pairs = meaningfulReviewPairs(state.pairs);
  if (!pairs.length)
    return `<p>${L('Суттєвих збігів структури, сценарію чи ідентифікаторів у цьому наборі не виявлено. Самі по собі однакові правильні результати не позначаються як підозрілі.', 'No significant structural, sequence or identifier matches were found in this batch. Matching correct results alone are not flagged as suspicious.')}</p>`;
  const range = pageRange(pairs.length, REVIEW_PAGE_SIZES.pairs, state.reviewPairPage);
  const pager = reviewPagination({
    range,
    index: -1,
    kind: 'pairs',
    label: L('Пари', 'Pairs'),
    language,
  });
  return `${pager}<div class="classroom-similarities">${pairs
    .slice(range.start, range.end)
    .map((row) => pairMarkup(row, { L, state, studentLabel }))
    .join('')}</div>${range.pages > 1 ? pager : ''}`;
}
