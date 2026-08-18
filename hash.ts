/**
 * Hashing / ids that work in Node and in Workers (Web Crypto is available in both).
 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomId(): string {
  return crypto.randomUUID();
}
