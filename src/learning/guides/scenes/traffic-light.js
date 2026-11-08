// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A traffic-light block turns three digital lamp commands into a visible signal and checks whether exactly one lamp is active.',
    'Блок світлофора перетворює три цифрові команди на видимі лампи й перевіряє, чи активна рівно одна лампа.',
  ],
  steps: [
    [
      'Connect independent switches to RED, YELLOW and GREEN. Start with RED=1 and the other two inputs at 0.',
      'Підключіть незалежні перемикачі до RED, YELLOW та GREEN. Почніть з RED=1 та двох інших нулів.',
    ],
    [
      'Connect VALID and GO to LEDs, then open the traffic-light scene from 3D to compare the visible lamps with these outputs.',
      'Підключіть VALID та GO до світлодіодів і відкрийте сцену світлофора через 3D для порівняння ламп із виходами.',
    ],
    [
      'Test red only, amber only, green only, all off and multiple lamps on. This component has no timing parameters or hidden controller.',
      'Перевірте окремо червоний, жовтий, зелений, усі вимкнені й кілька ввімкнених. Блок не має параметрів часу чи прихованого контролера.',
    ],
  ],
  experiment: [
    'Leave GREEN=1 and also set RED=1, then remove RED. Watch VALID and GO drop and recover while the physical lamp commands remain visible.',
    'Залиште GREEN=1 та додайте RED=1, потім приберіть RED. Спостерігайте зникнення й відновлення VALID/GO, поки команди ламп лишаються видимими.',
  ],
  expected: [
    'Exactly one lamp gives VALID=1. Only the green-only combination gives GO=1; the other seven input combinations do not grant passage.',
    'Рівно одна лампа дає VALID=1. Лише окремий зелений дає GO=1; інші сім комбінацій не дозволяють проїзд.',
  ],
  pitfalls: [
    [
      'This intentionally simplified model rejects red plus amber together. It does not implement country-specific traffic rules or automatically sequence the lamps.',
      'Ця спрощена модель не приймає одночасний червоний із жовтим. Вона не реалізує правила окремої країни чи автоматичне перемикання.',
    ],
    [
      'Drive every lamp input with a known bit; an unconnected Z is not a deliberate all-off command. VALID describes lamp consistency, not a complete road-safety assessment.',
      'Задайте кожній лампі визначений біт; непідключений Z не є навмисною командою вимкнення. VALID описує узгодженість ламп, а не повну безпеку дороги.',
    ],
  ],
  inputs: {
    red: ['RED: high lights the stop lamp.', 'RED: одиниця вмикає червону лампу зупинки.'],
    yellow: [
      'YELLOW: high lights the amber caution lamp.',
      'YELLOW: одиниця вмикає жовту попереджувальну лампу.',
    ],
    green: [
      'GREEN: high lights the green lamp; passage still requires a valid one-lamp state.',
      'GREEN: одиниця вмикає зелену; дозвіл додатково потребує правильного стану однієї лампи.',
    ],
  },
  outputs: {
    valid: [
      'VALID: 1 only when exactly one of RED, YELLOW and GREEN is high.',
      'VALID: 1 лише тоді, коли рівно один RED, YELLOW чи GREEN має 1.',
    ],
    go: ['GO: 1 only for GREEN=1 with RED=YELLOW=0.', 'GO: 1 лише при GREEN=1 та RED=YELLOW=0.'],
  },
  examples: ['traffic-light', 'traffic-junction'],
};
