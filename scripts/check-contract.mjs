/**
 * Guards the shared contract file against silent drift.
 *
 * lib/storefront-types.ts is duplicated byte-for-byte in the StoreCount repo.
 * A package or submodule would cost more than it saves for one dependency-free
 * file, so instead we pin its hash: edit one side and the other side's build
 * fails until you copy the change across.
 *
 * To accept an intentional change: run `node scripts/check-contract.mjs --write`
 * in BOTH repos after copying the file.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contract = join(root, "lib", "storefront-types.ts");
const hashFile = join(root, "lib", ".storefront-types.sha");

const actual = createHash("sha256")
  .update(readFileSync(contract, "utf8"))
  .digest("hex");

if (process.argv.includes("--write")) {
  writeFileSync(hashFile, actual + "\n");
  console.log(`Contract hash updated: ${actual.slice(0, 12)}…`);
  process.exit(0);
}

let expected;
try {
  expected = readFileSync(hashFile, "utf8").trim();
} catch {
  console.error(
    "Missing lib/.storefront-types.sha. Run: node scripts/check-contract.mjs --write",
  );
  process.exit(1);
}

if (actual !== expected) {
  console.error(
    "\nlib/storefront-types.ts has changed.\n\n" +
      "This file is mirrored in the StoreCount repo and the two copies must stay\n" +
      "identical. Copy the change to the other repo, then run\n" +
      "`node scripts/check-contract.mjs --write` in BOTH.\n\n" +
      `  expected ${expected.slice(0, 12)}…\n  actual   ${actual.slice(0, 12)}…\n`,
  );
  process.exit(1);
}
