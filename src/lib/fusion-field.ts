/**
 * THE FUSION FIELD
 * ────────────────────────────────────────────────────────────────────────────
 * The site's one signature interaction.
 *
 * Two dissimilar signals enter from the left — a continuous analogue trace
 * (engine audio) and a discrete quantised trace (OBD-II telemetry) — converge
 * on an attention node, and leave as a single fused decision stream.
 *
 * The output trace morphs in character between the two inputs according to the
 * live fusion weight, which the pointer steers. That is the whole idea: it is
 * not decoration, it is the shape of every project on this site.
 *
 * Constraints it is built to:
 *   · 2D canvas only — no WebGL, no shader compile, no library
 *   · zero allocation inside the animation loop
 *   · paused when off-screen or on a hidden tab
 *   · a single composed static frame under prefers-reduced-motion
 *   · reduced particle budget and self-steering weight on coarse pointers
 */

type Rgb = readonly [number, number, number];

interface Palette {
  signalA: Rgb;
  signalB: Rgb;
  signalOut: Rgb;
  rule: Rgb;
}

interface Particle {
  /** Position along its trace, 0 → 1. */
  t: number;
  speed: number;
  size: number;
  /** Which trace it rides: 0 = audio, 1 = telemetry, 2 = output. */
  trace: 0 | 1 | 2;
  seed: number;
}

const DESKTOP_PARTICLES = 96;
const MOBILE_PARTICLES = 40;
const TRACE_SAMPLES = 56;
const MAX_DPR = 2;

/** Composition, in normalised canvas space. */
const NODE_X = 0.615;
const NODE_Y = 0.5;
const ENTRY_A_Y = 0.28;
const ENTRY_B_Y = 0.72;

function parseColor(value: string): Rgb {
  const v = value.trim();

  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  const nums = v.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
  }

  return [0, 0, 0];
}

