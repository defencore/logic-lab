/** Browsers display their own wording after an unsaved private key requires confirmation. */
export function protectUnsavedKeys(event, classroom) {
  if (!classroom?.shouldWarnBeforeUnload?.()) return false;
  event.preventDefault();
  event.returnValue = '';
  return true;
}
