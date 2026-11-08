import { $$ } from '../shared/ui.js';

const labels = [
  ['Завдання', 'Task'],
  ['Побудова', 'Build'],
  ['Запис перевірки', 'Record test'],
  ['Пояснення', 'Explain'],
  ['Збереження', 'Save'],
];
export function studentStepsMarkup(progress, language) {
  const current = progress.steps.indexOf(false);
  return `<ol class="student-steps">${labels.map(([ua, en], index) => `<li data-student-step="${index}" class="${progress.steps[index] ? 'is-complete' : index === current ? 'is-current' : ''}" ${index === current ? 'aria-current="step"' : ''}><span aria-hidden="true" data-student-step-marker>${progress.steps[index] ? '✓' : index + 1}</span>${language === 'ua' ? ua : en}<small class="sr-only" data-student-step-status>${language === 'ua' ? (progress.steps[index] ? 'Готово' : 'Ще не завершено') : progress.steps[index] ? 'Complete' : 'Not complete'}</small></li>`).join('')}</ol>`;
}

/** Patch only stage indicators: form inputs, focus and text selection stay untouched. */
export function updateStudentSteps(root, progress, language) {
  const current = progress.steps.indexOf(false);
  for (const item of $$('[data-student-step]', root)) {
    const index = Number(item.dataset.studentStep);
    const complete = !!progress.steps[index];
    item.classList.toggle('is-complete', complete);
    item.classList.toggle('is-current', !complete && index === current);
    if (!complete && index === current) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    item.querySelector('[data-student-step-marker]').textContent = complete
      ? '✓'
      : String(index + 1);
    item.querySelector('[data-student-step-status]').textContent =
      language === 'ua'
        ? complete
          ? 'Готово'
          : 'Ще не завершено'
        : complete
          ? 'Complete'
          : 'Not complete';
  }
}
