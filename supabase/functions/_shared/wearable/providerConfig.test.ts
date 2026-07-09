import { assertEquals } from "jsr:@std/assert";
import { WHOOP } from "./providerConfig.ts";

Deno.test("WHOOP config carries verified v2 endpoints + offline scope", () => {
  assertEquals(WHOOP.authorizeUrl, "https://api.prod.whoop.com/oauth/oauth2/auth");
  assertEquals(WHOOP.tokenUrl, "https://api.prod.whoop.com/oauth/oauth2/token");
  assertEquals(WHOOP.apiBase, "https://api.prod.whoop.com/developer");
  assertEquals(WHOOP.scopes.includes("offline"), true);
});
