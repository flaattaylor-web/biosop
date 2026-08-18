/**
 * Runtime-agnostic configuration.
 *
 * On Node, values come from process.env (dotenv). On Cloudflare Workers, the
 * fetch handler calls setRuntimeEnv(env) with the Worker's bindings/secrets so
 * the same code reads the same names everywhere.
 */
const runtimeEnv: Record<string, string | undefined> = {};

export function setRuntimeEnv(env: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string') runtimeEnv[k] = v;
  }
}

export function getEnv(name: string): string | undefined {
  if (runtimeEnv[name] !== undefined) return runtimeEnv[name];
  try {
    // process may not exist in every runtime
    return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
  } catch {
    return undefined;
  }
}
