import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}`));
        return;
      }

      resolve(code ?? 0);
    });

    child.on("error", reject);
  });
}

async function main() {
  const localDevMode = process.env.LOCAL_DEV_MODE === "true";

  if (localDevMode) {
    console.log("LOCAL_DEV_MODE=true, skipping db:push before startup.");
  } else {
    const databaseUrl = process.env.DATABASE_URL ?? "";

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL must be set in team mode so the container can run db:push.",
      );
    }

    const dbPushExitCode = await run("npm", ["run", "db:push"]);

    if (dbPushExitCode !== 0) {
      process.exit(dbPushExitCode);
    }
  }

  const startExitCode = await run("npm", ["run", "start"]);
  process.exit(startExitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
