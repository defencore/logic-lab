class Parameter {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
    this.cancellations = [];
  }
  setValueAtTime(value, at) {
    this.events.push({ value, at });
  }
  cancelScheduledValues(at) {
    this.cancellations.push(at);
    this.events = this.events.filter((event) => event.at < at);
  }
  at(time) {
    let value = this.value;
    for (const event of this.events) if (event.at <= time) value = event.value;
    return value;
  }
}
export function fakeAudioContext() {
  return class Context {
    static instances = [];
    constructor() {
      this.currentTime = 0;
      this.state = 'suspended';
      this.nodes = [];
      this.destination = { kind: 'destination' };
      this.constructor.instances.push(this);
    }
    node(kind) {
      const node = {
        kind,
        outputs: [],
        stopped: false,
        disconnected: false,
        connect(target) {
          this.outputs.push(target);
        },
        disconnect() {
          this.disconnected = true;
        },
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      };
      this.nodes.push(node);
      return node;
    }
    createGain() {
      return Object.assign(this.node('gain'), { gain: new Parameter() });
    }
    createWaveShaper() {
      return this.node('limiter');
    }
    createBiquadFilter() {
      return Object.assign(this.node('filter'), { frequency: new Parameter(), Q: new Parameter() });
    }
    createOscillator() {
      return Object.assign(this.node('oscillator'), { frequency: new Parameter(440) });
    }
    createConstantSource() {
      return Object.assign(this.node('constant'), { offset: new Parameter(1) });
    }
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    async close() {
      this.state = 'closed';
    }
  };
}

export function audioFixture(type = 'active_buzzer', value = 1) {
  const node = { id: 'buzzer', type, enabled: true };
  const snapshot = {
    node: node.id,
    type,
    value,
    frequency: type === 'active_buzzer' ? 880 : null,
    volume: 0.15,
  };
  const event = { ...snapshot, serial: 1, at: 0 };
  return {
    project: { nodes: [node] },
    runtime: { time: 0, audio: { [node.id]: snapshot }, audioEvents: [event], audioSerial: 1 },
  };
}
export function append(fixture, at, value) {
  fixture.runtime.time = at;
  const snapshot = { ...fixture.runtime.audio.buzzer, value };
  fixture.runtime.audio.buzzer = snapshot;
  fixture.runtime.audioEvents.push({ ...snapshot, at, serial: ++fixture.runtime.audioSerial });
}
