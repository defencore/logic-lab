import { getDefinition } from '../components/catalog/index.js';
import { esc, format } from '../shared/ui.js';
import { reviewMatches, reviewCardMarkup } from './review-cards.js';

export function createReviewView({ state, language }) {
  const {
    teacherKey,
    batch = [],
    pairs = [],
    batchErrors = [],
    busy,
    reviewing,
    reviewCancelled,
  } = state;
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

  function mismatchMarkup(mismatches) {
    if (!mismatches?.length) return '';
    const visible = mismatches.slice(0, 8);
    return `<details><summary>${mismatches.length} ${L('розбіжностей', 'differences')}</summary><ul>${visible
      .map((mismatch) => {
        const position =
          mismatch.after < 0
            ? L('початковий стан', 'initial state')
            : `${L('після дії', 'after action')} ${mismatch.after + 1}`;
        const time = Number.isFinite(mismatch.at) ? `${mismatch.at.toFixed(3)} ${L('с', 's')}` : '';
        return `<li><strong>${esc(observedSignalLabel(mismatch.probe))}</strong> · ${esc(time)} · ${esc(position)}<br>${L('Очікується', 'Expected')}: ${esc(observedValue(mismatch.expected))}; ${L('отримано', 'received')}: ${esc(observedValue(mismatch.actual))}.${mismatch.expected === 'X' || mismatch.expected === 'Z' ? `<br>${L('Еталонний сигнал не визначений. Викладачеві потрібно уточнити еталон.', 'The reference signal is not defined. The instructor should correct the reference.')}` : ''}</li>`;
      })
      .join(
        '',
      )}</ul>${mismatches.length > visible.length ? `<p class="classroom-hint">${L('Показано перші 8 розбіжностей. Повний перелік зберігається у звіті.', 'Showing the first 8 differences. The saved report contains the complete list.')}</p>` : ''}</details>`;
  }

  function referenceCheckMarkup(result) {
    const checksPassed = result.functionalPassed;
    return `<span class="classroom-badge ${checksPassed ? 'pass' : 'fail'}">${checksPassed ? L('Перевірки пройдено', 'Checks passed') : L('Є розбіжності', 'Differences')}</span><p>${L('Збігається', 'Matched')}: <strong>${result.matched}/${result.totalChecks}</strong></p>${result.workEvidenceMissing || result.reviewRequired ? `<p><span class="classroom-badge">${L('Потрібен перегляд викладача', 'Instructor review needed')}</span></p>` : ''}${mismatchMarkup(result.mismatches)}`;
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

  function similarityMarkup(pair) {
    const left = studentLabel(batch[pair.a]?.submission, pair.a);
    const right = studentLabel(batch[pair.b]?.submission, pair.b);
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
    return `<article><strong>${esc(left)} ↔ ${esc(right)}</strong><p>${pair.suspected ? L('Потребує індивідуального обговорення.', 'Discuss the work individually.') : L('Є спільні ознаки для перегляду.', 'There are shared features to review.')}</p><ul>${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul><p class="classroom-hint">${L('Правильні розв’язання можуть мати спільну структуру й однакові результати. Ці збіги не доводять списування; запропонуйте пояснити схему або виконати змінений дослід.', 'Correct solutions can share structure and results. These matches do not prove copying; ask the student to explain the circuit or perform a modified experiment.')}</p></article>`;
  }

  function cardsMarkup() {
    const cards = batch
      .map((item, index) => ({ ...item, index }))
      .filter(({ submission, result, index }) => reviewMatches(state, submission, result, index));
    return cards.length
      ? `<p class="classroom-hint">${L('Показано робіт', 'Submissions shown')}: ${cards.length}/${batch.length}</p><div class="review-card-list">${cards.map((item) => reviewCardMarkup({ ...item, state, language, studentLabel, referenceCheckMarkup, evidenceMarkup })).join('')}</div>`
      : `<p>${L('За цим фільтром робіт немає.', 'No submissions match this filter.')}</p>`;
  }

  function reviewMarkup() {
    const meaningfulPairs = pairs.filter(
      (pair) =>
        pair.sharedAttempt ||
        pair.sharedVariant ||
        pair.topologyExact ||
        pair.actionsExact ||
        pair.suspected ||
        (pair.reasons?.length || 0) > Number(!!pair.resultsExact),
    );
    const visiblePairs = meaningfulPairs.slice(0, 100);
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
            )}</select></label></div><div id="review-cards">${cardsMarkup()}</div><h4>${L('Збіги між роботами', 'Similarity between submissions')}</h4>${reviewCancelled ? `<p>${L('Порівняння цього набору робіт не завершено.', 'Comparison of this batch was not completed.')}</p>` : busy ? `<p>${L('Порівняння схожості буде готове після перевірки всіх файлів.', 'Similarity comparison will be available after every file is checked.')}</p>` : meaningfulPairs.length ? `<div class="classroom-similarities">${visiblePairs.map(similarityMarkup).join('')}</div>${meaningfulPairs.length > visiblePairs.length ? `<p class="classroom-hint">${L('Показано перші 100 пар. Повний перелік доступний у збереженому звіті.', 'Showing the first 100 pairs. The saved report contains the complete list.')}</p>` : ''}` : `<p>${L('Суттєвих збігів структури, сценарію чи ідентифікаторів у цьому наборі не виявлено. Самі по собі однакові правильні результати не позначаються як підозрілі.', 'No significant structural, sequence or identifier matches were found in this batch. Matching correct results alone are not flagged as suspicious.')}</p>`}`
        : ''
    }`;
  }

  return { reviewMarkup, cardsMarkup };
}
