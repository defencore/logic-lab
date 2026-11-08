const KEY = 'logic-lab.lesson-reflections.v1';
const note = (value) => ({
  prediction: typeof value?.prediction === 'string' ? value.prediction.slice(0, 2000) : '',
  explanation: typeof value?.explanation === 'string' ? value.explanation.slice(0, 2000) : '',
  observation: typeof value?.observation === 'string' ? value.observation.slice(0, 5000) : '',
});
export function createLessonReflections(storage) {
  let entries = {};
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries = parsed;
  } catch {}
  const get = (id) => note(entries[id]);
  function persist() {
    entries = Object.fromEntries(Object.entries(entries).slice(-150));
    try {
      storage?.setItem(KEY, JSON.stringify(entries));
      return !!storage;
    } catch {
      return false;
    }
  }
  function save(id, patch) {
    const value = note({ ...get(id), ...patch });
    delete entries[id];
    entries[id] = value;
    return persist();
  }
  function startNew(example) {
    const run = crypto.randomUUID();
    for (const [id, value] of Object.entries(entries)) {
      if (!id.startsWith(`${example}:`)) continue;
      entries[`archive:${run}:${id}`] = note(value);
      delete entries[id];
    }
    return persist();
  }
  function history(example) {
    const result = new Map();
    for (const [key, value] of Object.entries(entries)) {
      const match = /^archive:([^:]+):(.+):([0-9]+)$/.exec(key);
      if (!match || match[2] !== example) continue;
      if (!result.has(match[1])) result.set(match[1], []);
      result.get(match[1]).push({ step: Number(match[3]), ...note(value) });
    }
    return [...result].reverse().map(([id, steps]) => ({ id, steps }));
  }
  return { get, save, startNew, history };
}

export function reflectionText(value, { language, title, step }) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  return `${L('Навчальне спостереження', 'Learning observation')}: ${title} · ${L('крок', 'step')} ${step + 1}\n${L('Прогноз', 'Prediction')}: ${value.prediction || '—'}\n${L('Збережені покази', 'Captured readings')}:\n${value.observation || '—'}\n${L('Пояснення', 'Explanation')}: ${value.explanation || '—'}`;
}
