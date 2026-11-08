import { contacts } from './pins.js';

export const component = (
  type,
  label,
  ua,
  category,
  symbol,
  inputs,
  outputs,
  defaults,
  description,
  descriptionUa,
) => ({
  type,
  label,
  ua,
  category,
  symbol,
  inputs: contacts(type, 'inputs', inputs),
  outputs: contacts(type, 'outputs', outputs),
  signals: { inputs, outputs },
  defaults,
  description,
  descriptionUa,
});
