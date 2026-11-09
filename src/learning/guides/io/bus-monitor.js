export function busMonitorGuide(width) {
  return {
    purpose: [
      `Read ${width} digital lines as a single number. The monitor shows every bit, including floating Z and unknown X.`,
      `Читайте ${width} цифрові лінії як одне число. Індикатор показує кожен біт, зокрема плаваючий Z і невизначений X.`,
    ],
    steps: [
      [
        'Connect the source lines in order. D0 is the least significant bit. Choose the 4-bit model for one nibble or the 8-bit model for a full byte.',
        'Підключіть лінії джерела за порядком. D0 є молодшим бітом. Оберіть модель на 4 біти для однієї шістнадцяткової цифри або на 8 біт для цілого байта.',
      ],
      [
        'Change a source bit and compare the HEX, DEC and BIN rows.',
        'Змініть біт джерела й порівняйте рядки HEX, DEC та BIN.',
      ],
      [
        'Use the Logic analyzer to capture individual data contacts over time.',
        'Для спостереження окремих бітів у часі оберіть їх у логічному аналізаторі.',
      ],
    ],
    experiment: [
      `Drive the four low bits high and every remaining bit of the ${width}-bit monitor low. Then disconnect D0 and compare the binary and hexadecimal displays.`,
      `На індикаторі шириною ${width} подайте одиниці на чотири молодші біти й нулі на решту. Від’єднайте D0 і порівняйте двійковий та шістнадцятковий покази.`,
    ],
    expected: [
      `Four high low-order bits give decimal 15, hexadecimal ${width === 4 ? '0xF' : '0x0F'}. An unresolved nibble shows X or Z, while the binary row preserves each actual state.`,
      `Чотири молодші одиниці дають десяткове 15 та шістнадцяткове ${width === 4 ? '0xF' : '0x0F'}. Невизначена група з чотирьох бітів показує X або Z, а двійковий рядок зберігає кожен фактичний стан.`,
    ],
    pitfalls: [
      [
        'To read fewer lines than the model accepts, tie unused high bits to GND. The monitor consumes digital inputs and has no outputs.',
        'Щоб прочитати менше ліній, ніж має модель, під’єднайте невикористані старші біти до GND. Індикатор має лише цифрові входи.',
      ],
    ],
    inputs: { in: ['Read-only data bit.', 'Біт даних для спостереження.'] },
    outputs: {},
    examples: ['ram-addressing', 'bcd-display'],
  };
}
