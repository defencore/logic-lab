import { component } from '../definition.js';

export const ANNOTATION = [
  component(
    'note',
    'Text note',
    'Текстова нотатка',
    'annotation',
    'T',
    [],
    [],
    { text: 'Add a note', color: '#e3c770' },
    'An editable annotation on the canvas.',
    'Редагована нотатка на полотні.',
  ),
  component(
    'group',
    'Color region',
    'Кольорова область',
    'annotation',
    '▧',
    [],
    [],
    { text: 'Functional block', color: '#648dcc', width: 420, height: 260 },
    'A colored background region for organizing circuits.',
    'Кольорова область для впорядкування схеми.',
  ),
];
