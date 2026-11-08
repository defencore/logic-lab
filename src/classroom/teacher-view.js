import { publicStarterPreview } from '../assessment/assignment-revision.js';
import { teacherStatus, probeKey } from './teacher-state.js';
import { starterPreviewMarkup } from './starter-preview.js';
import { teacherReferenceMarkup } from './teacher-reference-view.js';
import { esc } from '../shared/ui.js';

export function createTeacherView({ state, language, project, possibleProbes, reviewMarkup }) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  const form = state.teacherForm,
    key = state.teacherKey;
  const locked = !!(state.recording || state.player || state.preview || state.busy);
  const status = teacherStatus(state, project);
  const button = (id, label, disabled = false, primary = false) =>
    `<button type="button" id="${id}" class="${primary ? 'primary-btn' : 'soft-btn'}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  function editStatusMarkup() {
    return status.usingSavedReference
      ? L(
          'Видача використовує збережений еталон ключа. Поточну змінену схему або сценарій редактора НЕ застосовано. Щоб використати їх, запишіть новий сценарій і створіть новий ключ.',
          'Issuing uses the saved key reference. The changed editor circuit or sequence is NOT applied. Record a new sequence and create a new key to use it.',
        )
      : status.structuralChanged || status.referenceChanged
        ? L(
            'Змінено еталон, сценарій, контрольні виходи або заготовку. Потрібен новий ключ; попередній ключ і видані варіанти буде збережено окремо.',
            'The reference, sequence, observed outputs or starter changed. Create a new key; the previous key and variants will remain available separately.',
          )
        : status.metadataChanged
          ? L(
              'Є незастосовані зміни назви або умови. Застосуйте їх перед формуванням чи завантаженням варіантів.',
              'The title or instructions have unapplied changes. Apply them before generating or downloading variants.',
            )
          : key
            ? L(
                'Форма відповідає застосованому ключу. Варіанти міститимуть показану умову.',
                'The form matches the applied key. Variants will contain the displayed instructions.',
              )
            : L(
                'Ключ ще не створено. Форма зберігається локально; приватний ключ потрібно завантажити окремо.',
                'No key has been created. The form is saved locally; the private key must be downloaded separately.',
              );
  }
  function starterPreview() {
    try {
      const variant = state.issued?.[Number(state.teacherPreviewIndex) || 0];
      return starterPreviewMarkup(key ? publicStarterPreview(key, variant?.id) : null, language);
    } catch {
      return starterPreviewMarkup(null, language);
    }
  }
  function archivesMarkup() {
    const archives = state.teacherArchives || [];
    return archives.length
      ? `<details class="teacher-archives"><summary>${L('Попередні ключі та варіанти в цій сесії', 'Previous keys and variants in this session')} (${archives.length})${archives.some((entry) => entry.downloaded !== true) ? ` · <span class="teacher-archive-status" data-unsaved="true">${L('є незавантажені ключі', 'some keys are not downloaded')}</span>` : ''}</summary><p>${L('Приватні ключі не записуються у сховище браузера. Завантажте потрібні оригінали до закриття сторінки.', 'Private keys are not stored in browser storage. Download the originals you need before closing the page.')}</p>${archives.map((entry, index) => `<div><strong>${esc(entry.key.title)}</strong> · ${esc(entry.key.id.slice(0, 8))} · ${entry.key.issued.length} ${L('варіантів', 'variants')}<span class="teacher-archive-status" data-unsaved="${entry.downloaded !== true}">${entry.downloaded ? L('Ключ завантажено', 'Key downloaded') : L('Ключ ще не завантажено', 'Key not downloaded yet')}</span><button class="soft-btn" data-archive-key="${index}">${L('Ключ окремо', 'Separate key')}</button><button class="soft-btn" data-archive-tasks="${index}" ${entry.key.issued.length ? '' : 'disabled'}>${L('Лише студентські файли ZIP', 'Student files only ZIP')}</button></div>`).join('')}</details>`
      : '';
  }
  function teacherPanel() {
    const probes = possibleProbes();
    const warnings = [];
    if (state.referenceWarnings?.constant)
      warnings.push(
        L(
          'Обрані виходи не змінюються. Додайте запис, читання, скидання або різні входи.',
          'Selected outputs never change. Add writes, reads, resets or varied inputs.',
        ),
      );
    if (state.referenceWarnings?.undefined)
      warnings.push(
        L(
          'Еталон містить X або Z. Усуньте невизначені контрольні сигнали перед видачею.',
          'The reference contains X or Z. Resolve undefined observed signals before issuing.',
        ),
      );
    return `<section class="classroom-section teacher-workflow"><h3>${L('Підготовка й видача завдання', 'Prepare and distribute an assignment')}</h3><ol class="teacher-route" aria-label="${L('Шлях викладача', 'Instructor workflow')}">${['Еталон|Reference', 'Сценарій|Sequence', 'Контрольні виходи|Observed outputs', 'Заготовка|Starter', 'Варіанти|Variants', 'Видача|Download'].map((pair, index) => `<li><a href="#teacher-step-${index + 1}">${index + 1}. ${esc(pair.split('|')[language === 'ua' ? 0 : 1])}</a></li>`).join('')}</ol><div class="classroom-fields"><label>${L('Назва роботи', 'Assignment title')}<input id="task-title" maxlength="200" value="${esc(form.title || project.name)}"></label></div><label>${L('Умова та критерії', 'Instructions and criteria')}<textarea id="task-instructions" rows="3" maxlength="20000">${esc(form.instructions)}</textarea></label><div id="teacher-edit-status" class="teacher-state" role="status" data-dirty="${status.dirty}"><p id="teacher-status-message">${editStatusMarkup()}</p><div class="classroom-actions">${button('teacher-apply', L('Застосувати зміни умови', 'Apply instruction changes'), !status.metadataChanged || status.structuralChanged || (status.referenceChanged && !status.usingSavedReference) || locked)}${button('teacher-discard', L('Використовувати збережений еталон ключа', 'Use the saved key reference'), !key || !status.dirty || locked)}</div></div>
    <section id="teacher-step-1" class="teacher-step"><h4>1. ${L('Еталонна схема', 'Reference circuit')}</h4>${teacherReferenceMarkup({ key, project, language, locked })}${button('teacher-edit-circuit', L('Повернутися до поточної схеми', 'Return to the current circuit'), locked)}</section>
    <section id="teacher-step-2" class="teacher-step"><h4>2. ${L('Перевірочний сценарій', 'Reference test sequence')}</h4><p><strong>${L('Запис поточної роботи', 'Current work recording')}:</strong> ${state.sequence ? `${state.sequence.actions.length} ${L('дій', 'actions')} · ${state.sequence.duration.toFixed(3)} s` : L('Запису ще немає.', 'No sequence yet.')}</p><p class="classroom-hint">${L('Для нового ключа запишіть поточну схему. Видані варіанти продовжують використовувати сценарій застосованого ключа, показаний вище.', 'Record the current circuit for a new key. Issued variants keep using the applied key sequence shown above.')}</p>${button('teacher-record-sequence', L('Відкрити запис дій', 'Open action recording'), locked)}</section>
    <section id="teacher-step-3" class="teacher-step"><h4>3. ${L('Контрольні виходи', 'Observed outputs')}</h4><fieldset class="classroom-probes"><legend>${L('Що перевіряти', 'Observed signals')} <small>≤32</small></legend>${probes.map((probe, index) => `<label><input type="checkbox" data-task-probe="${index}" ${form.probes === null ? (index < 8 ? 'checked' : '') : form.probes.includes(probeKey(probe)) ? 'checked' : ''}>${esc(probe.label)}</label>`).join('') || `<p>${L('Додайте індикатор, пам’ять чи регістр до еталона.', 'Add an indicator, memory or register to the reference.')}</p>`}</fieldset></section>
    <section id="teacher-step-4" class="teacher-step"><h4>4. ${L('Заготовка студента', 'Student starter')}</h4><label>${L('Заготовка студента', 'Student starter')}<select id="task-starter"><option value="interfaces" ${form.starterMode === 'interfaces' ? 'selected' : ''}>${L('Лише входи та контрольні виходи', 'Inputs and observed outputs only')}</option><option value="components" ${form.starterMode === 'components' ? 'selected' : ''}>${L('Усі елементи без з’єднань', 'All components without wiring')}</option></select></label><p class="classroom-hint">${L('Внутрішні компоненти, обрані для спостереження, залишаться у заготовці й можуть підказати рішення. Для самостійного вибору елементів обирайте зовнішні індикатори.', 'Observed internal components remain in the starter and may reveal part of the solution. Choose external indicators when students should choose their own components.')}</p><div class="classroom-actions">${button('teacher-create', key ? L('Створити новий ключ з еталона', 'Create a new reference key') : L('Створити ключ з еталона', 'Create reference key'), !state.sequence?.actions.length || locked, true)}${button('teacher-key-import', L('Відкрити ключ викладача', 'Open instructor key'), locked)}</div>${warnings.map((message) => `<p class="classroom-error">${esc(message)}</p>`).join('')}<h4>${L('Попередній перегляд застосованого завдання', 'Preview of the applied assignment')}</h4>${state.issued?.length ? `<label>${L('Переглянути виданий варіант', 'Preview an issued variant')}<select id="teacher-preview-variant">${state.issued.map((task, index) => `<option value="${index}" ${index === (Number(state.teacherPreviewIndex) || 0) ? 'selected' : ''}>${esc(task.variant.studentId || task.variant.id)}</option>`).join('')}</select></label>` : ''}<div id="teacher-starter-preview">${starterPreview()}</div></section>
    <section id="teacher-step-5" class="teacher-step"><h4>5. ${L('Індивідуальні варіанти', 'Individual variants')}</h4><label>${L('Ідентифікатори студентів, по одному в рядку', 'Student IDs, one per line')}<textarea id="issue-students" rows="3" placeholder="student-01&#10;student-02">${esc(form.studentIds)}</textarea></label>${button('teacher-issue', L('Сформувати варіанти', 'Generate variants'), !key || status.dirty || locked || !!state.referenceWarnings?.undefined, true)}<p class="classroom-hint">${L('Спочатку перегляньте заготовку вище. Варіанти створюються лише із застосованого ключа.', 'Inspect the starter above first. Variants are generated only from the applied key.')}</p></section>
    <section id="teacher-step-6" class="teacher-step"><h4>6. ${L('Завантаження й передача', 'Download and distribute')}</h4><div class="teacher-key-state" data-unsaved="${status.keyNeedsDownload}"><p>${!key ? L('Ключ ще не створено. Збереження форми не зберігає розв’язання чи реєстр варіантів.', 'No key exists yet. Saving the form does not save the solution or issued registry.') : status.keyNeedsDownload ? L('Актуальний ключ ще не завантажено. Він містить розв’язання й оновлений реєстр варіантів; завантажте його до закриття сторінки.', 'The current key has not been downloaded. It contains the solution and updated variant registry; download it before closing the page.') : L('Поточну версію ключа завантажено або відновлено з файла. Ключ приватний і не передається студентам.', 'The current key was downloaded or restored from a file. Keep it private and do not distribute it to students.')}</p>${button('teacher-key-export', L('Завантажити застосований ключ окремо', 'Download applied key separately'), !key || locked, status.keyNeedsDownload)}</div>${button('teacher-tasks-zip', L('Завантажити всі студентські файли ZIP', 'Download all student files ZIP'), !state.issued?.length || status.dirty || locked)}<p>${L('ZIP містить лише публічні завдання студентів. Ключ із розв’язанням завантажується окремо.', 'The ZIP contains only public student assignments. Download the solution key separately.')}</p>${state.issued?.length ? `<ul class="issued-assignments">${state.issued.map((task, index) => `<li><span>${esc(task.variant.studentId)} · ${esc(task.variant.id.slice(0, 8))}</span><button type="button" class="soft-btn" data-task-download="${index}" ${status.dirty ? 'disabled' : ''}>${L('Файл студента', 'Student file')}</button></li>`).join('')}</ul>` : ''}</section>${archivesMarkup()}</section>
    <section class="classroom-section"><h3>${L('Перевірка робіт', 'Review submissions')}</h3><p>${L('Кожна схема повторно запускається зі студентським і прихованим сценарієм. Пояснення доступне в картці; результати з файла не приймаються на віру.', 'Each circuit is rerun with student and hidden test sequences. Notes are available in each card; claimed file results are not trusted.')}</p><div class="classroom-actions">${button('teacher-review', state.busy ? L('Перевірка…', 'Checking…') : L('Завантажити роботи', 'Load submissions'), !key || locked, true)}${button('teacher-report', L('Зберегти повний звіт JSON', 'Save full JSON report'), !state.batch?.length || locked)}${button('teacher-report-csv', L('Зберегти таблицю CSV', 'Save CSV table'), !state.batch?.length || locked)}</div><div id="review-results" aria-live="polite">${reviewMarkup()}</div></section>`;
  }
  return { teacherPanel, starterPreviewMarkup: starterPreview, editStatusMarkup };
}
