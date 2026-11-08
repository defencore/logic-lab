import { createLessonReflection } from './lesson-reflection.js';
import { getDefinition } from '../components/catalog/index.js';
import { EXAMPLES, createExample } from '../../examples/index.js';
import { $, $$, esc, format, signalClass } from '../shared/ui.js';
import { icon } from '../shared/icons.js';
import {
  guideMarkup,
  exampleCards,
  filterExamples,
  exampleCatalogShell,
} from '../learning/views/guides.js';

export function createLearningController(
  workbench,
  {
    t,
    title,
    showModal,
    closeModal,
    confirmReplace,
    addNode,
    selectionChanged,
    setWorkspaceView,
    primarySignal,
  },
) {
  const reflection = createLessonReflection(workbench);
  function showExamples(filters = {}) {
    const state = { query: '', category: 'all', level: 'all', ...filters };
    showModal(exampleCatalogShell(workbench.lang, state), true);
    $('.modal').classList.add('catalog-modal');
    const refresh = () => {
      state.query = $('#example-search').value;
      state.level = $('#example-level').value;
      const matches = filterExamples(EXAMPLES, state);
      $('#example-results').innerHTML = exampleCards(matches, workbench.lang);
      $('#catalog-count').textContent = `${t('examplesCount')}: ${matches.length}`;
      $$('[data-topic]').forEach((el) => {
        const active = el.dataset.topic === state.category;
        el.classList.toggle('active', active);
        el.setAttribute('aria-pressed', active);
      });
      $$('[data-example]').forEach(
        (el) => (el.onclick = () => confirmReplace(() => createExample(el.dataset.example))),
      );
      $$('[data-lab-guide]').forEach(
        (el) => (el.onclick = () => showLaboratory(el.dataset.labGuide)),
      );
    };
    $('#example-search').oninput = refresh;
    $('#example-level').onchange = refresh;
    $$('[data-topic]').forEach((el) => {
      el.onclick = () => {
        state.category = el.dataset.topic;
        refresh();
      };
    });
    $('#empty-project').onclick = () =>
      confirmReplace(() => ({ version: 1, name: t('newName'), nodes: [], wires: [] }));
    refresh();
  }
  function showComponentGuide(type, nodeId = null) {
    const definition = getDefinition(type);
    if (!definition) return;
    showModal(
      `<span class="eyebrow">${t('guideFor')}</span><h2>${esc(title(definition))}</h2>${guideMarkup(type, workbench.lang, nodeId)}<button class="primary-btn" id="guide-add">${icon('plus', 15)}${t('addComponent')}</button>`,
      true,
    );
    $('#guide-add').onclick = () => {
      closeModal();
      addNode(type);
    };
    bindLearningActions($('#modal-root'));
    updateGuideSignals();
  }
  function bindLearningActions(root) {
    $$('[data-learn-example]', root).forEach(
      (el) => (el.onclick = () => confirmReplace(() => createExample(el.dataset.learnExample))),
    );
  }
  function updateGuideSignals() {
    $$('[data-guide-node]').forEach((el) => {
      const value =
        workbench.runtime[el.dataset.guideDirection]?.[el.dataset.guideNode]?.[
          el.dataset.guidePort
        ];
      el.textContent = format(value);
      el.className = `signal-value ${signalClass(value)}`;
    });
    $$('[data-truth-node]').forEach((section) => {
      const node = workbench.project.nodes.find((item) => item.id === section.dataset.truthNode);
      if (!node) return;
      const definition = getDefinition(node.type);
      const inputs = definition.inputs.map(
        (port) => workbench.runtime.inputs?.[node.id]?.[port.id],
      );
      const outputs = definition.outputs.map(
        (port) => workbench.runtime.outputs?.[node.id]?.[port.id],
      );
      const known =
        node.enabled !== false &&
        [...inputs, ...outputs].every((value) => value === 0 || value === 1);
      const key = inputs.join('');
      $$('[data-truth-inputs]', section).forEach((row) => {
        const active = known && row.dataset.truthInputs === key;
        row.classList.toggle('current-row', active);
        if (active) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
      });
      const describe = (ports, values) =>
        ports.map((port, index) => `${port.label || port.id}=${format(values[index])}`).join(', ');
      const status = $('[data-truth-status]', section);
      if (status) {
        const message =
          node.enabled === false
            ? t('truthInactive')
            : known
              ? `${t('truthCurrent')}: ${describe(definition.inputs, inputs)} → ${describe(definition.outputs, outputs)}`
              : t('truthPending');
        if (status.textContent !== message) status.textContent = message;
      }
    });
  }
  function currentLesson() {
    const example = EXAMPLES.find((ex) => ex.id === workbench.project.exampleId);
    return example ? { example, lesson: example.lesson[workbench.lang] } : null;
  }
  function renderLesson() {
    const panel = $('#lesson-panel'),
      current = currentLesson();
    workbench.highlighted.clear();
    $('#lesson-toggle').hidden = !current;
    if (!current) {
      panel.hidden = true;
      return;
    }
    const { example, lesson } = current;
    workbench.lessonStep = Math.max(0, Math.min(lesson.steps.length - 1, workbench.lessonStep));
    const step = lesson.steps[workbench.lessonStep];
    const label = $('#lesson-toggle-label');
    if (label)
      label.textContent = `${workbench.lang === 'ua' ? 'Інструкція' : 'Instruction'} · ${workbench.lessonStep + 1}/${lesson.steps.length}`;
    const visible =
      workbench.lessonOpen && (!workbench.compactLayout.matches || workbench.compactLessonOpen);
    panel.hidden = !visible;
    $('#lesson-toggle').title = t(visible ? 'hideLesson' : 'showLesson');
    $('#lesson-toggle').setAttribute('aria-label', t(visible ? 'hideLesson' : 'showLesson'));
    $('#lesson-toggle').setAttribute('aria-expanded', String(visible));
    if (!visible) {
      $$('.lesson-highlight').forEach((el) => el.classList.remove('lesson-highlight'));
      return;
    }
    workbench.highlighted = new Set(step.nodes || []);
    panel.innerHTML = `<div class="lesson-heading"><span class="eyebrow">${t('lesson')} · ${esc(title(example))}</span><button id="lesson-close" class="icon-btn" aria-label="${t('hideLesson')}">${icon('close', 14)}</button></div><div class="lesson-content"><div><p class="lesson-goal">${esc(lesson.goal)}</p><strong>${workbench.lessonStep + 1}. ${esc(step.title)}</strong><p>${esc(step.text)}</p><div id="lesson-live" class="lesson-live"></div></div><div class="lesson-navigation"><span>${t('stepOf')} ${workbench.lessonStep + 1} ${t('of')} ${lesson.steps.length}</span><div><button id="lesson-prev" class="icon-btn" ${workbench.lessonStep === 0 ? 'disabled' : ''} aria-label="${t('previousStep')}">${icon('chevron', 15)}</button><button id="lesson-next" class="icon-btn" ${workbench.lessonStep === lesson.steps.length - 1 ? 'disabled' : ''} aria-label="${t('nextStep')}">${icon('chevron', 15)}</button></div><button id="lesson-inspect" class="text-btn">${t('inspectStep')}${icon('chevron', 12)}</button></div></div>${workbench.lessonStep === lesson.steps.length - 1 ? `<div class="lesson-result"><b>${t('expectedResult')}</b> ${esc(lesson.expected)}</div>` : ''}${reflection.markup(`${example.id}:${workbench.lessonStep}`)}`;
    reflection.bind(`${example.id}:${workbench.lessonStep}`, step);
    $('#lesson-close').onclick = () => {
      workbench.compactLessonOpen = false;
      workbench.lessonOpen = false;
      renderLesson();
    };
    $('#lesson-prev').onclick = () => {
      workbench.lessonStep--;
      renderLesson();
    };
    $('#lesson-next').onclick = () => {
      workbench.lessonStep++;
      renderLesson();
    };
    $('#lesson-inspect').onclick = () => {
      const node = workbench.project.nodes.find((n) => workbench.highlighted.has(n.id));
      if (node) {
        workbench.selected = new Set([node.id]);
        workbench.selectedWire = null;
        workbench.inspectorTab = 'properties';
        selectionChanged();
        setWorkspaceView('inspector');
      }
    };
    $$('.circuit-node').forEach((el) =>
      el.classList.toggle('lesson-highlight', workbench.highlighted.has(el.dataset.node)),
    );
    updateLessonSignals();
  }
  function updateLessonSignals() {
    const el = $('#lesson-live');
    if (!el || !workbench.lessonOpen) return;
    el.innerHTML = workbench.project.nodes
      .filter((n) => workbench.highlighted.has(n.id))
      .slice(0, 4)
      .map((n) => {
        const definition = getDefinition(n.type);
        const value = primarySignal(n);
        return `<span>${esc(n.label || title(definition))} <b class="${signalClass(value)}">${format(value)}</b></span>`;
      })
      .join('');
  }
  function showLaboratory(id) {
    const example = EXAMPLES.find((item) => item.id === id);
    if (!example?.lab) return;
    const sections = ['objectives', 'tasks', 'questions', 'deliverables'];
    showModal(
      `<span class="eyebrow">${t('laboratory')} · ${example.lab.duration} ${t('minutes')}</span><h2>${esc(title(example))}</h2><p>${esc(workbench.lang === 'ua' ? example.descriptionUa : example.description)}</p><div class="lab-resource-actions"><button id="start-lab" class="primary-btn">${icon('play', 15)}${t('startLab')}</button><a class="soft-btn" href="${example.circuitPath}" download="${id}.logic.json">${icon('download', 14)}${t('downloadCircuit')}</a><a class="soft-btn" href="${example.labPath}" download="${id}-lab.md">${icon('note', 14)}${t('downloadWorksheet')}</a></div><div class="lab-sheet">${sections.map((section) => `<section class="guide-section"><h4>${t(section)}</h4><ol>${example.lab[section][workbench.lang].map((item) => `<li>${esc(item)}</li>`).join('')}</ol></section>`).join('')}</div>`,
      true,
    );
    $('#start-lab').onclick = () => confirmReplace(() => createExample(id));
  }

  function showDiagnostics() {
    const messages = (workbench.runtime.diagnostics || []).slice(0, 50).map((d) => {
      const n = workbench.project.nodes.find((n) => n.id === d.node);
      const name = n?.label || (n ? title(getDefinition(n.type)) : '');
      if (workbench.lang === 'en') return d.message;
      if (d.code === 'invalid_scenario') return `${name}: ${t('sceneParameters')}`;
      if (d.code === 'invalid_motion')
        return `${name}: задайте додатні цілі кроки на оберт і мікрокроки, додатний хід та межі Min ≤ Max.`;
      if (d.code === 'invalid_servo')
        return `${name}: задайте 0 < мінімальний імпульс < центральний < максимальний, додатний кут і час втрати сигналу довший за максимальний імпульс.`;
      if (d.code === 'motion_unknown')
        return `${name}: позиція невідома після невизначеного керувального сигналу. Подайте Reset для відновлення початкової позиції.`;
      return d.code === 'oscillation'
        ? 'Схема не стабілізувалася. Перевірте комбінаційний зворотний зв’язок.'
        : d.code === 'invalid_sr'
          ? `${name}: S та R не можуть одночасно мати високий рівень.`
          : d.code === 'floating'
            ? `${name}: ${d.port || ''} має високий імпеданс (Z).`
            : `${name}: ${d.port || ''} має невідомий або конфліктний сигнал (X).`;
    });
    showModal(
      `<span class="eyebrow">LOGIC LAB</span><h2>${t('diagnostics')}</h2><div class="diagnostic-messages">${messages.map((m) => `<p>${esc(m)}</p>`).join('')}</div>`,
    );
  }
  function showHelp() {
    showModal(
      `<span class="eyebrow">${workbench.lang === 'ua' ? 'ВІТАЄМО В ЛАБОРАТОРІЇ' : 'HELLO, CURIOUS MIND'}</span><h2>${t('guideTitle')}</h2><p>${t('guideBody')}</p><div class="guide-rows">${[
        ['plus', 'guideAdd', 'guideAddText'],
        ['wire', 'guideWire', 'guideWireText'],
        ['play', 'guideSim', 'guideSimText'],
        ['mouse', 'guideKeys', 'guideKeysText'],
      ]
        .map(
          ([ico, a, b]) =>
            `<div class="guide-row"><span>${icon(ico, 21)}</span><div><h3>${t(a)}</h3><p>${esc(t(b)).replaceAll('\n', '<br>')}</p></div></div>`,
        )
        .join(
          '',
        )}</div><button id="got-it" class="primary-btn">${t('gotIt')}${icon('check', 16)}</button>`,
    );
    $('#got-it').onclick = closeModal;
  }

  return {
    openExamples: showExamples,
    openGuide: showComponentGuide,
    bindActions: bindLearningActions,
    updateGuideSignals,
    currentLesson,
    renderLesson,
    updateLessonSignals,
    openLaboratory: showLaboratory,
    openDiagnostics: showDiagnostics,
    openHelp: showHelp,
  };
}
