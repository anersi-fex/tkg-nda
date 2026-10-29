// End-to-end smoke test against a running app (invented data only). Signs in as the owner, sets
// the company names, issues an NDA, signs it as the visitor on a phone-sized screen (name, consent,
// typed signature, every initial, sign), checks the PDF and the record of events, voids a second
// one, and saves screenshots to test-results/. Run it on a fresh database:
//   scripts/local-db/start.sh --reset
//   set -a; . .local-db/env; set +a
//   OWNER_PASSWORD=owner-pass APP_URL=http://localhost:3000 npm run build && npm start
//   APP=http://localhost:3000 OWNER_PASSWORD=owner-pass node scripts/smoke.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_DIR ?? "playwright");

const APP = process.env.APP ?? "http://localhost:3000";
const OWNER = process.env.OWNER_PASSWORD ?? "owner-pass";
const OUT = "test-results";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures++;
};
const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" };
// Pretend to be Vercel's edge for the visitor: an address and a location.
const VISITOR_HEADERS = { "x-forwarded-for": "203.0.113.77", "x-vercel-ip-city": "Troy", "x-vercel-ip-country-region": "MI", "x-vercel-ip-country": "US" };

async function signIn(page, password) {
  await page.goto(`${APP}/login`);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click("button[type=submit]")]);
}

