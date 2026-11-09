import { byteBits } from './controls.js';
import { decodeEepromData, EEPROM_SIZE } from '../components/eeprom.js';

export function initialEepromState(parameters) {
  const memory = decodeEepromData(parameters.data) ?? Array(EEPROM_SIZE).fill('X');
  return { memory, memoryBits: memory.map(byteBits), lastClock: null };
}
