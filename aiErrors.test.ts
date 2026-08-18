import { describe, it, expect } from 'vitest';
import { classifyAiError, upstreamDetail } from '../src/server/app';

// Real payloads seen from the Gemini API during the 2026-08 Cloudflare bring-up.
const QUOTA = '{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}';
const OVERLOADED = '{"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}';
const RETIRED = '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements.","status":"NOT_FOUND"}}';

describe('classifyAiError', () => {
  it('separates quota exhaustion from provider overload', () => {
    expect(classifyAiError(QUOTA)).toBe('quota');
    expect(classifyAiError(OVERLOADED)).toBe('overloaded');
  });

  it('recognises a retired or inaccessible model', () => {
    expect(classifyAiError(RETIRED)).toBe('missing-model');
  });

  it('leaves unrelated failures unclassified so the real message survives', () => {
    expect(classifyAiError('TypeError: cannot read properties of undefined')).toBeNull();
    expect(classifyAiError('')).toBeNull();
  });
});

describe('upstreamDetail', () => {
  it('extracts the human-readable reason from the JSON envelope', () => {
    expect(upstreamDetail(QUOTA)).toBe('You exceeded your current quota, please check your plan and billing details.');
    expect(upstreamDetail(RETIRED)).toContain('no longer available to new users');
  });

  it('never leaks the API key variable name to the client', () => {
    expect(upstreamDetail('GEMINI_API_KEY environment variable is missing.')).toBeUndefined();
  });

  it('falls back to the raw message and caps its length', () => {
    expect(upstreamDetail('plain failure')).toBe('plain failure');
    expect(upstreamDetail('x'.repeat(400))!.length).toBe(240);
    expect(upstreamDetail('')).toBeUndefined();
  });
});
