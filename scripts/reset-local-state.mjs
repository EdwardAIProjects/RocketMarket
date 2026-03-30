import { rm } from "node:fs/promises";

const target = process.env.LOCAL_STATE_PATH || "/tmp/rocketmarket-local.json";
await rm(target, { force: true });
console.log(`Removed local state at ${target}`);
