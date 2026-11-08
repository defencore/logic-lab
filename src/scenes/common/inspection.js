const input = (port) => ({ port, side: 'in' });
const output = (port) => ({ port, side: 'out' });
const ROLES = {
  aquarium: {
    'aquarium-heater': input('heater'),
    'aquarium-filter': input('filter'),
    'aquarium-cooler': input('cooler'),
    'aquarium-cooler-lamp': input('cooler'),
    'aquarium-aerator': input('aerator'),
    'oxygen-bubble': input('aerator'),
    'aquarium-light': input('light'),
    'actuator-lamp': input('light'),
    'aquarium-feeder': input('feed'),
    'food-pellet': input('feed'),
    'aquarium-water-change': input('water_change'),
    'aquarium-fish': output('health'),
  },
  greenhouse: {
    'greenhouse-vent': input('vent'),
    'greenhouse-fan': input('vent'),
    'greenhouse-heater': input('heater'),
    'actuator-lamp': input('grow_light'),
    'water-drop': input('pump'),
    'greenhouse-irrigation': input('pump'),
    'greenhouse-soil': [output('moisture'), output('dry'), output('wet')],
    'greenhouse-plant': [output('growth'), output('health')],
    'greenhouse-flood': output('alarm'),
  },
  smart_home: {
    'home-gate': [input('gate'), output('gate_open')],
    'home-sprinkler': input('sprinkler'),
    'water-drop': input('sprinkler'),
    'home-heater': input('heater'),
    'home-fan': input('fan'),
    'home-window': input('indoor_light'),
    'actuator-lamp': input('outdoor_light'),
    'home-alarm': input('alarm_arm'),
    'home-water': [output('water'), output('tank_low')],
    'home-water-tank': output('water'),
    'home-visitor': output('motion'),
  },
  animal_feeder: {
    'feeder-motor': input('dispense'),
    'feeder-shaft': input('dispense'),
    'feeder-coupling': input('dispense'),
    'feeder-chute': input('dispense'),
    'feeder-hopper': [output('hopper'), output('empty')],
    'feeder-bowl': [output('level'), output('full')],
    'feeder-bowl-food': output('level'),
    'feeder-animal': output('hungry'),
    'feeder-warning': output('alarm'),
  },
  water_tank: {
    'tank-pump': input('pump'),
    'tank-propeller': input('pump'),
    'tank-inlet': input('pump'),
    'tank-drain': input('drain'),
    'tank-drain-stream': input('drain'),
    'tank-water': output('level'),
    'tank-level-ruler': output('level'),
    'tank-low-sensor': output('low'),
    'tank-high-sensor': output('high'),
    'tank-flood': output('overflow'),
  },
  railway: {
    'rail-gate': [input('barrier'), output('gate_closed')],
    'rail-gate-arm': [input('barrier'), output('gate_closed')],
    'rail-crossing-deck': output('crossing_clear'),
    'collision-aftermath': output('fault'),
  },
  traffic_junction: { 'collision-aftermath': output('crash') },
};

export function tagSceneObject(object, ...targets) {
  object.userData.inspection = targets.flat();
  return object;
}

/** Role mappings describe the existing circuit ports; they never act on control inputs. */
export function bindScenarioInspection(root, type) {
  root.traverse((object) => {
    if (object.userData.inspection) return;
    const role = object.userData.role;
    let target = ROLES[type]?.[role];
    if (role === 'temperature-sensor') target = output('temperature');
    if (type === 'traffic_light' && role?.startsWith('signal-lamp-'))
      target = input(['red', 'yellow', 'green'][Number(role.at(-1))]);
    if (
      type === 'railway' &&
      ['rail-turnout', 'turnout-lever', 'selected-rail-route'].includes(role)
    ) {
      const port = object.userData.end ? 'exit_points' : 'points';
      target = [input(port), output(`${port}_state`)];
    }
    if (type === 'railway' && role === 'rail')
      target = output(
        object.userData.track === 'shared' ? 'occupied' : `approach_${object.userData.track}`,
      );
    if (object.userData.transportKind === 'rail_train') target = output('occupied');
    if (object.userData.transportKind === 'rail_car') target = output('cars_wait');
    if (object.userData.transportKind === 'junction_car')
      target = output(`${object.userData.axis || 'ns'}_wait`);
    if (target) tagSceneObject(object, target);
  });
}

export function inspectionTargets(object, defaultNodeId) {
  for (let candidate = object; candidate; candidate = candidate.parent) {
    const tags = candidate.userData.inspection;
    if (!tags) continue;
    return tags
      .map((tag) => ({
        nodeId: tag.nodeId || defaultNodeId,
        ...(tag.port ? { port: tag.port, side: tag.side } : {}),
      }))
      .filter((tag) => tag.nodeId);
  }
  return defaultNodeId ? [{ nodeId: defaultNodeId }] : [];
}

export function inspectionVisible(object) {
  for (let candidate = object; candidate; candidate = candidate.parent)
    if (!candidate.visible || candidate.userData.inspectionIgnore) return false;
  return true;
}

export function inspectionMatches(target, selected) {
  return (
    target.nodeId === selected.nodeId &&
    (!selected.port || (target.port === selected.port && target.side === selected.side))
  );
}
