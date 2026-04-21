import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("diagnose env", async () => {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const pub = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const viteUrl = Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const vitePub = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";

  console.log("URL_present:", !!url, "len:", url.length);
  console.log("VITE_URL_present:", !!viteUrl, "len:", viteUrl.length);
  console.log("SRK_present:", !!srk, "len:", srk.length, "sha:", srk ? (await sha256Hex(srk)).slice(0, 12) : "none");
  console.log("ANON_present:", !!anon, "len:", anon.length, "sha:", anon ? (await sha256Hex(anon)).slice(0, 12) : "none");
  console.log("PUB_present:", !!pub, "len:", pub.length, "sha:", pub ? (await sha256Hex(pub)).slice(0, 12) : "none");
  console.log("VITE_PUB_present:", !!vitePub, "len:", vitePub.length, "sha:", vitePub ? (await sha256Hex(vitePub)).slice(0, 12) : "none");

  // Decode JWT role claim of SRK if present
  if (srk && srk.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(srk.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      console.log("SRK_role_claim:", payload.role, "ref:", payload.ref);
    } catch (e) {
      console.log("SRK_decode_err:", (e as Error).message);
    }
  }

  assertEquals(true, true);
});
