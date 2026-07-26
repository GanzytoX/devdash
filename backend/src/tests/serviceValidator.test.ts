import assert from 'node:assert/strict';
import test from 'node:test';
import { parseServiceInput, validMethod } from '../validators/service';

test('accepts supported monitoring methods', () => {
  assert.equal(validMethod('GET'), true);
  assert.equal(validMethod('DELETE'), false);
});

test('normalizes a valid service payload', () => {
  assert.deepEqual(parseServiceInput({ name: ' API ', url: 'https://example.com/health', method: 'GET', interval: 30 }), {
    name: 'API', url: 'https://example.com/health', method: 'GET', interval: 30,
  });
});

test('rejects unsafe monitoring intervals', () => {
  assert.throws(() => parseServiceInput({ name: 'API', url: 'https://example.com', method: 'GET', interval: 1 }), /intervalo/i);
});

test('does not coerce a string into public visibility', () => {
  assert.throws(
    () => parseServiceInput({
      name: 'API',
      url: 'https://example.com',
      method: 'GET',
      interval: 30,
      publicVisible: 'false',
    }),
    /booleano/i,
  );
});

test('rejects oversized tags', () => {
  assert.throws(
    () => parseServiceInput({
      name: 'API',
      url: 'https://example.com',
      method: 'GET',
      interval: 30,
      tags: 'x'.repeat(201),
    }),
    /etiquetas/i,
  );
});
