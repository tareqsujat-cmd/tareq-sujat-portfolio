/**
 * ORB FIELD — raymarched orbital cage
 * ────────────────────────────────────────────────────────────────────────────
 * A glowing core wrapped in flat ribbon rings that tumble around it, rendered
 * as real 3D in a single fragment shader.
 *
 * There is no geometry and no 3D library. Each ring is a signed distance field
 * — a torus with a rounded-box cross-section, which is what makes it read as a
 * flat ribbon rather than a wire — and the whole assembly is sphere-traced per
 * pixel, then shaded with a fresnel rim and a specular highlight.
 *
 * The two optimisations that make this affordable on an integrated GPU:
 *
 *   1. A bounding-sphere test. The orb occupies a small part of the frame, so
 *      most pixels miss it entirely and pay for nothing but the ambient haze.
 *   2. The ray is transformed into each ring's local frame ONCE per pixel,
 *      before marching. Inside the loop a ring costs a multiply-add rather
 *      than a full matrix product, which is the difference between this
 *      running and not.
 *
 * Behaviour:
 *   · pointer parallax orbits the camera slightly
 *   · scroll drifts the assembly and fades it through the reading middle
 *   · pauses on tab blur; reduced motion renders one composed still frame
 *   · rejects software rasterisation — the caller falls back to CSS
 */

const VERT = `#version 100
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `#version 100
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;
uniform float uScroll;
uniform float uIntensity;
uniform float uDark;
uniform vec3  uCore;
uniform vec3  uRing;
uniform vec3  uHaze;

const int RINGS = 5;
const int STEPS = 48;

// Rotation about an arbitrary axis.
mat3 rotAxis(vec3 a, float ang) {
  float s = sin(ang), c = cos(ang), k = 1.0 - c;
  return mat3(
    a.x * a.x * k + c,       a.y * a.x * k - a.z * s, a.z * a.x * k + a.y * s,
    a.x * a.y * k + a.z * s, a.y * a.y * k + c,       a.z * a.y * k - a.x * s,
    a.x * a.z * k - a.y * s, a.y * a.z * k + a.x * s, a.z * a.z * k + c
  );
}

