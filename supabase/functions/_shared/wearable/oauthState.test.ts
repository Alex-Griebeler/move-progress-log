import { assertEquals, assertThrows } from "jsr:@std/assert";
import { parseState, peekInviteToken } from "./oauthState.ts";

const SID = "a0000000-0000-4000-8000-000000000001";
const IID = "d0000000-0000-4000-8000-000000000001";

// Minimal stub of the .from().select().eq().single() chain used by peekInviteToken.
// deno-lint-ignore no-explicit-any
const supaStub = (result: { data: any; error: any }) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve(result),
      }),
    }),
  }),
});

const FUTURE = new Date(Date.now() + 60_000).toISOString();
const PAST = new Date(Date.now() - 60_000).toISOString();

Deno.test("parseState accepts valid student:invite:origin", () => {
  const p = parseState(`${SID}:${IID}:b64origin`);
  assertEquals(p.student_id, SID);
  assertEquals(p.invite_id, IID);
  assertEquals(p.encodedOrigin, "b64origin");
});

Deno.test("parseState accepts missing origin", () => {
  assertEquals(parseState(`${SID}:${IID}`).encodedOrigin, null);
});

Deno.test("parseState rejects a non-UUID student_id", () => {
  assertThrows(() => parseState(`not-a-uuid:${IID}`));
});

Deno.test("parseState rejects the deprecated 'retry' marker", () => {
  assertThrows(() => parseState(`${SID}:retry`));
});

Deno.test("peekInviteToken returns the token of a valid unclaimed invite", async () => {
  const supa = supaStub({
    data: { invite_token: "tok-1", created_student_id: SID, expires_at: FUTURE, is_used: false },
    error: null,
  });
  assertEquals(await peekInviteToken(supa, IID, SID), "tok-1");
});

Deno.test("peekInviteToken returns null when the invite is not found", async () => {
  const supa = supaStub({ data: null, error: { message: "not found" } });
  assertEquals(await peekInviteToken(supa, IID, SID), null);
});

Deno.test("peekInviteToken returns null on student mismatch", async () => {
  const supa = supaStub({
    data: { invite_token: "tok-1", created_student_id: "b0000000-0000-4000-8000-000000000002", expires_at: FUTURE, is_used: false },
    error: null,
  });
  assertEquals(await peekInviteToken(supa, IID, SID), null);
});

Deno.test("peekInviteToken returns null for a used invite", async () => {
  const supa = supaStub({
    data: { invite_token: "tok-1", created_student_id: SID, expires_at: FUTURE, is_used: true },
    error: null,
  });
  assertEquals(await peekInviteToken(supa, IID, SID), null);
});

Deno.test("peekInviteToken returns null for an expired invite", async () => {
  const supa = supaStub({
    data: { invite_token: "tok-1", created_student_id: SID, expires_at: PAST, is_used: false },
    error: null,
  });
  assertEquals(await peekInviteToken(supa, IID, SID), null);
});
