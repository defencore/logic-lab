import { getDefinition } from '../components/catalog/index.js';
import { esc, format } from '../shared/ui.js';
import { reviewMatches, reviewCardMarkup } from './review-cards.js';
import { reviewMismatches } from './review-mismatches.js';
import { reviewSimilaritiesMarkup } from './review-similarities.js';

export function createReviewView({ state, language }) {
  const { teacherKey, batch = [], batchErrors = [], busy, reviewing, reviewCancelled } = state;
  const adapter = { getLanguage: () => language };
  const L = (ua, en) => (language === 'ua' ? ua : en);
  function studentLabel(submission, index) {
    if (!submission) return `${L('Робота', 'Submission')} ${index + 1}`;
    const { name, id } = submission.student;
    return name && id && name !== id ? `${name} (${id})` : name || id;
  }

  function observedSignalLabel(probe) {
    const node = teacherKey?.referenceProject?.nodes.find(
      (candidate) => candidate.id === probe?.node,
    );
    if (!node) return L('Контрольний сигнал', 'Observed signal');
    const definition = getDefinition(node.type);
    const port = definition.signals[probe.side || 'outputs']?.find(
      (candidate) => candidate.id === probe.port,
    );
    const label = node.label || (adapter.getLanguage() === 'ua' ? definition.ua : definition.label);
    return `${label} · ${port?.label || probe.port}`;
  }

  function observedValue(value) {
    if (value === undefined) return L('немає результату', 'no result');
    if (value === 'X') return L('невизначено (X)', 'unknown (X)');
    if (value === 'Z') return L('високий імпеданс (Z)', 'high impedance (Z)');
    return format(value);
  }

  function referenceCheckMarkup(result, submission, index) {
    const checksPassed = result.functionalPassed;
    return `<span class="classroom-badge ${checksPassed ? 'pass' : 'fail'}">${checksPassed ? L('Перевірки пройдено', 'Checks passed') : L('Є розбіжності', 'Differences')}</span><p>${L('Збігається', 'Matched')}: <strong>${result.matched}/${result.totalChecks}</strong></p>${result.workEvidenceMissing || result.reviewRequired ? `<p><span class="classroom-badge">${L('Потрібен перегляд викладача', 'Instructor review needed')}</span></p>` : ''}${reviewMismatches(result.mismatches, { state, submission, index, language, actionCount: teacherKey?.sequence?.actions?.length, signalLabel: observedSignalLabel, observedValue })}`;
  }

  function evidenceMarkup(result) {
    const evidence = result.evidence || {};
    const warnings = [];
    if (!result.integrity)
      warnings.push(
        L(
          'Контрольна сума файлу не збігається. Перевірте походження та цілісність роботи.',
          'The file checksum does not match. Review the origin and integrity of this submission.',
        ),
      );
    if (!result.structureMatches)
      warnings.push(
        L(
          'Подана схема відрізняється від схеми, на якій записано дії.',
          'The submitted circuit differs from the circuit used to record the actions.',
        ),
      );
    if (!result.observationsMatch)
      warnings.push(
        L(
          'Записані у файлі результати не збігаються з повторним запуском схеми.',
          'The results stored in the file differ from the recomputed circuit results.',
        ),
      );
    if (result.workEvidenceMissing)
      warnings.push(
        L(
          'Немає журналу змістовних змін побудови. Навіть якщо схема працює правильно, самостійне виконання потрібно перевірити окремо.',
          'There is no history of semantic construction changes. Even if the circuit works correctly, independent completion needs separate review.',
        ),
      );
    if (result.reviewRequired && evidence.studentBound === false)
      warnings.push(
        L(
          'Цей варіант не закріплено за конкретним студентом. Уточніть, хто виконував роботу.',
          'This variant is not assigned to a specific student. Confirm who completed the work.',
        ),
      );
    return `<ul><li>${L('Зміни побудови схеми', 'Circuit construction changes')}: <strong>${Number.isInteger(evidence.constructionChanges) ? evidence.constructionChanges : 0}</strong></li><li>${L('Записані дії', 'Recorded actions')}: <strong>${Number.isInteger(evidence.actions) ? evidence.actions : 0}</strong></li><li>${L('Схема відповідає запису', 'Circuit matches the recording')}: <strong>${result.structureMatches ? L('так', 'yes') : L('ні', 'no')}</strong></li><li>${L('Результат повторного запуску збігається', 'Recomputed results match')}: <strong>${result.observationsMatch ? L('так', 'yes') : L('ні', 'no')}</strong></li></ul>${warnings.map((warning) => `<p class="classroom-hint"><strong>${esc(warning)}</strong></p>`).join('')}<p class="classroom-hint">${L('Журнал є свідченням роботи, але сам по собі не підтверджує авторство.', 'The journal provides work evidence but does not establish authorship by itself.')}</p>`;
  }

  function similaritiesMarkup() {
    return reviewSimilaritiesMarkup({ state, language, studentLabel });
  }

  function cardMarkup(index) {
    const item = batch[index];
    return item && reviewMatches(state, item.submission, item.result, index)
      ? reviewCardMarkup({
          ...item,
          index,
          state,
          language,
          studentLabel,
          referenceCheckMarkup,
          evidenceMarkup,
        })
      : '';
  }

  function cardsMarkup() {
    const cards = batch
      .map((item, index) => ({ ...item, index }))
      .filter(({ submission, result, index }) => reviewMatches(state, submission, result, index));
    return cards.length
      ? `<p class="classroom-hint">${L('Показано робіт', 'Submissions shown')}: ${cards.length}/${batch.length}</p><div class="review-card-list">${cards.map((item) => cardMarkup(item.index)).join('')}</div>`
      : `<p>${L('За цим фільтром робіт немає.', 'No submissions match this filter.')}</p>`;
  }

  function reviewMarkup() {
    return `${busy ? `<div class="classroom-processing"><p>${L('Обробляю дані. Вікно можна закрити; робота продовжиться.', 'Processing data. You may close this window; work will continue.')}</p>${reviewing ? `<button id="teacher-review-cancel" class="soft-btn">${L('Зупинити перевірку', 'Cancel checking')}</button>` : ''}</div>` : ''}${reviewCancelled ? `<p class="classroom-error">${L('Перевірку зупинено. Показано лише завершені результати; порівняння схожості не завершено.', 'Checking was stopped. Only completed results are shown; similarity comparison is incomplete.')}</p>` : ''}${batchErrors.map((error) => `<p class="classroom-error">${esc(error)}</p>`).join('')}${
      batch.length
        ? `<div class="review-filters"><label>${L('Пошук студента, групи або пояснення', 'Find student, group or explanation')}<input type="search" id="review-query" value="${esc(state.reviewQuery || '')}" ${busy ? 'disabled' : ''}></label><label>${L('Показати', 'Show')}<select id="review-filter" ${busy ? 'disabled' : ''}>${[
            ['all', 'Усі роботи', 'All submissions'],
            ['review', 'Потрібен перегляд', 'Needs review'],
            ['failed', 'Є розбіжності', 'Differences'],
            ['passed', 'Пройдено без зауважень', 'Passed without concerns'],
            ['similar', 'Мають підозрілі збіги', 'Flagged similarity'],
          ]
            .map(
              ([id, ua, en]) =>
                `<option value="${id}" ${(state.reviewFilter || 'all') === id ? 'selected' : ''}>${L(ua, en)}</option>`,
            )
            .join(
              '',
            )}</select></label></div><div id="review-cards">${cardsMarkup()}</div><h4>${L('Збіги між роботами', 'Similarity between submissions')}</h4><div id="review-similarities">${similaritiesMarkup()}</div>`
        : ''
    }`;
  }

  return { reviewMarkup, cardsMarkup, cardMarkup, similaritiesMarkup };
}
