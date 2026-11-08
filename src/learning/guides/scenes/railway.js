// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'A railway and road crossing models finite train/car bodies, timed road gates and a complete-route reservation, so interlocking prevents physical contact instead of hiding vehicles.',
    'Залізничний переїзд моделює повні тіла поїздів і машин, часові шлагбауми та повне резервування, щоб блокування запобігало фізичному контакту замість приховування транспорту.',
  ],
  steps: [
    [
      'Use APPROACH_A/B and OCCUPIED to request one route at a time. Reserve the converging, shared and divergent corridor until the entire train tail clears; retain POINTS with an SR latch throughout that reservation.',
      'За APPROACH_A/B та OCCUPIED обирайте один маршрут. Резервуйте вхідну, спільну й вихідну ділянки до виходу всього хвоста; утримуйте POINTS через SR увесь час резервування.',
    ],
    [
      'Alternate rail and road windows. Command BARRIER closed for a rail request or occupied reservation, then require GATE_CLOSED=1 and CROSSING_CLEAR=1 before showing green. Road cars already inside must clear before the gates lower. Use THROTTLE=30 km/h with speedLimit=60.',
      'Чергуйте дорожні й залізничні вікна. Закривайте BARRIER для залізничного запиту чи зайнятого резервування, а перед зеленим вимагайте GATE_CLOSED=1 та CROSSING_CLEAR=1. Машини всередині спершу мають виїхати. Використайте THROTTLE=30 км/год та speedLimit=60.',
    ],
    [
      'Set initialA=-48 and initialB=-85 meters for the supplied spacing. With RUN=1 and RESET=0, inspect moving road traffic, stopped train noses and the train passage counter in 3D. The 40-second laboratory cycle starts with 20 seconds for road traffic.',
      'Задайте initialA=-48 та initialB=-85 м. При RUN=1, RESET=0 спостерігайте в 3D рух машин, зупинені передні частини поїздів і лічильник проїзду потягів. Цикл лабораторної 40 с починається з 20 с для автодороги.',
    ],
  ],
  experiment: [
    'Compare the guarded cycle with a forced-open gate: the ready guard keeps trains red. Then bypass signals to inspect actual body contact; test THROTTLE=120 separately for turnout derailment. An empty road must not create a collision merely because the gates are open.',
    'Порівняйте правильний цикл із примусово відкритими шлагбаумами: захист лишає поїздам червоний. Потім обійдіть сигнали для перевірки справжнього контакту; окремо задайте THROTTLE=120 для сходження. Порожня дорога не створює аварії лише через відкриті шлагбауми.',
  ],
  expected: [
    'Trains and road cars both make repeated safe passages. A committed train keeps its route and closed gates until its full tail clears, even when the rail window ends. Collisions require overlapping physical bodies; overspeed or points violations can cause separate visible derailments.',
    'Поїзди й машини багаторазово безпечно проїжджають. Допущений поїзд зберігає маршрут і закриті шлагбауми до виходу всього хвоста, навіть після кінця вікна. Зіткнення потребує контакту тіл; швидкість чи стрілка окремо можуть спричинити видиме сходження.',
  ],
  pitfalls: [
    [
      'OCCUPIED is a complete-body route reservation, not a nose-only test. A train waiting behind its red stop line must not reserve the block; an admitted train must retain it until its rear clears the divergent exit.',
      'OCCUPIED — резервування для всього тіла, не лише голови. Поїзд перед червоною стоп-лінією не має займати ділянку; допущений зберігає її до виходу хвоста з вихідної стрілки.',
    ],
    [
      'A close command is not closed-gate feedback: lowering takes time and waits for cars inside. Keep a road window so queued cars can move. An open gate is not itself contact, and a static decorative car must never trigger an accident.',
      'Команда закривання не є підтвердженням: опускання триває певний час і чекає виїзду машин. Лишайте дорожнє вікно для черги. Відкритий шлагбаум сам не є контактом, декоративна нерухома машина не спричиняє аварії.',
    ],
  ],
  inputs: {
    signal_a: [
      'SIGNAL_A: high admits train A past its red stop line into the shared track.',
      'SIGNAL_A: 1 дозволяє поїзду A пройти червону стоп-лінію на спільну колію.',
    ],
    signal_b: [
      'SIGNAL_B: high admits train B from the opposite end of the same track.',
      'SIGNAL_B: 1 дозволяє поїзду B зайти з іншого боку тієї самої колії.',
    ],
    points: [
      'POINTS: near turnout; 0 connects siding A, 1 connects the straight main. Changing the physical blades beneath a train derails it.',
      'POINTS: ближня стрілка; 0 з’єднує гілку A, 1 — пряму головну колію. Зміна фізичних рейок під потягом призводить до сходження.',
    ],
    exit_points: [
      'EXIT POINTS: far turnout; 0 connects the straight main, 1 connects siding B. Unwired it follows POINTS; wire a separate switch for independent dispatch.',
      'EXIT POINTS: дальня стрілка; 0 з’єднує пряму колію, 1 — гілку B. Без дроту повторює POINTS; окремий перемикач дає незалежне керування.',
    ],
    barrier: [
      'BARRIER: 1 requests the gates across the road to close, 0 requests opening. Actual closure is timed and reported by GATE_CLOSED; the gates do not block the rails.',
      'BARRIER: 1 просить закрити шлагбауми поперек дороги, 0 — відкрити. Закривання має тривалість і підтверджується GATE_CLOSED; шлагбауми не перекривають рейки.',
    ],
    throttle: [
      'THROTTLE: eight-bit speed command in km/h, not a percentage; compare it with speedLimit.',
      'THROTTLE: восьмибітна команда швидкості в км/год, не відсоток; порівнюйте зі speedLimit.',
    ],
    run: [
      'RUN: high advances train motion; low pauses the process. Unwired defaults high.',
      'RUN: 1 рухає поїзди, 0 зупиняє процес. Без дроту активний.',
    ],
    reset: [
      'RESET: restores initialA/initialB, clears passage counts and all latched railway failures.',
      'RESET: відновлює initialA/initialB, очищає проїзди та всі запам’ятовані несправності.',
    ],
  },
  outputs: {
    approach_a: [
      'APPROACH_A: train A is approaching the shared block and can request admission.',
      'APPROACH_A: поїзд A наближається до ділянки та може запитати дозвіл.',
    ],
    approach_b: [
      'APPROACH_B: train B is approaching from the opposite side.',
      'APPROACH_B: поїзд B наближається з протилежного боку.',
    ],
    occupied: [
      'OCCUPIED: complete protected-route reservation after admission, held until the entire train rear clears the corridor.',
      'OCCUPIED: повне резервування після дозволеного в’їзду до виходу всього хвоста із захищеного коридору.',
    ],
    fault: [
      'FAULT: any latched collision, overspeed, moving-points or open-barrier failure.',
      'FAULT: запам’ятоване зіткнення, швидкість, рух стрілки чи відкритий переїзд.',
    ],
    speed: [
      'SPEED: numeric railway speed in km/h for inspection and plotting.',
      'SPEED: числова швидкість залізниці в км/год для огляду й графіка.',
    ],
    passed: [
      'PASSED: eight-bit count of trains that cleared the route before respawning.',
      'PASSED: восьмибітна кількість поїздів, що завершили маршрут до повторної появи.',
    ],
    gate_closed: [
      'GATE_CLOSED: actual gate arms are fully lowered, not merely commanded closed.',
      'GATE_CLOSED: фактичні шлагбауми повністю опущені, а не лише мають команду закривання.',
    ],
    crossing_clear: [
      'CROSSING_CLEAR: no full road-vehicle body remains inside the protected crossing between the gates.',
      'CROSSING_CLEAR: жодне повне тіло дорожньої машини не лишається в захищеному переїзді між шлагбаумами.',
    ],
    points_state: [
      'POINTS: actual near turnout position, 0 for siding A and 1 for the main.',
      'POINTS: фактична ближня стрілка, 0 для гілки A, 1 для головної колії.',
    ],
    exit_points_state: [
      'EXIT POINTS: actual far turnout position, 0 for the main and 1 for siding B.',
      'EXIT POINTS: фактична дальня стрілка, 0 для головної колії, 1 для гілки B.',
    ],
    cars_wait: [
      'CARS_WAIT: road vehicles are queued before the closed/closing gate stop lines.',
      'CARS_WAIT: дорожні машини чекають перед стоп-лініями закритих чи закриваних шлагбаумів.',
    ],
  },
  examples: ['railway-interlocking', 'railway-dispatch'],
};
