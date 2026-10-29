import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OWNER_PASSWORD = "owner-pass-for-tests";
process.env.SESSION_SECRET = "a-test-secret-that-is-at-least-32-characters-long";

test("session tokens round-trip, expire, and die with a password change", async () => {
  const { createSessionToken, verifySessionToken } = await import("../src/lib/session");
  const token = await createSessionToken(60);
  assert.equal(await verifySessionToken(token), "owner");
  assert.equal(await verifySessionToken(token + "x"), null);
  assert.equal(await verifySessionToken(token.replace(/\.owner\./, ".team.")), null);
  const expired = await createSessionToken(-1);
  assert.equal(await verifySessionToken(expired), null);
  process.env.OWNER_PASSWORD = "changed";
  assert.equal(await verifySessionToken(token), null);
  process.env.OWNER_PASSWORD = "owner-pass-for-tests";
});

test("tokens are base64url and shaped as the routes expect", async () => {
  const { newToken, tokenLooksValid, sha256Hex } = await import("../src/lib/tokens");
  const t = newToken();
  assert.equal(t.length, 43);
  assert.ok(tokenLooksValid(t));
  assert.ok(!tokenLooksValid("short"));
  assert.ok(!tokenLooksValid("has/slash".padEnd(40, "a")));
  assert.ok(!tokenLooksValid(null));
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
