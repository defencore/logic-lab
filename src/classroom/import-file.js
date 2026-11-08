import { boundedJson, SEQUENCE_LIMITS } from '../experiments/actions.js';
import { FileImportError, assertFileType, invalidFile, fileKind } from '../shared/file-errors.js';

/** Read one bounded, classified envelope before a validator can change any application state. */
export function parseClassroomImport(source, expected, validate = (value) => value) {
  if (typeof source !== 'string') throw new FileImportError('file_unreadable', { expected });
  if (new TextEncoder().encode(source).length > SEQUENCE_LIMITS.bytes)
    throw new FileImportError('file_too_large', { expected });
  let value;
  try {
    value = boundedJson(source);
  } catch (error) {
    throw new FileImportError(
      error instanceof SyntaxError ? 'file_invalid_json' : 'file_invalid_data',
      { expected },
      error,
    );
  }
  assertFileType(value, expected);
  const details = { expected, actual: fileKind(value) };
  try {
    const result = validate(value);
    return result && typeof result.then === 'function'
      ? result.catch((error) => {
          throw invalidFile(error, details);
        })
      : result;
  } catch (error) {
    throw invalidFile(error, details);
  }
}
