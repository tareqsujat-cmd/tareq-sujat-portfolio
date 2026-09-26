/**
 * Technical stack, grouped by what it is used *for* rather than by popularity.
 *
 * Rules this list follows:
 *   1. No proficiency percentages. They are unverifiable and everyone inflates them.
 *   2. Every entry names the project it was actually used in, so a reader can
 *      click through and check the claim.
 *   3. Nothing appears here that does not appear in a real repository's
 *      dependency manifest or source.
 */

export type Tool = {
  name: string;
  /** Slugs from the projects collection. Rendered as verification links. */
  usedIn: string[];
  /** Optional half-line of specificity — what it was used to do. */
  note?: string;
};

export type StackGroup = {
  id: string;
  title: string;
  /** One line framing why this group exists. */
  blurb: string;
  tools: Tool[];
};

export const stack: StackGroup[] = [
  {
    id: "languages",
    title: "Languages",
    blurb: "Chosen for the layer of the problem, from ordinal loss functions down to register allocation.",
    tools: [
      {
        name: "Python",
        usedIn: ["engine-health-grading", "asd-detection-framework", "gesture-keyboard", "abide-eda"],
        note: "primary research language",
      },
      { name: "TypeScript", usedIn: ["fashion-2026"], note: "strict mode, app + build tooling" },
      { name: "JavaScript", usedIn: ["fashion-2026", "php-commerce"] },
      { name: "SQL", usedIn: ["php-commerce"], note: "normalised schema, hand-written joins" },
      { name: "PHP", usedIn: ["php-commerce"] },
      { name: "x86 Assembly", usedIn: ["x86-banking-system"], note: "8086, no standard library" },
    ],
  },
  {
    id: "deep-learning",
    title: "Deep learning",
    blurb: "Model construction, training loops and the parts underneath the framework's abstractions.",
    tools: [
      {
        name: "PyTorch",
        usedIn: ["engine-health-grading", "asd-detection-framework"],
        note: "custom architectures, ordinal heads, fusion modules",
      },
      { name: "torchaudio", usedIn: ["engine-health-grading"], note: "spectrogram transforms" },
      { name: "einops", usedIn: ["engine-health-grading", "asd-detection-framework"] },
      { name: "timm", usedIn: ["engine-health-grading"], note: "backbone baselines" },
      {
        name: "CORN ordinal regression",
        usedIn: ["engine-health-grading"],
        note: "K−1 conditional binary thresholds",
      },
    ],
  },
  {
    id: "audio-vision",
    title: "Audio & vision",
    blurb: "Turning continuous physical signals into something a network can reason about.",
    tools: [
      { name: "librosa", usedIn: ["engine-health-grading"], note: "log-Mel, 128 bands" },
      { name: "soundfile", usedIn: ["engine-health-grading"] },
      { name: "audiomentations", usedIn: ["engine-health-grading"], note: "time/frequency masking" },
      { name: "MediaPipe", usedIn: ["gesture-keyboard"], note: "21-point hand landmarks" },
      { name: "OpenCV", usedIn: ["gesture-keyboard"] },
      { name: "Grad-CAM", usedIn: ["engine-health-grading", "asd-detection-framework"] },
    ],
  },
  {
    id: "neuroimaging",
    title: "Neuroimaging",
    blurb: "Medical imaging formats and the preprocessing that has to happen before any of it is usable.",
    tools: [
      { name: "nibabel", usedIn: ["asd-detection-framework"], note: "NIfTI I/O" },
      { name: "nilearn", usedIn: ["asd-detection-framework", "abide-eda"], note: "ABIDE I/II fetching" },
      {
        name: "MRI preprocessing",
        usedIn: ["asd-detection-framework"],
        note: "skull stripping, N4 bias correction, registration, QC",
      },
    ],
  },
  {
    id: "evaluation",
    title: "Evaluation & statistics",
    blurb: "The part that decides whether a result is real. Built before the models, deliberately.",
    tools: [
      { name: "scikit-learn", usedIn: ["asd-detection-framework", "engine-health-grading", "abide-eda"] },
      { name: "SciPy", usedIn: ["asd-detection-framework", "engine-health-grading"] },
      { name: "statsmodels", usedIn: ["engine-health-grading"] },
      { name: "pingouin", usedIn: ["engine-health-grading"], note: "significance testing" },
      {
        name: "Bootstrap CIs",
        usedIn: ["asd-detection-framework"],
        note: "resampled intervals on every reported metric",
      },
      { name: "Optuna", usedIn: ["asd-detection-framework"], note: "TPE search over architecture + optimiser" },
      { name: "MLflow", usedIn: ["engine-health-grading"], note: "experiment tracking" },
    ],
  },
  {
    id: "web",
    title: "Web",
    blurb: "Shipping interfaces, not just notebooks.",
    tools: [
      { name: "Next.js", usedIn: ["fashion-2026"], note: "App Router, RSC" },
      { name: "React", usedIn: ["fashion-2026"] },
      { name: "Astro", usedIn: [], note: "this site — zero-JS baseline, islands" },
      { name: "Tailwind CSS", usedIn: ["fashion-2026"], note: "v4, CSS-first tokens" },
      { name: "GSAP · Motion · Lenis", usedIn: ["fashion-2026"], note: "scroll and timeline motion" },
      { name: "Three.js", usedIn: ["fashion-2026"] },
      { name: "Zustand", usedIn: ["fashion-2026"], note: "persisted client state" },
    ],
  },
  {
    id: "tooling",
    title: "Data & tooling",
    blurb: "The unglamorous layer that makes an experiment reproducible six months later.",
    tools: [
      { name: "NumPy · pandas", usedIn: ["asd-detection-framework", "engine-health-grading", "abide-eda"] },
      { name: "Matplotlib · seaborn", usedIn: ["asd-detection-framework", "abide-eda"] },
      { name: "pytest", usedIn: ["asd-detection-framework"], note: "14 test modules" },
      { name: "Hydra / OmegaConf", usedIn: ["engine-health-grading"], note: "config-driven experiments" },
      { name: "MySQL", usedIn: ["php-commerce"] },
      { name: "Git", usedIn: [] },
      { name: "Vercel", usedIn: ["fashion-2026"] },
    ],
  },
];
