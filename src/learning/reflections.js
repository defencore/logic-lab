const KEY = 'logic-lab.lesson-reflections.v1';
export function createLessonReflections(storage) {
  let entries = {};
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries = parsed;
  } catch {}
  const get = (id) => {
    const value = entries[id];
    return {
      prediction: typeof value?.prediction === 'string' ? value.prediction.slice(0, 2000) : '',
      explanation: typeof value?.explanation === 'string' ? value.explanation.slice(0, 2000) : '',
      observation: typeof value?.observation === 'string' ? value.observation.slice(0, 5000) : '',
    };
  };
  function save(id, patch) {
    entries[id] = { ...get(id), ...patch };
    // Bound local notes to the most recently used 150 steps.
    const recent = Object.entries(entries)
      .filter(([key]) => key !== id)
      .slice(-149);
    entries = Object.fromEntries([...recent, [id, entries[id]]]);
    try {
      storage?.setItem(KEY, JSON.stringify(entries));
      return !!storage;
    } catch {
      return false;
    }
  }
  return { get, save };
}
