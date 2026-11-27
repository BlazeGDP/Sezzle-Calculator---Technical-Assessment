import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { calculate } from './api';
import { operations, validateInput } from './calculator';
import type { Operation } from './calculator';
import './styles.css';

export default function App() {
  const [operation, setOperation] = useState<Operation>('add');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState<'first' | 'second' | null>(null);
  const [pending, setPending] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const secondRef = useRef<HTMLInputElement>(null);
  const selected = operations.find((item) => item.id === operation)!;

  function clearFeedback() {
    setResult(null);
    setError('');
    setInvalidField(null);
  }

  function reset() {
    setOperation('add');
    setFirst('');
    setSecond('');
    clearFeedback();
    firstRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    clearFeedback();
    const validation = validateInput(operation, first, second);
    if ('error' in validation) {
      setError(validation.error);
      setInvalidField(validation.field);
      (validation.field === 'first' ? firstRef : secondRef).current?.focus();
      return;
    }
    setPending(true);
    try {
      setResult(await calculate(validation.request));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Calculation failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">∑</span> CALCULATOR</div>
        <span className="tech-label">React <span aria-hidden="true">/</span> Go</span>
      </header>
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">ARITHMETIC WORKSPACE</p>
        <h1 id="page-title">Make every number count.</h1>
        <p>Choose an operation, enter your numbers and get a result from the calculator API.</p>
      </section>
      <section className="workspace" aria-label="Calculator workspace">
        <form className="calculator-panel" onSubmit={submit} noValidate aria-busy={pending}>
          <div className="section-heading"><span className="step">01</span><h2>Choose an operation</h2></div>
          <fieldset disabled={pending} className="operations" aria-label="Operations">
            {operations.map((item) => (
              <button type="button" className="operation" key={item.id} aria-pressed={operation === item.id}
                onClick={() => { setOperation(item.id); clearFeedback(); }}>
                <span className="operation-symbol" aria-hidden="true">{item.symbol}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </fieldset>
          <div className="section-heading input-heading"><span className="step">02</span><h2>Enter your numbers</h2></div>
          <p className="operation-hint" id="operation-hint">{selected.hint}</p>
          <fieldset disabled={pending} className="inputs" aria-label="Operands" aria-describedby="operation-hint">
            <div className="field">
              <label htmlFor="first">{selected.first}</label>
              <input ref={firstRef} id="first" type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
                placeholder="e.g. 12.5" value={first} aria-invalid={invalidField === 'first'}
                aria-describedby={invalidField === 'first' ? 'feedback' : undefined}
                onChange={(event) => { setFirst(event.target.value); clearFeedback(); }} />
            </div>
            {selected.arity === 2 && (
              <div className="field">
                <label htmlFor="second">{selected.second}</label>
                <input ref={secondRef} id="second" type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
                  placeholder="e.g. 4" value={second} aria-invalid={invalidField === 'second'}
                  aria-describedby={invalidField === 'second' ? 'feedback' : undefined}
                  onChange={(event) => { setSecond(event.target.value); clearFeedback(); }} />
              </div>
            )}
          </fieldset>
          <div className="actions">
            <button type="submit" className="primary" disabled={pending}>{pending ? 'Calculating…' : 'Calculate'} <span aria-hidden="true">→</span></button>
            <button type="button" className="secondary" disabled={pending} onClick={reset}>Clear</button>
          </div>
          {error && <p className="error" role="alert" id="feedback">{error}</p>}
        </form>
        <aside className="result-panel" aria-label="Calculation result">
          <div className="result-top"><span className="result-kicker">RESULT</span><span className="result-icon" aria-hidden="true">=</span></div>
          <div className="result-content" role="status" aria-live="polite" aria-atomic="true">
            <p className="result-operation">{selected.label}</p>
            <output aria-label="Result" className="result-value">{pending ? '…' : result === null ? '—' : String(result)}</output>
            <p className="result-description">{pending ? 'Waiting for the API…' : result === null ? 'Your answer will appear here.' : 'Calculated by the backend API.'}</p>
          </div>
          <div className="result-footer"><span className="indicator" aria-hidden="true" /> SERVER-SIDE CALCULATION</div>
        </aside>
      </section>
      <footer className="page-footer"><span>Full-stack calculator</span><span>Seven operations · No account required</span></footer>
    </main>
  );
}
