import { getDefinition } from '../../components/catalog/index.js';
import { createGuide } from './create-guide.js';
import andGuide from './gates/and.js';
import orGuide from './gates/or.js';
import nandGuide from './gates/nand.js';
import norGuide from './gates/nor.js';
import xorGuide from './gates/xor.js';
import xnorGuide from './gates/xnor.js';
import notGuide from './gates/not.js';
import gndGuide from './io/gnd.js';
import vccGuide from './io/vcc.js';
import switchGuide from './io/switch.js';
import hotkeyGuide from './io/hotkey.js';
import busInputGuide from './io/bus-input.js';
import clockGuide from './io/clock.js';
import ledGuide from './io/led.js';
import matrixGuide from './io/matrix.js';
import sevensegGuide from './io/sevenseg.js';
import scopeGuide from './io/scope.js';
import muxGuide from './combinational/mux.js';
import demuxGuide from './combinational/demux.js';
import halfAdderGuide from './combinational/half-adder.js';
import fullAdderGuide from './combinational/full-adder.js';
import comparatorGuide from './combinational/comparator.js';
import decoderGuide from './combinational/decoder.js';
import encoderGuide from './combinational/encoder.js';
import srLatchGuide from './sequential/sr-latch.js';
import dFfGuide from './sequential/d-ff.js';
import jkFfGuide from './sequential/jk-ff.js';
import tFfGuide from './sequential/t-ff.js';
import registerGuide from './sequential/register.js';
import shiftRegisterGuide from './sequential/shift-register.js';
import counterGuide from './sequential/counter.js';
import ramGuide from './sequential/ram.js';
import romGuide from './sequential/rom.js';
import registerFileGuide from './sequential/register-file.js';
import dacGuide from './analog/dac.js';
import adcGuide from './analog/adc.js';
import amGuide from './analog/am.js';
import fmGuide from './analog/fm.js';
import pwmGuide from './analog/pwm.js';
import servoGuide from './analog/servo.js';
import aluGuide from './architecture/alu.js';
import tristateGuide from './architecture/tristate.js';
import priorityEncoderGuide from './architecture/priority-encoder.js';
import splitterGuide from './architecture/splitter.js';
import mergerGuide from './architecture/merger.js';
import openDrainGuide from './physical/open-drain.js';
import pullupGuide from './physical/pullup.js';
import pulldownGuide from './physical/pulldown.js';
import schmittGuide from './physical/schmitt.js';
import monostableGuide from './physical/monostable.js';
import noteGuide from './annotation/note.js';
import groupGuide from './annotation/group.js';
import stepperGuide from './motion/stepper.js';
import limitSwitchGuide from './motion/limit-switch.js';
import positionSensorGuide from './motion/position-sensor.js';
import trafficLightGuide from './scenes/traffic-light.js';
import trafficJunctionGuide from './scenes/traffic-junction.js';
import railwayGuide from './scenes/railway.js';
import animalFeederGuide from './scenes/animal-feeder.js';
import waterTankGuide from './scenes/water-tank.js';
import aquariumGuide from './automation/aquarium.js';
import greenhouseGuide from './automation/greenhouse.js';
import smartHomeGuide from './automation/smart-home.js';

// Register manuals explicitly so importing a component never mutates this registry.
const manuals = [
  ['and', andGuide],
  ['or', orGuide],
  ['nand', nandGuide],
  ['nor', norGuide],
  ['xor', xorGuide],
  ['xnor', xnorGuide],
  ['not', notGuide],
  ['gnd', gndGuide],
  ['vcc', vccGuide],
  ['switch', switchGuide],
  ['hotkey', hotkeyGuide],
  ['bus_input', busInputGuide],
  ['clock', clockGuide],
  ['led', ledGuide],
  ['matrix', matrixGuide],
  ['sevenseg', sevensegGuide],
  ['scope', scopeGuide],
  ['mux', muxGuide],
  ['demux', demuxGuide],
  ['half_adder', halfAdderGuide],
  ['full_adder', fullAdderGuide],
  ['comparator', comparatorGuide],
  ['decoder', decoderGuide],
  ['encoder', encoderGuide],
  ['sr_latch', srLatchGuide],
  ['d_ff', dFfGuide],
  ['jk_ff', jkFfGuide],
  ['t_ff', tFfGuide],
  ['register', registerGuide],
  ['shift_register', shiftRegisterGuide],
  ['counter', counterGuide],
  ['ram', ramGuide],
  ['rom', romGuide],
  ['register_file', registerFileGuide],
  ['dac', dacGuide],
  ['adc', adcGuide],
  ['am', amGuide],
  ['fm', fmGuide],
  ['pwm', pwmGuide],
  ['servo', servoGuide],
  ['alu', aluGuide],
  ['tristate', tristateGuide],
  ['priority_encoder', priorityEncoderGuide],
  ['splitter', splitterGuide],
  ['merger', mergerGuide],
  ['open_drain', openDrainGuide],
  ['pullup', pullupGuide],
  ['pulldown', pulldownGuide],
  ['schmitt', schmittGuide],
  ['monostable', monostableGuide],
  ['note', noteGuide],
  ['group', groupGuide],
  ['stepper', stepperGuide],
  ['limit_switch', limitSwitchGuide],
  ['position_sensor', positionSensorGuide],
  ['traffic_light', trafficLightGuide],
  ['traffic_junction', trafficJunctionGuide],
  ['railway', railwayGuide],
  ['animal_feeder', animalFeederGuide],
  ['water_tank', waterTankGuide],
  ['aquarium', aquariumGuide],
  ['greenhouse', greenhouseGuide],
  ['smart_home', smartHomeGuide],
];

export const GUIDES = Object.create(null);
for (const [type, content] of manuals) {
  GUIDES[type] = createGuide(getDefinition(type), content);
}

export function getGuide(type, language = 'en') {
  return GUIDES[type]?.[language === 'ua' || language === 'uk' ? 'ua' : 'en'];
}
