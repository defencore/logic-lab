const COLUMNS = 16;
const LINE_CAPACITY = 40;
const RAM_CAPACITY = LINE_CAPACITY * 2;
const SECOND_LINE = 0x40;
const SPACE = 0x20;

const blankRam = () => Array(RAM_CAPACITY).fill(SPACE);
const wrap = (value, size) => ((value % size) + size) % size;
const binary = (value) => value === 0 || value === 1;

export function initialLcd1602State() {
  return {
    ram: blankRam(),
    address: 0,
    dataBits: 8,
    twoLines: false,
    displayOn: false,
    cursorOn: false,
    blinkOn: false,
    direction: 1,
    entryShift: false,
    shift: 0,
    addressSpace: 'ddram',
    lastEnable: null,
    nibble: null,
    fault: null,
  };
}

function cellIndex(address, twoLines) {
  if (!twoLines) return address < RAM_CAPACITY ? address : -1;
  if (address < LINE_CAPACITY) return address;
  return address >= SECOND_LINE && address < SECOND_LINE + LINE_CAPACITY
    ? LINE_CAPACITY + address - SECOND_LINE
    : -1;
}

function moveAddress(state, direction) {
  const index = cellIndex(state.address, state.twoLines);
  if (index < 0) return state.address;
  const next = wrap(index + direction, RAM_CAPACITY);
  return state.twoLines && next >= LINE_CAPACITY ? SECOND_LINE + next - LINE_CAPACITY : next;
}

function shiftDisplay(state, distance) {
  return wrap(state.shift + distance, state.twoLines ? LINE_CAPACITY : RAM_CAPACITY);
}

function executeCommand(state, command) {
  if (command & 0x80) return { ...state, addressSpace: 'ddram', address: command & 0x7f };
  if (command & 0x40) return { ...state, addressSpace: 'cgram', fault: 'cgram' };
  if (command & 0x20)
    return {
      ...state,
      dataBits: command & 0x10 ? 8 : 4,
      twoLines: Boolean(command & 0x08),
    };
  if (command & 0x10) {
    const right = Boolean(command & 0x04);
    return command & 0x08
      ? { ...state, shift: shiftDisplay(state, right ? -1 : 1) }
      : { ...state, address: moveAddress(state, right ? 1 : -1) };
  }
  if (command & 0x08)
    return {
      ...state,
      displayOn: Boolean(command & 0x04),
      cursorOn: Boolean(command & 0x02),
      blinkOn: Boolean(command & 0x01),
    };
  if (command & 0x04)
    return { ...state, direction: command & 0x02 ? 1 : -1, entryShift: Boolean(command & 1) };
  if (command & 0x02) return { ...state, addressSpace: 'ddram', address: 0, shift: 0 };
  if (command & 1)
    return { ...state, ram: blankRam(), addressSpace: 'ddram', address: 0, shift: 0, direction: 1 };
  return state;
}

function writeCharacter(state, byte) {
  if (state.addressSpace === 'cgram') return { ...state, fault: 'cgram' };
  const index = cellIndex(state.address, state.twoLines);
  if (index < 0) return { ...state, fault: 'address' };
  const ram = state.ram.slice();
  ram[index] = byte;
  return {
    ...state,
    ram,
    address: moveAddress(state, state.direction),
    shift: state.entryShift ? shiftDisplay(state, state.direction) : state.shift,
  };
}

function readNibble(inputs, start) {
  let value = 0;
  for (let bit = 0; bit < 4; bit++) {
    const level = inputs[`d${start + bit}`];
    if (!binary(level)) return null;
    value |= level << bit;
  }
  return value;
}

function acceptWrite(state, inputs) {
  const { rs, rw } = inputs;
  const rejected = (fault) => ({ ...state, nibble: null, fault });
  if (rw === 1) return rejected('read');
  if (!binary(rs) || rw !== 0) return rejected('control');
  const upper = readNibble(inputs, 4);
  if (upper === null) return rejected('data');
  let byte;
  if (state.dataBits === 8) {
    const lower = readNibble(inputs, 0);
    // Function-set bootstrap leaves D0–D3 disconnected on a 4-bit wiring.
    const bootstrap =
      rs === 0 &&
      (upper === 2 || upper === 3) &&
      [0, 1, 2, 3].every((bit) => inputs[`d${bit}`] === 'Z');
    if (lower === null && !bootstrap) return rejected('data');
    byte = (upper << 4) | (lower ?? 0);
  } else {
    if (!state.nibble) return { ...state, nibble: { rs, value: upper }, fault: null };
    if (state.nibble.rs !== rs) return rejected('phase');
    byte = (state.nibble.value << 4) | upper;
  }
  const ready = { ...state, nibble: null, fault: null };
  return rs === 1 ? writeCharacter(ready, byte) : executeCommand(ready, byte);
}

/** Sample writes on a definite high-to-low E transition in a settled event wave. */
export function advanceLcd1602(node, state, inputs) {
  const enable = binary(inputs.e) ? inputs.e : null;
  if (node.enabled === false || enable === null) {
    if (state.lastEnable === null && state.nibble === null) return state;
    return { ...state, lastEnable: null, nibble: null };
  }
  if (enable === state.lastEnable) return state;
  const next = { ...state, lastEnable: enable };
  return state.lastEnable === 1 && enable === 0 ? acceptWrite(next, inputs) : next;
}

function glyph(byte) {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '□';
}

export function lcd1602Snapshot(state = initialLcd1602State()) {
  const lineLength = state.twoLines ? LINE_CAPACITY : RAM_CAPACITY;
  const cursorAddress =
    state.addressSpace === 'ddram' ? cellIndex(state.address, state.twoLines) : -1;
  let cursor = null;
  const rows = [0, 1].map((row) =>
    Array.from({ length: COLUMNS }, (_, column) => {
      if (!state.displayOn || (row === 1 && !state.twoLines)) return ' ';
      const index = row * LINE_CAPACITY + wrap(column + state.shift, lineLength);
      if (index === cursorAddress && (state.cursorOn || state.blinkOn))
        cursor = { row, column, underline: state.cursorOn, blink: state.blinkOn };
      return glyph(state.ram[index]);
    }).join(''),
  );
  return {
    rows,
    cursor,
    dataBits: state.dataBits,
    displayOn: state.displayOn,
    twoLines: state.twoLines,
    address: state.address,
    awaitingLowNibble: state.nibble !== null,
    fault: state.fault,
  };
}
