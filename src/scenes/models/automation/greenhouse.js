import { clamp } from '../../common/numbers.js';
import { environment } from './environment.js';

export function greenhouseStep(s, c, p, dt) {
  const { day } = environment(s, p);
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * 0.035 +
        (day ? 0.22 : 0) +
        c.heater * 1.6 -
        c.vent * 1.5) *
        dt,
    -20,
    80,
  );
  s.moisture = clamp(
    s.moisture + (c.pump * 5 - (day ? 0.55 : 0.3) - (c.vent ? 0.2 : 0)) * dt,
    0,
    100,
  );
  const lit = day || c.grow_light === 1;
  s.darkExposure = lit ? Math.max(0, s.darkExposure - dt * 3) : s.darkExposure + dt;
  const risks = [
    ['cold', s.temperature < 12 ? (12 - s.temperature) * 0.15 + 0.1 : 0],
    ['heat', s.temperature > 36 ? (s.temperature - 36) * 0.2 + 0.1 : 0],
    ['drought', s.moisture < 12 ? (12 - s.moisture) * 0.1 + 0.15 : 0],
    ['flood', s.moisture > 88 ? (s.moisture - 88) * 0.12 + 0.15 : 0],
    ['dark', s.darkExposure > 50 ? 0.5 : 0],
  ];
  const danger = risks.reduce((best, risk) => (risk[1] > best[1] ? risk : best), ['', 0]);
  s.health = clamp(s.health + (danger[1] > 0 ? -danger[1] : 0.2) * dt, 0, 100);
  if (s.health < 60) {
    s.alarm = true;
    s.failure ||= danger[0];
  }
  if (
    lit &&
    s.temperature >= 16 &&
    s.temperature <= 30 &&
    s.moisture >= 20 &&
    s.moisture <= 80 &&
    s.health > 0
  )
    s.growth = clamp(s.growth + 0.18 * (s.health / 100) * dt, 0, 100);
}
