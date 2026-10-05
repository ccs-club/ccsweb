import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const directory = process.env.CCS_TEST_DIRECTORY || await mkdtemp(path.join(os.tmpdir(), "ccs-browser-tests-"));
await mkdir(directory, { recursive: true });
const eventsFile = path.join(directory, "events.json");
const facebookPostsFile = path.join(directory, "facebook-posts.json");
await Promise.all([
  copyFile(new URL("../tests/fixtures/events.json", import.meta.url), eventsFile),
  copyFile(new URL("../tests/fixtures/facebook-posts.json", import.meta.url), facebookPostsFile),
]);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ADMIN_PASSWORD: "test-only-admin-password",
    ADMIN_SESSION_SECRET: "test-only-session-secret-at-least-32-characters",
    EVENTS_FILE_PATH: eventsFile,
    FACEBOOK_POSTS_FILE_PATH: facebookPostsFile,
    FACEBOOK_PAGE_ID: "",
    FACEBOOK_PAGE_ACCESS_TOKEN: "",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", async (error) => {
  console.error(error);
  await rm(directory, { recursive: true, force: true });
  process.exit(1);
});
child.on("exit", async (code) => {
  await rm(directory, { recursive: true, force: true });
  process.exit(code ?? 0);
});
