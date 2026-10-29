import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConfig, classifyDbError, keyKind, projectHost } from "../src/lib/db-health-core";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.sig`;

test("keyKind tells the four Supabase keys apart by shape", () => {
  assert.equal(keyKind("sb_secret_abc"), "secret");
  assert.equal(keyKind("sb_publishable_abc"), "publishable");
  assert.equal(keyKind(jwt("service_role")), "service_role");
  assert.equal(keyKind(jwt("anon")), "anon");
  assert.equal(keyKind("hello"), "unknown");
  assert.equal(keyKind(undefined), "unknown");
});

test("checkConfig catches the common paste mistakes before any request", () => {
  assert.equal(checkConfig(undefined, "sb_secret_x")?.code, "missing_env");
  assert.equal(checkConfig("https://abcd.supabase.co", "")?.code, "missing_env");
  assert.equal(checkConfig("not a url", "sb_secret_x")?.code, "bad_url");
  assert.equal(checkConfig("https://supabase.com/dashboard/project/abcd", "sb_secret_x")?.code, "dashboard_url");
  assert.equal(checkConfig("https://abcd.supabase.co", "sb_publishable_x")?.code, "publishable_key");
  assert.equal(checkConfig("https://abcd.supabase.co", jwt("anon"))?.code, "anon_key");
  assert.equal(checkConfig("https://abcd.supabase.co", "abc")?.code, "unknown_key");
  assert.equal(checkConfig("https://abcd.supabase.co", "sb_secret_x"), null);
  assert.equal(checkConfig("https://abcd.supabase.co/rest/v1/", jwt("service_role")), null);
  assert.equal(projectHost("https://abcd.supabase.co/rest/v1"), "abcd.supabase.co");
});

test("classifyDbError reads the shapes supabase-js really returns (recorded against PostgREST 13)", () => {
  const host = "abcd.supabase.co";
  assert.equal(classifyDbError({ code: "PGRST205", message: "Could not find the table 'public.envelopes' in the schema cache" }, 404, host).code, "no_tables");
  assert.equal(classifyDbError({ code: "42501", message: "permission denied for table envelopes" }, 401, host).code, "permission");
  assert.equal(classifyDbError({ message: "Invalid API key" }, 401, host).code, "bad_key");
  assert.equal(classifyDbError({ code: "", message: "TypeError: fetch failed" }, 0, host).code, "unreachable");
  assert.equal(classifyDbError({ code: "PGRST301", message: "JWT expired" }, 401, host).code, "bad_key");
  assert.equal(classifyDbError(null, 404, host).code, "bad_url");
  const other = classifyDbError({ code: "23505", message: "dup" }, 409, host);
  assert.equal(other.code, "error");
  assert.ok(other.message.includes("409 23505"));
  assert.ok(!JSON.stringify(other).includes("sb_secret"), "never echoes a key");
});
