export default {
  id: 'water-tank',
  label: 'Tank level with hysteresis',
  ua: 'Рівень резервуара з гістерезисом',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Maintain water between low and high sensors using a remembered pump request, then test an unsafe override.',
  descriptionUa:
    'Утримуйте воду між нижнім і верхнім датчиками завдяки пам’яті насоса та перевірте небезпечний обхід.',
  lesson: {
    en: {
      goal: 'Maintain water between low and high sensors using a remembered pump request, then test an unsafe override.',
      steps: [
        {
          title: 'Watch a complete fill/drain cycle',
          text: 'Open the tank in 3D with Drain outlet=1. The water drains until Low sets the SR latch, then the pump fills until High resets it. Between the two thresholds the latch remembers whether filling or draining is in progress.',
          nodes: ['tank', 'drain', 'memory', 'pump'],
        },
        {
          title: 'Compare sensors with the pump request',
          text: 'Select the tank and inspect Low, High and Level. Both sensors can be 0 between 20% and 80%, while the pump may be either on or off depending on the preceding threshold. Drain outlet=0 closes the outlet; it does not force the pump on.',
          nodes: ['tank', 'memory', 'drain'],
        },
        {
          title: 'Cause and clear an overflow',
          text: 'Set Drain outlet=0 and Force pump on=1. The override bypasses the high-level stop, so the tank reaches capacity and spills; Overflow latches. Turn the override off, reopen the drain, and pulse Reset tank to return to a clean initial state.',
          nodes: ['force', 'overflow', 'tank', 'reset'],
        },
      ],
      expected:
        'Automatic feedback cycles between approximately 20% and 80% without spilling. A forced pump with a closed outlet reaches 100% and latches Overflow until reset.',
    },
    ua: {
      goal: 'Утримуйте воду між нижнім і верхнім датчиками завдяки пам’яті насоса та перевірте небезпечний обхід.',
      steps: [
        {
          title: 'Спостерігайте цикл наповнення й зливу',
          text: 'Відкрийте резервуар у 3D з Drain outlet=1. Вода зливається до Low, який встановлює SR; насос наповнює до High, який скидає пам’ять. Між порогами защіпка пам’ятає поточний режим.',
          nodes: ['tank', 'drain', 'memory', 'pump'],
        },
        {
          title: 'Порівняйте датчики й запит насоса',
          text: 'Оберіть резервуар і перевірте Low, High та Level. Між 20% і 80% обидва датчики можуть бути 0, а насос — увімкнений чи вимкнений залежно від попереднього порогу. Drain outlet=0 закриває злив, а не вмикає насос.',
          nodes: ['tank', 'memory', 'drain'],
        },
        {
          title: 'Створіть і усуньте перелив',
          text: 'Задайте Drain outlet=0 та Force pump on=1. Обхід ігнорує High, резервуар досягає місткості та переливається; Overflow запам’ятовується. Вимкніть обхід, відкрийте злив і подайте імпульс Reset tank для чистого стану.',
          nodes: ['force', 'overflow', 'tank', 'reset'],
        },
      ],
      expected:
        'Автоматика підтримує цикл близько 20–80% без переливу. Примусовий насос із закритим зливом досягає 100% та тримає Overflow до скидання.',
    },
  },
  circuitPath: 'examples/water-tank/circuit.json',
  labPath: 'examples/water-tank/README.md',
  lab: {
    duration: 30,
    objectives: {
      en: [
        'Maintain water between low and high sensors using a remembered pump request, then test an unsafe override.',
        'Relate visible 3D behavior to the actual circuit signals and feedback.',
      ],
      ua: [
        'Утримуйте воду між нижнім і верхнім датчиками завдяки пам’яті насоса та перевірте небезпечний обхід.',
        'Пов’яжіть видиму 3D-поведінку з реальними сигналами й зворотним зв’язком.',
      ],
    },
    tasks: {
      en: [
        'Open the tank in 3D with Drain outlet=1. The water drains until Low sets the SR latch, then the pump fills until High resets it. Between the two thresholds the latch remembers whether filling or draining is in progress.',
        'Select the tank and inspect Low, High and Level. Both sensors can be 0 between 20% and 80%, while the pump may be either on or off depending on the preceding threshold. Drain outlet=0 closes the outlet; it does not force the pump on.',
        'Set Drain outlet=0 and Force pump on=1. The override bypasses the high-level stop, so the tank reaches capacity and spills; Overflow latches. Turn the override off, reopen the drain, and pulse Reset tank to return to a clean initial state.',
      ],
      ua: [
        'Відкрийте резервуар у 3D з Drain outlet=1. Вода зливається до Low, який встановлює SR; насос наповнює до High, який скидає пам’ять. Між порогами защіпка пам’ятає поточний режим.',
        'Оберіть резервуар і перевірте Low, High та Level. Між 20% і 80% обидва датчики можуть бути 0, а насос — увімкнений чи вимкнений залежно від попереднього порогу. Drain outlet=0 закриває злив, а не вмикає насос.',
        'Задайте Drain outlet=0 та Force pump on=1. Обхід ігнорує High, резервуар досягає місткості та переливається; Overflow запам’ятовується. Вимкніть обхід, відкрийте злив і подайте імпульс Reset tank для чистого стану.',
      ],
    },
    questions: {
      en: [
        'Why can the pump be on or off at the same middle level?',
        'How do pumpRate and drainRate combine while both are active?',
        'Why does clearing the override not erase the overflow history?',
      ],
      ua: [
        'Чому при однаковому середньому рівні насос може мати різний стан?',
        'Як поєднуються pumpRate та drainRate при одночасній роботі?',
        'Чому вимкнення обходу не стирає історію переливу?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project with the tested control circuit.',
        'A low/high/pump/level trace and an overflow demonstration followed by reset recovery.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою керування.',
        'Графік Low/High/насоса/рівня та демонстрація переливу зі скиданням.',
      ],
    },
  },
};
