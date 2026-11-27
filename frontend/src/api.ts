import type { CalculationRequest } from './calculator.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function errorMessage(body: unknown): string | null {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string' && body.error.message.trim()) {
    return body.error.message;
  }
  return null;
}

// A relative URL keeps development and production on the same browser origin.
export async function calculate(request: CalculationRequest, fetcher: typeof fetch = fetch): Promise<number> {
  let response: Response;
  try {
    response = await fetcher('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('The request timed out. Please try again.');
    }
    throw new Error('Could not reach the calculator service. Check that the backend is running.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`The service returned an unreadable response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(errorMessage(body) ?? `Calculation failed (HTTP ${response.status}).`);
  }
  if (!isRecord(body) || typeof body.result !== 'number' || !Number.isFinite(body.result)) {
    throw new Error('The service returned an invalid result.');
  }
  return body.result;
}
