import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanIp, clientIp, deviceLabel, geoLabel, requestInfo } from "../src/lib/request-info";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

test("clientIp prefers x-real-ip, else the first forwarded address, and refuses junk", () => {
  assert.equal(clientIp(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "10.0.0.1" })), "203.0.113.9");
  assert.equal(clientIp(h({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(clientIp(h({ "x-forwarded-for": "<b>evil</b>" })), "");
  assert.equal(clientIp(h({})), "");
  assert.equal(cleanIp("2001:DB8::1"), "2001:db8::1");
  assert.equal(cleanIp("not an ip"), "");
});

test("requestInfo reads Vercel's location headers and cleans them", () => {
  const info = requestInfo(h({ "x-real-ip": "203.0.113.9", "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "x-vercel-ip-city": "Troy", "x-vercel-ip-country-region": "MI", "x-vercel-ip-country": "US", "x-vercel-ip-latitude": "42.6056", "x-vercel-ip-longitude": "-83.1499", "x-vercel-ip-timezone": "America/Detroit" }));
  assert.equal(info.ip, "203.0.113.9");
  assert.deepEqual(info.geo, { city: "Troy", region: "MI", country: "US", latitude: "42.6056", longitude: "-83.1499", timezone: "America/Detroit" });
  assert.equal(geoLabel(info.geo), "Troy, MI, US");
  assert.equal(deviceLabel(info.userAgent), "iPhone, Safari");
  const encoded = requestInfo(h({ "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-vercel-ip-latitude": "abc" }));
  assert.equal(encoded.geo.city, "São Paulo");
  assert.equal(encoded.geo.latitude, undefined);
});

test("deviceLabel reads common browsers", () => {
  assert.equal(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"), "Windows, Chrome");
  assert.equal(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"), "Windows, Edge");
  assert.equal(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"), "Mac, Safari");
  assert.equal(deviceLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"), "Android, Chrome");
  assert.equal(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1"), "iPhone, Chrome");
  assert.equal(deviceLabel("curl/8.0"), "");
  assert.equal(deviceLabel(null), "");
});

test("timeline folds repeated opens from one device and keeps everything else", async () => {
  const { timeline } = await import("../src/lib/events");
  const base = { section_key: null, ip: "203.0.113.9", user_agent: "ua", geo: null, details: null };
  const ev = (id: number, kind: "opened" | "consented" | "issued", at: string, ip = "203.0.113.9") => ({ id, kind, at, ...base, ip }) as import("../src/lib/events").AuditEvent;
  const items = timeline([ev(1, "issued", "t1"), ev(2, "opened", "t2"), ev(3, "opened", "t3"), ev(4, "opened", "t4"), ev(5, "consented", "t5"), ev(6, "opened", "t6"), ev(7, "opened", "t7", "198.51.100.1")]);
  assert.deepEqual(
    items.map((i) => [i.event.id, i.repeats, i.lastAt]),
    [
      [1, 0, "t1"],
      [2, 2, "t4"],
      [5, 0, "t5"],
      [6, 0, "t6"],
      [7, 0, "t7"],
    ],
  );
});
