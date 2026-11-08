import { getDefinition } from '../components/catalog/index.js';
import { esc } from '../shared/ui.js';

export function starterPreviewMarkup(task, language) {
  const L = (ua, en) => (language === 'ua' ? ua : en);
  if (!task)
    return `<p class="classroom-hint">${L('Створіть або відкрийте ключ, щоб переглянути фактичну заготовку перед видачею.', 'Create or open a key to inspect the actual starter before issuing it.')}</p>`;
  const project = task.starterProject;
  const nodes = project.nodes;
  const minimumX = Math.min(0, ...nodes.map((node) => node.x));
  const minimumY = Math.min(0, ...nodes.map((node) => node.y));
  const width = Math.max(250, ...nodes.map((node) => node.x + 180)) - minimumX;
  const height = Math.max(100, ...nodes.map((node) => node.y + 80)) - minimumY;
  return `<article class="starter-preview"><h4>${esc(task.title)}</h4><p class="preserve-lines">${esc(task.instructions)}</p><p>${nodes.length} ${L('елементів', 'components')} · ${project.wires.length} ${L('з’єднань', 'connections')}${task.variant ? ` · ${L('Варіант', 'Variant')}: ${esc(task.variant.studentId || task.variant.id)}` : ` · ${L('значення входів буде персоналізовано при видачі', 'input values will be personalized when issued')}`}</p><svg class="starter-map" viewBox="${minimumX} ${minimumY} ${width} ${height}" role="img" aria-label="${L('Розташування елементів фактичної заготовки студента', 'Component layout of the actual student starter')}">${nodes.map((node) => `<g transform="translate(${node.x} ${node.y})"><rect width="170" height="64" rx="6"></rect><text x="8" y="23">${esc((node.label || getDefinition(node.type)?.label || node.type).slice(0, 24))}</text><text x="8" y="45">${esc(node.type)}</text></g>`).join('')}</svg><details><summary>${L('Повний перелік елементів заготовки', 'Complete starter component list')}</summary><ul>${nodes.map((node) => `<li>${esc(node.label || node.id)} — ${esc(language === 'ua' ? getDefinition(node.type)?.ua : getDefinition(node.type)?.label)}${node.params.value !== undefined ? ` · ${esc(node.params.value)}` : ''}</li>`).join('')}</ul></details><p class="classroom-hint">${L('Цей перегляд містить лише студентську заготовку. Еталонні з’єднання, приховані дії та очікувані результати сюди не входять. Обраний внутрішній регістр або пам’ять залишиться у студента, якщо він є контрольним виходом.', 'This preview contains only the student starter. Reference wiring, hidden actions and expected results are excluded. An internal register or memory remains in the starter when selected as an observed component.')}</p></article>`;
}
