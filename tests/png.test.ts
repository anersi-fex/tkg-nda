import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_INITIALS, MAX_SIGNATURE, pngFits, pngInfo, PNG_PREFIX } from "../src/lib/png";

/** A PNG header with the given IHDR size (enough for pngInfo; not a complete image). */
function fakePng(width: number, height: number, pad = 120): string {
  const bytes = Buffer.alloc(33 + pad);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "latin1");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return PNG_PREFIX + bytes.toString("base64");
}

test("pngInfo reads the declared size and refuses anything that is not a PNG data URL", () => {
  assert.deepEqual(pngInfo(fakePng(1200, 400)), { width: 1200, height: 400, bytes: 153 });
  assert.equal(pngInfo("data:image/jpeg;base64," + "A".repeat(200)), null);
  assert.equal(pngInfo(PNG_PREFIX + "not base64!!" + "A".repeat(200)), null);
  assert.equal(pngInfo(PNG_PREFIX + Buffer.from("GIF89a" + "x".repeat(120)).toString("base64")), null);
  assert.equal(pngInfo(fakePng(0, 10)), null);
  assert.equal(pngInfo(42), null);
  assert.equal(pngInfo(PNG_PREFIX + "A".repeat(400_000)), null, "over the size cap");
});

test("pngFits bounds the pad's output and refuses a crafted giant", () => {
  assert.ok(pngFits(pngInfo(fakePng(1800, 600)), MAX_SIGNATURE));
  assert.ok(pngFits(pngInfo(fakePng(720, 480)), MAX_INITIALS));
  assert.ok(!pngFits(pngInfo(fakePng(20000, 20000)), MAX_SIGNATURE));
  assert.ok(!pngFits(pngInfo(fakePng(2400, 1001)), MAX_SIGNATURE));
  assert.ok(!pngFits(null, MAX_SIGNATURE));
});
