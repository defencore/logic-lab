// Each text pair contains English first and Ukrainian second.
export default {
  purpose: [
    'The 8×8 matrix lights intersections selected by separate row and column masks.',
    'Матриця 8×8 підсвічує перетини, вибрані окремими масками рядків і стовпців.',
  ],
  steps: [
    [
      'Use two Byte value sources: wire D0…D7 separately to ROWS0…ROWS7 and COLS0…COLS7.',
      'Використайте два джерела Значення байта: окремо з’єднайте D0…D7 із ROWS0…ROWS7 та COLS0…COLS7.',
    ],
    [
      'Set both masks to 1 to select the first row and first column.',
      'Задайте обом маскам 1, щоб вибрати перший рядок і перший стовпець.',
    ],
    [
      'Try row mask 3 and column mask 5 to select two rows and two columns.',
      'Спробуйте маску рядків 3 та стовпців 5 для вибору двох рядків і двох стовпців.',
    ],
  ],
  experiment: [
    'Keep COLS=255 and advance ROWS through 1,2,4,8,16,32,64,128.',
    'Залиште COLS=255 та змінюйте ROWS: 1,2,4,8,16,32,64,128.',
  ],
  expected: [
    'A complete lit row moves through the matrix. Each pixel is on only when both its row and column bits are 1.',
    'Суцільний рядок світла рухається матрицею. Піксель активний лише коли біти його рядка й стовпця дорівнюють 1.',
  ],
  pitfalls: [
    [
      'The inputs are masks, not row numbers: value 3 selects rows 0 and 1 rather than only row 3.',
      'Входи є масками, не номерами рядків: 3 вибирає рядки 0 і 1, а не лише рядок 3.',
    ],
    [
      'This block shows the current mask; it does not store a separate 64-bit frame or model LED persistence.',
      'Блок показує поточну маску; він не зберігає окремий 64-бітний кадр і не моделює післясвітіння.',
    ],
  ],
  inputs: {
    rows: [
      'Eight row-enable bits; bit 0 selects the first row.',
      'Вісім бітів дозволу рядків; біт 0 вибирає перший рядок.',
    ],
    cols: [
      'Eight column-enable bits; bit 0 selects the first column.',
      'Вісім бітів дозволу стовпців; біт 0 вибирає перший стовпець.',
    ],
  },
  examples: ['counter', 'bus-mux'],
};
