import { describe, it, expect } from 'vitest';

/**
 * Oura Edge Function Integration Smoke Tests
 * 
 * Validates HTTP status codes for auth scenarios against live endpoints.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY env vars.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const describeIntegration = SUPABASE_URL ? describe : describe.skip;
const NETWORK_TEST_TIMEOUT_MS = 20000;

describeIntegration('Oura Edge Functions — Auth Smoke Tests', { timeout: NETWORK_TEST_TIMEOUT_MS }, () => {
  async function callFunction(name: string, authHeader?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const body = await res.text();
    return { status: res.status, body };
  }

  describe('oura-sync-all', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('oura-sync-all');
      expect(status).toBe(401);
    });

    it('returns 401 with anon key (not a user JWT)', async () => {
      const { status } = await callFunction('oura-sync-all', `Bearer ${ANON_KEY}`);
      expect(status).toBe(401);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('oura-sync-all', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('oura-sync-scheduled', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('oura-sync-scheduled');
      expect(status).toBe(401);
    });

    it('returns 401 with anon key (not a user JWT)', async () => {
      const { status } = await callFunction('oura-sync-scheduled', `Bearer ${ANON_KEY}`);
      expect(status).toBe(401);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('oura-sync-scheduled', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('create-audit-admin', () => {
    it('returns 401 or 403 without auth header (bootstrap guard or auth)', async () => {
      const { status } = await callFunction('create-audit-admin');
      expect([401, 403]).toContain(status);
    });

    it('returns 401 or 403 with anon key', async () => {
      const { status } = await callFunction('create-audit-admin', `Bearer ${ANON_KEY}`);
      expect([401, 403]).toContain(status);
    });

    it('response never contains credentials or password fields', async () => {
      const { body } = await callFunction('create-audit-admin', `Bearer ${ANON_KEY}`);
      expect(body).not.toContain('"credentials"');
      expect(body).not.toContain('"password"');
    });
  });
});
