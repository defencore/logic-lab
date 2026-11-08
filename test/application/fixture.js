export function withDocument(t) {
  const previous = globalThis.document;
  const elements = new Map();
  globalThis.document = {
    querySelector(selector) {
      if (!elements.has(selector))
        elements.set(selector, {
          value: '',
          innerHTML: '',
          disabled: false,
          classList: { toggle() {} },
          getBoundingClientRect: () => ({ width: 800, height: 600 }),
        });
      return elements.get(selector);
    },
  };
  t.after(() => {
    if (previous) globalThis.document = previous;
    else delete globalThis.document;
  });
  return elements;
}

export function editingContext() {
  const events = [];
  return {
    state: {
      project: { name: 'Circuit', nodes: [], wires: [] },
      selected: new Set(),
      selectedWire: null,
      view: { x: 0, y: 0, zoom: 1 },
      undoStack: [],
      redoStack: [],
    },
    services: { learning: { renderLesson: () => events.push('lesson') } },
    actions: {
      cancelInteraction: () => events.push('cancel'),
      changed: (options) => events.push(['changed', options]),
      notify: (message) => events.push(['notify', message]),
      setWorkspaceView: (name) => events.push(['workspace', name]),
      checkpoint: () => events.push('checkpoint'),
    },
    t: (key) => key,
    events,
  };
}
