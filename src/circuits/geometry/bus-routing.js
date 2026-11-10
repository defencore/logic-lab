import { LEAD, LIMIT } from './points.js';

const TRACK_GAP = 8;
const MIN_GAP = 6;
const MIN_LEAD = 16;

/** Lay out side-to-bottom wires as nested, separately spaced tracks. */
export function busRouteCandidates(entries, bodies) {
  if (entries.length < 2) return [];
  const first = entries[0];
  const reverse = !first.directions.start.x;
  const sign = (reverse ? first.directions.end : first.directions.start).x;
  const sideNode = reverse ? first.wire.to.node : first.wire.from.node;
  const sideBody = bodies.get(sideNode);
  if (!sign || !sideBody) return [];

  const contacts = [];
  for (const { vertices, directions } of entries) {
    const sideDirection = reverse ? directions.end : directions.start;
    const bottomDirection = reverse ? directions.start : directions.end;
    if (sideDirection.x !== sign || bottomDirection.y !== 1) return [];
    contacts.push({
      index: contacts.length,
      side: reverse ? vertices.at(-1) : vertices[0],
      bottom: reverse ? vertices[0] : vertices.at(-1),
    });
  }
  const { side, bottom } = contacts[0];
  if (
    contacts.some((pair) => pair.side.x !== side.x || pair.bottom.y !== bottom.y) ||
    new Set(contacts.map((pair) => pair.side.y)).size !== contacts.length ||
    new Set(contacts.map((pair) => pair.bottom.x)).size !== contacts.length
  )
    return [];

  const spread = (contacts.length - 1) * TRACK_GAP;
  const pinPositions = contacts.map((pair) => pair.bottom.x * sign);
  const low = Math.min(...pinPositions);
  const high = Math.max(...pinPositions);
  const sidePosition = side.x * sign;
  let firstTrack = sidePosition + LEAD;
  // Place all turns on the same side of the bottom contacts.
  if (firstTrack < high + TRACK_GAP && firstTrack + spread > low - TRACK_GAP) {
    const beforePins = low - TRACK_GAP - spread;
    firstTrack = beforePins >= sidePosition + MIN_LEAD ? beforePins : high + TRACK_GAP;
  }
  const towards = Math.sign(firstTrack * sign - bottom.x);
  const bottomOrder = [...contacts].sort((a, b) => (b.bottom.x - a.bottom.x) * towards);
  const sideOrder = [...contacts].sort((a, b) => a.side.y - b.side.y);

  function build(above, firstRow, gap) {
    const routes = [];
    const yByContact = new Map(
      bottomOrder.map((contact, index) => [contact, firstRow + index * gap]),
    );
    const order = above ? sideOrder : [...sideOrder].reverse();
    for (const [index, contact] of order.entries()) {
      const x = (firstTrack + index * TRACK_GAP) * sign;
      const y = yByContact.get(contact);
      if (Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) return null;
      const route = [
        contact.side,
        { x, y: contact.side.y },
        { x, y },
        { x: contact.bottom.x, y },
        contact.bottom,
      ];
      routes[contact.index] = reverse ? route.reverse() : route;
    }
    return routes;
  }

  const aboveSpace = sideBody.top - TRACK_GAP - bottom.y - MIN_LEAD;
  const gap = Math.min(TRACK_GAP, Math.floor(aboveSpace / (contacts.length - 1)));
  const above =
    gap >= MIN_GAP
      ? build(
          true,
          Math.min(bottom.y + LEAD, sideBody.top - TRACK_GAP - gap * (contacts.length - 1)),
          gap,
        )
      : null;
  const below = build(false, Math.max(bottom.y + LEAD, sideBody.bottom + TRACK_GAP), TRACK_GAP);
  return [above, below].filter(Boolean);
}
