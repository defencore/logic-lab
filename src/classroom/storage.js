import { parseSequence } from '../experiments/actions.js';
import { parseAssignment, validateAttempt } from '../assessment/index.js';

const PROFILE = 'logic-lab.classroom-profile';
const DRAFT = 'logic-lab.classroom-draft';
const fields = (value) => ({
  name: typeof value?.name === 'string' ? value.name.slice(0, 200) : '',
  id: typeof value?.id === 'string' ? value.id.slice(0, 100) : '',
  group: typeof value?.group === 'string' ? value.group.slice(0, 100) : '',
});
const parse = (storage, key) => {
  try {
    return JSON.parse(storage?.getItem(key) || 'null');
  } catch {
    return null;
  }
};
const checked = (value, validate) => {
  try {
    return value ? validate(value) : null;
  } catch {
    return null;
  }
};
export function readClassroomStorage(storage) {
  const profile = parse(storage, PROFILE);
  const draft = parse(storage, DRAFT);
  const assignment = checked(draft?.assignment, (value) => parseAssignment(JSON.stringify(value)));
  return {
    mode: profile?.mode === 'teacher' ? 'teacher' : 'student',
    student: fields(profile?.student),
    assignment,
    attempt: assignment
      ? checked(draft?.attempt, (value) => validateAttempt(value, assignment))
      : null,
    sequence: checked(draft?.sequence, (value) => parseSequence(JSON.stringify(value))),
    notes: typeof draft?.notes === 'string' ? draft.notes.slice(0, 10000) : '',
    teacherForm: sanitizeTeacherForm(draft?.teacherForm),
  };
}
export function sanitizeTeacherForm(value = {}) {
  return {
    title: typeof value?.title === 'string' ? value.title.slice(0, 200) : '',
    instructions: typeof value?.instructions === 'string' ? value.instructions.slice(0, 10000) : '',
    starterMode: value?.starterMode === 'components' ? 'components' : 'interfaces',
    studentIds: typeof value?.studentIds === 'string' ? value.studentIds.slice(0, 5000) : '',
    probes: Array.isArray(value?.probes)
      ? value.probes.filter((item) => typeof item === 'string').slice(0, 32)
      : null,
  };
}
export function createClassroomStorage(storage, onFailure = () => {}) {
  let warned = false;
  function write(key, value) {
    try {
      if (!storage) throw new Error('Browser storage is unavailable.');
      storage.setItem(key, JSON.stringify(value));
      warned = false;
      return true;
    } catch {
      if (!warned) onFailure();
      warned = true;
      return false;
    }
  }
  return {
    load: () => readClassroomStorage(storage),
    saveProfile: ({ mode, student }) => write(PROFILE, { mode, student: fields(student) }),
    saveDraft: ({ assignment, attempt, sequence, notes, teacherForm }) =>
      write(DRAFT, {
        assignment,
        attempt,
        sequence,
        notes,
        teacherForm: sanitizeTeacherForm(teacherForm),
      }),
  };
}
