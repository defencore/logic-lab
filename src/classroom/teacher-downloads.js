import { serializeAssignment } from '../assessment/assignments.js';
import { cleanName } from './files.js';

const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 = (bytes) =>
  (bytes.reduce((crc, value) => (crc >>> 8) ^ crcTable[(crc ^ value) & 255], 0xffffffff) ^
    0xffffffff) >>>
  0;
function record(length, fields) {
  const data = new Uint8Array(length),
    view = new DataView(data.buffer);
  for (const [offset, size, value] of fields)
    size === 4 ? view.setUint32(offset, value, true) : view.setUint16(offset, value, true);
  return data;
}
const concatenate = (parts) => {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

/** Standard uncompressed ZIP, with UTF-8 file names and CRC-32 for every public assignment. */
export function studentTasksZip(assignments) {
  if (!Array.isArray(assignments) || !assignments.length || assignments.length > 200)
    throw new Error('Choose 1–200 public student assignments.');
  const entries = assignments.map((task, index) => ({
    name: encoder.encode(
      `${String(index + 1).padStart(3, '0')}-${cleanName(task.variant?.studentId || 'student')}-${cleanName(task.id)}.assignment.json`,
    ),
    data: encoder.encode(serializeAssignment(task)),
  }));
  if (entries.reduce((sum, entry) => sum + entry.data.length, 0) > 100_000_000)
    throw new Error('The archive exceeds 100 MB. Download smaller groups.');
  const local = [],
    directory = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const checksum = crc32(data);
    const header = record(30, [
      [0, 4, 0x04034b50],
      [4, 2, 20],
      [6, 2, 0x800],
      [12, 2, 33],
      [14, 4, checksum],
      [18, 4, data.length],
      [22, 4, data.length],
      [26, 2, name.length],
    ]);
    local.push(header, name, data);
    directory.push(
      record(46, [
        [0, 4, 0x02014b50],
        [4, 2, 20],
        [6, 2, 20],
        [8, 2, 0x800],
        [14, 2, 33],
        [16, 4, checksum],
        [20, 4, data.length],
        [24, 4, data.length],
        [28, 2, name.length],
        [42, 4, offset],
      ]),
      name,
    );
    offset += header.length + name.length + data.length;
  }
  const central = concatenate(directory);
  return concatenate([
    ...local,
    central,
    record(22, [
      [0, 4, 0x06054b50],
      [8, 2, entries.length],
      [10, 2, entries.length],
      [12, 4, central.length],
      [16, 4, offset],
    ]),
  ]);
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reviewCsv(report) {
  const columns = [
    'student_id',
    'student_name',
    'group',
    'variant',
    'matched',
    'total_checks',
    'functional_passed',
    'file_integrity',
    'review_required',
    'construction_changes',
    'actions',
    'student_explanation',
  ];
  const rows = report.results.map(({ student, variant, result, notes }) => [
    student.id,
    student.name,
    student.group,
    variant,
    result.matched,
    result.totalChecks,
    result.functionalPassed,
    result.integrity,
    result.reviewRequired,
    result.evidence?.constructionChanges,
    result.evidence?.actions,
    notes,
  ]);
  return (
    '\ufeff' + [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
  );
}