// A flat ribbon ring: torus with a rounded-box cross-section, wide in the
// radial direction and thin along the axis.
float sdRibbon(vec3 p, float radius, float halfWidth, float halfThick) {
  vec2 q = vec2(length(p.xz) - radius, p.y);
  vec2 d = abs(q) - vec2(halfWidth, halfThick);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Per-ring ray, precomputed outside the march.
vec3 gRo[RINGS];
vec3 gRd[RINGS];
float gRadius[RINGS];

float map(float t) {
  float d = 1e9;
  for (int i = 0; i < RINGS; i++) {
    vec3 p = gRo[i] + t * gRd[i];
    d = min(d, sdRibbon(p, gRadius[i], 0.105, 0.0075));
  }
  return d;
}

vec3 normalAt(float t, vec3 ro, vec3 rd) {
  // Gradient by central differences in world space. Only hit pixels pay this.
  vec3 pos = ro + t * rd;
  float e = 0.004;
  vec3 n;
  for (int k = 0; k < 3; k++) {
    vec3 off = vec3(k == 0 ? e : 0.0, k == 1 ? e : 0.0, k == 2 ? e : 0.0);
    float a = 1e9;
    float b = 1e9;
    for (int i = 0; i < RINGS; i++) {
      vec3 base = gRo[i] + t * gRd[i];
      a = min(a, sdRibbon(base + off, gRadius[i], 0.105, 0.0075));
      b = min(b, sdRibbon(base - off, gRadius[i], 0.105, 0.0075));
    }
    if (k == 0) n.x = a - b;
    else if (k == 1) n.y = a - b;
    else n.z = a - b;
  }
  return normalize(n);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / max(uRes.y, 1.0);
  float narrow = 1.0 - smoothstep(0.72, 1.15, aspect);

  // Screen-space placement: right of centre on wide viewports, drifting toward
  // the upper corner on portrait where text spans the full width.
  vec2 anchor = mix(vec2(0.335, 0.045), vec2(0.185, 0.300), narrow);

  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  p -= anchor;
  p.y += uScroll * 0.22;

  // ── camera ─────────────────────────────────────────────────────────────
  vec3 ro = vec3(0.0, 0.0, mix(-3.05, -5.20, narrow));
  vec3 rd = normalize(vec3(p * 1.05, 1.0));

  // Pointer orbits the camera a little, so the cage shows a different face.
  float yaw = (uPointer.x - 0.5) * 0.55;
  float pitch = (uPointer.y - 0.5) * -0.38;
  mat3 cam = rotAxis(vec3(0.0, 1.0, 0.0), yaw) * rotAxis(vec3(1.0, 0.0, 0.0), pitch);
  ro = cam * ro;
  rd = cam * rd;

  float t = uTime;

  // ── ambient haze ───────────────────────────────────────────────────────
  // A soft violet bloom sitting behind everything, brightest near the orb.
  float hazeD = length(p * vec2(0.85, 1.0));
  vec3 col = uHaze * exp(-hazeD * 3.2) * 0.55;

  // ── build the rings, and transform the ray into each local frame ───────
  for (int i = 0; i < RINGS; i++) {
    float fi = float(i);
    float phase = fi * 1.2566;

    // Each ring tumbles on its own axis at its own rate, so the cage never
    // settles into an obvious repeat.
    vec3 axis = normalize(vec3(
      sin(phase * 1.7 + t * 0.10),
      cos(phase * 1.3 + t * 0.13),
      sin(phase * 2.1 - t * 0.08)
    ));
    float spin = t * (0.20 + fi * 0.045) + phase;

    mat3 rot = rotAxis(axis, spin);

    gRo[i] = rot * ro;
    gRd[i] = rot * rd;
    gRadius[i] = 0.52 + fi * 0.075;
  }

  // ── bounding sphere: most pixels stop here ─────────────────────────────
  float bound = 0.98;
  float bq = dot(ro, rd);
  float cq = dot(ro, ro) - bound * bound;
  float disc = bq * bq - cq;

  float hitT = -1.0;

  if (disc > 0.0) {
    float sq = sqrt(disc);
    float tNear = max(-bq - sq, 0.0);
    float tFar = -bq + sq;

    float march = tNear;
    for (int s = 0; s < STEPS; s++) {
      float d = map(march);
      // Cone-traced epsilon. A fixed threshold makes rays that graze a thin
      // band run out of steps while still just outside it, and neighbouring
      // pixels then alternate hit/miss — which shows up as a stippled edge.
      // Widening the threshold with distance travelled closes that gap.
      float eps = 0.0013 + 0.0021 * march;
      if (d < eps) { hitT = march; break; }
      march += max(d * 0.72, 0.0018);
      if (march > tFar) break;
    }
  }

  // ── shade the ribbons ──────────────────────────────────────────────────
  if (hitT > 0.0) {
    vec3 pos = ro + hitT * rd;
    vec3 n = normalAt(hitT, ro, rd);
    vec3 v = -rd;

    vec3 lightDir = normalize(vec3(-0.30, 0.62, -0.72));
    float diff = max(dot(n, lightDir), 0.0);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);

    vec3 h = normalize(lightDir + v);
    float ndh = max(dot(n, h), 0.0);

    // Saturated violet body. Kept deliberately dark at its base so the
    // highlights have somewhere to read against.
    vec3 body = uRing * (0.07 + 0.52 * diff);

    // Rim light — the edge-on glow that makes the bands read as glass. Kept
    // mostly in the ring's own hue; white here is what greyed it out.
    body += mix(uRing, vec3(1.0), 0.22) * fres * 0.85;

    // A single tight specular. One hot pinpoint reads as gloss; a broad
    // second lobe just washes the hue out.
    body += vec3(1.0, 0.94, 1.0) * pow(ndh, 90.0) * 1.70;

    // Depth cue — bands further from the camera sit back into the haze.
    float depth = clamp((hitT - 2.05) / 1.5, 0.0, 1.0);
    body = mix(body, uHaze * 1.5, depth * 0.62);

    col += body;
  }

  // ── the core ───────────────────────────────────────────────────────────
  // Analytic: perpendicular distance from the ray to the origin. No marching.
  float perp = length(ro - dot(ro, rd) * rd);
  float behind = step(0.0, dot(-ro, rd));

  float coreGlow = exp(-perp * perp * 13.0);
  float coreHalo = exp(-perp * perp * 2.4) * 0.70;
  float pulse = 0.90 + 0.10 * sin(t * 0.9);

  // Added last and unconditionally, so it blooms through the bands instead of
  // being occluded by them — the bands are glass, not metal.
  col += uCore * (coreGlow * 2.30 + coreHalo) * behind * pulse;
  col += uRing * exp(-perp * perp * 0.75) * 0.42 * behind;

  // ── composition ────────────────────────────────────────────────────────
  // Same discipline as the rest of the site: the text column stays near-black.
  vec2 gateCentre = mix(vec2(0.815, 0.545), vec2(0.78, 0.845), narrow);
  vec2 gateSize = mix(vec2(0.40, 0.50), vec2(0.30, 0.19), narrow);
  vec2 gate = (uv - gateCentre) / gateSize;
  float presence = exp(-dot(gate, gate) * 1.05);

  presence *= smoothstep(0.40, 0.70, uv.x);
  presence *= mix(1.0, 0.42, narrow);
  presence *= 1.0 - smoothstep(0.88, 1.0, uv.y) * 0.5;

  // Bold at the hero and again at the contact section; recedes where you read.
  float dip = smoothstep(0.03, 0.20, uScroll) * (1.0 - smoothstep(0.75, 0.97, uScroll));
  float envelope = mix(1.0, 0.40, dip);

  col *= presence * envelope * uIntensity * uDark;

  // Filmic roll-off, then dither: dark violet gradients band badly at 8 bits.
  col = col / (col + vec3(0.95));
  col = pow(col, vec3(0.92));

  // Reinhard pulls colour toward white as it compresses. Push the chroma back
  // out around luminance so the violet survives the roll-off.
  float lumc = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lumc), col, 1.42);

  float seed = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453 + fract(uTime));
  col += (seed - 0.5) / 255.0;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export interface OrbHandle {
  destroy(): void;
  setTheme(dark: boolean): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.env.DEV) {
      console.warn("[orb-field] shader failed:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function readVar(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = raw.match(/[\d.]+/g);
  if (!m || m.length < 3) return fallback;
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
}

/** Returns null when WebGL is unavailable — the caller keeps the CSS fallback. */
export function createOrbField(canvas: HTMLCanvasElement): OrbHandle | null {
  const context = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    // Software rasterisation would be far worse than the static fallback.
    failIfMajorPerformanceCaveat: true,
  }) as WebGLRenderingContext | null;

  if (!context) return null;
  const gl: WebGLRenderingContext = context;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {
    res: gl.getUniformLocation(program, "uRes"),
    time: gl.getUniformLocation(program, "uTime"),
    pointer: gl.getUniformLocation(program, "uPointer"),
    scroll: gl.getUniformLocation(program, "uScroll"),
    intensity: gl.getUniformLocation(program, "uIntensity"),
    dark: gl.getUniformLocation(program, "uDark"),
    core: gl.getUniformLocation(program, "uCore"),
    ring: gl.getUniformLocation(program, "uRing"),
    haze: gl.getUniformLocation(program, "uHaze"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");

  let width = 0;
  let height = 0;
  let raf = 0;
  let running = false;
  let start = performance.now();
  let lastFrame = 0;

  /** The assembly turns over seconds; 30 fps is indistinguishable from 60. */
  const FRAME_MS = 1000 / 30;

  let pointerX = 0.62;
  let pointerY = 0.5;
  let targetX = 0.62;
  let targetY = 0.5;
  let scroll = 0;
  let targetScroll = 0;
  let dark = document.documentElement.dataset.theme !== "light";

  let core = readVar("--orb-core", [0.98, 0.95, 1.0]);
  let ring = readVar("--orb-ring", [0.71, 0.32, 0.82]);
  let haze = readVar("--orb-haze", [0.09, 0.02, 0.28]);

  function intensity(): number {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--prism-strength")
      .trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : 0.82;
  }

  let strength = intensity();

  /**
   * Render scale. Raymarching cost scales with the square of this, and the
   * result is a soft out-of-focus background, so it is rendered well below
   * native resolution and upscaled.
   */
  function scaleFor(): number {
    const dpr = window.devicePixelRatio || 1;
    if (coarse.matches) return Math.min(dpr, 1.5) * 0.30;
    return Math.min(dpr, 2) * 0.42;
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = scaleFor();
    const w = Math.max(2, Math.round(rect.width * scale));
    const h = Math.max(2, Math.round(rect.height * scale));
    if (w === width && h === height) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (!running) draw(performance.now());
  }

  function draw(now: number): void {
    const t = (now - start) / 1000;
    gl.uniform2f(u.res, width, height);
    gl.uniform1f(u.time, t);
    gl.uniform2f(u.pointer, pointerX, pointerY);
    gl.uniform1f(u.scroll, scroll);
    gl.uniform1f(u.intensity, strength);
    gl.uniform1f(u.dark, dark ? 1 : 0);
    gl.uniform3f(u.core, core[0], core[1], core[2]);
    gl.uniform3f(u.ring, ring[0], ring[1], ring[2]);
    gl.uniform3f(u.haze, haze[0], haze[1], haze[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    pointerX += (targetX - pointerX) * 0.08;
    pointerY += (targetY - pointerY) * 0.08;
    scroll += (targetScroll - scroll) * 0.12;

    draw(now);
  }

  function play(): void {
    if (running || reduceMotion.matches) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function pause(): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    targetX = event.clientX / window.innerWidth;
    targetY = 1 - event.clientY / window.innerHeight;
  }

  function onScroll(): void {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  }

  function onVisibility(): void {
    if (document.hidden) pause();
    else play();
  }

  function onReduceMotion(): void {
    if (reduceMotion.matches) {
      pause();
      // A composed still frame, caught mid-tumble rather than at t = 0.
      start = performance.now() - 6400;
      draw(performance.now());
    } else {
      play();
    }
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    pause();
    canvas.dataset.failed = "true";
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  reduceMotion.addEventListener("change", onReduceMotion);
  canvas.addEventListener("webglcontextlost", onContextLost);

  resize();
  onScroll();
  if (reduceMotion.matches) onReduceMotion();
  else play();

  return {
    destroy(): void {
      pause();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onReduceMotion);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
    setTheme(next: boolean): void {
      dark = next;
      strength = intensity();
      core = readVar("--orb-core", core);
      ring = readVar("--orb-ring", ring);
      haze = readVar("--orb-haze", haze);
      if (!running) draw(performance.now());
    },
  };
}
