export function signalUnit(node, port, side, language = 'en') {
  const floor = language === 'ua' ? 'пов.' : 'floor';
  if (node.type === 'position_sensor' && port.analog)
    return node.params.unit === 'floor' ? floor : 'mm';
  if (port.unit) return port.unit === 'floor' ? floor : port.unit;
  if (!port.analog) return '';
  if (node.type === 'limit_switch') return 'mm';
  if (node.type === 'stepper') return port.id === 'angle' ? '°' : 'mm';
  if (node.type === 'servo') return side === 'out' ? '°' : '';
  if (node.type === 'pwm') return '';
  return 'V';
}
