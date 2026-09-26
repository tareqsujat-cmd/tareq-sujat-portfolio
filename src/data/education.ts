/**
 * Education, research record and coursework.
 *
 * Course titles are marked `confirmed: false` where they were inferred from
 * course codes rather than read from a transcript. Unconfirmed entries still
 * render, but they are listed in the handoff notes so they can be corrected —
 * nothing here is asserted as verified when it is not.
 */

export type Education = {
  institution: string;
  degree: string;
  field: string;
  location: string;
  period: string;
  /** Omitted from the page entirely when null. Never invented. */
  cgpa: string | null;
  notes?: string[];
};

export const education: Education = {
  institution: "BRAC University",
  degree: "BSc", // TODO_CONFIRM: exact degree designation
  field: "Computer Science and Engineering",
  location: "Dhaka, Bangladesh",
  period: "TODO_CONFIRM — start year – expected graduation",
  cgpa: null, // TODO_CONFIRM: include or omit
};

export type ResearchItem = {
  title: string;
  kind: "Paper" | "Thesis" | "Framework";
  /** Free text — never rendered as "published" unless it says so. */
  status: string;
  authors?: string[];
  yourPosition?: string;
  year: string;
  href?: string;
  /** Slug in the projects collection, if there is a case study. */
  project?: string;
  summary: string;
};

export const research: ResearchItem[] = [
  {
    title:
      "Vision-based Hand Gesture Virtual Keyboard-Mouse framework with Bilingual Next-word prediction",
    kind: "Paper",
    status: "TODO_CONFIRM — venue and publication status",
    authors: [
      "Sammam Mahdi",
      "Reshad Ul Karim",
      "Tareq Sujat",
      "Syeda Maliha Tabassum",
      "Abrar Samin",
      "Aniqua Nusrat Zereen",
    ],
    yourPosition: "Third author",
    year: "2026",
    href: "https://www.researchgate.net/publication/408869355_Vision-based_Hand_Gesture_Virtual_Keyboard-Mouse_framework_with_Bilingual_Next-word_prediction",
    project: "gesture-keyboard",
    summary:
      "Touchless bilingual text entry from hand geometry, with LSTM next-word prediction in English and Bangla. Nine gestures at ≥97.4% accuracy and sub-millisecond latency across seven lighting conditions.",
  },
  {
    title: "Multimodal Car Engine Health Grading from OBD-II Telemetry and Engine Audio",
    kind: "Thesis",
    status: "TODO_CONFIRM — in progress / submitted / defended",
    year: "2026",
    project: "engine-health-grading",
    summary:
      "Ordinal health grading fusing vehicle telemetry with engine acoustics. Cross-driver evaluation exposed a 6.5-point generalisation gap that same-driver splits had hidden entirely.",
  },
  {
    title: "ASD Multimodal Detection Framework",
    kind: "Framework",
    status: "Research code — evaluation-first pipeline for ABIDE I/II",
    year: "2026",
    project: "asd-detection-framework",
    summary:
      "Reproducible multimodal pipeline with four 3D backbones, five fusion strategies, Optuna search and bootstrap confidence intervals on every reported metric.",
  },
];

export type CourseGroup = {
  title: string;
  courses: { code: string; name: string; confirmed: boolean }[];
};

export const coursework: CourseGroup[] = [
  {
    title: "Systems & architecture",
    courses: [
      { code: "CSE340", name: "Computer Architecture", confirmed: false },
      { code: "CSE341", name: "Microprocessors", confirmed: false },
      { code: "CSE421", name: "Computer Networks", confirmed: false },
    ],
  },
  {
    title: "Intelligence & vision",
    courses: [
      { code: "CSE428", name: "Image Processing", confirmed: false },
      { code: "CSE461", name: "Introduction to Robotics", confirmed: false },
    ],
  },
  {
    title: "Software & data",
    courses: [
      { code: "CSE370", name: "Database Systems", confirmed: false },
      { code: "CSE470", name: "Software Engineering", confirmed: false },
    ],
  },
];
