import { TEXT } from '../locales/index.js';
import { loadProject, loadProjectRecovery } from '../circuits/project.js';
import { createExample } from '../../examples/index.js';
import { SIMULATION_RATES, TIME_WINDOWS } from '../signals/time.js';
export const boundCoordinate = (value) => Math.max(-1_000_000, Math.min(1_000_000, value));
export const uid = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
export function createApplicationModel() {
  let lang = 'en';
  try {
    lang =
      localStorage.getItem('logic-lab.language') ||
      (navigator.language.startsWith('uk') ? 'ua' : 'en');
  } catch {}
  if (!TEXT[lang]) lang = 'en';
  let timeBase = 1,
    simulationRate = 1;
  try {
    const settings = JSON.parse(localStorage.getItem('logic-lab.simulation') || '{}');
    if (SIMULATION_RATES.includes(settings.rate)) simulationRate = settings.rate;
    if (TIME_WINDOWS.includes(settings.timeBase)) timeBase = settings.timeBase;
  } catch {}
  const project = loadProject() || createExample('half-adder');
  return {
    lang,
    project,
    projectRecovery: loadProjectRecovery(),
    timeBase,
    simulationRate,
    runtime: null,
    running: true,
    inspectorTab: 'properties',
    lessonOpen: true,
    compactLessonOpen: false,
    workspaceView: 'canvas',
    compactLayout: window.matchMedia('(max-width: 1200px), (max-height: 720px)'),
    lessonStep: 0,
    highlighted: new Set(),
    tool: 'select',
    spaceHeld: false,
    shiftHeld: false,
    suppressPanClick: false,
    category: 'all',
    query: '',
    selected: new Set(),
    selectedWire: null,
    pending: null,
    gesture: null,
    view: project.viewport || { x: 0, y: 0, zoom: 1 },
    monitorOpen: false,
    undoStack: [],
    redoStack: [],
    storageTimer: null,
    toastTimer: null,
    lastFrame: null,
  };
}
export function createLocalization(state) {
  return {
    t: (key) => TEXT[state.lang][key] || key,
    title: (def) => (state.lang === 'ua' ? def.ua || def.label : def.label),
  };
}
