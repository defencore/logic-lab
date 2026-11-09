import { getDefinition } from '../components/catalog/index.js';
import { esc } from '../shared/ui.js';
import { icon, gateIcon } from '../shared/icons.js';
import { isBusMonitor, busMonitorMarkup } from './bus-monitor-node.js';
import { lcd1602NodeMarkup } from './lcd1602-node.js';
import { peripheralInputMarkup } from './peripheral-input-nodes.js';
import { hotkeyNodeMarkup } from './hotkey-node.js';
import { keypadNodeMarkup } from './keypad-node.js';
import { audioNodeMarkup } from './audio-node.js';
import { BYTE_TYPES, MEMORY_TYPES } from './state-inspection/model.js';
import { byteWidgetMarkup, memoryMapMarkup } from './state-inspection/markup.js';

export function nodeBody(node, { language, t, title }) {
  const d = getDefinition(node.type);
  if (BYTE_TYPES.has(node.type)) return byteWidgetMarkup(node, language, { compact: true });
  if (MEMORY_TYPES.has(node.type)) return memoryMapMarkup(node, language, { compact: true });
  if (isBusMonitor(node.type)) return busMonitorMarkup();
  switch (node.type) {
    case 'lcd1602':
      return lcd1602NodeMarkup();
    case 'contact_switch':
    case 'potentiometer':
      return peripheralInputMarkup(node, language);
    case 'active_buzzer':
    case 'passive_buzzer':
      return audioNodeMarkup();
    case 'hotkey':
      return hotkeyNodeMarkup(node, language);
    case 'keypad':
    case 'keypad_4x4':
      return keypadNodeMarkup(node, language, { compact: true });
    case 'switch':
      return `<button class="switch-control ${node.params.value ? 'is-on' : ''}" data-switch="${node.id}" aria-label="${esc(node.label || title(d))}" aria-pressed="${!!node.params.value}"><span class="switch-track"><i></i></span><span class="switch-value">${node.params.value ? '1' : '0'}</span></button>`;
    case 'button':
      return `<button type="button" class="soft-btn momentary-control" data-momentary="${node.id}" aria-label="${esc(node.label || title(d))}" aria-pressed="${node.params.value === 1}"><span>${language === 'ua' ? 'Утримувати' : 'Hold'}</span> <b>${node.params.value === 1 ? '1' : '0'}</b></button>`;
    case 'led':
      return '<div class="led-view"><i class="led-bulb"></i><span class="led-text">0</span></div>';
    case 'gnd':
    case 'vcc':
      return `<div class="constant-value">${node.type === 'vcc' ? '1' : '0'}<span>${node.type === 'vcc' ? 'VCC' : 'GND'}</span></div>`;
    case 'scope':
    case 'am':
    case 'fm':
      return `<canvas class="mini-scope" width="210" height="65"></canvas>${node.type !== 'scope' ? '<span class="node-readout"></span>' : ''}`;
    case 'servo':
      return `<div class="servo-bank">${[1, 2, 3, 4].map((i) => `<div class="servo-unit"><div class="servo-disc"><div class="servo-arm" data-servo="${i}"></div></div><span>S${i} <b data-angle="${i}">0°</b></span></div>`).join('')}</div>`;
    case 'traffic_light':
      return `<div class="scene-node-widget"><div class="traffic-mini">${['red', 'yellow', 'green'].map((color) => `<i data-lamp="${color}" class="lamp-${color}"></i>`).join('')}</div><strong class="node-readout"></strong><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
    case 'traffic_junction':
    case 'railway':
    case 'animal_feeder':
    case 'water_tank':
    case 'aquarium':
    case 'greenhouse':
    case 'smart_home':
    case 'elevator':
      return `<div class="scene-node-widget"><span class="scene-node-icon">${icon(node.type === 'railway' ? 'wire' : node.type === 'traffic_junction' ? 'grid' : 'box', 32)}</span><strong class="node-readout"></strong><span class="scene-node-state"></span><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
    case 'stepper':
      return `<div class="stepper-widget"><div class="stepper-body"><div class="stepper-rotor"></div></div><strong class="node-readout"></strong><button data-motion-open data-scene-node="${node.id}" class="text-btn">${t('view3d')}${icon('chevron', 11)}</button></div>`;
    case 'limit_switch':
    case 'position_sensor':
      return `<div class="sensor-widget"><span class="sensor-light"></span><strong class="node-readout"></strong><span class="sensor-status"></span></div>`;
    case 'sevenseg':
      return `<div class="seven-seg">${['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].map((id) => `<i class="segment segment-${id}" data-segment="${id}"></i>`).join('')}</div>`;
    case 'matrix':
      return `<div class="led-matrix">${Array.from({ length: 64 }, (_, i) => `<i data-pixel="${i}"></i>`).join('')}</div>`;
    case 'pwm':
      return '<div class="pwm-view"><svg viewBox="0 0 120 30"><path d="M0 25H10V5H45V25H70V5H105V25H120"/></svg><span class="node-readout"></span></div>';
    default:
      return ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].includes(node.type)
        ? `<div class="gate-view">${gateIcon(node.type, 48)}</div>`
        : `<div class="chip-view"><span>${esc(d.symbol || d.type.toUpperCase().replaceAll('_', ' '))}</span><strong class="node-readout"></strong></div>`;
  }
}
