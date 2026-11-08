import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXAMPLES, createExample } from '../examples/index.js';
import { validateProject } from '../src/project.js';
import { createRuntime, simulate } from '../src/simulator.js';

const IDS = [
  'aquarium-life-support',
  'aquarium-feeding',
  'aquarium-lighting',
  'greenhouse-climate',
  'greenhouse-irrigation',
  'home-climate',
  'yard-security',
  'railway-dispatch',
];
function open(id) {
  const project = createExample(id),
    runtime = createRuntime();
  simulate(project, runtime, 0);
  return { project, runtime };
}
function source(context, id, value, key = 'value') {
  context.project.nodes.find((node) => node.id === id).params[key] = value;
  simulate(context.project, context.runtime, 0);
}
function advance(context, seconds, observe = () => {}, dt = 0.05) {
  const count = Math.ceil(seconds / dt);
  for (let index = 0; index < count; index++) {
    simulate(context.project, context.runtime, seconds / count);
    observe(context);
  }
}
const output = (context, id = 'world', port = 'alarm') => context.runtime.signals.outputs[id][port];
const input = (context, port, id = 'world') => context.runtime.signals.inputs[id][port];
const state = (context) => context.runtime.state.world.scenario;
function reset(context) {
  source(context, 'reset', 1);
  source(context, 'reset', 0);
}

test('eight new laboratories ship editable circuits, accurate node references and bilingual assessment materials', async () => {
  for (const id of IDS) {
    const example = EXAMPLES.find((example) => example.id === id);
    assert.ok(example, id);
    assert.equal(example.category, id === 'railway-dispatch' ? 'scenes' : 'automation');
    const project = example.create();
    assert.deepEqual(validateProject(project), project);
    const ids = new Set(project.nodes.map((node) => node.id));
    for (const language of ['en', 'ua']) {
      const lesson = example.lesson[language];
      assert.ok(lesson.steps.length >= 3, id);
      assert.ok(lesson.expected.length > 80, id);
      for (const step of lesson.steps) {
        assert.ok(step.text.length > 70, `${id}/${step.title}`);
        assert.ok(
          step.nodes.every((node) => ids.has(node)),
          `${id}: invalid lesson node`,
        );
      }
      for (const field of ['objectives', 'tasks', 'questions', 'deliverables'])
        assert.ok(example.lab[field][language].length >= 2, `${id}/${field}/${language}`);
    }
    const json = JSON.parse(
      await readFile(new URL(`../${example.circuitPath}`, import.meta.url), 'utf8'),
    );
    assert.deepEqual(json, project, id);
    const worksheet = await readFile(new URL(`../${example.labPath}`, import.meta.url), 'utf8');
    for (const heading of [
      'Objectives',
      'Procedure',
      'Expected result',
      'Review questions',
      'Deliverables',
      'Extension',
      'Мета',
      'Порядок виконання',
      'Очікуваний результат',
      'Контрольні запитання',
      'Що подати',
      'Додаткове завдання',
    ])
      assert.ok(worksheet.includes(`## ${heading}`), `${id}/${heading}`);
    const context = open(id);
    assert.deepEqual(context.runtime.diagnostics, [], `${id}: ready-to-run starting circuit`);
    const reversed = createExample(id);
    reversed.nodes.reverse();
    const reverseRuntime = createRuntime();
    simulate(reversed, reverseRuntime, 0);
    assert.deepEqual(
      reverseRuntime.diagnostics,
      [],
      `${id}: feedback must settle in either node order`,
    );
    assert.deepEqual(reverseRuntime.outputs.world, context.runtime.outputs.world, id);
  }
});

test('all seven automatic starting circuits remain healthy through five accelerated days', () => {
  for (const id of IDS.slice(0, 7)) {
    const context = open(id);
    advance(context, 300);
    assert.deepEqual(context.runtime.diagnostics, [], `${id}: no unresolved signals`);
    assert.equal(output(context), 0, `${id}: no baseline alarm`);
    if (id.startsWith('aquarium')) {
      assert.equal(output(context, 'world', 'alive'), 4, id);
      assert.ok(output(context, 'world', 'health') > 95, id);
      assert.ok(output(context, 'world', 'food') > 20, id);
    } else if (id.startsWith('greenhouse')) {
      assert.ok(output(context, 'world', 'health') > 95, id);
      assert.ok(output(context, 'world', 'growth') > 50, id);
    } else {
      assert.ok(output(context, 'world', 'temperature') > 18.5, id);
      assert.ok(output(context, 'world', 'water') > 0, id);
    }
  }
});

