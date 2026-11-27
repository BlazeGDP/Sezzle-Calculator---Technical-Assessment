import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/api.ts';
import type { Operation } from '../src/calculator.ts';

// Run explicitly against a running Go service; ordinary unit tests remain isolated.
const base = process.env.CALCULATOR_API_URL ?? 'http://127.0.0.1:8080';
const liveFetch: typeof fetch = (url, init) => fetch(new URL(String(url), base), init);

const cases: [Operation, number[], number][] = [
  ['add', [12, 8], 20],
  ['subtract', [3, 8], -5],
  ['multiply', [-4, 5], -20],
  ['divide', [7, 2], 3.5],
  ['power', [2, 10], 1024],
  ['sqrt', [81], 9],
  ['percentage', [15, 200], 30],
];

test('live health endpoint', async () => {
  const response = await fetch(new URL('/api/v1/health', base), { signal: AbortSignal.timeout(8000) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

for (const [operation, operands, expected] of cases) {
  test(`live ${operation}`, async () => {
    assert.equal(await calculate({ operation, operands }, liveFetch), expected);
  });
}

test('live errors are returned to the frontend API client', async () => {
  await assert.rejects(calculate({ operation: 'divide', operands: [5, 0] }, liveFetch), /Cannot divide by zero/);
  await assert.rejects(calculate({ operation: 'sqrt', operands: [-9] }, liveFetch), /non-negative number/);
  await assert.rejects(calculate({ operation: 'power', operands: [-4, 0.5] }, liveFetch), /no real-valued result/);
  await assert.rejects(calculate({ operation: 'multiply', operands: [1e308, 10] }, liveFetch), /numeric range/);
});
