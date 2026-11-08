const labels = {
  assignment: ['завдання викладача', 'an instructor assignment'],
  'teacher-key': ['ключ викладача', 'an instructor key'],
  'student-work': ['чернетка роботи студента', 'a student work draft'],
  submission: ['робота для викладача', 'an instructor submission'],
  project: ['файл схеми', 'a circuit project'],
  sequence: ['сценарій дій', 'an action sequence'],
  review: ['звіт перевірки', 'a review report'],
};

export function fileErrorMessage(error, { language = 'ua', mode = 'student' } = {}) {
  if (!error?.code?.startsWith('file_')) return error?.message || String(error);
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const route = (kind) =>
    ({
      assignment: L(
        'Відкрийте його через «Студент» → «Відкрити завдання викладача».',
        'Open it through Student → Open instructor assignment.',
      ),
      project: L(
        'Відкрийте його в меню «Файли проєкту» → «Імпорт проєкту».',
        'Open it in Project files → Import project.',
      ),
      sequence: L(
        'Відкрийте його через «Сценарій дій» → «Відкрити сценарій».',
        'Open it through Action sequence → Open sequence.',
      ),
      'teacher-key':
        mode === 'teacher'
          ? L(
              'Відкрийте його через «Викладач» → «Відкрити ключ викладача».',
              'Open it through Instructor → Open instructor key.',
            )
          : L(
              'Ключ відкривають лише в режимі «Викладач» → «Відкрити ключ викладача». Для виконання роботи попросіть викладача видати файл вашого завдання.',
              'Keys open only in Instructor → Open instructor key. To complete your work, ask your instructor for your assignment file.',
            ),
      'student-work': L(
        'Відкрийте його через «Студент» → «Відкрити мою роботу».',
        'Open it through Student → Open my work.',
      ),
      submission:
        mode === 'teacher'
          ? L(
              'Додайте його до перевірки робіт у режимі «Викладач». Для продовження роботи скористайтеся «Студент» → «Відкрити мою роботу».',
              'Add it to work review in Instructor mode. To resume the work, use Student → Open my work.',
            )
          : L(
              'Відкрийте його через «Студент» → «Відкрити мою роботу».',
              'Open it through Student → Open my work.',
            ),
      review: L(
        'Звіт призначений для перегляду результатів і не імпортується як робота або завдання.',
        'A report contains review results and cannot be imported as a work or assignment file.',
      ),
    })[kind] || '';
  const original = L(
    'Спробуйте ще раз з оригінальним файлом або попросіть надіслати його повторно. Поточну роботу не змінено.',
    'Try the original file again or ask for a fresh copy. Your current work is unchanged.',
  );
  if (
    error.actual === 'teacher-key' &&
    ['file_unsupported_version', 'file_invalid_data'].includes(error.code)
  ) {
    const reason =
      error.code === 'file_unsupported_version'
        ? L(
            'Ця версія ключа викладача не підтримується.',
            'This instructor key version is unsupported.',
          )
        : L(
            'Ключ викладача містить застарілі, непідтримувані або пошкоджені дані.',
            'The instructor key contains obsolete, unsupported or damaged data.',
          );
    const recovery =
      mode === 'teacher'
        ? L(
            'Отримайте актуальний ключ і відкрийте його в режимі «Викладач» → «Відкрити ключ викладача».',
            'Get a current key and open it in Instructor → Open instructor key.',
          )
        : L(
            'Попросіть викладача використати актуальний ключ у режимі «Викладач» і видати вам новий файл завдання. Відкрийте завдання через «Відкрити завдання викладача».',
            'Ask your instructor to use a current key in Instructor mode and issue a new assignment file. Open the assignment with Open instructor assignment.',
          );
    return `${reason} ${recovery} ${L('Поточний ключ і роботу не змінено.', 'Your current key and work are unchanged.')}`;
  }
  if (error.code === 'file_wrong_kind')
    return `${L('Це', 'This is')} ${labels[error.actual]?.[language === 'ua' ? 0 : 1] || L('інший файл', 'a different file')}. ${route(error.actual)}`;
  if (error.code === 'file_unsupported_version') {
    return `${L('Ця версія файла не підтримується. Отримайте актуальний файл.', 'This file version is unsupported. Get a current file.')} ${route(error.actual)} ${L('Поточну роботу не змінено.', 'Your current work is unchanged.')}`;
  }
  const reasons = {
    file_invalid_json: L(
      'Файл містить пошкоджений або незавершений JSON.',
      'The file contains damaged or incomplete JSON.',
    ),
    file_checksum: L(
      'Перевірка цілісності не пройдена: файл змінено після збереження або пошкоджено.',
      'The integrity check failed: the file was changed after export or is damaged.',
    ),
    file_invalid_data: L(
      'Файл містить пошкоджені або непідтримувані дані.',
      'The file contains damaged or unsupported data.',
    ),
    file_unknown_kind: L(
      'Це не впізнаваний файл Logic Lab для цієї дії.',
      'This is not a recognized Logic Lab file for this action.',
    ),
    file_unreadable: L('Не вдалося прочитати файл.', 'The file could not be read.'),
    file_too_large: L(
      'Файл перевищує допустимі 10 МБ. Виберіть менший файл Logic Lab.',
      'The file exceeds the 10 MB limit. Choose a smaller Logic Lab file.',
    ),
  };
  return reasons[error.code] ? `${reasons[error.code]} ${original}` : error.message;
}