test('aquarium life-support permissions and a stuck-heater fault cause measured deterioration before death and recover on reset', () => {
  const air = open('aquarium-life-support');
  source(air, 'air-permit', 0);
  advance(air, 40);
  assert.ok(output(air, 'world', 'oxygen') < 55);
  assert.equal(output(air, 'world', 'low_oxygen'), 1);
  assert.equal(input(air, 'aerator'), 0);
  assert.equal(output(air, 'world', 'alive'), 4);
  advance(air, 160);
  assert.equal(output(air), 1);
  assert.ok(output(air, 'world', 'alive') < 4);
  assert.equal(state(air).failure, 'oxygen');
  source(air, 'air-permit', 1);
  reset(air);
  assert.equal(output(air, 'world', 'alive'), 4);
  assert.equal(output(air, 'world', 'health'), 100);
  assert.equal(output(air), 0);

  const heat = open('aquarium-life-support');
  source(heat, 'unsafe-heat', 1);
  advance(heat, 8);
  assert.ok(output(heat, 'world', 'temperature') > 30);
  assert.equal(input(heat, 'cooler'), 0);
  assert.equal(output(heat, 'world', 'alive'), 4);
  advance(heat, 50);
  assert.equal(output(heat, 'world', 'alive'), 0);
  assert.equal(state(heat).failure, 'heat');
  source(heat, 'unsafe-heat', 0);
  advance(heat, 30);
  assert.equal(output(heat, 'world', 'alive'), 0, 'correcting a command cannot revive fish');
  reset(heat);
  assert.equal(output(heat, 'world', 'alive'), 4);
});

test('timed aquarium feeding produces bounded actual portions and an explicit bypass causes overfeeding', () => {
  const context = open('aquarium-feeding');
  let currentPulse = 0,
    longestPulse = 0,
    pulses = 0,
    previous = 0,
    minimumFood = Infinity;
  advance(context, 90, () => {
    const feeding = input(context, 'feed');
    if (feeding) {
      currentPulse += 0.05;
      if (!previous) pulses++;
      longestPulse = Math.max(longestPulse, currentPulse);
    } else currentPulse = 0;
    minimumFood = Math.min(minimumFood, output(context, 'world', 'food'));
    previous = feeding;
  });
  assert.ok(pulses > 4);
  assert.ok(longestPulse <= 1.05);
  assert.ok(minimumFood > 20);
  assert.equal(output(context, 'world', 'alive'), 4);
  source(context, 'force-feed', 1);
  advance(context, 10);
  assert.ok(output(context, 'world', 'food') > 85);
  assert.equal(input(context, 'feed'), 1);
  advance(context, 80);
  assert.equal(state(context).failure, 'overfed');
  assert.ok(output(context, 'world', 'alive') < 4);
  source(context, 'force-feed', 0);
  reset(context);
  assert.equal(output(context, 'world', 'alive'), 4);
  assert.equal(output(context), 0);
});

test('aquarium XOR schedule reproduces all four states and permanent light removes the resting interval', () => {
  const context = open('aquarium-lighting');
  for (const invert of [0, 1]) {
    source(context, 'invert', invert);
    assert.equal(output(context, 'world', 'day'), 1);
    assert.equal(input(context, 'light'), 1 ^ invert);
  }
  advance(context, 31);
  for (const invert of [0, 1]) {
    source(context, 'invert', invert);
    assert.equal(output(context, 'world', 'day'), 0);
    assert.equal(input(context, 'light'), invert);
  }
  source(context, 'invert', 0);
  source(context, 'force-light', 1);
  advance(context, 120);
  assert.ok(state(context).lightExposure > 90);
  assert.ok(output(context, 'world', 'health') < 100);
  assert.equal(output(context, 'world', 'alive'), 4);
  advance(context, 200);
  assert.equal(output(context, 'world', 'alive'), 0);
  assert.equal(state(context).failure, 'light');
  source(context, 'force-light', 0);
  reset(context);
  assert.equal(output(context, 'world', 'alive'), 4);
});

test('greenhouse climate feedback grows plants while a failed heater raises temperature before damage', () => {
  const context = open('greenhouse-climate');
  advance(context, 60);
  assert.ok(output(context, 'world', 'growth') > 20);
  assert.equal(output(context, 'world', 'health'), 100);
  source(context, 'unsafe-heat', 1);
  advance(context, 12);
  assert.ok(output(context, 'world', 'temperature') > 30);
  assert.equal(input(context, 'vent'), 0);
  advance(context, 120);
  assert.ok(output(context, 'world', 'health') < 60);
  assert.equal(output(context), 1);
  assert.equal(state(context).failure, 'heat');
  source(context, 'unsafe-heat', 0);
  reset(context);
  assert.equal(output(context, 'world', 'health'), 100);
  assert.equal(output(context), 0);
});

