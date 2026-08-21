import { describe, it, expect } from 'vitest';
import { withTimeout, withIdleTimeout, isTimeout, GeminiTimeoutError } from '../src/server/gemini';

const never = () => new Promise<string>(() => {});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An iterable that yields, then goes silent forever. The exact shape of the reported failure. */
async function* stalls(): AsyncGenerator<string> {
  yield 'first';
  await new Promise(() => {});
  yield 'never reached';
}

async function* fine(): AsyncGenerator<string> {
  yield 'a'; yield 'b'; yield 'c';
}

describe('Gemini deadlines', () => {
  it('a hung call raises a timeout instead of waiting forever', async () => {
    const err = await withTimeout(60, 'test-model', never).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiTimeoutError);
    expect(isTimeout(err)).toBe(true);
    expect(String(err.message)).toContain('test-model');
  });

  it('a call that answers in time is untouched', async () => {
    await expect(withTimeout(500, 'fast', async () => 'ok')).resolves.toBe('ok');
  });

  it('passes the deadline signal down so the provider call is actually cancelled', async () => {
    let seen: AbortSignal | undefined;
    await withTimeout(60, 'm', (signal) => { seen = signal; return never(); }).catch(() => undefined);
    expect(seen).toBeInstanceOf(AbortSignal);
    expect(seen!.aborted).toBe(true);
  });

  it('a real client abort is not disguised as a timeout', async () => {
    const ctrl = new AbortController();
    const p = withTimeout(5000, 'm', (signal) => new Promise<string>((_, rej) => {
      signal.addEventListener('abort', () => rej(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })));
    }), ctrl.signal).catch((e) => e);
    ctrl.abort();
    const err = await p;
    expect(isTimeout(err)).toBe(false);
    expect(err.name).toBe('AbortError');
  });

  it('a stream that opens and then goes silent is cut off', async () => {
    const seen: string[] = [];
    const run = async () => {
      for await (const v of withIdleTimeout(stalls(), 60)) seen.push(v);
    };
    const err = await run().catch((e) => e);
    expect(isTimeout(err)).toBe(true);
    expect(String(err.message)).toMatch(/stopped sending data/);
    expect(seen).toEqual(['first']); // what arrived before the silence is still delivered
  });

  it('a healthy stream passes through untouched and completes', async () => {
    const seen: string[] = [];
    for await (const v of withIdleTimeout(fine(), 500)) seen.push(v);
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('a slow but alive stream is not killed: the bound is silence, not total duration', async () => {
    async function* slow() { yield '1'; await sleep(40); yield '2'; await sleep(40); yield '3'; }
    const seen: string[] = [];
    for await (const v of withIdleTimeout(slow(), 150)) seen.push(v);
    expect(seen).toEqual(['1', '2', '3']);
  });
});
