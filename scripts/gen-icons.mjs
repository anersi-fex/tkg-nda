// Draws Ink's app icons, link card and iPhone opening screens into public/.
// Run: npm run icons
// Needs Playwright (the project's, a global one on NODE_PATH, or playwright-core) and a Chromium:
// CHROMIUM_PATH, else the one under /opt/pw-browsers. The mark is the same as InkMark in
// src/components/brand.tsx (keep the two geometries in sync).
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const FONT = join(ROOT, "node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2");

// The same geometry as brand.tsx: a fountain-pen nib; big marks carry the slit and breather hole.
function nibPath(small) {
  const body = "M512 112C664 112 772 236 772 408C772 572 630 748 512 912C394 748 252 572 252 408C252 236 360 112 512 112Z";
  if (small) return body;
  const hole = "M512 428C535 428 554 447 554 470C554 493 535 512 512 512C489 512 470 493 470 470C470 447 489 428 512 428Z";
  const slit = "M500 508H524V840L512 862L500 840Z";
  return body + hole + slit;
}

// Ink: graphite to slate (the light-mode gradient; icons never change with the theme).
const GRAD_FROM = "#1f2937";
const GRAD_TO = "#475569";
const MARK_RADIUS = 0.27;

const SPLASH_SCREENS = [
  [440, 956, 3],
  [420, 912, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [375, 667, 2],
  [414, 736, 3],
];

const THEMES = {
  light: { bg: "#f2f3f7", text: "#15171c", muted: "#646a78", suffix: "" },
  dark: { bg: "#0b0d12", text: "#eef0f5", muted: "#8c93a5", suffix: "-dark" },
};

function markSvg({ small = false, rx = Math.round(1024 * MARK_RADIUS), scale = 1 } = {}) {
  const t = scale === 1 ? "" : ` transform="translate(512 512) scale(${scale}) translate(-512 -512)"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GRAD_FROM}"/><stop offset="1" stop-color="${GRAD_TO}"/></linearGradient></defs>` +
    `<rect width="1024" height="1024"${rx ? ` rx="${rx}"` : ""} fill="url(#g)"/>` +
    `<path d="${nibPath(small)}" fill="#fff" fill-rule="evenodd"${t}/>` +
    `</svg>`
  );
}

function markHtml(size, radius = Math.round(size * MARK_RADIUS), extraStyle = "") {
  return (
    `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:linear-gradient(135deg,${GRAD_FROM},${GRAD_TO});flex:none;${extraStyle}">` +
    `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}" style="display:block"><path d="${nibPath(size < 40)}" fill="#fff" fill-rule="evenodd"/></svg>` +
    `</div>`
  );
}

