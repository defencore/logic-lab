export function reviewItem({ id = 'work', name = id, rows = 1, signals = 1, mismatches = 0 } = {}) {
  const probes = Array.from({ length: signals }, (_, index) => ({
    node: `source-${index + 1}`,
    port: 'out',
    side: 'outputs',
  }));
  const project = {
    nodes: probes.map((probe, index) => ({
      id: probe.node,
      type: 'switch',
      label: `Source ${index + 1}`,
    })),
  };
  return {
    submission: {
      id,
      student: { name, id, group: 'Group' },
      assignment: { title: 'Task', variant: { id: `${id}-variant` } },
      project,
      sequence: { probes, actions: [] },
      observations: [{ at: 0, after: -1, values: ['untrusted-claim'] }],
      notes: 'Student explanation',
    },
    result: {
      functionalPassed: !mismatches,
      passed: !mismatches,
      matched: rows * signals - mismatches,
      totalChecks: rows * signals,
      mismatches: Array.from({ length: mismatches }, (_, index) => ({
        at: index / 10,
        after: index,
        probe: probes[0],
        expected: 0,
        actual: `difference-${index + 1}`,
      })),
      studentObservations: Array.from({ length: rows }, (_, row) => ({
        at: row / 10,
        after: row - 1,
        values: probes.map((_, signal) => `row-${row}-signal-${signal}`),
      })),
      integrity: true,
      structureMatches: true,
      observationsMatch: true,
      evidence: { actions: rows, constructionChanges: 2 },
    },
  };
}

export function reviewState(...batch) {
  return {
    teacherKey: { referenceProject: batch[0]?.submission.project },
    batch,
    pairs: [],
    batchErrors: [],
  };
}

export function similarityState(count = 16) {
  const state = reviewState(
    ...Array.from({ length: count }, (_, index) =>
      reviewItem({ id: `s${index}`, name: `Learner ${index}` }),
    ),
  );
  state.pairs.push({ a: 0, b: 1, resultsExact: true, reasons: ['results'] });
  for (let a = 0; a < count; a++)
    for (let b = a + 1; b < count; b++) state.pairs.push({ a, b, sharedAttempt: true });
  return state;
}

export function reviewTarget(dataset = {}, { value = '', id = '', disabled = false } = {}) {
  return {
    dataset,
    value,
    id,
    disabled,
    matches: (selector) =>
      selector === '[data-review-page-input]' && dataset.reviewPageInput !== undefined,
    closest(selector) {
      return selector === '[data-review-page]'
        ? dataset.reviewPage !== undefined
          ? this
          : null
        : dataset.reviewOpen !== undefined || dataset.reviewReplay !== undefined
          ? this
          : null;
    },
  };
}
