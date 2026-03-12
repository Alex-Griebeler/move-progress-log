import { describe, it, expect } from 'vitest';

/**
 * Oura Edge Function Integration Smoke Tests
 *
 * These tests validate HTTP status codes for auth scenarios.
 * They require a running Supabase instance and use environment variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY (anon key)
 *
 * In CI, these run against the staging project.
 * Credentials are injected via GitHub Secrets, never hardcoded.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Skip if no Supabase URL configured (local dev without env)
const describeIntegration = SUPABASE_URL ? describe : describe.skip;

describeIntegration('Oura Edge Functions — Auth Smoke Tests', () => {
  // Helper: call edge function with given auth
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

  describe('Without Authorization header', () => {
    it('oura-sync-all returns 401', async () => {
      const { status, body } = await callFunction('oura-sync-all');
      expect(status).toBe(401);
      expect(body).toContain('authorization');
    });

    it('oura-sync-scheduled returns 401', async () => {
      const { status, body } = await callFunction('oura-sync-scheduled');
      expect(status).toBe(401);
      expect(body).toContain('authorization');
    });
  });

  describe('With anon key (not a user JWT)', () => {
    it('oura-sync-all returns 401 (invalid JWT)', async () => {
      const { status } = await callFunction('oura-sync-all', `Bearer ${ANON_KEY}`);
      expect(status).toBe(401);
    });

    it('oura-sync-scheduled returns 401 (invalid JWT)', async () => {
      const { status } = await callFunction('oura-sync-scheduled', `Bearer ${ANON_KEY}`);
      expect(status).toBe(401);
    });
  });

  describe('With forged/invalid JWT', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';

    it('oura-sync-all rejects forged token', async () => {
      const { status } = await callFunction('oura-sync-all', `Bearer ${fakeJwt}`);
      expect([401, 403]).toContain(status);
    });

    it('oura-sync-scheduled rejects forged token', async () => {
      const { status } = await callFunction('oura-sync-scheduled', `Bearer ${fakeJwt}`);
      expect([401, 403]).toContain(status);
    });
  });

  describe('create-audit-admin', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('create-audit-admin');
      expect(status).toBe(401);
    });

    it('returns 401 with anon key', async () => {
      const { status } = await callFunction('create-audit-admin', `Bearer ${ANON_KEY}`);
      expect(status).toBe(401);
    });

    it('response never contains credentials or password fields', async () => {
      const { body } = await callFunction('create-audit-admin', `Bearer ${ANON_KEY}`);
      expect(body).not.toContain('"credentials"');
      expect(body).not.toContain('"password"');
    });
  });
});
