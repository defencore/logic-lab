// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A position sensor forwards the measured carriage coordinate and detects its relation to a fixed or live target.',
    'Датчик положення передає виміряну координату каретки та визначає її відношення до сталої або змінної цілі.',
  ],
  steps: [
    [
      'Connect stepper POS to sensor POS. Leave TARGET unwired to use Threshold, or connect an analog millimeter target such as a DAC output.',
      'Підключіть POS крокового двигуна до POS датчика. Без TARGET діє Threshold; або подайте аналогову ціль у міліметрах, наприклад вихід ЦАП.',
    ],
    [
      'Choose Mode=below, above or window. In window mode set Tolerance in millimeters around the target.',
      'Оберіть Mode=below, above або window. У режимі window задайте Tolerance у міліметрах навколо цілі.',
    ],
    [
      'For position control, use a below sensor for DIR and NOT(window sensor Q) for EN, with both sensors sharing the same TARGET.',
      'Для позиціонування використайте датчик below для DIR та NOT(Q датчика window) для EN; обидва датчики мають спільний TARGET.',
    ],
  ],
  experiment: [
    'Set target 10 mm and Tolerance=0.5 mm. Compare position 9,9.5,10,10.5,11 mm, then change a wired target while the motor runs.',
    'Задайте ціль 10 мм і Tolerance=0.5 мм. Порівняйте положення 9,9.5,10,10.5,11 мм, потім змініть підключену ціль під час руху двигуна.',
  ],
  expected: [
    'Window Q is high from 9.5 through 10.5 mm, inclusively. Below and above compare directly to the target; the POS output always forwards the measurement.',
    'Q у режимі window має 1 від 9.5 до 10.5 мм включно. Below та above порівнюють безпосередньо з ціллю; вихід POS завжди передає вимірювання.',
  ],
  pitfalls: [
    [
      'A wired TARGET overrides Threshold; a floating wired target is unknown, not a fallback to the property. Tolerance applies only to window mode.',
      'Підключений TARGET замінює Threshold; непідключений рівень на наявному дроті є невідомим, а не поверненням до властивості. Tolerance діє лише в window.',
    ],
    [
      'A target window narrower than the motor’s reachable step grid can cause endless direction changes. Use a tolerance at least half the step distance and a target inside Min/Max.',
      'Вікно цілі, вужче за досяжну сітку кроків двигуна, може спричинити нескінченну зміну напрямку. Задайте допуск щонайменше в половину кроку та ціль у межах Min/Max.',
    ],
    [
      'Use the same coordinate unit for POS, TARGET and Tolerance. Unit (unit) can label elevator coordinates as floors; it changes the label without converting values. This block has no optical or magnetic sensor model.',
      'Використовуйте одну одиницю для POS, TARGET і Tolerance. Unit (unit), одиниця позиції на екрані, може позначати координати ліфта поверхами; вона змінює підпис без перерахунку чисел. Блок не моделює оптичний чи магнітний датчик.',
    ],
  ],
  inputs: {
    position: [
      'POS: actual measured coordinate in millimeters; unknown measurements propagate to the outputs.',
      'POS: фактична виміряна координата в міліметрах; невідомі вимірювання передаються на виходи.',
    ],
    target: [
      'TARGET: optional analog reference in millimeters; when unwired the Threshold property supplies it.',
      'TARGET: необов’язкова аналогова опора в міліметрах; без дроту її задає властивість Threshold.',
    ],
  },
  outputs: {
    position: [
      'POS: unchanged measured position, for chaining sensors or observation.',
      'POS: незмінене виміряне положення для каскадування датчиків або спостереження.',
    ],
    out: [
      'Q: below means POS≤target, above means POS≥target, window means |POS−target|≤Tolerance.',
      'Q: below означає POS≤ціль, above — POS≥ціль, window — |POS−ціль|≤Tolerance.',
    ],
  },
  examples: ['position-control', 'stepper-basics'],
};
