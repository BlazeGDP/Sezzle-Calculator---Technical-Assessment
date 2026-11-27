import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operations, parseOperand, validateInput } from '../src/calculator.ts';
import { calculate } from '../src/api.ts';
import type { CalculationRequest } from '../src/calculator.ts';

test('operation definitions are unique and cover all seven operations', () => {
  assert.equal(operations.length, 7);
  assert.equal(new Set(operations.map((item) => item.id)).size, 7);
  assert.equal(operations.filter((item) => item.arity === 1)[0].id, 'sqrt');
});

test('accepts valid decimal and scientific notation', () => {
  for (const [value, expected] of [['0', 0], [' -12.5 ', -12.5], ['+.5', 0.5], ['2.', 2], ['1e-3', 0.001], ['2E+2', 200]] as const) {
    assert.equal(parseOperand(value), expected);
  }
});

test('rejects blank, invalid and non-finite numbers', () => {
  for (const value of ['', ' ', 'abc', '2x', '1,5', '0x10', 'NaN', 'Infinity', '1e999', '.', '1e', '--1']) {
    assert.equal(parseOperand(value), null, value);
  }
});

test('validates both operands for every binary operation', () => {
  for (const operation of operations.filter((item) => item.arity === 2)) {
    assert.deepEqual(validateInput(operation.id, '2.5', '-3'), { request: { operation: operation.id, operands: [2.5, -3] } });
  }
});

test('square root sends only the first operand', () => {
  assert.deepEqual(validateInput('sqrt', '81', 'ignored'), { request: { operation: 'sqrt', operands: [81] } });
});

test('validation identifies the invalid field', () => {
  assert.deepEqual(validateInput('sqrt', '', '2'), { error: 'Enter a valid first number.', field: 'first' });
  assert.deepEqual(validateInput('divide', '5', 'abc'), { error: 'Enter a valid second number.', field: 'second' });
});

const request: CalculationRequest = { operation: 'add', operands: [2, 3] };
const respond = (body: unknown, status = 200): typeof fetch => async () => Response.json(body, { status });

test('API posts JSON and returns the server result, including zero', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, '/api/v1/calculate');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(init?.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(String(init?.body)), request);
    assert.ok(init?.signal instanceof AbortSignal);
    return Response.json({ result: 0 });
  };
  assert.equal(await calculate(request, fetcher), 0);
  assert.equal(await calculate(request, respond({ result: 5 })), 5);
});

test('API reports structured server errors and fallback HTTP errors', async () => {
  await assert.rejects(calculate(request, respond({ error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } }, 400)), /Cannot divide by zero/);
  for (const body of [null, {}, { error: null }, { error: { message: 12 } }, { error: { message: ' ' } }]) {
    await assert.rejects(calculate(request, respond(body, 503)), /HTTP 503/);
  }
});

test('API rejects malformed success responses', async () => {
  for (const body of [null, {}, { result: '5' }, { result: null }]) {
    await assert.rejects(calculate(request, respond(body)), /invalid result/);
  }
  await assert.rejects(calculate(request, async () => new Response('{"result":1e999}')), /invalid result/);
  await assert.rejects(calculate(request, async () => new Response('<html>', { status: 502 })), /unreadable response/);
});

test('API provides actionable transport and timeout errors', async () => {
  await assert.rejects(calculate(request, async () => { throw new TypeError('offline'); }), /Could not reach/);
  for (const name of ['TimeoutError', 'AbortError']) {
    await assert.rejects(calculate(request, async () => { throw new DOMException('aborted', name); }), /timed out/);
  }
});