function page(body, bg = "transparent") {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Plus Jakarta Sans"; src: url("${pathToFileURL(FONT).href}") format("woff2"); font-weight: 200 800; font-style: normal; }
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
body { background: ${bg}; font-family: "Plus Jakarta Sans", sans-serif; -webkit-font-smoothing: antialiased; }
svg { display: block; }
.fill { width: 100vw; height: 100vh; }
.fill > svg { width: 100%; height: 100%; }
.center { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style></head><body>${body}</body></html>`;
}

function splashHtml(theme) {
  const { bg, text, muted } = THEMES[theme];
  return page(
    `<main class="center">` +
      markHtml(112, 26) +
      `<div style="margin-top:22px;font-size:28px;font-weight:800;letter-spacing:-0.025em;line-height:1.15;color:${text}">Ink</div>` +
      `<div style="margin-top:4px;font-size:14px;font-weight:600;line-height:1.3;color:${muted}">by TKG</div>` +
      `</main>`,
    bg,
  );
}

// The plain link card: the mark and the name, with a faint signature flourish along the bottom.
function ogHtml() {
  const flourish =
    `<svg width="1200" height="630" viewBox="0 0 1200 630" style="position:fixed;inset:0">` +
    `<defs><linearGradient id="b" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="630"><stop offset="0" stop-color="${GRAD_FROM}"/><stop offset="1" stop-color="${GRAD_TO}"/></linearGradient></defs>` +
    `<path d="M-40 520 C 120 380, 220 640, 360 500 S 560 360, 700 520 S 920 660, 1080 480 S 1240 420, 1300 520" fill="none" stroke="url(#b)" stroke-width="26" stroke-linecap="round" opacity="0.14"/>` +
    `<path d="M700 572 H 1140" stroke="url(#b)" stroke-width="6" stroke-linecap="round" opacity="0.18"/>` +
    `</svg>`;
  const { text, muted } = THEMES.light;
  return page(
    flourish +
      `<main style="position:fixed;left:96px;top:130px;display:flex;align-items:center;gap:46px">` +
      markHtml(220, 59, "box-shadow:0 2px 6px rgba(21,23,28,0.06),0 18px 40px rgba(31,41,55,0.24)") +
      `<div><div style="font-size:104px;font-weight:800;letter-spacing:-0.035em;line-height:1.05;color:${text}">Ink</div>` +
      `<div style="margin-top:14px;font-size:38px;font-weight:600;line-height:1.2;color:${muted}">by The Koka Group</div></div>` +
      `</main>`,
    THEMES.light.bg,
  );
}

async function loadChromium() {
  // require() honors NODE_PATH (a global Playwright); import() does not.
  for (const spec of ["playwright", "playwright-core"]) {
    try {
      const mod = require(spec);
      if (mod.chromium) return mod.chromium;
    } catch {
      // try the next one
    }
  }
  if (process.env.PLAYWRIGHT_CORE) {
    const mod = await import(pathToFileURL(process.env.PLAYWRIGHT_CORE).href);
    const chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) return chromium;
  }
  throw new Error("Playwright not found: run `npm install --no-save playwright-core`, or set PLAYWRIGHT_CORE to its index.mjs");
}

function findChromiumBinary() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync("/opt/pw-browsers/chromium")) return "/opt/pw-browsers/chromium";
  if (existsSync("/opt/pw-browsers")) {
    for (const dir of readdirSync("/opt/pw-browsers").filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      const bin = join("/opt/pw-browsers", dir, "chrome-linux", "chrome");
      if (existsSync(bin)) return bin;
    }
  }
  return undefined;
}

function pngSize(file) {
  const head = readFileSync(file).subarray(0, 24);
  if (head.toString("latin1", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return [head.readUInt32BE(16), head.readUInt32BE(20)];
}

async function main() {
  if (!existsSync(FONT)) throw new Error(`Plus Jakarta Sans not found at ${FONT} (run npm install)`);
  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: findChromiumBinary() });
  const work = mkdtempSync(join(tmpdir(), "ink-icons-"));
  const contexts = new Map();
  let n = 0;
  const written = [];

  async function render({ html, width, height, ratio = 1, out, transparent = false }) {
    if (!contexts.has(ratio)) contexts.set(ratio, await browser.newContext({ deviceScaleFactor: ratio }));
    const tab = await contexts.get(ratio).newPage();
    const file = join(work, `page-${n++}.html`);
    writeFileSync(file, html);
    await tab.setViewportSize({ width, height });
    await tab.goto(pathToFileURL(file).href);
    const fontOk = await tab.evaluate(async () => {
      await document.fonts.ready;
      const faces = await document.fonts.load('800 28px "Plus Jakarta Sans"');
      return faces.length > 0 && faces.every((f) => f.status === "loaded");
    });
    if (!fontOk) throw new Error("Plus Jakarta Sans did not load");
    const jpeg = out.endsWith(".jpg");
    await tab.screenshot({ path: out, type: jpeg ? "jpeg" : "png", quality: jpeg ? 90 : undefined, omitBackground: transparent });
    await tab.close();
    if (!jpeg) {
      const [w, h] = pngSize(out);
      if (w !== width * ratio || h !== height * ratio) throw new Error(`${out} is ${w}x${h}, expected ${width * ratio}x${height * ratio}`);
    }
    written.push(out.slice(ROOT.length + 1));
  }

  try {
    mkdirSync(join(PUBLIC, "splash"), { recursive: true });
    writeFileSync(join(PUBLIC, "icon.svg"), markSvg({ small: true }) + "\n");
    written.push("public/icon.svg");
    const svgPage = (svg) => page(`<div class="fill">${svg}</div>`);
    await render({ html: page(`<div class="fill">${markSvg({ rx: 0 })}</div>`, GRAD_FROM), width: 180, height: 180, out: join(PUBLIC, "apple-touch-icon.png") });
    for (const size of [192, 512]) {
      await render({ html: svgPage(markSvg()), width: size, height: size, out: join(PUBLIC, `icon-${size}.png`), transparent: true });
    }
    await render({ html: page(`<div class="fill">${markSvg({ rx: 0, scale: 0.8 })}</div>`, GRAD_FROM), width: 512, height: 512, out: join(PUBLIC, "icon-maskable-512.png") });
    await render({ html: svgPage(markSvg({ small: true })), width: 32, height: 32, out: join(PUBLIC, "favicon-32.png"), transparent: true });
    await render({ html: ogHtml(), width: 1200, height: 630, out: join(PUBLIC, "og.jpg") });
    for (const [w, h, ratio] of SPLASH_SCREENS) {
      for (const theme of ["light", "dark"]) {
        const name = `splash-${w * ratio}x${h * ratio}${THEMES[theme].suffix}.png`;
        await render({ html: splashHtml(theme), width: w, height: h, ratio, out: join(PUBLIC, "splash", name) });
      }
    }
  } finally {
    await browser.close();
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`Wrote ${written.length} files:\n  ${written.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
