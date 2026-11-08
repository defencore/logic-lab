import { parseSequence, SEQUENCE_LIMITS } from '../experiments/actions.js';
import { parseAssignment, validateAttempt } from '../assessment/index.js';
import { createStoredRecovery } from '../circuits/project-storage.js';

const PROFILE = 'logic-lab.classroom-profile';
const DRAFT = 'logic-lab.classroom-draft';
export const CLASSROOM_RECOVERY_KEY = 'logic-lab.classroom-draft.recovery.v1';
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
function current(storage) {
  const profile = parse(storage, PROFILE);
  const raw = storage?.getItem(DRAFT) ?? null;
  const rejected = [];
  let draft = null;
  if (raw) {
    try {
      draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object' || Array.isArray(draft))
        throw new Error('The saved classroom draft is not an object.');
    } catch (error) {
      rejected.push(error.message);
      draft = null;
    }
  }
  function checked(value, validate, section) {
    if (value === undefined || value === null) return null;
    try {
      return validate(value);
    } catch (error) {
      rejected.push(`${section}: ${error.message}`);
      return null;
    }
  }
  const assignment = checked(
    draft?.assignment,
    (value) => parseAssignment(JSON.stringify(value)),
    'Assignment',
  );
  const attempt = assignment
    ? checked(draft?.attempt, (value) => validateAttempt(value, assignment), 'Attempt')
    : null;
  if (!assignment && draft?.attempt !== undefined && draft?.attempt !== null)
    rejected.push('The saved attempt cannot be restored without a valid assignment.');
  const sequence = checked(
    draft?.sequence,
    (value) => parseSequence(JSON.stringify(value)),
    'Action sequence',
  );
  const state = {
    mode: profile?.mode === 'teacher' ? 'teacher' : 'student',
    student: fields(profile?.student),
    assignment,
    attempt,
    sequence,
    notes: typeof draft?.notes === 'string' ? draft.notes.slice(0, 20000) : '',
    teacherForm:
      checked(draft?.teacherForm, sanitizeTeacherForm, 'Teacher form') || sanitizeTeacherForm(),
    studentBuildReady: draft?.studentBuildReady === true,
    studentDirty: draft?.studentDirty !== false,
    studentLastSaveKind: ['draft', 'submission'].includes(draft?.studentLastSaveKind)
      ? draft.studentLastSaveKind
      : null,
    studentSavedAt:
      typeof draft?.studentSavedAt === 'string' ? draft.studentSavedAt.slice(0, 100) : null,
    workOrigin:
      draft?.workOrigin &&
      /^[0-9a-f]{64}$/.test(draft.workOrigin.digest) &&
      typeof draft.workOrigin.id === 'string'
        ? { id: draft.workOrigin.id.slice(0, 100), digest: draft.workOrigin.digest }
        : null,
  };
  return { state, issue: rejected.length ? { raw, reason: rejected.join(' ') } : null };
}
export function readClassroomStorage(storage) {
  try {
    return current(storage).state;
  } catch {
    return current(null).state;
  }
}
export function sanitizeTeacherForm(value = {}) {
  const probes = value?.probes ?? null;
  const invalid = (code, message) => {
    const error = new Error(message);
    error.code = code;
    throw error;
  };
  if (probes !== null) {
    if (Array.isArray(probes) && probes.length > SEQUENCE_LIMITS.probes)
      invalid(
        'teacher_probe_limit',
        `Choose at most ${SEQUENCE_LIMITS.probes} observed signals. No selection was saved.`,
      );
    if (
      !Array.isArray(probes) ||
      probes.some(
        (probe) =>
          typeof probe !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,100}:(inputs|outputs):[a-zA-Z0-9_-]{1,100}$/.test(probe),
      ) ||
      new Set(probes).size !== probes.length
    )
      invalid(
        'teacher_probe_invalid',
        'Observed signal selections contain invalid or duplicate contacts.',
      );
  }
  return {
    title: typeof value?.title === 'string' ? value.title.slice(0, 200) : '',
    instructions: typeof value?.instructions === 'string' ? value.instructions.slice(0, 20000) : '',
    starterMode: value?.starterMode === 'components' ? 'components' : 'interfaces',
    studentIds: typeof value?.studentIds === 'string' ? value.studentIds.slice(0, 5000) : '',
    probes: probes === null ? null : [...probes],
  };
}
export function createClassroomStorage(storage, onFailure = () => {}) {
  let warned = false;
  const recovery = createStoredRecovery({
    getStorage: () => storage,
    backupKey: CLASSROOM_RECOVERY_KEY,
    kind: 'classroom-draft',
  });
  function failure() {
    if (!warned) onFailure();
    warned = true;
    return false;
  }
  function write(key, value) {
    try {
      if (!storage) throw new Error('Browser storage is unavailable.');
      if (key === DRAFT) {
        const snapshot = current(storage);
        if (snapshot.issue) {
          const original = recovery.preserve(snapshot.issue.raw, snapshot.issue.reason);
          if (!original.backedUp || original.raw !== snapshot.issue.raw || !original.handled)
            return failure();
        }
      }
      storage.setItem(key, JSON.stringify(value));
      warned = false;
      return true;
    } catch {
      return failure();
    }
  }
  function load() {
    try {
      const value = current(storage);
      if (value.issue) recovery.preserve(value.issue.raw, value.issue.reason);
      return value.state;
    } catch {
      return readClassroomStorage(null);
    }
  }
  function getRecovery() {
    try {
      const value = current(storage);
      if (value.issue) return recovery.preserve(value.issue.raw, value.issue.reason);
      return recovery.read();
    } catch {
      return recovery.read();
    }
  }
  function acknowledgeRecovery(raw) {
    const value = getRecovery();
    if (!value?.backedUp || (raw !== undefined && value.raw !== raw)) return false;
    return recovery.acknowledge(value.raw);
  }
  return {
    load,
    recovery: getRecovery,
    acknowledgeRecovery,
    saveProfile: ({ mode, student }) => write(PROFILE, { mode, student: fields(student) }),
    saveDraft: ({
      assignment,
      attempt,
      sequence,
      notes,
      teacherForm,
      studentBuildReady,
      studentDirty,
      studentLastSaveKind,
      studentSavedAt,
      workOrigin,
    }) => {
      try {
        return write(DRAFT, {
          assignment,
          attempt,
          sequence,
          notes,
          teacherForm: sanitizeTeacherForm(teacherForm),
          studentBuildReady,
          studentDirty,
          studentLastSaveKind,
          studentSavedAt,
          workOrigin,
        });
      } catch {
        return failure();
      }
    },
  };
}
