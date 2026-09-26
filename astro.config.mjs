// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://tareqsujat.dev", // TODO_CONFIRM: final domain
  output: "static",
  trailingSlash: "never",

  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/404") && !page.includes("/og/"),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Small, well-cached chunks beat one large bundle for a content site.
      cssCodeSplit: true,
    },
  },

  build: {
    // Emit CSS as files rather than inlining, so it caches across routes.
    inlineStylesheets: "auto",
    format: "directory",
  },

  image: {
    // AVIF first, WebP fallback, generated at build time by sharp.
    responsiveStyles: true,
    layout: "constrained",
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },

  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      wrap: false,
    },
  },
});
