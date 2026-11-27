export const operations = [
  { id: 'add', symbol: '+', label: 'Add', hint: 'Add two numbers.', arity: 2, first: 'First number', second: 'Second number' },
  { id: 'subtract', symbol: '−', label: 'Subtract', hint: 'Subtract the second number from the first.', arity: 2, first: 'First number', second: 'Second number' },
  { id: 'multiply', symbol: '×', label: 'Multiply', hint: 'Multiply two numbers.', arity: 2, first: 'First number', second: 'Second number' },
  { id: 'divide', symbol: '÷', label: 'Divide', hint: 'Divide the first number by the second.', arity: 2, first: 'Dividend', second: 'Divisor' },
  { id: 'power', symbol: 'xʸ', label: 'Power', hint: 'Raise the base to the exponent.', arity: 2, first: 'Base', second: 'Exponent' },
  { id: 'sqrt', symbol: '√', label: 'Square root', hint: 'Find the non-negative square root.', arity: 1, first: 'Number', second: '' },
  { id: 'percentage', symbol: '%', label: 'Percentage', hint: 'Find the first number percent of the second.', arity: 2, first: 'Percentage (%)', second: 'Value' },
] as const;

export type Operation = (typeof operations)[number]['id'];
export type CalculationRequest = { operation: Operation; operands: number[] };
export type Validation = { request: CalculationRequest } | { error: string; field: 'first' | 'second' };

// Accept decimal and scientific notation, but not hexadecimal, Infinity, or blank input.
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseOperand(value: string): number | null {
  const trimmed = value.trim();
  if (!decimalPattern.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function validateInput(operation: Operation, first: string, second: string): Validation {
  const a = parseOperand(first);
  if (a === null) return { error: 'Enter a valid first number.', field: 'first' };
  if (operation === 'sqrt') return { request: { operation, operands: [a] } };
  const b = parseOperand(second);
  if (b === null) return { error: 'Enter a valid second number.', field: 'second' };
  return { request: { operation, operands: [a, b] } };
}