test('greenhouse irrigation remembers both middle-band states, avoids invalid reset and exposes a real flooding bypass', () => {
  const context = open('greenhouse-irrigation');
  const middleStates = new Set();
  let highest = 0,
    lowest = 100;
  advance(context, 180, () => {
    const moisture = output(context, 'world', 'moisture');
    highest = Math.max(highest, moisture);
    lowest = Math.min(lowest, moisture);
    if (
      moisture > 45 &&
      moisture < 55 &&
      output(context, 'world', 'dry') === 0 &&
      output(context, 'world', 'wet') === 0
    )
      middleStates.add(input(context, 'pump'));
  });
  assert.deepEqual([...middleStates].sort(), [0, 1]);
  assert.ok(lowest < 35.1 && highest > 75);
  source(context, 'reset', 1);
  assert.equal(output(context, 'memory', 'q'), 0);
  assert.deepEqual(context.runtime.diagnostics, []);
  source(context, 'reset', 0);
  source(context, 'force-pump', 1);
  advance(context, 60);
  assert.ok(output(context, 'world', 'moisture') > 88);
  assert.ok(output(context, 'world', 'health') < 100);
  assert.equal(state(context).failure, 'flood');
  source(context, 'force-pump', 0);
  reset(context);
  assert.equal(output(context, 'world', 'health'), 100);
});

test('home climate permission denies a true request and equal-duration lighting trials measure additional energy', () => {
  const denied = open('home-climate');
  source(denied, 'comfort', 0);
  advance(denied, 20);
  assert.equal(output(denied, 'world', 'cold'), 1);
  assert.equal(input(denied, 'heater'), 0);
  const coldTemperature = output(denied, 'world', 'temperature');
  source(denied, 'comfort', 1);
  advance(denied, 5);
  assert.ok(output(denied, 'world', 'temperature') > coldTemperature);

  const normal = open('home-climate'),
    forced = open('home-climate');
  source(forced, 'force-lights', 1);
  advance(normal, 60);
  advance(forced, 60);
  assert.ok(output(forced, 'world', 'energy') > output(normal, 'world', 'energy'));
  assert.ok(
    Math.abs(output(forced, 'world', 'temperature') - output(normal, 'world', 'temperature')) <
      1e-8,
  );
});

test('yard authorization drives actual gate travel, unauthorized motion alarms, and rain/low-water protection blocks irrigation', () => {
  const authorized = open('yard-security');
  advance(authorized, 10);
  assert.equal(output(authorized, 'world', 'motion'), 1);
  assert.equal(output(authorized, 'world', 'gate_open'), 1);
  assert.equal(output(authorized), 0);
  const unauthorized = open('yard-security');
  source(unauthorized, 'authorized', 0);
  advance(unauthorized, 9);
  assert.equal(input(unauthorized, 'gate'), 0);
  assert.equal(output(unauthorized, 'world', 'gate_open'), 0);
  assert.equal(output(unauthorized), 1);
  advance(unauthorized, 6);
  assert.equal(output(unauthorized), 0, 'a current security alarm clears after motion');

  advance(authorized, 12);
  assert.equal(output(authorized, 'world', 'rain'), 1);
  assert.equal(input(authorized, 'sprinkler'), 0);
  const dry = open('yard-security');
  source(dry, 'world', 0, 'initialWater');
  delete dry.runtime.state.world;
  simulate(dry.project, dry.runtime, 0);
  assert.equal(output(dry, 'world', 'tank_low'), 1);
  assert.equal(input(dry, 'sprinkler'), 0);
  assert.equal(output(dry), 0);
  source(dry, 'force-pump', 1);
  advance(dry, 0.1);
  assert.equal(output(dry), 1);
  assert.equal(state(dry).failure, 'empty_tank');
  source(dry, 'force-pump', 0);
  advance(dry, 1);
  assert.equal(output(dry), 1, 'dry-pump failure is latched');
  reset(dry);
  assert.equal(output(dry), 0);
});

test('manual railway dispatch exposes both turnouts, rejects simultaneous requests and safely passes both main-exit routes', () => {
  const context = open('railway-dispatch');
  source(context, 'near-points', 1);
  source(context, 'far-points', 1);
  assert.equal(output(context, 'world', 'points_state'), 1);
  assert.equal(output(context, 'world', 'exit_points_state'), 1);
  source(context, 'near-points', 0);
  source(context, 'far-points', 0);
  source(context, 'close-road', 1);
  advance(context, 1);
  assert.equal(output(context, 'world', 'gate_closed'), 1);
  source(context, 'request-a', 1);
  source(context, 'request-b', 1);
  assert.equal(input(context, 'signal_a'), 0);
  assert.equal(input(context, 'signal_b'), 0);
  source(context, 'request-b', 0);
  assert.equal(input(context, 'signal_a'), 1);
  advance(context, 3);
  source(context, 'request-a', 0);
  advance(context, 17);
  assert.equal(output(context, 'world', 'passed'), 1);
  assert.equal(output(context, 'world', 'occupied'), 0);
  assert.equal(output(context, 'world', 'fault'), 0);

  source(context, 'near-points', 1);
  source(context, 'far-points', 1);
  source(context, 'request-b', 1);
  assert.equal(input(context, 'signal_b'), 1);
  advance(context, 3);
  source(context, 'request-b', 0);
  advance(context, 17);
  assert.equal(output(context, 'world', 'passed'), 2);
  assert.equal(output(context, 'world', 'fault'), 0);
  assert.equal(output(context, 'world', 'occupied'), 0);
  source(context, 'close-road', 0);
  advance(context, 1);
  assert.equal(output(context, 'world', 'gate_closed'), 0);
});
