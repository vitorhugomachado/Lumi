/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    process.env.RAILWAY_ENVIRONMENT_ID ? "0.0.0.0" : "127.0.0.1",
    "--port",
    process.env.PORT || "3000",
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
