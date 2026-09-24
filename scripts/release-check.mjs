import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

if (git("status", "--porcelain")) {
  throw new Error("Release check requires a clean worktree");
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "master") {
  throw new Error(`Release check must run from master, not ${branch}`);
}

const head = git("rev-parse", "HEAD");
const master = git("rev-parse", "origin/master");
if (head !== master) {
  throw new Error(`HEAD ${head} does not match origin/master ${master}`);
}

const manifest = readFileSync("public/manifest.webmanifest", "utf8");
if (manifest !== "{}\n") {
  throw new Error("The legacy manifest tombstone is missing or changed");
}

console.log(`Release check passed for ${head}`);
