// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A traffic-light block turns three digital lamp commands into a visible signal. It accepts red, amber, red plus amber and green alone, while only green alone permits movement.',
    'Блок світлофора перетворює три цифрові команди на видимі лампи. Коректні червоний, жовтий, червоний із жовтим та окремий зелений; рух дозволяє лише окремий зелений.',
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
      'Test red, red plus amber, green and amber in sequence. Red plus amber remains a stop command. Then test darkness and green combined with either other lamp; those are invalid. The block has no hidden timing controller.',
      'Послідовно перевірте червоний, червоний із жовтим, зелений та жовтий. Червоний із жовтим лишається командою зупинки. Темрява та зелений разом з іншою лампою некоректні. Прихованого контролера часу немає.',
    ],
  ],
  experiment: [
    'Leave GREEN=1 and also set RED=1, then remove RED. Watch VALID and GO drop and recover while the physical lamp commands remain visible.',
    'Залиште GREEN=1 та додайте RED=1, потім приберіть RED. Спостерігайте зникнення й відновлення VALID/GO, поки команди ламп лишаються видимими.',
  ],
  expected: [
    'Red only, amber only, red plus amber and green only give VALID=1. Only green alone gives GO=1; all other combinations remain stop commands.',
    'Окремий червоний, окремий жовтий, червоний із жовтим та окремий зелений дають VALID=1. Лише окремий зелений дає GO=1; решта комбінацій не дозволяє проїзд.',
  ],
  pitfalls: [
    [
      'Red plus amber is a valid stop phase preparing for green. VALID checks the supported lamp combinations, not country-specific timing, flashing modes or the safety of an entire junction.',
      'Червоний із жовтим — коректна фаза зупинки перед зеленим. VALID перевіряє підтримані комбінації ламп, а не місцеві інтервали, миготіння чи безпеку всього перехрестя.',
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
      'GREEN: high lights the green lamp; RED and YELLOW must both be low to permit movement.',
      'GREEN: одиниця вмикає зелену; для дозволу руху RED та YELLOW мають бути нулями.',
    ],
  },
  outputs: {
    valid: [
      'VALID: 1 for red only, amber only, red plus amber or green only. Darkness or green with another lamp gives 0.',
      'VALID: 1 для червоного, жовтого, червоного з жовтим або окремого зеленого. Темрява чи зелений з іншою лампою дають 0.',
    ],
    go: ['GO: 1 only for GREEN=1 with RED=YELLOW=0.', 'GO: 1 лише при GREEN=1 та RED=YELLOW=0.'],
  },
  examples: ['traffic-light', 'traffic-junction'],
};