function rgba(c: Rgb, alpha: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Cheap deterministic noise — enough character without a Perlin implementation. */
function wobble(t: number, seed: number): number {
  return (
    Math.sin(t * 6.283 + seed) * 0.6 +
    Math.sin(t * 15.7 + seed * 2.3) * 0.28 +
    Math.sin(t * 27.1 + seed * 5.1) * 0.12
  );
}

export interface FusionFieldHandle {
  destroy(): void;
  refreshPalette(): void;
}

export function createFusionField(
  canvas: HTMLCanvasElement,
  readout?: HTMLElement | null,
): FusionFieldHandle {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return { destroy() {}, refreshPalette() {} };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let running = false;
  let time = 0;
  let readoutFrame = 0;

  /** Fusion weight toward audio. 0.5 is balanced. */
  let weight = 0.5;
  let targetWeight = 0.5;
  let pointerActive = false;

  let palette: Palette = readPalette();

  const particleCount = coarsePointer.matches ? MOBILE_PARTICLES : DESKTOP_PARTICLES;
  const particles: Particle[] = new Array(particleCount);
  for (let i = 0; i < particleCount; i += 1) {
    const r = i / particleCount;
    particles[i] = {
      t: r,
      speed: 0.055 + (i % 7) * 0.006,
      size: 1 + (i % 3) * 0.55,
      trace: (i % 3) as 0 | 1 | 2,
      seed: (i * 12.9898) % 6.283,
    };
  }

  /** Scratch buffers — reused every frame so the loop never allocates. */
  const traceX = new Float32Array(TRACE_SAMPLES);
  const traceY = new Float32Array(TRACE_SAMPLES);

  function readPalette(): Palette {
    const s = getComputedStyle(document.documentElement);
    return {
      signalA: parseColor(s.getPropertyValue("--signal-a")),
      signalB: parseColor(s.getPropertyValue("--signal-b")),
      signalOut: parseColor(s.getPropertyValue("--signal-out")),
      rule: parseColor(s.getPropertyValue("--rule")),
    };
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!running) draw();
  }

  /**
   * Writes one input trace into the scratch buffers.
   *
   * `character` blends the trace between analogue (0) and quantised (1), which
   * is what lets the output stream inherit the dominant modality's shape.
   */
  function buildTrace(
    entryY: number,
    character: number,
    amplitude: number,
    phase: number,
    fromX: number,
    toX: number,
    toY: number,
  ): void {
    for (let i = 0; i < TRACE_SAMPLES; i += 1) {
      const t = i / (TRACE_SAMPLES - 1);

      // Ease the trace toward the node rather than running straight at it.
      const converge = t * t * (3 - 2 * t);
      const baseY = lerp(entryY, toY, converge);

      // Amplitude decays as the signal is absorbed by the attention node.
      const envelope = (1 - converge) * amplitude;

      const analogue = wobble(t * 1.9 + phase, 0.7);
      const steps = 7;
      const quantised = Math.round(wobble(t * 1.4 + phase, 2.1) * steps) / steps;
      const shape = lerp(analogue, quantised, character);

      traceX[i] = lerp(fromX, toX, t);
      traceY[i] = baseY + shape * envelope;
    }
  }

  function strokeTrace(
    color: Rgb,
    alpha: number,
    lineWidth: number,
    stepped = false,
  ): void {
    ctx!.beginPath();
    ctx!.moveTo(traceX[0]!, traceY[0]!);
    for (let i = 1; i < TRACE_SAMPLES; i += 1) {
      if (stepped) {
        // Horizontal then vertical: the staircase that says "quantised".
        ctx!.lineTo(traceX[i]!, traceY[i - 1]!);
      }
      ctx!.lineTo(traceX[i]!, traceY[i]!);
    }
    ctx!.strokeStyle = rgba(color, alpha);
    ctx!.lineWidth = lineWidth;
    ctx!.lineJoin = "round";
    ctx!.lineCap = "round";
    ctx!.stroke();
  }

  /** Samples the current scratch trace at 0 → 1 without allocating. */
  function sampleTrace(t: number, out: { x: number; y: number }): void {
    const f = clamp01(t) * (TRACE_SAMPLES - 1);
    const i = Math.min(Math.floor(f), TRACE_SAMPLES - 2);
    const frac = f - i;
    out.x = lerp(traceX[i]!, traceX[i + 1]!, frac);
    out.y = lerp(traceY[i]!, traceY[i + 1]!, frac);
  }

  const samplePoint = { x: 0, y: 0 };

  function drawBackgroundTicks(): void {
    const spacing = 44;
    const tickLength = 5;
    ctx!.strokeStyle = rgba(palette.rule, 0.85);
    ctx!.lineWidth = 1;
    ctx!.beginPath();
    for (let x = spacing; x < width; x += spacing) {
      const major = Math.round(x / spacing) % 4 === 0;
      const len = major ? tickLength * 2 : tickLength;
      ctx!.moveTo(Math.round(x) + 0.5, height - 1);
      ctx!.lineTo(Math.round(x) + 0.5, height - 1 - len);
    }
    ctx!.stroke();
  }

  function drawNode(x: number, y: number, pulse: number): void {
    const radius = 19 + pulse * 2.5;

    // Instrument dial ticks around the node.
    ctx!.strokeStyle = rgba(palette.rule, 1);
    ctx!.lineWidth = 1;
    ctx!.beginPath();
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const inner = radius + 7;
      const outer = inner + (i % 6 === 0 ? 6 : 3);
      ctx!.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx!.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }
    ctx!.stroke();

    // The weight is legible in the ring itself: an arc of each signal's colour.
    const start = -Math.PI / 2;
    const audioArc = Math.PI * 2 * weight;

    ctx!.lineWidth = 2.5;
    ctx!.lineCap = "butt";

    ctx!.beginPath();
    ctx!.arc(x, y, radius, start, start + audioArc);
    ctx!.strokeStyle = rgba(palette.signalA, 0.95);
    ctx!.stroke();

    ctx!.beginPath();
    ctx!.arc(x, y, radius, start + audioArc, start + Math.PI * 2);
    ctx!.strokeStyle = rgba(palette.signalB, 0.95);
    ctx!.stroke();

    // Core.
    ctx!.beginPath();
    ctx!.arc(x, y, 3, 0, Math.PI * 2);
    ctx!.fillStyle = rgba(palette.signalOut, 0.9);
    ctx!.fill();
  }

  function draw(): void {
    if (width === 0 || height === 0) return;

    ctx!.clearRect(0, 0, width, height);

    const nodeX = width * NODE_X;
    const nodeY = height * NODE_Y;
    const amp = height * 0.23;
    const pulse = (Math.sin(time * 2.2) + 1) * 0.5;

    drawBackgroundTicks();

    // ── Input A — audio, continuous ──────────────────────────────────────
    const weightA = 0.45 + weight * 0.9;
    buildTrace(height * ENTRY_A_Y, 0, amp * weightA, time * 0.9, 0, nodeX, nodeY);
    strokeTrace(palette.signalA, 0.5 + weight * 0.45, 1.4 + weight * 1.3);

    for (const p of particles) {
      if (p.trace !== 0) continue;
      sampleTrace(p.t, samplePoint);
      ctx!.beginPath();
      ctx!.arc(samplePoint.x, samplePoint.y, p.size, 0, Math.PI * 2);
      ctx!.fillStyle = rgba(palette.signalA, 0.4 + weight * 0.55);
      ctx!.fill();
    }

    // ── Input B — telemetry, quantised ───────────────────────────────────
    const weightB = 0.45 + (1 - weight) * 0.9;
    buildTrace(height * ENTRY_B_Y, 1, amp * weightB, time * 0.62, 0, nodeX, nodeY);
    strokeTrace(palette.signalB, 0.5 + (1 - weight) * 0.45, 1.4 + (1 - weight) * 1.3, true);

    for (const p of particles) {
      if (p.trace !== 1) continue;
      sampleTrace(p.t, samplePoint);
      const s = p.size;
      ctx!.fillStyle = rgba(palette.signalB, 0.4 + (1 - weight) * 0.55);
      // Square marks for the discrete signal — the shape carries the meaning.
      ctx!.fillRect(samplePoint.x - s, samplePoint.y - s, s * 2, s * 2);
    }

    // ── Output — the fused decision ──────────────────────────────────────
    // Character interpolates between the two inputs, so the output visibly
    // inherits whichever modality currently dominates.
    buildTrace(nodeY, 1 - weight, amp * 0.5, time * 0.75, nodeX, width, nodeY);
    strokeTrace(palette.signalOut, 0.75, 1.9);

    for (const p of particles) {
      if (p.trace !== 2) continue;
      sampleTrace(p.t, samplePoint);
      ctx!.beginPath();
      ctx!.arc(samplePoint.x, samplePoint.y, p.size * 0.85, 0, Math.PI * 2);
      ctx!.fillStyle = rgba(palette.signalOut, 0.6);
      ctx!.fill();
    }

    drawNode(nodeX, nodeY, pulse);
  }

  function tick(now: number): void {
    rafId = requestAnimationFrame(tick);

    const seconds = now / 1000;
    const dt = Math.min(seconds - time, 0.05);
    time = seconds;

    // On touch devices, or before the pointer arrives, the field steers itself
    // so it is never inert.
    if (!pointerActive) {
      targetWeight = 0.5 + Math.sin(seconds * 0.32) * 0.32;
    }
    weight += (targetWeight - weight) * Math.min(dt * 3.2, 1);

    for (const p of particles) {
      p.t += p.speed * dt;
      if (p.t > 1) p.t -= 1;
    }

    draw();

    readoutFrame += 1;
    if (readout && readoutFrame % 6 === 0) {
      const a = weight.toFixed(2);
      const b = (1 - weight).toFixed(2);
      readout.textContent = `audio ${a} · telemetry ${b}`;
    }
  }

  function start(): void {
    if (running || reduceMotion.matches) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ── Input ──────────────────────────────────────────────────────────────

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) / rect.height;
    pointerActive = true;
    // Upper half favours audio, lower half favours telemetry.
    targetWeight = clamp01(1 - y);
  }

  function onPointerLeave(): void {
    pointerActive = false;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) start();
        else stop();
      }
    },
    { threshold: 0.01 },
  );

  function onVisibility(): void {
    if (document.hidden) stop();
    else if (isOnScreen()) start();
  }

  function isOnScreen(): boolean {
    const rect = canvas.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function onReduceMotionChange(): void {
    if (reduceMotion.matches) {
      stop();
      // One composed, balanced frame — the same diagram, held still.
      weight = 0.5;
      time = 0;
      draw();
      if (readout) readout.textContent = "audio 0.50 · telemetry 0.50";
    } else if (isOnScreen()) {
      start();
    }
  }

  const resizeObserver = new ResizeObserver(() => resize());

  resize();
  resizeObserver.observe(canvas);
  observer.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  reduceMotion.addEventListener("change", onReduceMotionChange);

  const parent = canvas.parentElement ?? canvas;
  parent.addEventListener("pointermove", onPointerMove, { passive: true });
  parent.addEventListener("pointerleave", onPointerLeave, { passive: true });

  if (reduceMotion.matches) {
    onReduceMotionChange();
  }

  return {
    destroy(): void {
      stop();
      resizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onReduceMotionChange);
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
    },
    refreshPalette(): void {
      palette = readPalette();
      if (!running) draw();
    },
  };
}
