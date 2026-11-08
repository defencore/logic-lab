import test from 'node:test';
import assert from 'node:assert/strict';
import { getMotionState } from '../../../src/scenes/data/mechanics.js';

test('3D state follows resolved mechanical signals and locates chained sensors', () => {
  const project = {
    nodes: [
      { id: 'axis', type: 'stepper', params: { min: 0, max: 80 } },
      { id: 'position', type: 'position_sensor', params: {} },
      { id: 'limit', type: 'limit_switch', params: { normallyClosed: true } },
    ],
    wires: [
      { from: { node: 'axis', port: 'position' }, to: { node: 'position', port: 'position' } },
      { from: { node: 'position', port: 'position' }, to: { node: 'limit', port: 'position' } },
    ],
  };
  const runtime = {
    outputs: {
      axis: { position: 25, angle: 1125, moving: 1 },
      position: { position: 25, out: 0 },
      limit: { out: 0 },
    },
    inputs: {
      axis: { enable: 1 },
      position: { position: 25, target: 40 },
      limit: { position: 25 },
    },
  };
  const scene = getMotionState(project, runtime);
  assert.equal(scene.motors[0].position, 25);
  assert.equal(scene.motors[0].moving, true);
  assert.equal(scene.sensors[0].motorId, 'axis');
  assert.equal(scene.sensors[0].threshold, 40);
  assert.equal(scene.sensors[1].motorId, 'axis');
  assert.equal(scene.sensors[1].triggered, true);
  runtime.outputs.axis.position = 'X';
  runtime.outputs.limit.out = 'Z';
  project.wires.push({
    from: { node: 'position', port: 'out' },
    to: { node: 'axis', port: 'enable' },
  });
  runtime.inputs.axis.enable = 'X';
  const unknown = getMotionState(project, runtime);
  assert.equal(unknown.motors[0].position, 'X');
  assert.equal(unknown.motors[0].enabled, false);
  assert.equal(unknown.sensors[1].triggered, null);
});

test('sensor source discovery terminates on disconnected and cyclic position networks', () => {
  const project = {
    nodes: [
      { id: 'a', type: 'position_sensor', params: {} },
      { id: 'b', type: 'position_sensor', params: {} },
    ],
    wires: [
      { from: { node: 'b', port: 'position' }, to: { node: 'a', port: 'position' } },
      { from: { node: 'a', port: 'position' }, to: { node: 'b', port: 'position' } },
    ],
  };
  assert.equal(getMotionState(project, { inputs: {}, outputs: {} }).sensors[0].motorId, null);
});
