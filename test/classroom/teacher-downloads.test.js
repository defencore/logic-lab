import test from 'node:test';
import assert from 'node:assert/strict';
import { createExample } from '../../examples/index.js';
import { createAssignment, issueAssignment, parseAssignment } from '../../src/assessment/index.js';
import { studentTasksZip, reviewCsv, csvCell } from '../../src/classroom/teacher-downloads.js';
import { sequenceFor } from './fixtures/classroom-session.js';

function localEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 6, true), 0x800, 'UTF-8 file names');
    assert.equal(view.getUint16(offset + 8, true), 0, 'standard store method');
    const length = view.getUint32(offset + 18, true),
      nameLength = view.getUint16(offset + 26, true),
      extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    result.push({ name, source: new TextDecoder().decode(bytes.slice(start, start + length)) });
    offset = start + length;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50, 'central directory follows local entries');
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), result.length);
  return result;
}

test('ZIP contains only independently importable public student files and keeps the key separate', () => {
  const project = createExample('shift-register-sequence');
  const key = createAssignment({
    title: 'Зсув',
    instructions: 'Побудуйте схему.',
    referenceProject: project,
    sequence: sequenceFor(project),
  });
  const tasks = [
    issueAssignment(key, { studentId: 'студент-01' }),
    issueAssignment(key, { studentId: 'студент-02' }),
  ];
  const files = localEntries(studentTasksZip(tasks));
  assert.equal(files.length, 2);
  assert.match(files[0].name, /студент-01/);
  files.forEach((file, index) => {
    assert.deepEqual(parseAssignment(file.source), tasks[index]);
    assert.doesNotMatch(file.source, /logic-lab-assignment-key|referenceProject|"sequence"/);
    assert.doesNotMatch(file.name, /[\\/]/);
  });
  assert.throws(() => studentTasksZip([key]), /Unsupported student assignment/);
});

test('CSV escapes formula commands, quotes and multiline student explanations', () => {
  for (const value of ['=1+2', '+SUM(A1)', '-10+2', '@IMPORT', '\t=HYPERLINK'])
    assert.ok(csvCell(value).startsWith('"\''));
  const csv = reviewCsv({
    results: [
      {
        student: { id: '=BAD', name: 'Student "One"', group: 'A' },
        variant: 'v1',
        notes: 'First line\nSecond line',
        result: {
          matched: 2,
          totalChecks: 3,
          functionalPassed: false,
          integrity: true,
          reviewRequired: true,
          evidence: { constructionChanges: 4, actions: 5 },
        },
      },
    ],
  });
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv, /"'=BAD"/);
  assert.match(csv, /Student ""One""/);
  assert.match(csv, /"First line\nSecond line"/);
  assert.match(csv, /student_explanation/);
});
