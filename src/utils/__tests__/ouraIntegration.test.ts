import { describe, it, expect } from 'vitest';

/**
 * Oura Edge Function Integration Smoke Tests
 * 
 * Validates HTTP status codes for auth scenarios against live endpoints.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY env vars.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const IS_CI = import.meta.env.CI === 'true';
const RUN_LOCAL_INTEGRATION = import.meta.env.VITE_RUN_OURA_INTEGRATION_TESTS === 'true';
const SHOULD_RUN_INTEGRATION = Boolean(SUPABASE_URL && ANON_KEY) && (IS_CI || RUN_LOCAL_INTEGRATION);

const describeIntegration = SHOULD_RUN_INTEGRATION ? describe : describe.skip;
const NETWORK_TEST_TIMEOUT_MS = 20000;

describeIntegration('Oura Edge Functions — Auth Smoke Tests', { timeout: NETWORK_TEST_TIMEOUT_MS }, () => {
  const TRANSIENT_RETRY_COUNT = 2;

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function callFunction(
    name: string,
    authHeader?: string,
    options?: {
      method?: 'GET' | 'POST';
      query?: string;
      body?: string;
    }
  ) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    const query = options?.query ? `?${options.query}` : '';
    const method = options?.method ?? 'POST';
    const requestInit: RequestInit = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      requestInit.body = options?.body ?? '{}';
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${query}`, requestInit);
    const body = await res.text();
    return { status: res.status, body };
  }

  async function callFunctionWithRetry(name: string, authHeader?: string) {
    let lastResponse = await callFunction(name, authHeader);

    for (let attempt = 0; attempt < TRANSIENT_RETRY_COUNT; attempt++) {
      if (lastResponse.status < 500) return lastResponse;
      await wait(300 * (attempt + 1));
      lastResponse = await callFunction(name, authHeader);
    }

    return lastResponse;
  }

  describe('oura-sync-all', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('oura-sync-all');
      expect(status).toBe(401);
    });

    it('returns 401 with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('oura-sync-all', `Bearer ${ANON_KEY}`);
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
      const { status } = await callFunctionWithRetry('oura-sync-scheduled', `Bearer ${ANON_KEY}`);
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

  describe('import-exercises', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('import-exercises');
      expect(status).toBe(401);
    });

    it('returns non-2xx with anon key (not admin/trainer JWT)', async () => {
      const { status } = await callFunctionWithRetry('import-exercises', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('import-exercises', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('generate-group-session', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('generate-group-session');
      expect(status).toBe(401);
    });

    it('returns non-2xx with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('generate-group-session', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('generate-group-session', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('parse-word-prescription', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('parse-word-prescription');
      expect(status).toBe(401);
    });

    it('returns non-2xx with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('parse-word-prescription', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('parse-word-prescription', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('generate-student-report', () => {
    it('returns 401 without auth header', async () => {
      const { status } = await callFunction('generate-student-report');
      expect(status).toBe(401);
    });

    it('returns non-2xx with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('generate-student-report', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('rejects forged token with non-200', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.invalid';
      const { status } = await callFunction('generate-student-report', `Bearer ${fakeJwt}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('oura-sync', () => {
    it('returns non-2xx without auth header', async () => {
      const { status } = await callFunction('oura-sync');
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('returns non-2xx with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('oura-sync', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('oura-sync-test', () => {
    it('returns non-2xx without auth header', async () => {
      const { status } = await callFunction('oura-sync-test');
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('returns non-2xx with anon key (not a user JWT)', async () => {
      const { status } = await callFunctionWithRetry('oura-sync-test', `Bearer ${ANON_KEY}`);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });
  });

  describe('validate-student-invite', () => {
    it('returns 400 when token is missing', async () => {
      const { status } = await callFunction('validate-student-invite', undefined, { method: 'GET' });
      expect(status).toBe(400);
    });

    it('returns 400 for malformed token format', async () => {
      const { status } = await callFunction('validate-student-invite', undefined, {
        method: 'GET',
        query: 'token=invalid-token',
      });
      expect(status).toBe(400);
    });
  });

  describe('create-student-from-invite', () => {
    it('returns 400 with invalid payload shape', async () => {
      const { status } = await callFunction('create-student-from-invite');
      expect(status).toBe(400);
    });

    it('returns 400 with malformed invite_token', async () => {
      const { status } = await callFunction('create-student-from-invite', undefined, {
        body: JSON.stringify({
          invite_token: 'invalid-token',
          student_data: { name: 'Teste' },
        }),
      });
      expect(status).toBe(400);
    });
  });

  describe('oura-callback', () => {
    it('returns 400 when code/state are missing', async () => {
      const { status } = await callFunction('oura-callback', undefined, { method: 'GET' });
      expect(status).toBe(400);
    });
  });

  describe('check-rate-limit', () => {
    it('returns non-2xx when action is missing', async () => {
      const { status } = await callFunction('check-rate-limit');
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('returns non-2xx for invalid action', async () => {
      const { status } = await callFunction('check-rate-limit', undefined, {
        body: JSON.stringify({ action: 'invalid_action' }),
      });
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    });

    it('returns 401 for increment + user_id without auth', async () => {
      const { status } = await callFunction('check-rate-limit', undefined, {
        body: JSON.stringify({
          action: 'login',
          increment: true,
          user_id: '00000000-0000-4000-8000-000000000000',
        }),
      });
      expect(status).toBe(401);
    });
  });
});
