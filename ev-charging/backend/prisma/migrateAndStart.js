/**
 * Cloud Run-friendly entrypoint:
 * - applies Prisma migrations (idempotent)
 * - then starts the API server
 */

const { spawn } = require("child_process");
const path = require("path");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  // Ensure Prisma uses the correct schema (repo default)
  const schemaPath = path.join(__dirname, "schema.prisma");

  console.log("▶ Applying Prisma migrations...");
  await run("npx", ["prisma", "migrate", "deploy", "--schema", schemaPath]);
  console.log("✅ Prisma migrations applied");

  console.log("▶ Starting API server...");
  // Start the original server
  require(path.join(__dirname, "..", "server.js"));
}

main().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
