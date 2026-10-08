import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapsGatewayUrl } from './maps-config.mjs';

test('Unconfigured static builds make no assumed API request on GitHub Pages', () => {
  assert.equal(mapsGatewayUrl(undefined), null);
  assert.equal(mapsGatewayUrl(''), null);
});
test('Only a public HTTPS gateway endpoint enters the browser build', () => {
  assert.equal(mapsGatewayUrl('https://maps.example.org/api/maps/hospitals'), 'https://maps.example.org/api/maps/hospitals');
  for (const value of ['api-key-secret', 'http://maps.example.org/api/maps/hospitals', 'https://user:secret@maps.example.org/api/maps/hospitals', 'https://maps.example.org/api/maps/hospitals?key=secret', 'https://maps.example.org/api/maps/hospitals#secret', 'https://api.neshan.org/v1/search']) {
    assert.throws(() => mapsGatewayUrl(value));
  }
});
