export default {
  id: 'railway-dispatch',
  label: 'Railway: switch and dispatch',
  ua: 'Залізниця: стрілки та диспетчер',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Set two independent turnouts, close road access and dispatch one train at a time through a visibly selected route.',
  descriptionUa:
    'Оберіть дві незалежні стрілки, закрийте дорогу й пропускайте поїзди по одному видимо обраним маршрутом.',
  lesson: {
    en: {
      goal: 'Set two independent turnouts, close road access and dispatch one train at a time through a visibly selected route.',
      steps: [
        {
          title: 'Set the route before permission',
          text: 'Initially both requests and Close road gates are 0. Near turnout=0 connects siding A; Near=1 selects the near main line. Far turnout=0 selects the far main line; Far=1 connects siding B. Change these switches while trains wait, compare Points state and Exit points state, and watch the physical blades and selected routes.',
          nodes: ['near-points', 'far-points', 'world'],
        },
        {
          title: 'Dispatch A to the main exit',
          text: 'Set Near=0 and Far=0, then Close road gates=1. Wait for Gate closed=1 and Clear=1 before Request train A=1. The logic also requires no B request and no occupied reservation. Once admitted, return Request A=0 and keep both turnouts fixed until the whole train clears. OCC keeps the road gates closed throughout the reservation.',
          nodes: ['close-road', 'gate-ready', 'request-a', 'signal-a', 'world'],
        },
        {
          title: 'Dispatch B and restore road access',
          text: 'After OCC returns to 0, set Near=1 and Far=1, then request only B. B enters its siding turnout and exits along the near main line. Wait until the full train clears, remove its request and set Close road gates=0 so cars move again. Requesting A and B together grants neither signal.',
          nodes: ['near-points', 'far-points', 'request-b', 'signal-b', 'barrier'],
        },
        {
          title: 'Inspect an unsafe route separately',
          text: 'Export the safe circuit first. With no train on a blade, Near=0 and Far=1 links the two sidings instead of the main exits. A train already waiting in the receiving siding can make that route unsafe. Changing an occupied turnout can instead cause derailment without vehicle contact. Keep these causes distinct, then restore the switches and reset before another trial.',
          nodes: ['near-points', 'far-points', 'alarm', 'reset'],
        },
      ],
      expected:
        'The two point switches select actual connected trajectories. Main-exit dispatch passes A and B safely in turn; conflicting requests stay red, and occupied-route feedback holds gates until the train tail clears.',
    },
    ua: {
      goal: 'Оберіть дві незалежні стрілки, закрийте дорогу й пропускайте поїзди по одному видимо обраним маршрутом.',
      steps: [
        {
          title: 'Задайте маршрут до дозволу',
          text: 'Спочатку обидва запити й Close road gates мають 0. Near turnout=0 підключає бічну A, Near=1 — ближню головну. Far turnout=0 обирає дальню головну, Far=1 — бічну B. Перемикайте під час очікування, порівнюйте Points state та Exit points state, дивіться на вістря й обрані шляхи.',
          nodes: ['near-points', 'far-points', 'world'],
        },
        {
          title: 'Пропустіть A на головний вихід',
          text: 'Задайте Near=0 та Far=0, потім Close road gates=1. Дочекайтеся Gate closed=1 та Clear=1 і подайте Request train A=1. Логіка також вимагає відсутності B та зайнятого резервування. Після дозволу поверніть Request A=0 й утримуйте обидві стрілки до виходу всього поїзда. OCC тримає шлагбауми закритими під час резервування.',
          nodes: ['close-road', 'gate-ready', 'request-a', 'signal-a', 'world'],
        },
        {
          title: 'Пропустіть B та відновіть дорогу',
          text: 'Після OCC=0 задайте Near=1 та Far=1, потім запитайте лише B. B заходить через свою бічну стрілку та виходить ближньою головною. Дочекайтеся всього хвоста, приберіть запит і задайте Close road gates=0 для машин. Одночасні запити A та B не дають жодного зеленого.',
          nodes: ['near-points', 'far-points', 'request-b', 'signal-b', 'barrier'],
        },
        {
          title: 'Окремо дослідіть небезпечний маршрут',
          text: 'Спершу експортуйте безпечну схему. Коли вістря вільні, Near=0 та Far=1 з’єднують дві бічні колії замість головних виходів. Поїзд, що вже чекає на приймальній бічній, робить такий шлях небезпечним. Перемикання зайнятої стрілки спричиняє окреме сходження без контакту машин. Розрізняйте ці причини, поверніть стрілки та скиньте перед новим дослідом.',
          nodes: ['near-points', 'far-points', 'alarm', 'reset'],
        },
      ],
      expected:
        'Два перемикачі обирають справжні з’єднані траєкторії. Диспетчеризація на головні виходи безпечно пропускає A та B по черзі; суперечливі запити лишаються червоними, а резервування тримає шлагбауми до виходу хвоста.',
    },
  },
  circuitPath: 'examples/railway-dispatch/circuit.json',
  labPath: 'examples/railway-dispatch/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Set two independent turnouts, close road access and dispatch one train at a time through a visibly selected route.',
        'Explain which Boolean conditions permit each actuator and verify the result using live sensor feedback.',
      ],
      ua: [
        'Оберіть дві незалежні стрілки, закрийте дорогу й пропускайте поїзди по одному видимо обраним маршрутом.',
        'Поясніть логічні умови дозволу кожного механізму та перевірте результат за живими датчиками.',
      ],
    },
    tasks: {
      en: [
        'Initially both requests and Close road gates are 0. Near turnout=0 connects siding A; Near=1 selects the near main line. Far turnout=0 selects the far main line; Far=1 connects siding B. Change these switches while trains wait, compare Points state and Exit points state, and watch the physical blades and selected routes.',
        'Set Near=0 and Far=0, then Close road gates=1. Wait for Gate closed=1 and Clear=1 before Request train A=1. The logic also requires no B request and no occupied reservation. Once admitted, return Request A=0 and keep both turnouts fixed until the whole train clears. OCC keeps the road gates closed throughout the reservation.',
        'After OCC returns to 0, set Near=1 and Far=1, then request only B. B enters its siding turnout and exits along the near main line. Wait until the full train clears, remove its request and set Close road gates=0 so cars move again. Requesting A and B together grants neither signal.',
        'Export the safe circuit first. With no train on a blade, Near=0 and Far=1 links the two sidings instead of the main exits. A train already waiting in the receiving siding can make that route unsafe. Changing an occupied turnout can instead cause derailment without vehicle contact. Keep these causes distinct, then restore the switches and reset before another trial.',
      ],
      ua: [
        'Спочатку обидва запити й Close road gates мають 0. Near turnout=0 підключає бічну A, Near=1 — ближню головну. Far turnout=0 обирає дальню головну, Far=1 — бічну B. Перемикайте під час очікування, порівнюйте Points state та Exit points state, дивіться на вістря й обрані шляхи.',
        'Задайте Near=0 та Far=0, потім Close road gates=1. Дочекайтеся Gate closed=1 та Clear=1 і подайте Request train A=1. Логіка також вимагає відсутності B та зайнятого резервування. Після дозволу поверніть Request A=0 й утримуйте обидві стрілки до виходу всього поїзда. OCC тримає шлагбауми закритими під час резервування.',
        'Після OCC=0 задайте Near=1 та Far=1, потім запитайте лише B. B заходить через свою бічну стрілку та виходить ближньою головною. Дочекайтеся всього хвоста, приберіть запит і задайте Close road gates=0 для машин. Одночасні запити A та B не дають жодного зеленого.',
        'Спершу експортуйте безпечну схему. Коли вістря вільні, Near=0 та Far=1 з’єднують дві бічні колії замість головних виходів. Поїзд, що вже чекає на приймальній бічній, робить такий шлях небезпечним. Перемикання зайнятої стрілки спричиняє окреме сходження без контакту машин. Розрізняйте ці причини, поверніть стрілки та скиньте перед новим дослідом.',
      ],
    },
    questions: {
      en: [
        'Which turnout is the entry switch for each train?',
        'Why is a route to an occupied receiving siding unsafe despite a clear shared block?',
        'Why must contact collision and moving-points derailment have different explanations?',
      ],
      ua: [
        'Яка стрілка є вхідною для кожного поїзда?',
        'Чому маршрут на зайняту приймальну бічну небезпечний навіть при вільній спільній ділянці?',
        'Чому контактне зіткнення та сходження через рух стрілки потребують різних пояснень?',
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
