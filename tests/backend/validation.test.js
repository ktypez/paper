import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFtsQuery,
  buildLikePattern,
  decodeCursor,
  detectFileType,
  encodeCursor,
  hasThai,
  optionalText,
  parseLimit,
  parseRange,
  requiredText,
} from "../../functions/api/_lib/validation.js";

test("cursor values round trip", () => {
  const cursor = encodeCursor("2026-09-24T12:00:00.000Z", "receipt-id");
  assert.deepEqual(decodeCursor(cursor), {
    uploadedAt: "2026-09-24T12:00:00.000Z",
    id: "receipt-id",
  });
});

test("invalid cursors fail with a 400", () => {
  assert.throws(() => decodeCursor("not-a-cursor"), (error) => error.status === 400);
});

test("list limits are clamped", () => {
  assert.equal(parseLimit(undefined), 30);
  assert.equal(parseLimit("0"), 1);
  assert.equal(parseLimit("500"), 50);
  assert.equal(parseLimit("24"), 24);
});

test("text validation trims values and removes controls", () => {
  assert.equal(requiredText("  receipt\u0000  ", "ชื่อ", 20), "receipt");
  assert.equal(optionalText("   ", 20), null);
  assert.equal(optionalText(null, 20), null);
  assert.throws(() => requiredText(" ", "ชื่อ", 20), (error) => error.code === "required");
});

test("FTS terms are quoted and bounded", () => {
  assert.equal(buildFtsQuery(' one "two" '), '"one"* """two"""*');
});

test("Thai search uses an escaped substring pattern", () => {
  assert.equal(hasThai("ค่ากาแฟ"), true);
  assert.equal(hasThai("coffee"), false);
  assert.equal(buildLikePattern("50%_กาแฟ"), "%50\\%\\_กาแฟ%");
});

test("single byte ranges are normalized", () => {
  assert.deepEqual(parseRange("bytes=10-19"), { offset: 10, length: 10 });
  assert.deepEqual(parseRange("bytes=10-"), { offset: 10 });
  assert.deepEqual(parseRange("bytes=-5"), { suffix: 5 });
  assert.throws(() => parseRange("bytes=10-5"), (error) => error.status === 416);
});

test("file signatures determine supported content types", async () => {
  const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], "receipt.jpg");
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "receipt.png");
  const webp = new File([new TextEncoder().encode("RIFF0000WEBPVP8 ")], "receipt.webp");
  const pdf = new File([new TextEncoder().encode("%PDF-1.7")], "document.pdf");
  const unknown = new File([new TextEncoder().encode("plain text")], "note.txt");

  assert.equal(await detectFileType(jpeg), "image/jpeg");
  assert.equal(await detectFileType(png), "image/png");
  assert.equal(await detectFileType(webp), "image/webp");
  assert.equal(await detectFileType(pdf), "application/pdf");
  assert.equal(await detectFileType(unknown), null);
});
