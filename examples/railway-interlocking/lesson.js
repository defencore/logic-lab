export default {
  id: 'railway-interlocking',
  label: 'Railway and road interlocking',
  ua: 'Блокування залізниці та автодороги',
  category: 'scenes',
  level: 'intermediate',
  description:
    'Alternate road and rail windows, close the road gates, clear the crossing and reserve the complete train route.',
  descriptionUa:
    'Чергуйте дорожні й залізничні вікна, закривайте шлагбауми, очищайте переїзд і резервуйте повний маршрут поїзда.',
  lesson: {
    en: {
      goal: 'Alternate road and rail windows, close the road gates, clear the crossing and reserve the complete train route.',
      steps: [
        {
          title: 'Observe the first road window',
          text: 'Open the railway scene in 3D and keep Scene run active. The 0.025 Hz clock starts with a 20-second road window: cars cross while the trains queue at red signals. It then grants a 20-second rail window. X-ray-style readouts expose the actual circuit signals, not an independent animation.',
          nodes: ['window', 'rail-window-led', 'railway'],
        },
        {
          title: 'Wait for gates and cars to clear',
          text: 'A rail window with an approach request asks the road gates to close. Closing takes time, and vehicles already inside must drive completely out first. Gate ready requires both Gate closed=1 and Crossing clear=1; only then can a selected train receive green. Queued road vehicles stop before the crossing, not on it.',
          nodes: ['rail-request', 'barrier', 'gate-ready', 'dispatch-ready', 'safe-a', 'safe-b'],
        },
        {
          title: 'Keep the route until the complete train clears',
          text: 'The selected train reserves the converging, shared and divergent route after passing its red stop line. Occupied remains high until the entire rear of the train has left that protected corridor. The points latch must hold throughout; the other train stays red. A road window cannot reopen the gates while this reservation is still occupied.',
          nodes: ['railway', 'free', 'admit-a', 'admit-b', 'points', 'need-barrier'],
        },
        {
          title: 'Bypass the guards and inspect real contact',
          text: 'For an unsafe trial, remove all overrides, reset, then turn Unsafe both-signals override on. It bypasses the rail window, occupancy and gate-ready guards. Inspect the moving trains and road cars: collision is recorded only when their physical bodies contact, while a wrong turnout or excessive speed can derail a train separately. Restore safe controls before each reset; use Throttle=120 for a separate overspeed trial.',
          nodes: ['unsafe', 'reset', 'throttle', 'railway', 'fault'],
        },
        {
          title: 'Compare an open gate with a collision',
          text: 'With the unsafe override off, Force barrier open=1 prevents Gate closed and the interlock keeps trains red while cars continue to cross. An empty road does not cause a crash merely because a gate is open. Combining an open gate with the unsafe signal override removes that protection; a crossing accident occurs only if a train actually contacts a road vehicle. Restore both overrides before reset.',
          nodes: ['open', 'gate-ready', 'safe-a', 'safe-b', 'railway', 'reset'],
        },
      ],
      expected:
        'Both trains and road cars make repeated safe passages. Trains wait for physically closed gates and a clear crossing; points and gates stay protected until the entire train clears. Unsafe bypasses can create real body collisions or derailments, not phantom crashes on an empty road.',
    },
    ua: {
      goal: 'Чергуйте дорожні й залізничні вікна, закривайте шлагбауми, очищайте переїзд і резервуйте повний маршрут поїзда.',
      steps: [
        {
          title: 'Спостерігайте перше дорожнє вікно',
          text: 'Відкрийте залізницю в 3D та залиште Scene run активним. Такт 0.025 Гц починається з дорожнього вікна 20 с: машини проїжджають, поїзди чекають червоного. Потім настає залізничне вікно 20 с. Поточні значення показують реальні сигнали схеми, а не окрему анімацію.',
          nodes: ['window', 'rail-window-led', 'railway'],
        },
        {
          title: 'Дочекайтеся шлагбаумів і виїзду машин',
          text: 'Залізничне вікно із запитом наближення починає закривання дорожніх шлагбаумів. Воно триває певний час, а машини всередині спершу мають повністю виїхати. Дозвіл потребує Gate closed=1 та Crossing clear=1; лише тоді обраний поїзд отримує зелений. Черга стоїть перед переїздом, не на ньому.',
          nodes: ['rail-request', 'barrier', 'gate-ready', 'dispatch-ready', 'safe-a', 'safe-b'],
        },
        {
          title: 'Тримайте маршрут до виходу всього поїзда',
          text: 'Після проходження червоної стоп-лінії обраний поїзд резервує вхідну, спільну й вихідну ділянки. Occupied тримається, доки весь хвіст не залишить захищений коридор. Пам’ять стрілки зберігає маршрут, інший поїзд має червоний. Дорожнє вікно не відкриває шлагбауми до завершення зайнятого резервування.',
          nodes: ['railway', 'free', 'admit-a', 'admit-b', 'points', 'need-barrier'],
        },
        {
          title: 'Обійдіть захист і перевірте справжній контакт',
          text: 'Для небезпечного досліду вимкніть обходи, скиньте стан і ввімкніть Unsafe both-signals override. Він обходить вікно, зайнятість і готовність переїзду. Спостерігайте поїзди й машини: зіткнення фіксується лише за контактом тіл; неправильна стрілка чи надмірна швидкість окремо можуть спричинити сходження. Повертайте правильні входи перед скиданням; Throttle=120 перевіряє перевищення швидкості.',
          nodes: ['unsafe', 'reset', 'throttle', 'railway', 'fault'],
        },
        {
          title: 'Відрізніть відкритий шлагбаум від зіткнення',
          text: 'Без небезпечного обходу Force barrier open=1 не дає Gate closed, тому поїзди чекають червоного, а машини проїжджають. Порожня дорога не створює аварії лише через відкритий шлагбаум. Разом із Unsafe override цей захист зникає; аварія переїзду стається лише за контактом поїзда з машиною. Вимкніть обидва обходи перед скиданням.',
          nodes: ['open', 'gate-ready', 'safe-a', 'safe-b', 'railway', 'reset'],
        },
      ],
      expected:
        'Поїзди та машини багаторазово безпечно проїжджають. Поїзди чекають фізично закритих шлагбаумів і чистого переїзду; стрілка й шлагбауми захищені до виходу всього поїзда. Небезпечні обходи спричиняють реальний контакт чи сходження, а не вигадані аварії порожньої дороги.',
    },
  },
  circuitPath: 'examples/railway-interlocking/circuit.json',
  labPath: 'examples/railway-interlocking/README.md',
  lab: {
    duration: 40,
    objectives: {
      en: [
        'Alternate road and rail windows, close the road gates, clear the crossing and reserve the complete train route.',
        'Verify complete-body route reservation and distinguish an unsafe command from a physical collision.',
      ],
      ua: [
        'Чергуйте дорожні й залізничні вікна, закривайте шлагбауми, очищайте переїзд і резервуйте повний маршрут поїзда.',
        'Перевірте резервування для всього тіла та відрізніть небезпечну команду від фізичного зіткнення.',
      ],
    },
    tasks: {
      en: [
        'Open the railway scene in 3D and keep Scene run active. The 0.025 Hz clock starts with a 20-second road window: cars cross while the trains queue at red signals. It then grants a 20-second rail window. X-ray-style readouts expose the actual circuit signals, not an independent animation.',
        'A rail window with an approach request asks the road gates to close. Closing takes time, and vehicles already inside must drive completely out first. Gate ready requires both Gate closed=1 and Crossing clear=1; only then can a selected train receive green. Queued road vehicles stop before the crossing, not on it.',
        'The selected train reserves the converging, shared and divergent route after passing its red stop line. Occupied remains high until the entire rear of the train has left that protected corridor. The points latch must hold throughout; the other train stays red. A road window cannot reopen the gates while this reservation is still occupied.',
        'For an unsafe trial, remove all overrides, reset, then turn Unsafe both-signals override on. It bypasses the rail window, occupancy and gate-ready guards. Inspect the moving trains and road cars: collision is recorded only when their physical bodies contact, while a wrong turnout or excessive speed can derail a train separately. Restore safe controls before each reset; use Throttle=120 for a separate overspeed trial.',
        'With the unsafe override off, Force barrier open=1 prevents Gate closed and the interlock keeps trains red while cars continue to cross. An empty road does not cause a crash merely because a gate is open. Combining an open gate with the unsafe signal override removes that protection; a crossing accident occurs only if a train actually contacts a road vehicle. Restore both overrides before reset.',
      ],
      ua: [
        'Відкрийте залізницю в 3D та залиште Scene run активним. Такт 0.025 Гц починається з дорожнього вікна 20 с: машини проїжджають, поїзди чекають червоного. Потім настає залізничне вікно 20 с. Поточні значення показують реальні сигнали схеми, а не окрему анімацію.',
        'Залізничне вікно із запитом наближення починає закривання дорожніх шлагбаумів. Воно триває певний час, а машини всередині спершу мають повністю виїхати. Дозвіл потребує Gate closed=1 та Crossing clear=1; лише тоді обраний поїзд отримує зелений. Черга стоїть перед переїздом, не на ньому.',
        'Після проходження червоної стоп-лінії обраний поїзд резервує вхідну, спільну й вихідну ділянки. Occupied тримається, доки весь хвіст не залишить захищений коридор. Пам’ять стрілки зберігає маршрут, інший поїзд має червоний. Дорожнє вікно не відкриває шлагбауми до завершення зайнятого резервування.',
        'Для небезпечного досліду вимкніть обходи, скиньте стан і ввімкніть Unsafe both-signals override. Він обходить вікно, зайнятість і готовність переїзду. Спостерігайте поїзди й машини: зіткнення фіксується лише за контактом тіл; неправильна стрілка чи надмірна швидкість окремо можуть спричинити сходження. Повертайте правильні входи перед скиданням; Throttle=120 перевіряє перевищення швидкості.',
        'Без небезпечного обходу Force barrier open=1 не дає Gate closed, тому поїзди чекають червоного, а машини проїжджають. Порожня дорога не створює аварії лише через відкритий шлагбаум. Разом із Unsafe override цей захист зникає; аварія переїзду стається лише за контактом поїзда з машиною. Вимкніть обидва обходи перед скиданням.',
      ],
    },
    questions: {
      en: [
        'Why do closed-gate commands differ from the Gate closed feedback bit?',
        'Why must the complete rear of a train clear before handing over points?',
        'How does a road window reopen traffic without interrupting a committed train?',
        'Why can an open crossing remain collision-free when no road vehicle is present?',
      ],
      ua: [
        'Чим команда закривання відрізняється від датчика Gate closed?',
        'Чому перед передаванням стрілки має вийти весь хвіст поїзда?',
        'Як дорожнє вікно відкриває рух, не перериваючи вже дозволений поїзд?',
        'Чому відкритий переїзд без машин може не мати зіткнення?',
      ],
    },
    deliverables: {
      en: [
        'An exported .logic.json interlocking circuit.',
        'A three-minute observation showing nonzero train and road-vehicle passages, gate-ready signals and full-body reservation handovers.',
        'A safe forced-open observation and a separately reset unsafe physical collision or derailment record.',
      ],
      ua: [
        'Експортована схема блокування .logic.json.',
        'Трихвилинне спостереження проїзду поїздів і машин, готовності шлагбаумів та передавання повного резервування.',
        'Безпечне спостереження відкритого шлагбаума й окремий запис справжнього зіткнення чи сходження після скидання.',
      ],
    },
  },
};
