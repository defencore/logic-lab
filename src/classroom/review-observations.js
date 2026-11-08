import { esc, format } from '../shared/ui.js';
import { REVIEW_PAGE_SIZES, pageRange } from './review-detail-state.js';
import { reviewPagination } from './review-pagination.js';
import { reviewPosition } from './review-position.js';

export function reviewObservationsMarkup(
  submission,
  result,
  language,
  { detail = {}, index = 0 } = {},
) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const observations = result.studentObservations || [],
    probes = submission.sequence?.probes || [];
  if (!observations.length)
    return `<p>${L('Повторно обчислених спостережень немає: 0 рядків. Відкрийте дослід або перевірте файл роботи повторно.', 'No recomputed observations are available: 0 rows. Replay the experiment or check the work file again.')}</p>`;
  const rows = pageRange(observations.length, REVIEW_PAGE_SIZES.rows, detail.rowPage);
  const signals = pageRange(probes.length, REVIEW_PAGE_SIZES.signals, detail.signalPage);
  const nodes = new Map((submission.project?.nodes || []).map((node) => [node.id, node]));
  const visibleProbes = probes.slice(signals.start, signals.end);
  return `<p>${L('Це результати повторного запуску студентського сценарію, а не значення, заявлені у файлі. Стани вхідних джерел теж доступні серед контрольних сигналів.', 'These values were recomputed from the student sequence; they are not claimed file results. Input-source states are also available among the observed signals.')}</p>${reviewPagination({ range: rows, index, kind: 'rows', label: L('Рядки', 'Rows'), language })}${reviewPagination({ range: signals, index, kind: 'signals', label: L('Сигнали', 'Signals'), language })}<div class="classroom-table-scroll"><table class="classroom-table review-observation-table"><caption>${L('Повторно обчислені спостереження', 'Recomputed observations')}</caption><thead><tr><th scope="col">${L('Після дії', 'After action')}</th><th scope="col">${L('Час, с', 'Time, s')}</th>${visibleProbes.map((probe, offset) => `<th scope="col">${signals.start + offset + 1}. ${esc(nodes.get(probe.node)?.label || probe.node)} · ${esc(probe.port)}</th>`).join('')}</tr></thead><tbody>${observations
    .slice(rows.start, rows.end)
    .map(
      (observation, offset) =>
        `<tr data-review-observation="${rows.start + offset}"><td>${reviewPosition(observation.after, submission.sequence?.actions?.length, language, { compact: true })}</td><td>${observation.at.toFixed(4)}</td>${visibleProbes.map((_, signalOffset) => `<td>${esc(format(observation.values[signals.start + signalOffset]))}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody></table></div>`;
}
