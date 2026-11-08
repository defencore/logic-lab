const kinds = {
  'logic-lab-assignment': 'assignment',
  'logic-lab-assignment-key': 'teacher-key',
  'logic-lab-student-work': 'student-work',
  'logic-lab-submission': 'submission',
  'logic-lab-sequence': 'sequence',
  'logic-lab-review': 'review',
};
const messages = {
  file_wrong_kind: 'The selected file has a different Logic Lab file type.',
  file_unknown_kind: 'Unsupported Logic Lab file format.',
  file_unsupported_version: 'Unsupported Logic Lab file version.',
  file_invalid_json: 'The file contains invalid JSON.',
  file_checksum:
    'The work file checksum does not match. The original file has been changed or damaged.',
  file_invalid_data: 'The file contains invalid or unsupported data.',
  file_unreadable: 'The selected file could not be read.',
  file_too_large: 'Logic Lab files must be at most 10 MB.',
};

/** Machine-readable import failures keep format decisions separate from interface wording. */
export class FileImportError extends Error {
  constructor(code, details = {}, cause) {
    super(messages[code] || code, cause ? { cause } : undefined);
    this.name = 'FileImportError';
    this.code = code;
    Object.assign(this, details);
  }
}

export function fileKind(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unknown';
  if (Object.hasOwn(kinds, value.kind)) return kinds[value.kind];
  if (!value.kind && Array.isArray(value.nodes) && Array.isArray(value.wires)) return 'project';
  return 'unknown';
}

export function assertFileType(value, expected) {
  const actual = fileKind(value);
  if (actual !== 'unknown' && value.version !== 1)
    throw new FileImportError('file_unsupported_version', {
      actual,
      expected,
      version: value.version,
    });
  const accepted = expected === 'student-work' ? ['student-work', 'submission'] : [expected];
  if (!accepted.includes(actual))
    throw new FileImportError(actual === 'unknown' ? 'file_unknown_kind' : 'file_wrong_kind', {
      actual,
      expected,
    });
  return value;
}

export function invalidFile(error, details) {
  return error instanceof FileImportError
    ? error
    : new FileImportError('file_invalid_data', details, error);
}
