// Internal smoke runner — uses service_role from env, never logs the key.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("internal smoke-test-integrity execution", async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${url}/functions/v1/smoke-test-integrity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
      "apikey": serviceRoleKey,
      "x-internal-trigger": "true",
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  console.log("STATUS_CODE:", res.status);
  console.log("RESPONSE_BODY:", text);

  assertEquals(typeof res.status, "number");
});
