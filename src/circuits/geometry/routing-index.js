const TILE_SIZE = 256;
const TILE_LIMIT = 64;

function tileKeys({ left, top, right, bottom }) {
  const firstColumn = Math.floor(left / TILE_SIZE);
  const lastColumn = Math.floor(right / TILE_SIZE);
  const firstRow = Math.floor(top / TILE_SIZE);
  const lastRow = Math.floor(bottom / TILE_SIZE);
  const count = (lastColumn - firstColumn + 1) * (lastRow - firstRow + 1);
  if (
    count > TILE_LIMIT ||
    ![firstColumn, lastColumn, firstRow, lastRow].every(Number.isSafeInteger)
  )
    return null;
  const keys = [];
  for (let row = firstRow; row <= lastRow; row++)
    for (let column = firstColumn; column <= lastColumn; column++) keys.push(`${column},${row}`);
  return keys;
}

function intersects(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function createRoutingIndex() {
  const records = new Map();
  const tiles = new Map();
  const overflow = new Set();
  let nextOrder = 0;

  function remove(item) {
    const record = records.get(item);
    if (!record) return;
    records.delete(item);
    if (!record.keys) {
      overflow.delete(record);
      return;
    }
    for (const key of record.keys) {
      const tile = tiles.get(key);
      tile.delete(record);
      if (!tile.size) tiles.delete(key);
    }
  }

  function add(item, bounds) {
    remove(item);
    const keys = tileKeys(bounds);
    const record = { item, bounds: { ...bounds }, keys, order: nextOrder++ };
    records.set(item, record);
    if (!keys) {
      overflow.add(record);
      return;
    }
    for (const key of keys) {
      if (!tiles.has(key)) tiles.set(key, new Set());
      tiles.get(key).add(record);
    }
  }

  function query(bounds) {
    const keys = tileKeys(bounds);
    if (!keys) {
      const matches = [];
      for (const record of records.values())
        if (intersects(bounds, record.bounds)) matches.push(record.item);
      return matches;
    }

    const matches = new Set();
    const collect = (record) => {
      if (intersects(bounds, record.bounds)) matches.add(record);
    };
    for (const record of overflow) collect(record);
    for (const key of keys) {
      const tile = tiles.get(key);
      if (tile) for (const record of tile) collect(record);
    }
    return [...matches].sort((a, b) => a.order - b.order).map((record) => record.item);
  }

  return { add, remove, query };
}
