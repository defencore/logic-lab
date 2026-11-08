import { esc, format } from '../shared/ui.js';

export function reviewMatches(state, submission, result, index) {
  const query = String(state.reviewQuery || '')
    .trim()
    .toLocaleLowerCase();
  const haystack = [
    submission.student?.name,
    submission.student?.id,
    submission.student?.group,
    submission.assignment?.title,
    submission.notes,
  ]
    .join(' ')
    .toLocaleLowerCase();
  if (query && !haystack.includes(query)) return false;
  const mode = state.reviewFilter || 'all';
  return mode === 'review'
    ? !!result.reviewRequired
    : mode === 'failed'
      ? !result.functionalPassed
      : mode === 'passed'
        ? !!result.passed && !result.reviewRequired
        : mode === 'similar'
          ? (state.pairs || []).some(
              (pair) => pair.suspected && (pair.a === index || pair.b === index),
            )
          : true;
}

export function reviewObservationsMarkup(submission, result, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const observations = result.studentObservations || [];
  if (!observations.length)
    return `<p>${L('Повторно обчислені спостереження недоступні в цьому звіті. Відкрийте дослід або перевірте файл роботи повторно.', 'Recomputed observations are unavailable in this report. Replay the experiment or check the work file again.')}</p>`;
  const probes = submission.sequence?.probes || [];
  const nodes = new Map((submission.project?.nodes || []).map((node) => [node.id, node]));
  return `<p>${L('Це результати повторного запуску студентського сценарію, а не значення, заявлені у файлі.', 'These values were recomputed from the student sequence; they are not claimed file results.')}</p><div class="classroom-table-scroll"><table class="classroom-table"><thead><tr><th>${L('Після дії', 'After action')}</th><th>${L('Час, с', 'Time, s')}</th>${probes
    .slice(0, 8)
    .map(
      (probe) => `<th>${esc(nodes.get(probe.node)?.label || probe.node)} · ${esc(probe.port)}</th>`,
    )
    .join('')}</tr></thead><tbody>${observations
    .slice(0, 60)
    .map(
      (observation) =>
        `<tr><td>${observation.after < 0 ? L('Початковий стан', 'Initial state') : observation.after + 1}</td><td>${observation.at.toFixed(4)}</td>${observation.values
          .slice(0, 8)
          .map((value) => `<td>${esc(format(value))}</td>`)
          .join('')}</tr>`,
    )
    .join(
      '',
    )}</tbody></table></div>${observations.length > 60 || probes.length > 8 ? `<p class="classroom-hint">${L('Показано до 60 рядків і 8 сигналів. Повні обчислені дані є у звіті JSON.', 'Showing up to 60 rows and 8 signals. The JSON report includes complete recomputed data.')}</p>` : ''}`;
}

export function reviewCardMarkup({
  submission,
  result,
  index,
  state,
  language,
  studentLabel,
  referenceCheckMarkup,
  evidenceMarkup,
}) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const locked = !!(state.busy || state.recording || state.player || state.preview);
  const variant = submission.assignment?.variant?.id || '';
  return `<article class="review-card" data-review-card="${index}"><header><h4>${esc(studentLabel(submission, index))}</h4><span>${esc(submission.student?.group || '')}</span><span class="classroom-variant" title="${esc(variant)}">${L('Варіант', 'Variant')}: ${esc(variant.slice(0, 8))}</span></header><div class="review-card-score">${referenceCheckMarkup(result)}</div><section><h5>${L('Пояснення студента', 'Student explanation')}</h5><p class="preserve-lines">${esc(submission.notes || L('Пояснення у файлі відсутнє.', 'No explanation was included.'))}</p></section><div class="classroom-actions"><button type="button" class="soft-btn" data-review-open="${index}" ${locked || !submission.project ? 'disabled' : ''}>${L('Відкрити схему студента', 'Open student circuit')}</button><button type="button" class="soft-btn" data-review-replay="${index}" ${locked || !submission.sequence ? 'disabled' : ''}>${L('Відтворити дослід студента', 'Replay student experiment')}</button></div><p class="classroom-hint">${L('Перегляд відкриває подану схему та справжню послідовність входів. Поточна схема зберігається до завершення перегляду.', 'Preview opens the submitted circuit and its actual input sequence. Your current circuit is retained until preview ends.')}</p><details><summary>${L('Повторно обчислений дослід', 'Recomputed experiment')}</summary>${reviewObservationsMarkup(submission, result, language)}</details><details><summary>${L('Цілісність і свідчення роботи', 'Integrity and work evidence')}</summary><p>${result.integrity ? L('Контрольна сума збігається', 'Checksum matches') : L('Контрольна сума не збігається', 'Checksum mismatch')}</p>${evidenceMarkup(result)}</details></article>`;
}
