import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/**
 * A metric shown in the case-study scorecard.
 *
 * `caveat` exists because honesty is the point: a number without its
 * evaluation protocol is marketing, not engineering. Anything that looks
 * suspiciously high must carry the protocol that produced it.
 */
const metric = z.object({
  label: z.string(),
  value: z.string(),
  /** e.g. "cross-driver k-fold" — how the number was obtained. */
  protocol: z.string().optional(),
  caveat: z.string().optional(),
  /** Marks the number that best represents real-world generalisation. */
  headline: z.boolean().default(false),
});

/** One stage in the horizontal pipeline diagram. */
const stage = z.object({
  label: z.string(),
  detail: z.string().optional(),
  /** Groups stages into parallel branches, e.g. "audio" / "telemetry". */
  branch: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    /** Short type label: "Undergraduate thesis", "Research framework"… */
    kicker: z.string(),
    tier: z.enum(["featured", "additional"]),
    /** Sort order within a tier. Lower first. */
    order: z.number(),
    period: z.string(),
    /** One sentence for the index card. */
    summary: z.string(),
    /** Two-to-three sentences opening the case study. */
    lede: z.string(),
    /** What Tareq personally built. Never omitted on featured work. */
    role: z.string(),
    collaborators: z.array(z.string()).default([]),
    supervisor: z.string().optional(),
    stack: z.array(z.string()).default([]),
    /** Used to cross-link the Stack section back to real projects. */
    domains: z.array(z.string()).default([]),
    links: z
      .object({
        github: z.string().url().optional(),
        live: z.string().url().optional(),
        paper: z.string().url().optional(),
        demo: z.string().url().optional(),
      })
      .default({}),
    metrics: z.array(metric).default([]),
    pipeline: z.array(stage).default([]),
    /** Rendered as a caution banner, e.g. unverified publication status. */
    note: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
