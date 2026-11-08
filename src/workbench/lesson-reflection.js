import { $, esc, format } from '../shared/ui.js';
import { createLessonReflections, reflectionText } from '../learning/reflections.js';

export function createLessonReflection(
  workbench,
  { showModal, addObservation, renderLesson } = {},
) {
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
      <div class="reflection-actions"><button id="lesson-add-observation" class="primary-btn">${L('Додати спостереження до роботи', 'Add observation to my work')}</button><button id="lesson-new-experiment" class="soft-btn">${L('Почати новий дослід', 'Start a new experiment')}</button><button id="lesson-history" class="soft-btn">${L('Попередні досліди', 'Previous experiments')}</button></div>
      <p id="lesson-reflection-status" role="status">${L('Це ваші навчальні нотатки, а не автоматична оцінка.', 'These are your learning notes, not an automatic grade.')}</p></details>`;
  }
  function bind(id, step, exampleTitle) {
    const separator = id.lastIndexOf(':');
    const example = id.slice(0, separator);
    const stepIndex = Number(id.slice(separator + 1));
    const status = (ok) => {
      $('#lesson-reflection-status').textContent = ok
        ? L(
            'Нотатки збережено на цьому пристрої. «Додати спостереження до роботи» переносить їх у пояснення, яке входить до чернетки й здачі.',
            'Notes saved on this device. Add the observation to your work to include it in the portable draft and submission explanation.',
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
    $('#lesson-add-observation').onclick = () => {
      const value = notes.get(id);
      if (!value.prediction.trim() && !value.observation.trim() && !value.explanation.trim()) {
        $('#lesson-reflection-status').textContent = L(
          'Спочатку запишіть прогноз, покази або пояснення.',
          'Enter a prediction, capture readings or add an explanation first.',
        );
        return;
      }
      try {
        addObservation(
          reflectionText(value, { language: workbench.lang, title: exampleTitle, step: stepIndex }),
        );
        $('#lesson-reflection-status').textContent = L(
          'Спостереження додано до пояснення роботи. Воно увійде до переносної чернетки й файла для викладача.',
          'The observation was added to your work explanation. It will be included in the portable draft and instructor file.',
        );
      } catch (error) {
        $('#lesson-reflection-status').textContent = error.message;
      }
    };
    $('#lesson-new-experiment').onclick = () => {
      const saved = notes.startNew(example);
      renderLesson();
      $('.lesson-reflection').open = true;
      $('#lesson-reflection-status').textContent = saved
        ? L(
            'Новий дослід: відповіді порожні. Попередні нотатки доступні в історії; додані до роботи спостереження збережені.',
            'New experiment: answers are blank. Previous notes remain in history; observations already added to your work are preserved.',
          )
        : L(
            'Новий дослід почато в пам’яті. Сховище недоступне — збережіть важливі нотатки у файлі роботи.',
            'New experiment started in memory. Storage is unavailable; save important notes in your work file.',
          );
    };
    $('#lesson-history').onclick = () => {
      const history = notes.history(example);
      showModal(
        `<h2>${L('Попередні досліди', 'Previous experiments')}</h2>${history.length ? history.map((run, index) => `<section><h3>${L('Дослід', 'Experiment')} ${history.length - index}</h3>${run.steps.map((value) => `<pre class="reflection-history">${esc(reflectionText(value, { language: workbench.lang, title: exampleTitle, step: value.step }))}</pre>`).join('')}</section>`).join('') : `<p>${L('Попередніх дослідів ще немає.', 'No previous experiments yet.')}</p>`}`,
        true,
      );
    };
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
