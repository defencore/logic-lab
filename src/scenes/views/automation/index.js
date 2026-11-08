import { aquarium } from './aquarium.js';
import { greenhouse } from './greenhouse.js';
import { home } from './home.js';

export function createAutomationModel(type, context) {
  const construct = { aquarium, greenhouse, smart_home: home }[type];
  if (!construct) throw new Error(`Unsupported automation scene: ${type}`);
  return construct(context);
}

export const AUTOMATION_FRAMING = Object.freeze({
  aquarium: {
    target: [0, 2.7, 0],
    perspective: [10.5, 7.5, 11.5],
    front: [0, 3.1, 16],
    top: [0, 22, 0.001],
  },
  greenhouse: {
    target: [0, 2.1, 0],
    perspective: [12, 9, 13],
    front: [0, 4.0, 19],
    top: [0, 26, 0.001],
  },
  smart_home: {
    target: [0, 1.8, 0.5],
    perspective: [12, 10, 14],
    front: [0, 4.5, 21],
    top: [0, 28, 0.501],
  },
});
