import { cp, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
try { await access(path.join(standalone, "server.js")); }
catch { throw new Error("Build de production manquant. Lancez npm run build avant npm start."); }
await cp(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
const child = spawn(process.execPath, [path.join(standalone, "server.js")], {
  stdio: "inherit", env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", HOSTNAME: "0.0.0.0" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error.message); process.exit(1); });
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
