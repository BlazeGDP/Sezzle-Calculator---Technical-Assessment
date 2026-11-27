import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { calculate } from '../src/api';

vi.mock('../src/api', () => ({ calculate: vi.fn() }));
const api = vi.mocked(calculate);

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('calculator interface', () => {
  it('submits two operands and renders the backend result', async () => {
    const user = userEvent.setup();
    api.mockResolvedValue(15);
    render(<App />);
    await user.type(screen.getByLabelText('First number'), '7.5');
    await user.type(screen.getByLabelText('Second number'), '7.5');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByLabelText('Result').textContent).toBe('15'));
    expect(api).toHaveBeenCalledWith({ operation: 'add', operands: [7.5, 7.5] });
  });

  it('blocks invalid input and focuses the invalid field', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByRole('alert').textContent).toMatch(/valid first number/);
    expect(document.activeElement).toBe(screen.getByLabelText('First number'));
    await user.type(screen.getByLabelText('First number'), '4');
    await user.type(screen.getByLabelText('Second number'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByRole('alert').textContent).toMatch(/valid second number/);
    expect(api).not.toHaveBeenCalled();
  });

  it('switches to a unary operation and clears previous feedback', async () => {
    const user = userEvent.setup();
    api.mockResolvedValue(9);
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Square root' }));
    expect(screen.queryByLabelText('Second number')).toBeNull();
    expect(screen.getByRole('button', { name: 'Square root' }).getAttribute('aria-pressed')).toBe('true');
    await user.type(screen.getByLabelText('Number', { exact: true }), '81');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByLabelText('Result').textContent).toBe('9'));
    expect(api).toHaveBeenCalledWith({ operation: 'sqrt', operands: [81] });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Result').textContent).toBe('—');
    expect((screen.getByLabelText('First number') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Add' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows pending state, prevents duplicate submission, and displays server errors', async () => {
    const user = userEvent.setup();
    let rejectRequest!: (reason: Error) => void;
    api.mockReturnValue(new Promise<number>((_, reject) => { rejectRequest = reject; }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Divide' }));
    await user.type(screen.getByLabelText('Dividend'), '8');
    await user.type(screen.getByLabelText('Divisor'), '0');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect((screen.getByRole('button', { name: 'Calculating…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(true);
    expect(api).toHaveBeenCalledTimes(1);
    rejectRequest(new Error('Cannot divide by zero.'));
    expect((await screen.findByRole('alert')).textContent).toBe('Cannot divide by zero.');
    expect((screen.getByRole('button', { name: 'Calculate' }) as HTMLButtonElement).disabled).toBe(false);
    await user.clear(screen.getByLabelText('Divisor'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders zero and clears stale results when a number is edited', async () => {
    const user = userEvent.setup();
    api.mockResolvedValue(0);
    render(<App />);
    await user.type(screen.getByLabelText('First number'), '0');
    await user.type(screen.getByLabelText('Second number'), '0');
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    await waitFor(() => expect(screen.getByLabelText('Result').textContent).toBe('0'));
    await user.type(screen.getByLabelText('First number'), '1');
    expect(screen.getByLabelText('Result').textContent).toBe('—');
  });
});
