export default {
  id: 'pwm-servos',
  label: 'PWM & control surfaces',
  ua: 'ШІМ та кермові поверхні',
  category: 'mixed',
  level: 'intermediate',
  description:
    'Adjust a 105 Hz duty cycle and move four control surfaces using the supplied radio-channel mapping.',
  descriptionUa:
    'Змінюйте заповнення ШІМ 105 Гц і рухайте чотири рулі за наданим прикладом радіоканалу.',
  lesson: {
    en: {
      goal: 'Separate pulse frequency from duty ratio and turn that ratio into an angle.',
      steps: [
        {
          title: 'Inspect the starting angles',
          text: 'Course PWM duty=0.34 drives S1/S3 to −45°. Height PWM duty=0.66 drives S2/S4 to +45°. The DUTY wires carry a ratio; the scope wires carry actual pulses.',
          nodes: ['course', 'height', 'servos'],
        },
        {
          title: 'Move one pair of surfaces',
          text: 'Select Course PWM and set Duty cycle to 0.5: S1 and S3 center at 0°. Try 0.18 for −90° and 0.82 for +90°. The other pair is independent.',
          nodes: ['course', 'servos'],
        },
        {
          title: 'Run and compare the pulses',
          text: 'With the simulation running, both 105 Hz pulse trains draw automatically; press Run only if paused. Change frequency without changing duty: the pulse spacing changes while the duty-driven angles stay fixed. Reference mapping: duty = 0.5 − (command / 360) × 0.32.',
          nodes: ['course', 'height', 'course-scope', 'height-scope'],
        },
      ],
      expected:
        'Duty 0.18…0.82 maps to −90°…+90°. At the reference frequency, command ±360 arcmin maps through the supplied duty formula.',
    },
    ua: {
      goal: 'Відрізніть частоту від заповнення й перетворіть заповнення на кут.',
      steps: [
        {
          title: 'Перевірте початкові кути',
          text: 'Course PWM із duty=0.34 задає S1/S3 кут −45°. Height PWM із duty=0.66 задає S2/S4 кут +45°. Дроти DUTY передають частку, осцилографи — самі імпульси.',
          nodes: ['course', 'height', 'servos'],
        },
        {
          title: 'Порухайте одну пару рулів',
          text: 'Оберіть Course PWM та задайте Коефіцієнт заповнення 0.5: S1 і S3 стануть у 0°. Спробуйте 0.18 для −90° та 0.82 для +90°. Інша пара незалежна.',
          nodes: ['course', 'servos'],
        },
        {
          title: 'Порівняйте імпульси',
          text: 'В активній симуляції осцилограми 105 Гц малюються автоматично; натисніть Запуск лише після паузи. Змініть частоту при сталому заповненні: період зміниться, кути залишаться сталими. Формула прикладу: duty = 0.5 − (команда / 360) × 0.32.',
          nodes: ['course', 'height', 'course-scope', 'height-scope'],
        },
      ],
      expected:
        'Заповнення 0.18…0.82 відповідає кутам −90°…+90°. Команди ±360 кутових мінут перетворюються за наведеною формулою.',
    },
  },
  circuitPath: 'examples/pwm-servos/circuit.json',
  labPath: 'examples/pwm-servos/README.md',
  lab: {
    duration: 25,
    objectives: {
      en: [
        'Separate pulse frequency from duty ratio and turn that ratio into an angle.',
        'Verify the predicted behavior through controlled input changes.',
      ],
      ua: [
        'Відрізніть частоту від заповнення й перетворіть заповнення на кут.',
        'Перевірте очікувану поведінку керованими змінами входів.',
      ],
    },
    tasks: {
      en: [
        'Course PWM duty=0.34 drives S1/S3 to −45°. Height PWM duty=0.66 drives S2/S4 to +45°. The DUTY wires carry a ratio; the scope wires carry actual pulses.',
        'Select Course PWM and set Duty cycle to 0.5: S1 and S3 center at 0°. Try 0.18 for −90° and 0.82 for +90°. The other pair is independent.',
        'With the simulation running, both 105 Hz pulse trains draw automatically; press Run only if paused. Change frequency without changing duty: the pulse spacing changes while the duty-driven angles stay fixed. Reference mapping: duty = 0.5 − (command / 360) × 0.32.',
      ],
      ua: [
        'Course PWM із duty=0.34 задає S1/S3 кут −45°. Height PWM із duty=0.66 задає S2/S4 кут +45°. Дроти DUTY передають частку, осцилографи — самі імпульси.',
        'Оберіть Course PWM та задайте Коефіцієнт заповнення 0.5: S1 і S3 стануть у 0°. Спробуйте 0.18 для −90° та 0.82 для +90°. Інша пара незалежна.',
        'В активній симуляції осцилограми 105 Гц малюються автоматично; натисніть Запуск лише після паузи. Змініть частоту при сталому заповненні: період зміниться, кути залишаться сталими. Формула прикладу: duty = 0.5 − (команда / 360) × 0.32.',
      ],
    },
    questions: {
      en: [
        'Which wire carries pulses and which carries a duty ratio?',
        'Why can frequency change without changing a duty-driven servo angle?',
        'What duty centers a surface?',
      ],
      ua: [
        'Який дріт передає імпульси, а який — заповнення?',
        'Чому зміна частоти не змінює кута, керованого заповненням?',
        'Яке заповнення центрує руль?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your completed experiment.',
        'A duty/angle table for 0.18, 0.34, 0.5, 0.66 and 0.82 and two PWM traces.',
      ],
      ua: [
        'Експортований проєкт .logic.json із завершеним дослідом.',
        'Таблиця заповнення й кута для 0.18, 0.34, 0.5, 0.66 та 0.82 і дві осцилограми ШІМ.',
      ],
    },
  },
};
