import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://guchio2366-dev.github.io",
  base: "/insight-journal",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory"
  }
});
