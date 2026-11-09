import { bindProbePicker, probePickerMarkup } from '../classroom/probe-picker.js';
import { logicChannelChoices, logicChannelId } from '../signals/logic-analyzer.js';
import { $ } from '../shared/ui.js';

const CHANNEL_LIMIT = 8;

export function openLogicAnalyzer({ state, analyzer, open, close, onApply }) {
  const L = (ua, en) => (state.lang === 'ua' ? ua : en);
  const project = state.project;
  const choices = logicChannelChoices(project, state.lang);
  const present = new Set(choices.map(logicChannelId));
  const selected = analyzer
    .channels(project)
    .map(logicChannelId)
    .filter((id) => present.has(id));
  const options = {
    choices,
    selected,
    language: state.lang,
    prefix: 'logic',
    limit: CHANNEL_LIMIT,
  };
  open(
    `<h2>${L('Логічний аналізатор', 'Logic analyzer')}</h2>
    <p>${L('Оберіть до 8 окремих цифрових контактів. Переходи фіксуються в модельному часі після встановлення стану схеми. Пунктир позначає Z, червоний — X.', 'Choose up to 8 individual digital contacts. Transitions are captured at settled simulation times. Dotted lines indicate Z and red indicates X.')}</p>
    ${probePickerMarkup(options)}
    <div class="modal-actions">
      <button type="button" id="logic-clear" class="soft-btn">${L('Автоматичні канали', 'Automatic channels')}</button>
      <button type="button" id="logic-cancel" class="soft-btn">${L('Скасувати', 'Cancel')}</button>
      <button type="button" id="logic-apply" class="primary-btn">${L('Показати вибране', 'Show selected')}</button>
    </div>`,
    true,
  );
  const picker = bindProbePicker({
    ...options,
    limitMessage: L(
      'Можна вибрати до 8 каналів. Зніміть один із вибраних.',
      'Choose up to 8 channels. Deselect one before adding another.',
    ),
    onCount: (count) => {
      $('#logic-apply').disabled = count === 0;
    },
  });
  const apply = (ids) => {
    if (state.project !== project) return close();
    const chosen = new Set(ids);
    analyzer.configure(
      project,
      choices.filter((channel) => chosen.has(logicChannelId(channel))),
    );
    close();
    onApply();
  };
  $('#logic-cancel').onclick = close;
  $('#logic-clear').onclick = () => apply([]);
  $('#logic-apply').onclick = () => apply(picker.ids());
}
