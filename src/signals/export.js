import { paintLogicTrace } from './logic-trace.js';

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const numberLabel = (value) =>
  finite(value) ? String(Number(value.toPrecision(7))) : String(value ?? '—');

function fittedText(context, value, width) {
  const characters = [...String(value ?? '')];
  if (context.measureText(characters.join('')).width <= width) return characters.join('');
  while (characters.length && context.measureText(characters.join('') + '…').width > width)
    characters.pop();
  return characters.join('') + '…';
}

export async function waveformPng(
  traces,
  { title, startTime, endTime, sampleTimes, timeLabel = 'Simulation time (s)' },
) {
  if (!Array.isArray(traces) || !finite(startTime) || !finite(endTime) || endTime < startTime)
    throw new TypeError('Waveform channels and a valid simulation time range are required.');
  if (
    !Array.isArray(sampleTimes) ||
    sampleTimes.some(
      (time, index) =>
        !finite(time) ||
        time < startTime ||
        time > endTime ||
        (index > 0 && time <= sampleTimes[index - 1]),
    ) ||
    traces.some(
      (trace) =>
        !Array.isArray(trace.history) || Math.min(256, trace.history.length) > sampleTimes.length,
    )
  )
    throw new TypeError('Ordered simulation sample times must cover every waveform sample.');
  await document.fonts.ready;
  const width = 1440;
  const headerHeight = 80;
  const rowHeight = 100;
  const footerHeight = 64;
  const plotLeft = 232;
  const plotWidth = width - plotLeft - 24;
  const rows = Math.max(1, traces.length);
  const plotHeight = rows * rowHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = headerHeight + plotHeight + footerHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The waveform image canvas is unavailable.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, canvas.height);
  context.fillStyle = '#1b2938';
  context.font = '650 24px Inter, sans-serif';
  context.fillText(fittedText(context, title, width - 48), 24, 34);
  const duration = endTime - startTime;
  const decimals =
    duration > 0 ? Math.min(9, Math.max(0, Math.ceil(-Math.log10(duration / 4)) + 2)) : 3;
  const timeText = (time) => time.toFixed(decimals);
  context.font = '13px Inter, sans-serif';
  context.fillStyle = '#536174';
  context.fillText(`${timeLabel}: ${timeText(startTime)} – ${timeText(endTime)}`, 24, 60);
  context.fillStyle = '#f8faf9';
  context.fillRect(0, headerHeight, plotLeft - 16, plotHeight);
  context.strokeStyle = '#e1e7e3';
  context.lineWidth = 1;
  context.setLineDash([3, 5]);
  context.beginPath();
  for (let tick = 0; tick <= 4; tick++) {
    const x = plotLeft + (tick / 4) * plotWidth;
    context.moveTo(x, headerHeight);
    context.lineTo(x, headerHeight + plotHeight);
  }
  for (let row = 0; row < rows; row++) {
    for (const fraction of [0.2, 0.5, 0.8]) {
      const y = headerHeight + (row + fraction) * rowHeight;
      context.moveTo(plotLeft, y);
      context.lineTo(plotLeft + plotWidth, y);
    }
  }
  context.stroke();
  context.setLineDash([]);
  traces.forEach((trace, index) => {
    const top = headerHeight + index * rowHeight;
    const color = /^#[0-9a-f]{6}$/i.test(trace.color) ? trace.color : '#258461';
    const values = trace.history.length ? trace.history.slice(-256) : [trace.current];
    const known = values.filter(finite);
    const minimum = Math.min(0, ...known);
    const maximum = Math.max(1, ...known);
    context.fillStyle = color;
    context.fillRect(24, top + 21, 4, 46);
    context.fillStyle = '#24374a';
    context.font = '600 14px Inter, sans-serif';
    context.fillText(fittedText(context, trace.label, plotLeft - 64), 40, top + 36);
    context.fillStyle = color;
    context.font = '14px ui-monospace, monospace';
    context.fillText(fittedText(context, numberLabel(trace.current), plotLeft - 64), 40, top + 59);
    context.fillStyle = '#6a786f';
    context.font = '11px ui-monospace, monospace';
    context.fillText(numberLabel(maximum), plotLeft + 7, top + 15);
    context.fillText(numberLabel(minimum), plotLeft + 7, top + rowHeight - 7);
    context.strokeStyle = color;
    context.lineWidth = 2;
    if (trace.transitions) {
      paintLogicTrace(context, trace.transitions, {
        left: plotLeft,
        width: plotWidth,
        top,
        height: rowHeight,
        start: startTime,
        end: endTime,
        color,
      });
      return;
    }
    context.beginPath();
    let previous;
    let onlyPoint;
    values.forEach((value, sample) => {
      if (!finite(value)) {
        previous = undefined;
        return;
      }
      const sampleTime = trace.history.length
        ? sampleTimes[sampleTimes.length - values.length + sample]
        : endTime;
      const x = plotLeft + (duration > 0 ? (sampleTime - startTime) / duration : 1) * plotWidth;
      const y = top + rowHeight * 0.8 - ((value - minimum) / (maximum - minimum)) * rowHeight * 0.6;
      if (previous === undefined) context.moveTo(x, y);
      else {
        if (trace.stepped) context.lineTo(x, previous);
        context.lineTo(x, y);
      }
      previous = y;
      onlyPoint = { x, y };
    });
    context.stroke();
    if (known.length === 1 && onlyPoint) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(onlyPoint.x, onlyPoint.y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = '#dce4de';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(24, top + rowHeight);
    context.lineTo(width - 24, top + rowHeight);
    context.stroke();
  });
  context.fillStyle = '#536174';
  context.font = '12px ui-monospace, monospace';
  for (let tick = 0; tick <= 4; tick++) {
    context.textAlign = tick === 0 ? 'left' : tick === 4 ? 'right' : 'center';
    context.fillText(
      timeText(startTime + (tick / 4) * duration),
      plotLeft + (tick / 4) * plotWidth,
      headerHeight + plotHeight + 22,
    );
  }
  context.textAlign = 'center';
  context.font = '13px Inter, sans-serif';
  context.fillText(timeLabel, plotLeft + plotWidth / 2, canvas.height - 14);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not create the waveform image.'))),
      'image/png',
    ),
  );
}
