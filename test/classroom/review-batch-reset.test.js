import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, submissionFixture } from '../assessment/fixtures/lab-assessment.js';
import { createTeacherWorkspace } from '../../src/classroom/teacher-workspace.js';

function oldReview(key) {
  return {
    teacherKey: key,
    batch: [{ old: true }],
    pairs: [{ old: true }],
    batchErrors: ['Old error'],
    reviewPairPage: 5,
    reviewDetails: new Map([['old-submission', { rowPage: 3, observationsOpen: true }]]),
  };
}

test('a new batch clears previous pages and expanded cards once, while subsequent progress preserves new choices', async () => {
  const f = await submissionFixture();
  const state = oldReview(f.key);
  const oldDetails = state.reviewDetails;
  let updates = 0;
  const workspace = createTeacherWorkspace(state, {
    onProgress() {
      updates++;
      if (updates === 1) {
        assert.equal(state.reviewPairPage, 0);
        assert.notEqual(state.reviewDetails, oldDetails);
        assert.equal(state.reviewDetails.size, 0);
      } else if (updates === 2 && state.batch.length) {
        state.reviewDetails.set('current-submission', { rowPage: 1, observationsOpen: true });
      } else {
        assert.deepEqual(state.reviewDetails.get('current-submission'), {
          rowPage: 1,
          observationsOpen: true,
        });
      }
    },
  });
  const source = JSON.stringify(f.submission);
  await workspace.reviewFiles([
    { name: 'work.json', size: source.length, text: async () => source },
  ]);
  assert.equal(state.batch.length, 1);
  assert.equal(state.reviewPairPage, 0);
  assert.equal(state.reviewDetails.has('old-submission'), false);
  assert.deepEqual(state.reviewDetails.get('current-submission'), {
    rowPage: 1,
    observationsOpen: true,
  });
  assert.ok(updates >= 3);
});

test('a successfully opened key resets review pages, while rejected key and oversized batch imports preserve them', async () => {
  const f = fixture();
  const state = oldReview(f.key);
  const workspace = createTeacherWorkspace(state);
  const previous = structuredClone(state);
  await assert.rejects(workspace.importKey('{'), { code: 'file_invalid_json' });
  assert.deepEqual(state, previous);
  await assert.rejects(workspace.reviewFiles(Array.from({ length: 41 }, () => ({}))), /40/);
  assert.deepEqual(state, previous);
  await workspace.importKey(JSON.stringify(f.key));
  assert.equal(state.reviewPairPage, 0);
  assert.equal(state.reviewDetails.size, 0);
  assert.deepEqual(state.batch, []);
  assert.deepEqual(state.pairs, []);
});
