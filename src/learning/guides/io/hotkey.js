// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A keyboard input turns a physical key or shortcut into one digital output Q, so you can operate a circuit without clicking its input switches.',
    'Клавіша клавіатури перетворює фізичну клавішу або комбінацію на один цифровий вихід Q, щоб керувати схемою без натискання перемикачів мишею.',
  ],
  steps: [
    [
      'Place the keyboard input and connect its single Q contact to an LED, gate input or register clock.',
      'Розмістіть клавішу клавіатури та під’єднайте її єдиний контакт Q до світлодіода, входу логічного елемента чи такту регістра.',
    ],
    [
      'Select the component and choose Assign a key in Properties, then press a physical key or Shift + K. An empty assignment means the component has no keyboard control yet.',
      'Виберіть елемент і натисніть «Призначити клавішу» у властивостях, потім саму клавішу або, наприклад, Shift + K. Порожнє призначення означає, що керування клавіатурою ще не задано.',
    ],
    [
      'Choose Hold for 1 while pressed, Inverted for 0 while pressed, or Toggle to change Q once per new press and retain it after release.',
      'Оберіть режим: «Поки утримується» видає 1 під час натискання; «Інверсний» видає 0; «Перемикати» змінює Q один раз на нове натискання й зберігає стан після відпускання.',
    ],
    [
      'Click the workspace and press the assigned key. Watch Q on the component, in Output signal or on the connected LED.',
      'Клацніть робочий простір і натисніть призначену клавішу. Спостерігайте Q на елементі, у полі «Сигнал на виході» або на під’єднаному світлодіоді.',
    ],
  ],
  experiment: [
    'Connect Q to an LED and compare all three modes: hold the key, release it, then press it twice. Record these actions and replay them to reproduce the same input changes without using the keyboard.',
    'Під’єднайте Q до світлодіода й порівняйте три режими: утримуйте клавішу, відпустіть її та натисніть двічі. Запишіть дії й відтворіть їх, щоб повторити ті самі зміни входу без клавіатури.',
  ],
  expected: [
    'Hold follows the press; inverted is high at rest and low while pressed; toggle changes only on separate new presses. Replaying the recorded experiment reproduces Q in each mode.',
    'Hold повторює натискання; inverted має 1 у спокої та 0 під час натискання; toggle змінюється лише на окремих нових натисканнях. Відтворення записаного досліду повторює Q кожного режиму.',
  ],
  pitfalls: [
    [
      'The action table records the press state as value: 0 for released and 1 for pressed in hold/inverted modes; toggle records its latched state. Inverted Q is the opposite of value. The saved binding and mode identify the assigned key and chosen behavior.',
      'У таблиці дій value означає стан натискання: 0 після відпускання та 1 під час утримання в режимах hold/inverted; toggle записує зафіксований стан. Інверсний Q протилежний value. Збережені binding і mode визначають призначену клавішу та обраний режим.',
    ],
    [
      'Use a supported plain key or a Shift combination. Ctrl, Alt and Meta combinations remain reserved for browser and operating-system commands.',
      'Використовуйте підтримувану клавішу або комбінацію із Shift. Комбінації з Ctrl, Alt і Meta залишаються для команд браузера та операційної системи.',
    ],
    [
      'The binding identifies a physical key position, independent of the current typing language. Test the captured key label before recording a laboratory experiment.',
      'Призначення визначає фізичну позицію клавіші незалежно від поточної мови введення. Перед записом лабораторної роботи перевірте підпис захопленої клавіші.',
    ],
    [
      'Keyboard autorepeat does not produce extra toggle changes. Release the key before the next press; leaving the workspace releases held inputs safely.',
      'Автоповтор клавіатури не створює додаткових перемикань toggle. Перед наступним натисканням відпустіть клавішу; вихід із робочого простору безпечно відпускає утримувані входи.',
    ],
    [
      'Typing in a text field and replaying a sequence do not activate live keyboard inputs. Assign the key and choose its mode before recording; the experiment retains the chosen setup and every input transition.',
      'Набір тексту в полі та відтворення сценарію не активують живі клавіатурні входи. Призначайте клавішу й обирайте режим до запису: сценарій зберігає налаштування та кожне перемикання входу.',
    ],
  ],
  outputs: {
    out: [
      'One digital bit Q controlled by the chosen mode and the live or recorded key presses.',
      'Один цифровий біт Q відповідно до обраного режиму й поточних або записаних натискань.',
    ],
  },
  examples: ['keyboard-inputs', 'half-adder', 'shift-register-sequence'],
};
