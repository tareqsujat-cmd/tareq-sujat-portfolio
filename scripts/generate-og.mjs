/**
 * Renders the /og/* routes from a built site into public/og/*.png.
 *
 * The cards are authored as real Astro pages (src/pages/og/[...slug].astro) so
 * they inherit the site's tokens and typefaces. This script only serves the
 * build, screenshots each card at 1200×630, and writes the PNGs back into
 * public/ so the next build ships them.
 *
 * Usage:  npm run build && npm run og && npm run build
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, mkdir, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "public", "og");

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      /* keep looking */
    }
  }
  throw new Error("Chrome not found — set CHROME_PATH or install Chrome.");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const PORT = 4399;

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (path.endsWith("/")) path += "index.html";
    let file = join(dist, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(dist, path, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));

// Discover the card routes the build produced.
const ogDist = join(dist, "og");
let slugs = [];
try {
  const entries = await readdir(ogDist, { withFileTypes: true });
  slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
} catch {
  console.error("No /og routes in dist — run `npm run build` first.");
  server.close();
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const chrome = process.env.CHROME_PATH ?? (await findChrome());
let made = 0;

for (const slug of slugs) {
  const url = `http://127.0.0.1:${PORT}/og/${slug}/`;
  const out = join(outDir, `${slug}.png`);

  await new Promise((resolve, reject) => {
    const proc = spawn(
      chrome,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-color-profile=srgb",
        "--window-size=1200,630",
        `--screenshot=${out}`,
        "--virtual-time-budget=3000",
        url,
      ],
      { stdio: "ignore" },
    );
    proc.on("exit", () => resolve());
    proc.on("error", reject);
  });

  await sleep(120);
  try {
    const { size } = await stat(out);
    console.log(`  ${slug}.png  ${(size / 1024).toFixed(0)} KB`);
    made += 1;
  } catch {
    console.error(`  FAILED ${slug}`);
  }
}

server.close();
console.log(`\n${made}/${slugs.length} social cards written to public/og/`);
