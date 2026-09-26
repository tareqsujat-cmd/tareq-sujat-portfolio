/**
 * Single source of truth for identity, links and site-wide metadata.
 *
 * Anything marked TODO_CONFIRM is a fact that could not be verified from the
 * repositories or local files. It is deliberately NOT invented — fill it in and
 * the site picks it up everywhere at once. Values left as `null` are omitted
 * from the rendered page and from structured data rather than faked.
 */

export const site = {
  name: "Tareq Sujat",
  /** Used in <title>, OG and JSON-LD. */
  role: "Computer Science & Engineering — BRAC University",
  /** The one-line positioning statement. Derived from the actual work: every
   *  serious project fuses two dissimilar signals into one decision. */
  positioning:
    "I build systems that fuse dissimilar signals into decisions you can trust.",
  summary:
    "Undergraduate CSE researcher at BRAC University working on multimodal machine learning — engine acoustics with vehicle telemetry, neuroimaging with phenotype, hand geometry with language models. I care most about the part everyone skips: proving the model actually generalises.",

  url: "https://tareqsujat.dev", // TODO_CONFIRM: final domain
  locale: "en",
  location: "Dhaka, Bangladesh",

  email: {
    /** The address published on the site. */
    primary: "tareq.sujat@g.bracu.ac.bd", // TODO_CONFIRM: prefer university or personal?
    academic: "tareq.sujat@g.bracu.ac.bd",
    personal: "sujattareq@gmail.com",
  },

  links: {
    github: "https://github.com/tareqsujat-cmd",
    linkedin: "https://www.linkedin.com/in/tareq-sujat-33a1402b5/",
    researchgate:
      "https://www.researchgate.net/publication/408869355_Vision-based_Hand_Gesture_Virtual_Keyboard-Mouse_framework_with_Bilingual_Next-word_prediction",
    /** Drop the PDF at public/resume/tareq-sujat-resume.pdf to activate the CTA. */
    resume: "/resume/tareq-sujat-resume.pdf", // TODO_CONFIRM: file not yet supplied
  },

  /** Rendered verbatim into <meta name="description">. Keep under ~155 chars. */
  description:
    "Tareq Sujat — CSE undergraduate at BRAC University building multimodal machine learning systems for engine diagnostics, neuroimaging and touchless interaction.",

  ogImage: "/og/default.png",
} as const;

export type NavItem = {
  label: string;
  href: string;
  index: string;
};

export const navigation: NavItem[] = [
  { label: "Work", href: "/#work", index: "01" },
  { label: "Research", href: "/#research", index: "02" },
  { label: "Approach", href: "/#approach", index: "03" },
  { label: "Stack", href: "/#stack", index: "04" },
  { label: "Education", href: "/#education", index: "05" },
  { label: "Contact", href: "/#contact", index: "06" },
];
