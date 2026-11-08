export default {
  id: 'greenhouse-irrigation',
  label: 'Greenhouse: irrigation with memory',
  ua: 'Теплиця: полив із пам’яттю',
  category: 'automation',
  level: 'intermediate',
  description:
    'Use an SR latch to water from the dry sensor to the wet sensor, keeping a remembered request between thresholds.',
  descriptionUa:
    'Через SR-защіпку поливайте від нижнього до верхнього датчика й зберігайте запит між порогами.',
  lesson: {
    en: {
      goal: 'Use an SR latch to water from the dry sensor to the wet sensor, keeping a remembered request between thresholds.',
      steps: [
        {
          title: 'Wait for the dry threshold',
          text: 'Leave Unsafe pump always on=0. Moisture slowly falls until Dry=1 below 35%. Dry sets the SR latch and starts irrigation. Observe that the pump remains on even after Dry returns to 0, because the latch remembers the cycle.',
          nodes: ['world', 'start', 'memory'],
        },
        {
          title: 'Measure the middle-band memory',
          text: 'Wet=1 above 75% resets the latch. Compare the same middle-band moisture once while filling and once while drying; Dry=Wet=0 in both cases, but Pump differs. Reset process also clears the latch, while the NOT reset guard prevents S=R=1.',
          nodes: ['stop', 'not-reset', 'memory', 'pump'],
        },
        {
          title: 'Bypass the upper stop',
          text: 'Turn Unsafe pump always on=1. It bypasses the wet stop; moisture can exceed the safe level and cause flooding and plant damage. Turn the override off before pulsing Reset process, then verify the original dry-to-wet cycle starts correctly.',
          nodes: ['force-pump', 'pump', 'world', 'reset'],
        },
      ],
      expected:
        'The pump has memory between 35% and 75%, so it performs useful fill cycles instead of switching at one threshold. Forced pumping creates a measured flood and a visible health consequence.',
    },
    ua: {
      goal: 'Через SR-защіпку поливайте від нижнього до верхнього датчика й зберігайте запит між порогами.',
      steps: [
        {
          title: 'Дочекайтеся нижнього порогу',
          text: 'Лишіть Unsafe pump always on=0. Moisture спадає, поки нижче 35% не з’явиться Dry=1. Dry встановлює SR й починає полив. Насос лишається ввімкненим після Dry=0, бо пам’ять зберігає цикл.',
          nodes: ['world', 'start', 'memory'],
        },
        {
          title: 'Виміряйте пам’ять посередині',
          text: 'Wet=1 вище 75% скидає пам’ять. Порівняйте ту саму середню вологість під час поливу та висихання: в обох Dry=Wet=0, але Pump різний. Reset process також скидає SR, а NOT reset не допускає S=R=1.',
          nodes: ['stop', 'not-reset', 'memory', 'pump'],
        },
        {
          title: 'Обійдіть верхню зупинку',
          text: 'Увімкніть Unsafe pump always on=1. Обхід ігнорує Wet: волога виходить за безпечну смугу, починається затоплення та шкода рослинам. Спершу вимкніть обхід, потім подайте Reset process і перевірте відновлення циклу Dry→Wet.',
          nodes: ['force-pump', 'pump', 'world', 'reset'],
        },
      ],
      expected:
        'Насос має пам’ять між 35% та 75%, тому виконує цикли наповнення замість перемикань біля одного порогу. Примусовий полив створює вимірюване затоплення й видимі наслідки для здоров’я.',
    },
  },
  circuitPath: 'examples/greenhouse-irrigation/circuit.json',
  labPath: 'examples/greenhouse-irrigation/README.md',
  lab: {
    duration: 35,
    objectives: {
      en: [
        'Use an SR latch to water from the dry sensor to the wet sensor, keeping a remembered request between thresholds.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Через SR-защіпку поливайте від нижнього до верхнього датчика й зберігайте запит між порогами.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Leave Unsafe pump always on=0. Moisture slowly falls until Dry=1 below 35%. Dry sets the SR latch and starts irrigation. Observe that the pump remains on even after Dry returns to 0, because the latch remembers the cycle.',
        'Wet=1 above 75% resets the latch. Compare the same middle-band moisture once while filling and once while drying; Dry=Wet=0 in both cases, but Pump differs. Reset process also clears the latch, while the NOT reset guard prevents S=R=1.',
        'Turn Unsafe pump always on=1. It bypasses the wet stop; moisture can exceed the safe level and cause flooding and plant damage. Turn the override off before pulsing Reset process, then verify the original dry-to-wet cycle starts correctly.',
      ],
      ua: [
        'Лишіть Unsafe pump always on=0. Moisture спадає, поки нижче 35% не з’явиться Dry=1. Dry встановлює SR й починає полив. Насос лишається ввімкненим після Dry=0, бо пам’ять зберігає цикл.',
        'Wet=1 вище 75% скидає пам’ять. Порівняйте ту саму середню вологість під час поливу та висихання: в обох Dry=Wet=0, але Pump різний. Reset process також скидає SR, а NOT reset не допускає S=R=1.',
        'Увімкніть Unsafe pump always on=1. Обхід ігнорує Wet: волога виходить за безпечну смугу, починається затоплення та шкода рослинам. Спершу вимкніть обхід, потім подайте Reset process і перевірте відновлення циклу Dry→Wet.',
      ],
    },
    questions: {
      en: [
        'Why does a direct Dry-to-Pump wire differ from an SR controller?',
        'Why must reset inhibit the S request as well as set R?',
        'At the same moisture value, what information can only the latch provide?',
      ],
      ua: [
        'Чим прямий дріт Dry→Pump відрізняється від SR-керування?',
        'Чому скидання має блокувати S та подавати R одночасно?',
        'Яку інформацію при однаковій волозі дає лише пам’ять?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json project containing your tested circuit.',
        'A time-stamped record of sensors, actuator commands and visible outcomes for the safe, fault and recovery trials.',
      ],
      ua: [
        'Експортований проєкт .logic.json із перевіреною схемою.',
        'Запис часу, датчиків, команд і видимих результатів безпечного досліду, несправності та відновлення.',
      ],
    },
  },
};
