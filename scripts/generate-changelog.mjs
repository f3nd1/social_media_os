// Generates public/changelog.json from git history so the Changelog screen can
// read it. Run as a prebuild and predev step. The output is gitignored on
// purpose: it is regenerated fresh on every build or dev start, so it can never
// block a git pull or cause a merge conflict. If git is unavailable for any
// reason, an empty list is written so the build still succeeds.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const outFile = join(repoRoot, "public", "changelog.json");

// ASCII control characters unlikely to appear in a commit are used as
// separators so multi-line commit bodies survive intact. Each commit record
// starts with RECORD; a BODY_END marker closes the (possibly multi-line) body
// so the git --name-status lines that follow are never mistaken for the body.
const RECORD = "\x1e"; // starts each commit record
const FIELD = "\x1f"; // between header fields
const BODY_END = "\x1d"; // closes the body, before the file list
const FORMAT =
  RECORD + ["%H", "%h", "%an", "%aI", "%s", "%b"].join(FIELD) + BODY_END;

function mapChangeType(code) {
  const key = (code || "").trim().charAt(0).toUpperCase();
  if (key === "A") return "Added";
  if (key === "D") return "Deleted";
  if (key === "R") return "Renamed";
  if (key === "C") return "Copied";
  return "Modified";
}

function readCommits() {
  const raw = execFileSync(
    "git",
    ["log", `--pretty=format:${FORMAT}`, "--name-status", "--no-color"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  const commits = [];

  for (const record of raw.split(RECORD)) {
    if (!record.trim()) continue;

    // The body may span many lines, so split the header from the file list on
    // the explicit BODY_END marker rather than on the first newline.
    const markerIndex = record.indexOf(BODY_END);
    const header = markerIndex === -1 ? record : record.slice(0, markerIndex);
    const fileBlock = markerIndex === -1 ? "" : record.slice(markerIndex + 1);
    const [hash, shortHash, author, isoDate, subject, body = ""] =
      header.split(FIELD);

    if (!hash) continue;

    const files = [];
    for (const line of fileBlock.split("\n")) {
      const trimmed = line.replace(/\s+$/, "");
      if (!trimmed.trim()) continue;
      const parts = trimmed.split("\t");
      if (parts.length < 2) continue;
      // For renames and copies git prints the destination path last.
      const path = parts[parts.length - 1];
      if (!path) continue;
      files.push({ path, changeType: mapChangeType(parts[0]) });
    }

    commits.push({
      hash,
      shortHash,
      author,
      date: isoDate,
      subject,
      body: body.trim(),
      files,
    });
  }

  return commits;
}

function main() {
  let commits = [];
  try {
    commits = readCommits();
  } catch (error) {
    console.warn(
      "[changelog] Could not read git history, writing an empty changelog:",
      error?.message ?? error,
    );
    commits = [];
  }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), commits }, null, 2),
  );
  console.log(
    `[changelog] Wrote ${commits.length} commits to public/changelog.json`,
  );
}

main();
