import { component } from '../definition.js';
import { bit } from '../pins.js';

export const AUDIO = [
  component(
    'active_buzzer',
    'Active buzzer',
    'Активний зумер',
    'audio',
    'BUZZ',
    [bit('in', 'EN')],
    [],
    { frequency: 880, volume: 0.15 },
    'A digital high enables a constant tone at the configured frequency. Low, floating and unknown inputs are silent.',
    'Активний бузер: цифрова одиниця вмикає постійний тон заданої частоти. Нуль, плаваючий і невизначений входи вимикають звук.',
  ),
  component(
    'passive_buzzer',
    'Passive buzzer',
    'Пасивний зумер',
    'audio',
    'PIEZO',
    [bit('in', 'SIGNAL')],
    [],
    { volume: 0.15 },
    'Reproduces the timing of a digital square wave. Its pitch comes from the input transitions; a constant level is silent.',
    'Пасивний бузер відтворює часову форму цифрового прямокутного сигналу. Частоту задають переходи на вході; сталий рівень не створює тону.',
  ),
];
