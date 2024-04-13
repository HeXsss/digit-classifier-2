import { defineConfig } from "vite"

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist"
  },
  publicDir: "public",
  base: "/digit-classifier-2/"
})
