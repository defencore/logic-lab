import { paintLogicTrace } from './logic-trace.js';

const isSample = (value) => typeof value === 'number' && Number.isFinite(value);

function plot(
  context,
  values,
  {
    width,
    height,
    top = 0,
    minimum = 0,
    maximum = 1,
    capacity = 256,
    stepped = false,
    sampleTimes,
    timeWindow,
    endTime,
  },
) {
  const samples = values.slice(-capacity);
  const times = sampleTimes?.slice(-samples.length);
  const end = endTime ?? times?.at(-1);
  const start = Number.isFinite(timeWindow) ? end - timeWindow : times?.[0];
  const timed = times?.length === samples.length && Number.isFinite(start) && end > start;
  let previous;
  context.beginPath();
  samples.forEach((value, index) => {
    if (!isSample(value)) {
      previous = undefined;
      return;
    }
    if (timed && (times[index] < start || times[index] > end)) {
      previous = undefined;
      return;
    }
    const x = timed
      ? ((times[index] - start) / (end - start)) * width
      : ((capacity - samples.length + index) / (capacity - 1)) * width;
    const normalized = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum || 1)));
    const y = top + height * 0.8 - normalized * height * 0.6;
    if (previous === undefined) context.moveTo(x, y);
    else {
      if (stepped) context.lineTo(x, previous);
      context.lineTo(x, y);
    }
    previous = y;
  });
  context.stroke();
}

export function drawMini(canvas, history, node, sampleTimes) {
  const context = canvas.getContext('2d'),
    width = canvas.width,
    height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#e1e7e2';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x < width; x += 21) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let y = 0; y < height; y += 16) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
  context.strokeStyle = '#258461';
  context.lineWidth = 1.8;
  const range = Math.max(0.01, Math.abs(Number(node.params.range || node.params.amplitude || 5)));
  plot(context, history, {
    width,
    height,
    minimum: -range,
    maximum: range,
    capacity: 128,
    sampleTimes,
  });
}

export function paintTraces(canvas, traces, pixelRatio = window.devicePixelRatio || 1) {
  const rect = canvas.getBoundingClientRect(),
    width = rect.width,
    height = rect.height;
  if (!width || !height) return;
  if (
    canvas.width !== Math.round(width * pixelRatio) ||
    canvas.height !== Math.round(height * pixelRatio)
  ) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  const context = canvas.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  const logic = !!traces[0]?.transitions;
  const plotHeight = logic ? Math.max(0, height - 18) : height;
  const rowHeight = plotHeight / Math.max(1, traces.length);
  context.strokeStyle = '#e8ece8';
  context.lineWidth = 1;
  context.setLineDash([2, 4]);
  context.beginPath();
  const gridStep = logic ? width / 4 : 60;
  for (let x = 0; x < width; x += gridStep) {
    context.moveTo(x, 0);
    context.lineTo(x, plotHeight);
  }
  for (let row = 0; row <= traces.length; row++) {
    context.moveTo(0, rowHeight * row);
    context.lineTo(width, rowHeight * row);
  }
  context.stroke();
  context.setLineDash([]);
  if (logic) {
    const end = traces[0].endTime || traces[0].timeWindow;
    const start = Math.max(0, end - traces[0].timeWindow);
    context.font = '10px ui-monospace, monospace';
    context.fillStyle = '#536174';
    for (let tick = 0; tick <= 4; tick++) {
      context.textAlign = tick === 0 ? 'left' : tick === 4 ? 'right' : 'center';
      const time = start + ((end - start) * tick) / 4;
      context.fillText(`${Number(time.toFixed(6))} s`, (width * tick) / 4, height - 3);
    }
    traces.forEach((trace, index) => {
      context.lineWidth = 1.7;
      paintLogicTrace(context, trace.transitions, {
        width,
        top: index * rowHeight,
        height: rowHeight,
        start,
        end,
        color: trace.color,
      });
    });
    return;
  }
  traces.forEach((trace, index) => {
    const history = trace.history.length ? trace.history : [trace.current];
    const numbers = history.filter(isSample);
    context.strokeStyle = trace.color;
    context.lineWidth = 1.7;
    plot(context, history, {
      width,
      height: rowHeight,
      top: index * rowHeight,
      minimum: Math.min(0, ...numbers),
      maximum: Math.max(1, ...numbers),
      stepped: trace.stepped,
      sampleTimes: trace.history.length ? trace.sampleTimes : [trace.endTime],
      timeWindow: trace.timeWindow,
      endTime: trace.endTime,
    });
  });
}
