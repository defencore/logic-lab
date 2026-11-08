import { clamp } from '../../common/numbers.js';
import { environment } from './environment.js';

export function homeStep(s, c, p, dt) {
  const env = environment(s, p);
  // Ventilation exchanges heat with ambient air; it does not provide refrigeration.
  s.temperature = clamp(
    s.temperature +
      ((p.ambientTemperature - s.temperature) * (0.025 + c.fan * 0.08) + c.heater * 1.2) * dt,
    -20,
    80,
  );
  const requested = c.sprinkler === 1;
  s.water = clamp(
    s.water + ((env.rain ? 4 : 0) - (requested && s.water > 0 ? 0.7 : 0)) * dt,
    0,
    100,
  );
  s.gate = clamp(s.gate + (c.gate ? 0.4 : -0.4) * dt, 0, 1);
  s.energy +=
    ((c.heater * 2 +
      c.fan * 0.4 +
      c.indoor_light * 0.08 +
      c.outdoor_light * 0.06 +
      (requested ? 0.12 : 0)) *
      dt) /
    3600;
  s.alarmActive = c.alarm_arm === 1 && env.motion && s.gate < 0.95;
  s.dryPump = requested && s.water <= 0;
  if (s.dryPump) {
    s.alarm = true;
    s.failure ||= 'empty_tank';
  }
}
