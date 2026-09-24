import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAX_FILE_SIZE } from "../../functions/api/_lib/validation.js";

test("client and server upload limits stay synchronized", () => {
  const source = readFileSync(new URL("../../src/lib/upload-utils.ts", import.meta.url), "utf8");
  const match = source.match(/MAX_FILE_SIZE\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/);
  assert.ok(match, "client MAX_FILE_SIZE declaration was not found");
  const clientLimit = Number(match[1]) * Number(match[2]) * Number(match[3]);
  assert.equal(clientLimit, MAX_FILE_SIZE);
});
