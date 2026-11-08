import { SEQUENCE_LIMITS } from '../experiments/actions.js';
import { FileImportError } from '../shared/file-errors.js';

export const cleanName = (name) =>
  String(name)
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .slice(0, 100) || 'logic-lab';
export function downloadFile(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readClassroomFile(file) {
  if (!file) throw new FileImportError('file_unreadable');
  if (file.size > SEQUENCE_LIMITS.bytes) throw new FileImportError('file_too_large');
  try {
    return await file.text();
  } catch (error) {
    throw new FileImportError('file_unreadable', {}, error);
  }
}
export function chooseClassroomFiles(onFiles, { multiple = false, onError = () => {} } = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.multiple = multiple;
  input.hidden = true;
  document.body.append(input);
  input.addEventListener(
    'change',
    () => {
      const files = [...input.files];
      input.remove();
      if (files.length)
        Promise.resolve()
          .then(() => onFiles(files))
          .catch(onError);
    },
    { once: true },
  );
  input.addEventListener('cancel', () => input.remove(), { once: true });
  input.click();
}

/** Serialize mutations while preserving the outcome of the operation that actually started. */
export function createClassroomOperations(onChange = () => {}) {
  let busy = false;
  return {
    isBusy: () => busy,
    async run(action) {
      if (busy) throw new Error('Wait for the current classroom operation to finish.');
      busy = true;
      try {
        onChange(true);
        return await action();
      } finally {
        busy = false;
        onChange(false);
      }
    },
  };
}
