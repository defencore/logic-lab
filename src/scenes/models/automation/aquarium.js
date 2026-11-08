import { clamp } from '../../common/numbers.js';

export function aquariumStep(s, c, p, dt) {
  const live = s.fish.filter((fish) => fish.alive).length;
  const inhabitants = live / Math.max(1, p.fishCount);
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * 0.035 +
        c.heater * 1.8 -
        c.cooler * 1.9 +
        c.light * 0.03) *
        dt,
    -20,
    80,
  );
  s.oxygen = clamp(
    s.oxygen +
      (c.aerator * 4.5 + c.water_change * 1.2 - 0.65 * inhabitants - (s.food > 85 ? 0.5 : 0)) * dt,
    0,
    100,
  );
  s.food = clamp(s.food + (c.feed * 8 - 1.1 * inhabitants) * dt, 0, 100);
  s.cleanliness = clamp(
    s.cleanliness +
      (c.filter * 3 + c.water_change * 5 - 0.28 * inhabitants - Math.max(0, s.food - 65) * 0.015) *
        dt,
    0,
    100,
  );
  s.lightExposure = c.light ? s.lightExposure + dt : Math.max(0, s.lightExposure - dt * 4);
  const risks = [
    ['cold', s.temperature < 20 ? (20 - s.temperature) * 0.7 + 0.2 : 0],
    ['heat', s.temperature > 30 ? (s.temperature - 30) * 0.8 + 0.2 : 0],
    ['oxygen', s.oxygen < 25 ? (25 - s.oxygen) * 0.12 + 0.2 : 0],
    ['overfed', s.food > 85 ? (s.food - 85) * 0.12 + 0.2 : 0],
    ['starved', s.food < 8 ? (8 - s.food) * 0.15 + 0.2 : 0],
    ['dirty', s.cleanliness < 25 ? (25 - s.cleanliness) * 0.12 + 0.2 : 0],
    ['light', s.lightExposure > 90 ? 0.7 : 0],
  ];
  const danger = risks.reduce((best, risk) => (risk[1] > best[1] ? risk : best), ['', 0]);
  for (let index = 0; index < s.fish.length; index++) {
    const fish = s.fish[index];
    if (!fish.alive) continue;
    fish.health = clamp(
      fish.health + (danger[1] > 0 ? -danger[1] * (1 + index * 0.07) : 0.45) * dt,
      0,
      100,
    );
    if (fish.health < 60) {
      s.alarm = true;
      s.failure ||= danger[0] || null;
    }
    if (fish.health <= 0) {
      fish.alive = false;
      fish.deadAt = s.time;
      s.failure ||= danger[0] || 'oxygen';
      s.alarm = true;
    }
  }
  s.health = s.fish.reduce((sum, fish) => sum + fish.health, 0) / s.fish.length;
}
