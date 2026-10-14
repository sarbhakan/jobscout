import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
await build({ entryPoints: ["components/web/widget.ts"], bundle: true, format: "iife", platform: "browser", target: "es2022", minify: true, outfile: "public/jobscout-widget.js" });
