// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'An animal-feeding process exposes bowl and hopper levels so a digital controller can replenish food only when needed and detect unsafe dispensing.',
    'Процес годівниці надає рівні миски й бункера, щоб цифрове керування додавало їжу за потреби та виявляло небезпечне насипання.',
  ],
  steps: [
    [
      'Set hopperCapacity=500, bowlCapacity=100, initialHopper=300 and initialLevel=10 for the supplied lab. Open the feeder in 3D to observe both containers and the animal.',
      'Для лабораторної задайте hopperCapacity=500, bowlCapacity=100, initialHopper=300 та initialLevel=10. Відкрийте годівницю в 3D для огляду обох місткостей і тварини.',
    ],
    [
      'Use HUNGRY to set an SR latch and FULL to reset it; gate its output with NOT EMPTY before DISPENSE. Set hungryThreshold=20 and fullThreshold=60 so feedback has a useful hysteresis band.',
      'Подайте HUNGRY на встановлення SR, FULL — на скидання; перед DISPENSE додайте NOT EMPTY. Задайте hungryThreshold=20 і fullThreshold=60 для корисного гістерезису.',
    ],
    [
      'dispenseRate=25 and eatRate=4 set transfer and consumption per second. alarmThreshold=90 detects excessive bowl fill; portionSize=40 defines one FED count. Pulse REFILL from 0 to 1 to refill only the hopper.',
      'dispenseRate=25 та eatRate=4 задають подавання й споживання за секунду. alarmThreshold=90 виявляє зайву їжу; portionSize=40 визначає одну порцію FED. Фронт REFILL 0→1 наповнює лише бункер.',
    ],
  ],
  experiment: [
    'Watch automatic fill/consume cycles, pulse hopper refill, then deliberately force DISPENSE past FULL to observe an excessive-fill alarm. Remove the override before RESET.',
    'Спостерігайте цикли насипання й споживання, подайте Refill, потім навмисно утримуйте DISPENSE після FULL для тривоги переповнення. Приберіть обхід перед RESET.',
  ],
  expected: [
    'Feedback fills until FULL, waits until HUNGRY and stops automatic transfer if EMPTY. REFILL is edge-triggered; consumed food increments FED by portionSize. Unsafe dispensing latches ALARM until reset.',
    'Керування насипає до FULL, чекає HUNGRY та блокує автоматичне подавання при EMPTY. REFILL діє за фронтом; спожита їжа збільшує FED за portionSize. Небезпечне насипання тримає ALARM до скидання.',
  ],
  pitfalls: [
    [
      'EMPTY means the hopper is empty, not that the bowl is hungry. Refill adds no food directly to the bowl and holding REFILL high does not perform repeated refills.',
      'EMPTY означає порожній бункер, а не голодну миску. Refill не насипає прямо до миски; утримання REFILL=1 не повторює наповнення.',
    ],
    [
      'Choose hungryThreshold below fullThreshold and alarmThreshold above the intended full level. A manual override intentionally bypasses the protection; restoring inputs does not erase a latched alarm.',
      'Задайте hungryThreshold нижче fullThreshold, а alarmThreshold вище робочого повного рівня. Ручний обхід навмисно оминає захист; відновлення входів не стирає тривогу.',
    ],
  ],
  inputs: {
    dispense: [
      'DISPENSE: high transfers food from hopper to bowl at dispenseRate.',
      'DISPENSE: 1 подає їжу з бункера до миски зі швидкістю dispenseRate.',
    ],
    refill: [
      'REFILL: rising edge fills the hopper to hopperCapacity; return to 0 to re-arm.',
      'REFILL: додатний фронт наповнює бункер до hopperCapacity; поверніть 0 для наступного запуску.',
    ],
    run: [
      'RUN: high advances transfer and eating; low pauses this process. Unwired defaults high.',
      'RUN: 1 запускає подавання й споживання, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialHopper and initialLevel and clears alarm/portion history.',
      'RESET: відновлює initialHopper й initialLevel та очищає тривоги й порції.',
    ],
  },
  outputs: {
    hungry: [
      'HUNGRY: bowl level is at or below hungryThreshold; use it as a feeding request.',
      'HUNGRY: рівень миски не вищий за hungryThreshold; запит годування.',
    ],
    full: [
      'FULL: bowl level is at or above fullThreshold; use it to stop feeding.',
      'FULL: рівень миски не нижчий за fullThreshold; команда зупинення подавання.',
    ],
    empty: [
      'EMPTY: the hopper has no food available for transfer.',
      'EMPTY: у бункері немає їжі для подавання.',
    ],
    alarm: [
      'ALARM: latched unsafe dispensing or excessive bowl fill, cleared by RESET.',
      'ALARM: запам’ятоване небезпечне подавання чи надмірний рівень до RESET.',
    ],
    level: [
      'LEVEL: current bowl food mass in grams for observation and feedback.',
      'LEVEL: поточна маса їжі в мисці в грамах для огляду й керування.',
    ],
    hopper: [
      'HOPPER: remaining stored food mass in grams.',
      'HOPPER: залишок запасу їжі в бункері в грамах.',
    ],
    fed: [
      'FED: eight-bit number of portionSize portions consumed by the animal.',
      'FED: восьмибітна кількість порцій розміром portionSize, які з’їла тварина.',
    ],
  },
  examples: ['animal-feeder'],
};
