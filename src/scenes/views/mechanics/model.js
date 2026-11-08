import * as THREE from 'three';
import { finite } from '../../common/numbers.js';
import { TAU, COLORS, travelRatio, shaftRadians } from './coordinates.js';
import { MESSAGES } from './messages.js';
import { buildAxis } from './axis.js';
import { tagSceneObject } from '../../common/inspection.js';

/** Build testable printer mechanics from snapshots without allocating WebGL. */
export function createMotionModel(context, { language = 'en' } = {}) {
  const text = MESSAGES[language] || MESSAGES.en;
  const {
    root,
    mesh,
    box,
    cylinder,
    geometry,
    keep,
    release,
    label,
    steel,
    brightSteel,
    black,
    dark,
    ivory,
    brass,
    sensorBody,
    accents,
  } = context;
  const printer = new THREE.Group();
  root.add(printer);
  printer.userData.role = 'printer-frame';
  mesh(printer, box(11.8, 0.32, 13.6), ivory, 0, 0.2, -0.7);
  mesh(printer, box(11.2, 0.08, 13.0), dark, 0, 0.4, -0.7);
  for (const x of [-4.35, 4.35]) {
    mesh(printer, box(0.44, 7.7, 0.6), dark, x, 4.25, 0);
    mesh(printer, box(0.08, 7.35, 0.07), steel, x, 4.25, 0.34);
    mesh(printer, box(1.15, 0.14, 1.8), black, x, 0.51, 0);
  }
  mesh(printer, box(9.15, 0.42, 0.65), dark, 0, 8.0, 0);
  for (const x of [-5.0, 5.0])
    for (const z of [-6.5, 5.1]) mesh(printer, box(0.8, 0.18, 0.8), black, x, 0.09, z);
  label(printer, 'LOGIC LAB  /  MOTION', 0, 0.83, 5.4, 3.7);

  const gantry = new THREE.Group();
  gantry.position.y = 5.35;
  gantry.userData.role = 'z-gantry';
  printer.add(gantry);
  mesh(gantry, box(9.0, 0.65, 0.42), dark, 0, 0, -0.36);
  const rightMount = mesh(gantry, box(0.85, 0.42, 1.45), steel, 4.2, 0, 0.38);
  rightMount.userData.role = 'gantry-right-mount';
  const leftMount = mesh(gantry, box(0.72, 0.9, 0.82), steel, -4.35, 0, 0);
  leftMount.userData.role = 'gantry-left-mount';

  const xAxis = buildAxis(context, text, gantry, { index: 0, travel: 6.0, screwLength: 8.0 });
  const yAxis = buildAxis(context, text, printer, {
    index: 1,
    travel: 4.2,
    screwLength: 10.8,
    origin: [0, 1.05, 0],
    rotation: [0, -Math.PI / 2, 0],
  });
  const zAxis = buildAxis(context, text, printer, {
    index: 2,
    travel: 3.9,
    screwLength: 5.4,
    origin: [4.4, 5.35, 0.85],
    rotation: [0, 0, Math.PI / 2],
  });
  // The Y rails span the complete swept bed, leaving their bearings and motor
  // outside its travel. Standoffs seat the bearings on the printer base.
  for (const x of [-0.42, 0.42])
    for (const z of [-5.4, 5.4]) {
      const stand = mesh(printer, box(0.34, 0.455, 0.3), steel, x, 0.6675, z);
      stand.userData.role = 'y-bearing-stand';
    }
  const yMotorMount = mesh(printer, box(1.4, 0.045, 1.3), steel, 0, 0.4625, -6.22);
  yMotorMount.userData.role = 'y-motor-mount';
  // The vertical rod bearings and motor mount attach to the right column.
  for (const y of [2.65, 8.05]) {
    const mount = mesh(printer, box(0.66, 0.2, 1.65), steel, 4.4, y, 0.65);
    mount.userData.role = 'z-bearing-mount';
  }
  const zMotorMount = mesh(printer, box(1.35, 0.16, 1.5), steel, 4.4, 1.21, 0.65);
  zMotorMount.userData.role = 'z-motor-mount';
  const axes = [xAxis, yAxis, zAxis];
  yAxis.name.sprite.position.set(-4.1, 1.25, 0.4);
  zAxis.name.sprite.position.set(0.1, -1.0, -0.5);
  zAxis.name.sprite.scale.set(2.6, (2.6 * 96) / 512, 1);

  const bed = new THREE.Group();
  yAxis.carriage.add(bed);
  bed.userData.role = 'build-bed';
  mesh(bed, box(6.2, 0.17, 6.6), steel, 0, 0.55, 0);
  const buildSurface = mesh(bed, box(6.0, 0.045, 6.4), black, 0, 0.66, 0);
  buildSurface.userData.role = 'build-surface';
  const bedGrid = [];
  for (let i = -3; i <= 3; i++) {
    bedGrid.push(i, 0.686, -3.2, i, 0.686, 3.2);
    bedGrid.push(-3.0, 0.686, i, 3.0, 0.686, i);
  }
  const gridShape = keep(new THREE.BufferGeometry());
  gridShape.setAttribute('position', new THREE.Float32BufferAttribute(bedGrid, 3));
  bed.add(
    new THREE.LineSegments(gridShape, keep(new THREE.LineBasicMaterial({ color: 0x6e8276 }))),
  );
  // A rigid underframe joins the central carriage to all four leveling springs.
  const bedSupport = new THREE.Group();
  bed.add(bedSupport);
  bedSupport.userData.role = 'bed-support';
  mesh(bedSupport, box(5.3, 0.14, 0.35), dark, 0, 0.18, 0);
  mesh(bedSupport, box(0.35, 0.14, 5.6), dark, 0, 0.18, 0);
  for (const z of [-2.7, 2.7]) mesh(bedSupport, box(5.3, 0.14, 0.3), dark, 0, 0.18, z);
  for (const x of [-2.5, 2.5]) mesh(bedSupport, box(0.3, 0.14, 5.6), dark, x, 0.18, 0);
  for (const x of [-2.5, 2.5])
    for (const z of [-2.7, 2.7]) {
      const spring = mesh(bed, cylinder(0.1, 0.32, 12), brass, x, 0.34, z);
      spring.rotation.z = Math.PI / 2;
      spring.userData.role = 'bed-leveling-spring';
    }
  const head = new THREE.Group();
  xAxis.carriage.add(head);
  head.userData.role = 'print-head';
  const hanger = mesh(head, box(0.56, 0.8, 0.18), steel, 0, -0.2, -0.18);
  hanger.userData.role = 'head-hanger';
  const extruderBody = mesh(head, box(0.95, 1.0, 0.85), accents[0], 0, -0.6, 0.2);
  extruderBody.userData.role = 'extruder-body';
  mesh(head, box(0.72, 0.72, 0.12), black, 0, -0.57, 0.69);
  const fan = mesh(
    head,
    geometry('fan-ring', () => new THREE.TorusGeometry(0.26, 0.035, 8, 28)),
    steel,
    0,
    -0.57,
    0.78,
  );
  fan.castShadow = false;
  for (let i = 0; i < 5; i++) {
    const blade = mesh(
      head,
      box(0.23, 0.07, 0.025),
      dark,
      Math.cos((i * TAU) / 5) * 0.11,
      -0.57 + Math.sin((i * TAU) / 5) * 0.11,
      0.78,
    );
    blade.rotation.z = (i * TAU) / 5 + 0.4;
  }
  mesh(head, box(0.55, 0.22, 0.55), steel, 0, -1.22, 0.2);
  const nozzle = mesh(
    head,
    geometry('nozzle', () => new THREE.ConeGeometry(0.15, 0.26, 20)),
    brass,
    0,
    -1.46,
    0.2,
  );
  nozzle.rotation.z = Math.PI;
  nozzle.userData.role = 'print-nozzle';

  const sensors = new Map();
  const createSensor = () => {
    const group = new THREE.Group();
    group.userData.role = 'position-sensor';
    const light = keep(
      new THREE.MeshStandardMaterial({
        color: COLORS.idle,
        emissive: COLORS.idle,
        emissiveIntensity: 0.15,
        roughness: 0.3,
      }),
    );
    const beamMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: COLORS.active,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    );
    mesh(group, box(0.32, 0.3, 0.2), sensorBody, 0, 0, 0.72);
    mesh(group, box(0.46, 0.05, 0.3), steel, 0, -0.18, 0.72);
    const lever = mesh(group, box(0.03, 0.065, 0.42), brightSteel, 0, 0.04, 0.44);
    lever.rotation.x = 0.3;
    const indicator = mesh(
      group,
      geometry('sensor-light', () => new THREE.SphereGeometry(0.055, 12, 8)),
      light,
      0.1,
      0.14,
      0.84,
    );
    indicator.castShadow = false;
    mesh(group, box(0.035, 0.035, 0.6), beamMaterial, 0, 0.06, 0.18);
    const name = label(group, '', 0, 0.58, 0.8, 1.8);
    return {
      group,
      light,
      beamMaterial,
      name,
      dispose() {
        group.removeFromParent();
        name.dispose();
        release(light);
        release(beamMaterial);
      },
    };
  };
  let motorCount = 0;
  let sensorCount = 0;
  const normalStatus = () =>
    [
      motorCount === 0 ? text.empty : motorCount > 3 ? text.limit : '',
      sensorCount > 24 ? text.sensorLimit : '',
    ]
      .filter(Boolean)
      .join(' ');

  function update({ motors = [], sensors: sensorData = [] } = {}) {
    motorCount = motors.length;
    sensorCount = sensorData.length;
    axes.forEach((axis, index) => {
      const data = motors[index];
      axis.data = data || null;
      const position = data ? { nodeId: data.id, port: 'position', side: 'out' } : null;
      const angle = data ? { nodeId: data.id, port: 'angle', side: 'out' } : null;
      tagSceneObject(axis.group, ...(position ? [position] : []));
      tagSceneObject(axis.carriage, ...(position ? [position] : []));
      for (const object of [axis.motor, axis.shaft, axis.screw])
        tagSceneObject(
          object,
          ...(angle
            ? [
                angle,
                ...['step', 'dir', 'enable', 'reset'].map((port) => ({
                  nodeId: data.id,
                  port,
                  side: 'in',
                })),
              ]
            : []),
        );
      axis.motor.visible = !!data;
      axis.name.set(
        `${'XYZ'[index]} · ${data?.label || (data ? `${'XYZ'[index]} ${text.axis}` : text.unassigned)}`,
      );
      const positionKnown = typeof data?.position === 'number' && Number.isFinite(data.position);
      const angleKnown = typeof data?.angle === 'number' && Number.isFinite(data.angle);
      if (!data) {
        axis.lastRatio = 0.5;
        axis.lastAngle = 0;
      } else {
        if (positionKnown) axis.lastRatio = travelRatio(data.position, data.min, data.max);
        if (angleKnown) axis.lastAngle = shaftRadians(data.angle);
      }
      axis.carriage.position.x = (axis.lastRatio - 0.5) * axis.travel;
      axis.shaft.rotation.x = axis.lastAngle;
      axis.screw.rotation.x = axis.shaft.rotation.x;
      const color =
        !data || data.enabled === false
          ? COLORS.idle
          : !positionKnown || !angleKnown
            ? COLORS.unknown
            : data.moving
              ? COLORS.active
              : [COLORS.x, COLORS.y, COLORS.z][index];
      axis.ledMaterial.color.setHex(color);
      axis.ledMaterial.emissive.setHex(color);
      axis.ledMaterial.emissiveIntensity = data?.moving && data.enabled !== false ? 0.75 : 0.1;
    });
    gantry.position.y = zAxis.data ? zAxis.group.position.y + zAxis.carriage.position.x : 5.35;
    tagSceneObject(
      gantry,
      ...(zAxis.data ? [{ nodeId: zAxis.data.id, port: 'position', side: 'out' }] : []),
    );
    const live = new Set();
    sensorData.slice(0, 24).forEach((data, index) => {
      const id = data.id ?? `sensor-${index}`;
      live.add(id);
      let sensor = sensors.get(id);
      if (!sensor) {
        sensor = createSensor();
        sensors.set(id, sensor);
      }
      tagSceneObject(
        sensor.group,
        { nodeId: id, port: 'out', side: 'out' },
        { nodeId: id, port: 'position', side: 'in' },
      );
      const axis = axes.find((candidate) => candidate.data && candidate.data.id === data.motorId);
      if (axis) {
        if (sensor.group.parent !== axis.group) axis.group.add(sensor.group);
        const location = finite(
          data.threshold,
          finite(
            data.position,
            data.mode === 'max' ? finite(axis.data.max, 200) : finite(axis.data.min),
          ),
        );
        sensor.group.position.set(
          (travelRatio(location, axis.data.min, axis.data.max) - 0.5) * axis.travel,
          0.03,
          0,
        );
      } else {
        if (sensor.group.parent !== printer) printer.add(sensor.group);
        sensor.group.position.set(
          -4.0 + (index % 12) * 0.72,
          0.8,
          4.1 + Math.floor(index / 12) * 0.8,
        );
      }
      const triggered = data.triggered === true || data.triggered === 1;
      const color = triggered
        ? COLORS.active
        : data.enabled !== false && (data.triggered === null || ['X', 'Z'].includes(data.signal))
          ? COLORS.unknown
          : COLORS.idle;
      sensor.light.color.setHex(color);
      sensor.light.emissive.setHex(color);
      sensor.light.emissiveIntensity = triggered ? 1.0 : 0.1;
      sensor.beamMaterial.color.setHex(color);
      sensor.beamMaterial.opacity = triggered ? 0.45 : 0.08;
      sensor.name.set(data.label || String(id));
    });
    for (const [id, sensor] of sensors)
      if (!live.has(id)) {
        sensor.dispose();
        sensors.delete(id);
      }
    return normalStatus();
  }

  const bounds = new THREE.Box3(new THREE.Vector3(-6.0, 0, -7.6), new THREE.Vector3(6.0, 8.3, 6.2));
  return {
    root: printer,
    bounds,
    axes,
    gantry,
    bed,
    head,
    update,
    status: normalStatus,
    dispose() {
      for (const sensor of sensors.values()) sensor.dispose();
      sensors.clear();
      printer.removeFromParent();
    },
  };
}
