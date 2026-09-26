/**
 * Copies exactly the font files the site references out of the installed
 * @fontsource packages into public/fonts.
 *
 * Fontsource ships dozens of subsets and weights; we self-host only the four
 * files @font-face actually asks for. Run via `npm run fonts` after install.
 */
import { copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "fonts");

/** @type {Array<{ from: string; to: string }>} */
const FILES = [
  {
    from: "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2",
    to: "instrument-serif-400.woff2",
  },
  {
    from: "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
    to: "instrument-serif-400-italic.woff2",
  },
  {
    from: "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
    to: "geist-variable.woff2",
  },
  {
    from: "node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
    to: "geist-mono-variable.woff2",
  },
];

await mkdir(out, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = join(root, file.from);
  try {
    await access(src);
  } catch {
    console.error(`  MISSING  ${file.from}`);
    continue;
  }
  await copyFile(src, join(out, file.to));
  console.log(`  copied   ${file.to}`);
  copied += 1;
}

if (copied !== FILES.length) {
  console.error(
    `\n${FILES.length - copied} font file(s) missing — check the paths in scripts/collect-fonts.mjs`,
  );
  process.exit(1);
}

console.log(`\n${copied} font files in public/fonts`);
