import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const edgeSource = (slug: string) =>
  readFileSync(resolve(__dirname, `../../../supabase/functions/${slug}/index.ts`), 'utf-8');

const groupSession = edgeSource('generate-group-session');
const classify = edgeSource('classify-exercises');
const importExercises = edgeSource('import-exercises');

// Action 3: production trainers carry the `moderator` role (admin-create-user
// only ever creates admin/moderator; the frontend AppRole has no `trainer`).
// generate-group-session is a trainer feature reachable on /prescricoes, so it
// must accept moderator. import/classify-exercises sit behind admin-only screens
// (AdminRoute), so their legacy `trainer` is tightened to admin only — no new
// access granted to moderators.
describe('edge role guards — moderator is the canonical trainer role', () => {
  it('generate-group-session accepts moderator (trainer feature)', () => {
    expect(groupSession).toContain('["admin", "moderator", "trainer"]');
  });

  it('classify-exercises stays admin-only (no moderator/legacy trainer)', () => {
    expect(classify).toContain('.in("role", ["admin"])');
    expect(classify).not.toContain('["admin", "trainer"]');
  });

  it('import-exercises stays admin-only (no moderator/legacy trainer)', () => {
    expect(importExercises).toContain('allowedRoles: ["admin"]');
    expect(importExercises).not.toContain('["admin", "trainer"]');
  });
});
