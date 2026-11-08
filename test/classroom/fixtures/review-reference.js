import { createExample } from '../../../examples/index.js';
import { createAssignment, issueAssignment } from '../../../src/assessment/index.js';
import { createSequence, appendAction, finishSequence } from '../../../src/experiments/actions.js';
import { reviewItem, reviewState } from './review.js';

export function referenceReviewFixture() {
  const project = createExample('shift-register-sequence');
  const sequence = createSequence(project, {
    probes: [{ node: 'shift', port: 'out', side: 'outputs' }],
  });
  for (let index = 0; index < 100; index++)
    appendAction(sequence, { at: index / 100, node: 'ser', key: 'value', value: index % 2 });
  finishSequence(sequence, 1.1);
  const key = createAssignment({ title: 'Reference task', referenceProject: project, sequence });
  const assignment = issueAssignment(key, { studentId: 'student' });
  const item = reviewItem({ id: 'student-work', name: 'Student' });
  Object.assign(item.submission, {
    student: { id: 'student', name: 'Student', group: 'A' },
    project,
    assignment,
    sequence: { ...sequence, actions: sequence.actions.slice(0, 2), duration: 0.02 },
  });
  item.result.mismatches = [-1, ...sequence.actions.map((_, index) => index), 100].map((after) => ({
    after,
    at: after < 0 ? 0 : after === 100 ? sequence.duration : sequence.actions[after].at,
    probe: sequence.probes[0],
    expected: 0,
    actual: 1,
  }));
  const other = reviewItem({ id: 'other-learner', name: 'Other' });
  other.submission.notes = 'Different observation';
  const state = reviewState(other, item);
  state.teacherKey = key;
  return { state, key, item };
}
