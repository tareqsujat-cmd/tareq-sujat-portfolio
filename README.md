# tareqsujat.dev

Personal portfolio for Tareq Sujat — CSE undergraduate at BRAC University.

Built with Astro, TypeScript and Tailwind v4. No client-side framework: the
whole site ships **3 KB of JavaScript**, all of it hand-written.

---

## Quick start

```bash
npm install
npm run fonts     # copies the 4 woff2 files out of @fontsource into public/fonts
npm run dev       # http://localhost:4321
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built site |
| `npm run check` | `astro check` — type + template diagnostics |
| `npm run fonts` | Re-copy font files after a dependency update |
| `npm run og` | Screenshot the `/og/*` routes into `public/og/*.png` |
| `npm run build:full` | build → regenerate social cards → build again |

Use `build:full` when project titles or headline metrics change, since the
social cards are rendered from that data. Plain `build` is fine otherwise.

---

## How it is put together

```
src/
  content/projects/     One file per project. Frontmatter drives every
                        component; the body is the case-study narrative.
  content.config.ts     Schema for the above. Metrics carry a `protocol`
                        field by design — see "Honesty rules" below.
  data/
    site.ts             Identity, links, metadata. Single source of truth.
    stack.ts            Skills, each mapped to the projects that prove it.
    education.ts        Education, research record, coursework.
  components/
    sections/           The six homepage sections.
    Pipeline.astro      Architecture diagrams (branching flow).
    MetricGrid.astro    Results scorecard.
    Pending.astro       Renders unconfirmed facts as visible placeholders.
  lib/
    fusion-field.ts     The signature hero canvas.
    orb-field.ts        The live background shader.
    ui.ts               Theme, reveals, active section, mobile nav.
    pending.ts          TODO_CONFIRM detection.
    resume.ts           Build-time résumé availability.
  layouts/Base.astro    Head, SEO, JSON-LD, skip link, pre-paint theme script.
  pages/
    index.astro         Homepage
    work/               Index + case studies
    og/[...slug].astro  Social cards, rendered as real pages then screenshotted
```

### Adding a project

Drop a `.md`/`.mdx` file in `src/content/projects/`. The schema is enforced at
build time, so a missing required field fails the build rather than rendering
an empty section. Set `tier: "featured"` for a full case study, `"additional"`
for a compact card.

---

## Design system

Everything lives in `src/styles/global.css`.

Colours are semantic CSS custom properties (`--ink`, `--paper`, `--accent`,
`--rule`, `--signal-a/b/out`) defined once for light and redefined wholesale
for dark. **Never hard-code a colour in a component** — use the token, and both
themes stay correct for free.

Both themes are art-directed rather than inverted, and every foreground/
background pair used on the site meets WCAG AA (verified: `ink-faint`, the
quietest token, sits at 4.55:1 against its worst-case surface).

Type: **Instrument Serif** (display) · **Geist** (UI) · **Geist Mono**
(metadata, metrics, code). Self-hosted, 93 KB total.

### The orb field — the live background

The site's background is a **raymarched orbital cage**: a glowing core wrapped
in flat ribbon rings that tumble around it, rendered in real time. It reacts to
the pointer and drifts with scroll.

There is no 3D library and no geometry. Each ring is a signed distance field —
a torus with a rounded-box cross-section, which is what makes it read as a flat
ribbon rather than a wire — and the assembly is sphere-traced per pixel, then
shaded with a fresnel rim and a specular highlight.

Two layers, in order of preference:

| Layer | File | When it runs |
| --- | --- | --- |
| WebGL fragment shader | `src/lib/orb-field.ts` | Whenever hardware WebGL is available |
| Static CSS orb | `src/components/OrbStill.astro` | No WebGL, software-only rendering, or context loss |

`src/components/SiteBackdrop.astro` picks between them. The still orb is also
what the social cards are rendered from, so there is one definition of the look.

**The two optimisations that make it affordable on an integrated GPU:**

1. **A bounding-sphere test.** The orb occupies a small part of the frame, so
   most pixels miss it entirely and pay for nothing but the ambient haze.
2. **The ray is transformed into each ring's local frame once per pixel**,
   before marching. Inside the loop a ring then costs a multiply-add instead of
   a full matrix product — the difference between this running and not.

**Three rules keep it from wrecking the page:**

- **It is composed, not sprayed.** A screen-space gate confines the orb to the
  right, so the text column stays near-black. The gate is aspect-aware: on
  portrait the camera pulls back and the whole assembly tucks into the top
  corner rather than being cropped into a hard bright edge.
- **It recedes where you read.** An intensity envelope keyed to scroll makes it
  a statement at the hero and again at contact, and drops it to ~40% through
  the content-dense middle.
- **It never competes with first paint.** The shader and the hero canvas both
  boot on `requestIdleCallback` after `load`, and the CSS fallback is painted
  only once the shader is known to have failed.

**Rendering notes worth knowing:**

- `failIfMajorPerformanceCaveat: true` rejects software rasterisation outright —
  a raymarcher on a CPU renderer would be far worse than the static fallback.
- **Capped at 30 fps** and rendered at **0.42× resolution** (0.30× on touch).
  Raymarching cost scales with the square of that number.
- The hit test uses a **cone-traced epsilon** (`0.0013 + 0.0021 * distance`). A
  fixed threshold makes rays that graze a thin band run out of steps just
  outside it, and neighbouring pixels alternate hit/miss — which shows up as a
  stippled edge along every ring.
- Tone mapping is followed by a **chroma restore** around luminance. Reinhard
  compresses toward white, which had desaturated the violet to milky grey.

Tune it with these tokens in `global.css`:

```css
--prism-strength: 0.82;   /* master intensity; 0 disables it entirely */
--orb-core: 250 243 246;  /* the glowing core */
--orb-ring: 181 93 201;   /* the ribbon rings */
--orb-haze: 24 1 71;      /* the ambient bloom */
```

Change those three colours and the whole backdrop retints — to the site's oxide
accent, for instance, if the violet ever feels off-brand.

Hidden in light mode (emitted light needs darkness), frozen on a single
composed frame under `prefers-reduced-motion`, and dropped entirely under
`prefers-reduced-transparency` and forced colours.

**Dark is the default theme** — the orb only exists against black. An explicit
choice by the visitor is stored and always wins. To follow the OS setting
instead, restore the `prefers-color-scheme` branch in the inline script in
`src/layouts/Base.astro`.

> **Editing the shader:** the GLSL lives in a template literal. A stray backtick
> inside it silently terminates the string and the build fails with a confusing
> parse error. Keep backticks out of shader comments.

### Motion — two systems, deliberately separate

- `data-enter` / `data-enter-mask` — above-the-fold. Pure CSS animation on
  load. No JavaScript, no observer, nothing that can get stuck.
- `data-reveal` / `data-reveal-mask` — below-the-fold. Observer-driven, gated
  on `.reveals-armed`, which the inline head script removes again after 2.5 s
  if the reveal module never boots. Content can never be stranded invisible.

`prefers-reduced-motion` short-circuits both and freezes the hero canvas on a
single composed frame.

---

## Honesty rules

These are load-bearing, not decoration. The site's credibility depends on them.

1. **Every metric carries its evaluation protocol.** The `protocol` field is
   how a reader knows what a number means. A metric without one is a claim
   without evidence.
2. **`headline: true` marks the number that best represents generalisation** —
   which is deliberately *not* always the highest. The engine-health case study
   leads with the cross-driver 93.3%, not the same-driver 99.94%, because the
   second one is measuring the driver.
3. **Never invent a fact.** Anything unverified is written as
   `TODO_CONFIRM: <the question>`. `Pending.astro` renders it as a visibly
   provisional chip carrying that question — so an unfilled placeholder looks
   deliberate on a live page and is impossible to miss in review.
4. **No fabricated publication status.** Nothing is described as published,
   accepted or peer-reviewed until the venue is confirmed.

---

## Still to confirm

Search the codebase for `TODO_CONFIRM` to find these in place.

**Blocking — cannot be invented:**

- [ ] **Résumé PDF** → drop at `public/resume/tareq-sujat-resume.pdf`. Until it
      exists, every résumé CTA automatically degrades to an email request
      instead of a dead link (`src/lib/resume.ts`).
- [ ] **Gesture-keyboard paper**: venue + status → `src/data/education.ts`
- [ ] **Thesis**: collaborator name, split of work, supervisor →
      `src/content/projects/engine-health-grading.mdx`
- [ ] **Gesture-keyboard**: your specific contribution (3rd of 6 authors) →
      `src/content/projects/gesture-keyboard.mdx`
- [ ] **ASD framework**: solo or team? → `src/content/projects/asd-detection-framework.mdx`
- [ ] **Education**: start year, expected graduation, CGPA (or leave `null` to
      omit entirely) → `src/data/education.ts`
- [ ] **Domain** → `site.url` in `src/data/site.ts` *and* `site` in
      `astro.config.mjs`

**Worth doing:**

- [ ] Course titles in `src/data/education.ts` are inferred from course codes —
      confirm or correct them.
- [ ] Which framework trained the gesture-keyboard LSTMs (not listed until known).
- [ ] Published email: currently the university address. Swap in
      `site.email.primary` if you prefer the personal one.
- [ ] Figures from the research repos (architecture diagrams, ROC curves,
      confusion matrices) would strengthen the case studies considerably.

---

## Deploying

Static output — any host works.

- **Vercel / Netlify** — zero config. Build `npm run build`, output `dist`.
- **Cloudflare Pages** — same.
- **GitHub Pages** — set `base` in `astro.config.mjs` if not served from root.

Set `site` in `astro.config.mjs` to the real domain before deploying;
canonical URLs, OG tags, the sitemap and `robots.txt` all derive from it.

No environment variables. No secrets. No third-party scripts.

---

## Measured

Production build, homepage:

| | |
| --- | --- |
| LCP (home, shader running) | 788–1332 ms across 4 runs |
| CLS | 0 |
| Sustained FPS | 60, worst frame 18 ms |
| JavaScript | 20 KB (12.5 KB of it the shader) |
| Total transfer | 148 KB (9 requests) — 95 KB of that is fonts |

Measured on an Intel UHD 620 integrated GPU under test load, which is close to
a worst realistic case. Inner pages, which have no hero canvas, sit lower.
| Console errors | 0 |
| Broken links / fragments | 0 |
| `astro check` | 0 errors, 0 warnings |
