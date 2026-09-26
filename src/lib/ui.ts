/**
 * Site runtime: theme switching, scroll reveals, active-section tracking and
 * the mobile navigation panel.
 *
 * Deliberately framework-free — the whole file is a few kilobytes and the site
 * ships no client framework at all. Everything degrades: without JS the content
 * is fully rendered and navigable, only the enhancements are absent.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage — the theme still applies for this visit.
  }
  document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((el) => {
    el.setAttribute("aria-pressed", String(theme === "dark"));
  });
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
}

function initTheme(): void {
  // The pre-paint inline script has already stamped data-theme; sync the
  // button state and follow the system if the visitor never chose explicitly.
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }

  document.querySelectorAll<HTMLElement>("[data-theme-toggle]").forEach((el) => {
    el.setAttribute("aria-pressed", String(getTheme() === "dark"));
    el.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  });

  if (!stored) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        let explicit: string | null = null;
        try {
          explicit = localStorage.getItem(STORAGE_KEY);
        } catch {
          explicit = null;
        }
        if (!explicit) {
          document.documentElement.dataset.theme = systemTheme();
          window.dispatchEvent(
            new CustomEvent("themechange", { detail: { theme: systemTheme() } }),
          );
        }
      });
  }
}

/* -------------------------------------------------------------------------- */
/* Scroll reveals                                                              */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    __revealsBooted?: () => void;
  }
}

function initReveals(): void {
  // Tell the inline failsafe we made it, so it stops counting down.
  window.__revealsBooted?.();

  const targets = document.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-mask]");
  if (targets.length === 0) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    },
    // A threshold of 0 with a small bottom inset fires reliably for elements
    // taller than the viewport, which a ratio-based threshold does not.
    { rootMargin: "0px 0px -6% 0px", threshold: 0 },
  );

  targets.forEach((el) => observer.observe(el));
}

/* -------------------------------------------------------------------------- */
/* Active section                                                              */
/* -------------------------------------------------------------------------- */

function initActiveSection(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"),
  );
  if (sections.length === 0 || links.length === 0) return;

  let current = "";

  const setActive = (id: string): void => {
    if (id === current) return;
    current = id;
    for (const link of links) {
      const isActive = link.dataset.navLink === id;
      link.setAttribute("aria-current", isActive ? "true" : "false");
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry nearest the top of the viewport that is still visible.
      let best: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!best || entry.boundingClientRect.top < best.boundingClientRect.top) {
          best = entry;
        }
      }
      if (best) setActive(best.target.id);
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));
}

/* -------------------------------------------------------------------------- */
/* Mobile navigation                                                           */
/* -------------------------------------------------------------------------- */

function initMobileNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const panel = document.querySelector<HTMLElement>("[data-nav-panel]");
  if (!toggle || !panel) return;

  const close = (): void => {
    toggle.setAttribute("aria-expanded", "false");
    panel.dataset.open = "false";
    document.documentElement.style.removeProperty("overflow");
  };

  const open = (): void => {
    toggle.setAttribute("aria-expanded", "true");
    panel.dataset.open = "true";
    document.documentElement.style.setProperty("overflow", "hidden");
    panel.querySelector<HTMLAnchorElement>("a")?.focus();
  };

  toggle.addEventListener("click", () => {
    if (toggle.getAttribute("aria-expanded") === "true") close();
    else open();
  });

  panel.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      close();
      toggle.focus();
    }
  });

  // A resize past the breakpoint should never leave the page scroll-locked.
  window.matchMedia("(min-width: 768px)").addEventListener("change", (event) => {
    if (event.matches) close();
  });
}

/* -------------------------------------------------------------------------- */

export function initSite(): void {
  document.documentElement.classList.add("js");
  initTheme();
  initReveals();
  initActiveSection();
  initMobileNav();
}
