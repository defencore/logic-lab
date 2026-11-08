export function simulationStepText(rate, language, t) {
  const duration = new Intl.NumberFormat(language === 'ua' ? 'uk-UA' : 'en', {
    maximumFractionDigits: 3,
  }).format(10 * rate);
  return {
    duration: `${duration} ${t('milliseconds')}`,
    label: `${t('step')} · ${duration} ${t('milliseconds')}`,
  };
}

export function updateSimulationStep(rate, language, t, root = document) {
  const button = root.querySelector('#step');
  if (!button) return;
  const text = simulationStepText(rate, language, t);
  button.title = text.label;
  button.setAttribute('aria-label', text.label);
  const duration = root.querySelector('#step-duration');
  if (duration) duration.textContent = text.duration;
}
