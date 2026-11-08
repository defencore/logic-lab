import { $, esc, format } from '../shared/ui.js';
import { createLessonReflections } from '../learning/reflections.js';

export function createLessonReflection(workbench) {
  let storage;
  try {
    storage = globalThis.localStorage;
  } catch {}
  const notes = createLessonReflections(storage);
  const L = (ua, en) => (workbench.lang === 'ua' ? ua : en);
  function markup(id) {
    const saved = notes.get(id);
    return `<details class="lesson-reflection"><summary>${L('Передбач → Зроби → Порівняй → Поясни', 'Predict → Do → Compare → Explain')}</summary>
      <label>${L('1. Передбач результат до зміни входів', '1. Predict the result before changing inputs')}<textarea id="lesson-prediction" rows="2" maxlength="2000">${esc(saved.prediction)}</textarea></label>
      <p>${L('2. Виконай дію з інструкції на схемі, потім збережи покази.', '2. Perform the instruction on the circuit, then capture the readings.')}</p>
      <button class="soft-btn" id="lesson-capture">${L('Зберегти покази зараз', 'Capture readings now')}</button>
      <p>${L('3. Порівняй передбачення з цими показами:', '3. Compare your prediction with these readings:')}</p><output id="lesson-observation">${esc(saved.observation || L('Покази ще не збережені.', 'No readings captured yet.'))}</output>
      <label>${L('4. Поясни, чому результат збігся або відрізняється', '4. Explain why the result agrees or differs')}<textarea id="lesson-explanation" rows="2" maxlength="2000">${esc(saved.explanation)}</textarea></label>
      <p id="lesson-reflection-status" role="status">${L('Це ваші навчальні нотатки, а не автоматична оцінка.', 'These are your learning notes, not an automatic grade.')}</p></details>`;
  }
  function bind(id, step) {
    const status = (ok) => {
      $('#lesson-reflection-status').textContent = ok
        ? L(
            'Нотатки збережено на цьому пристрої. Для здачі додайте пояснення в «Завдання та здача».',
            'Notes saved on this device. For submission, add your explanation in Assignments & submission.',
          )
        : L(
            'Не вдалося зберегти нотатки. Скопіюйте їх перед закриттям.',
            'Notes could not be saved. Copy them before closing.',
          );
    };
    for (const key of ['prediction', 'explanation']) {
      $(`#lesson-${key}`).oninput = (event) =>
        status(notes.save(id, { [key]: event.target.value }));
    }
    $('#lesson-capture').onclick = () => {
      const selected = workbench.project.nodes.filter((node) => step.nodes?.includes(node.id));
      const values = selected.map((node) => {
        const ports = ['inputs', 'outputs'].flatMap((direction) =>
          Object.entries(workbench.runtime[direction]?.[node.id] || {}).map(
            ([port, value]) => `${direction === 'inputs' ? 'IN' : 'OUT'} ${port}=${format(value)}`,
          ),
        );
        return `${node.label || node.id}: ${ports.join(', ') || '—'}`;
      });
      const observation = `t=${workbench.runtime.time.toFixed(3)} s\n${values.join('\n') || L('Виберіть крок з елементами для спостереження.', 'Choose a step with components to observe.')}`;
      $('#lesson-observation').textContent = observation;
      status(notes.save(id, { observation }));
    };
  }
  return { markup, bind };
}
