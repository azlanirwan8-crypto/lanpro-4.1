/**
 * #315 — wrapper CJS: delegasi ke generator TypeScript (Zod → OpenAPI).
 * Tetap ada supaya pemanggilan `node scripts/generate-openapi.cjs` tidak putus.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", path.join(__dirname, "generate-openapi.ts")],
  { stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(r.status === null ? 1 : r.status);
