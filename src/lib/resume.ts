/**
 * Résumé availability, resolved at build time.
 *
 * The CTA must never be a dead link. Until the PDF is actually dropped into
 * public/resume/, every résumé affordance on the site degrades to an email
 * request instead of pointing at a 404 — and the moment the file appears, the
 * next build turns them all back into real download links with no code change.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { site } from "~/data/site";

const publicPath = fileURLToPath(new URL("../../public", import.meta.url));
const resumeFile = `${publicPath}${site.links.resume.replace(/\//g, "/")}`;

export const resumeAvailable: boolean = existsSync(resumeFile);

export const resumeHref: string = resumeAvailable
  ? site.links.resume
  : `mailto:${site.email.primary}?subject=${encodeURIComponent("Résumé request")}`;

export const resumeLabel: string = resumeAvailable ? "Résumé" : "Request résumé";