const browser = await chromium.launch();
try {
  // --- Signed out ---
  const anon = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${1 + Math.floor(Math.random() * 250)}` } });
  const a = await anon.newPage();
  await a.goto(`${APP}/`);
  check(a.url().includes("/login"), "signed out: / goes to /login");
  await a.goto(`${APP}/new`);
  check(a.url().includes("/login") && a.url().includes("next=%2Fnew"), "signed out: /new goes to /login?next=/new");
  const r401 = await anon.request.get(`${APP}/api/nda/00000000-0000-0000-0000-000000000000/pdf`);
  check(r401.status() === 401, "signed out: the owner's PDF route is 401");
  const r404 = await anon.request.post(`${APP}/api/sign/${"a".repeat(43)}/event`, { data: { kind: "opened" } });
  check(r404.status() === 404, "unknown token: event route is 404");
  const bad = await anon.request.post(`${APP}/api/sign/not-a-token/event`, { data: { kind: "opened" } });
  check(bad.status() === 404, "malformed token: 404");
  await a.goto(`${APP}/s/${"b".repeat(43)}`);
  check((await a.textContent("body")).includes("isn't here"), "unknown signing link shows the not-found page");
  await a.goto(`${APP}/login`);
  await a.fill("#password", "wrong-password");
  await a.click("button[type=submit]");
  await a.waitForSelector("text=That password isn't right");
  check(true, "wrong password is refused");
  await anon.close();

  // --- Owner: settings, then a new NDA ---
  const owner = await browser.newContext({ ...PHONE });
  const o = await owner.newPage();
  await signIn(o, OWNER);
  check(o.url() === `${APP}/`, "owner signs in and lands on Agreements");
  await o.screenshot({ path: `${OUT}/01-home-empty.png`, fullPage: true });
  await o.goto(`${APP}/settings`);
  await o.fill("#companyName", "The Koka Group, LLC");
  await o.fill("#companyAddress", "100 W Big Beaver Rd, Troy, MI 48084");
  await o.fill("#ownerName", "Anersi Koka");
  await o.fill("#ownerTitle", "Owner");
  await o.click("button[type=submit]");
  await o.waitForSelector("text=Saved.");
  check(true, "settings saved");
  await o.screenshot({ path: `${OUT}/02-settings.png`, fullPage: true });

  await o.goto(`${APP}/new`);
  await o.fill("#name", "Jordan Example");
  await o.fill("#email", "jordan@example.com");
  await o.fill("#note", "Office visit");
  await Promise.all([o.waitForURL((u) => u.pathname.startsWith("/nda/")), o.click("button[type=submit]")]);
  const ndaUrl = o.url();
  const ndaId = new URL(ndaUrl).pathname.split("/")[2];
  check(/^[0-9a-f-]{36}$/.test(ndaId), "new NDA made and opened");
  await o.waitForSelector("text=Signing link");
  const link = (await o.textContent("p.font-mono")).trim();
  check(link.startsWith(`${APP}/s/`) && link.length > APP.length + 40, `signing link shown: ${link.slice(0, 40)}...`);
  check((await o.locator("svg").count()) > 0, "QR code drawn");
  await o.screenshot({ path: `${OUT}/03-nda-issued.png`, fullPage: true });
  const token = link.split("/s/")[1];

  // --- Visitor signs on a phone ---
  const visitor = await browser.newContext({ ...PHONE, extraHTTPHeaders: VISITOR_HEADERS });
  const v = await visitor.newPage();
  await v.goto(link);
  await v.waitForSelector("text=Create my signature");
  check((await v.textContent("h1")).includes("Agreement"), "signing page shows the agreement title");
  check((await v.inputValue("#name")) === "Jordan Example", "the name the owner typed is prefilled");
  await v.screenshot({ path: `${OUT}/04-sign-top.png`, fullPage: false });
  await v.screenshot({ path: `${OUT}/04b-sign-full.png`, fullPage: true });

  // Tapping a gold tab before adopting a signature only nudges.
  const tabs = v.locator("button[aria-label^='Initial here']");
  const tabCount = await tabs.count();
  check(tabCount >= 5 && tabCount <= 7, `${tabCount} initial tabs`);
  await tabs.first().click();
  await v.waitForSelector("text=Create your signature first");
  check(true, "a tab before the signature asks for the signature first");

  // Name, consent, adopt a typed signature.
  await v.fill("#name", "Jordan Q. Example");
  await v.click("button:has-text('Create my signature')");
  await v.waitForSelector("text=Check the box");
  check(true, "consent is required before the signature");
  await v.check("input[type=checkbox]");
  await v.click("button:has-text('Create my signature')");
  await v.waitForSelector("[role=dialog]");
  await v.waitForSelector("[role=dialog] button:has-text('Adopt and continue'):not([disabled])");
  await v.screenshot({ path: `${OUT}/05-adopt.png` });
  await v.click("[role=dialog] [role=radio] >> nth=1");
  await v.click("button:has-text('Adopt and continue')");
  await v.waitForSelector("text=Signing as");
  check(true, "typed signature adopted");

  // Initial every tab.
  for (let i = 0; i < tabCount; i++) {
    const tab = v.locator("button[aria-label^='Initial here']").first();
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await v.waitForFunction((n) => document.querySelectorAll("button[aria-label^='Initial here']").length === n, tabCount - i - 1);
  }
  await v.waitForSelector("text=All initialed");
  check((await v.locator("img[alt^='Initials of']").count()) === tabCount, "every section carries the initials image");
  await v.screenshot({ path: `${OUT}/06-initialed.png`, fullPage: true });

  // Sign and finish.
  await v.locator("section >> button:has-text('Sign and finish')").click();
  await v.waitForSelector("h1:has-text('Signed')", { timeout: 30000 });
  check(true, "signed and sealed");
  await v.screenshot({ path: `${OUT}/07-signed.png` });
  const pdfRes = await visitor.request.get(`${APP}/api/sign/${token}/pdf`);
  check(pdfRes.status() === 200 && pdfRes.headers()["content-type"] === "application/pdf", "the signer's PDF downloads");
  const pdf = await pdfRes.body();
  check(pdf.subarray(0, 5).toString("latin1") === "%PDF-" && pdf.length > 5000, `PDF is ${pdf.length} bytes`);
  writeFileSync(`${OUT}/signed.pdf`, pdf);
  const pdf2 = await (await visitor.request.get(`${APP}/api/sign/${token}/pdf`)).body();
  check(Buffer.compare(pdf, pdf2) === 0, "the stored PDF is served byte for byte");
  // A second finish is a no-op; events after completion are refused.
  const again = await visitor.request.post(`${APP}/api/sign/${token}/complete`, { data: {} });
  check(again.status() === 200 && (await again.json()).already === true, "a second 'finish' is a no-op");
  const late = await visitor.request.post(`${APP}/api/sign/${token}/event`, { data: { kind: "initialed", section: "x" } });
  check(late.status() === 409, "no events after completion");
  await v.reload();
  await v.waitForSelector("h1:has-text('Signed')");
  check(true, "reopening the link shows the signed state");
  await visitor.close();

  // --- Owner sees the record ---
  await o.goto(ndaUrl);
  await o.waitForSelector("text=Signed copy");
  const body = await o.textContent("body");
  check(body.includes("Jordan Q. Example"), "owner sees the signed name");
  check(body.includes("IP 203.0.113.77") && body.includes("Troy, MI, US") && body.includes("iPhone, Safari"), "events carry the visitor's address, location and device");
  check(body.includes("Agreement SHA-256") && body.includes("PDF SHA-256"), "fingerprints shown");
  const kinds = ["Agreement issued", "opened the agreement", "agreed to sign electronically", "adopted a typed signature", "Signer initialed", "signed the agreement", "completed and sealed", "downloaded the signed copy"];
  for (const k of kinds) check(body.includes(k), `record has: ${k}`);
  check((await o.locator("li:has-text('Signer initialed')").count()) === tabCount, `record has ${tabCount} initial events`);
  await o.screenshot({ path: `${OUT}/08-record.png`, fullPage: true });
  const ownerPdf = await owner.request.get(`${APP}/api/nda/${ndaId}/pdf`);
  check(ownerPdf.status() === 200 && Buffer.compare(await ownerPdf.body(), pdf) === 0, "the owner's PDF is the same file");

  // --- A second NDA, voided ---
  await o.goto(`${APP}/new`);
  await Promise.all([o.waitForURL((u) => u.pathname.startsWith("/nda/")), o.click("button[type=submit]")]);
  const link2 = (await o.textContent("p.font-mono")).trim();
  o.once("dialog", (d) => d.accept());
  await o.click("button:has-text('Void this agreement')");
  await o.waitForSelector("text=Voided. The link no longer works", { timeout: 15000 }).catch(() => undefined);
  await o.reload();
  await o.waitForSelector("text=Voided");
  check(true, "voided");
  const v2 = await (await browser.newContext(PHONE)).newPage();
  await v2.goto(link2);
  await v2.waitForSelector("text=canceled");
  check(true, "a voided link says so to the visitor");
  const v2res = await v2.request.post(`${APP}/api/sign/${link2.split("/s/")[1]}/event`, { data: { kind: "opened" } });
  check(v2res.status() === 409, "a voided link takes no events");
  await v2.context().close();

  await o.goto(`${APP}/`);
  await o.waitForSelector("text=Signed");
  await o.screenshot({ path: `${OUT}/09-home.png`, fullPage: true });
  const home = await o.textContent("body");
  check(home.includes("Jordan Q. Example") && home.includes("Voided"), "home lists the signed and the voided agreement");
  await owner.close();
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
