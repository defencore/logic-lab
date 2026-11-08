export function createGuide(definition, content) {
  const describePins = (direction, index) =>
    Object.fromEntries(
      definition[direction].map((pin) => {
        const description = content[direction]?.[pin.group || pin.id]?.[index];
        if (!pin.group) return [pin.id, description];
        return [
          pin.id,
          index === 0
            ? `${pin.label}: separate bit ${pin.bit}, binary weight ${2 ** pin.bit}. ${description}`
            : `${pin.label}: окремий біт ${pin.bit}, двійкова вага ${2 ** pin.bit}. ${description}`,
        ];
      }),
    );
  const groups = ['inputs', 'outputs'].flatMap((direction) =>
    definition.signals[direction]
      .filter((signal) => signal.width > 1)
      .map((signal) => {
        const pins = definition[direction].filter((pin) => pin.group === signal.id);
        return `${pins[0].label}…${pins.at(-1).label}`;
      }),
  );
  return Object.fromEntries(
    ['en', 'ua'].map((language, index) => [
      language,
      {
        purpose: content.purpose[index],
        steps: [
          ...(groups.length
            ? [
                index === 0
                  ? `Connect each labeled line separately: ${groups.join(', ')}. Match the bit indices; bit 0 has weight 1. Each wire carries one bit.`
                  : `Підключайте кожну підписану лінію окремо: ${groups.join(', ')}. Зберігайте номери бітів; біт 0 має вагу 1. Кожен дріт передає один біт.`,
              ]
            : []),
          ...content.steps.map((text) => text[index]),
        ],
        experiment: content.experiment[index],
        expected: content.expected[index],
        pitfalls: content.pitfalls.map((text) => text[index]),
        inputs: describePins('inputs', index),
        outputs: describePins('outputs', index),
        examples: [...content.examples],
      },
    ]),
  );
}
