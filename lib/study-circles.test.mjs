import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CIRCLE_DOCUMENT_BYTES, validateCircleDocument, validateCircleDraft, validCircleResponse } from "./study-circles.ts";

const now = Date.parse("2030-01-01T08:00:00Z");
const session = { kind: "session", title: "Calculus", location: "Library", startsAt: "2030-01-01T10:00:00+02:00" };
const poll = { kind: "poll", title: "Next topic?", options: ["Integration", "Matrices"] };
const resource = { kind: "resource", title: "Practice questions", url: "https://example.com/notes" };
const validate = (draft) => validateCircleDraft(draft, now);

test("rejects missing details and non-string or unknown activity kinds", () => {
  for (const input of [null, false, "", [], {}, { ...poll, kind: "unknown" }, { ...poll, kind: ["poll"] }, { ...poll, kind: {} }]) {
    assert.equal(typeof validate(input).error, "string");
  }
});

test("normalizes titles and supplies only the chosen activity's fields", () => {
  assert.deepEqual(validate({ ...poll, title: "  Next topic?  ", description: "  Pick one  ", url: "javascript:bad", location: "ignored" }).data, {
    kind: "poll", title: "Next topic?", description: "Pick one", location: "", startsAt: "",
    options: ["Integration", "Matrices"], url: "",
  });
});

test("enforces the exact title and description length limits", () => {
  for (const title of ["", "   ", 123, "a".repeat(121)]) assert.ok(validate({ ...poll, title }).error);
  assert.ok(validate({ ...poll, title: "a" }).data);
  assert.ok(validate({ ...poll, title: "a".repeat(120), description: "a".repeat(1000) }).data);
  assert.ok(validate({ ...poll, description: "a".repeat(1001) }).error);
});

test("requires a future session, including correct timezone conversion", () => {
  assert.ok(validate(session).error, "time equal to now must fail");
  assert.ok(validate({ ...session, startsAt: "2030-01-01T07:59:59Z" }).error);
  for (const startsAt of ["invalid", "", null, now + 1000]) assert.ok(validate({ ...session, startsAt }).error);
  const result = validate({ ...session, startsAt: "2030-01-01T12:00:00+02:00", location: " Library " });
  assert.equal(result.data.startsAt, "2030-01-01T10:00:00.000Z");
  assert.equal(result.data.location, "Library");
});

test("bounds session meeting-place names", () => {
  const future = { ...session, startsAt: "2030-01-02T08:00:00Z" };
  for (const location of ["", "   ", 1, "a".repeat(161)]) assert.ok(validate({ ...future, location }).error);
  assert.ok(validate({ ...future, location: "a".repeat(160) }).data);
});

test("accepts 2–6 unique trimmed poll options of at most 80 characters", () => {
  assert.deepEqual(validate({ ...poll, options: [" A ", " B "] }).data.options, ["A", "B"]);
  assert.ok(validate({ ...poll, options: Array.from({ length: 6 }, (_, i) => String(i)) }).data);
  assert.ok(validate({ ...poll, options: ["a".repeat(80), "b"] }).data);
  for (const options of [null, [], ["A"], ["A", 2], ["A", " "], ["A", "a"], [" A ", "a"], ["a".repeat(81), "b"], Array.from({ length: 7 }, (_, i) => String(i))]) {
    assert.ok(validate({ ...poll, options }).error, `rejected ${JSON.stringify(options)}`);
  }
});

test("only accepts bounded HTTP(S) resource URLs without embedded credentials", () => {
  for (const url of ["https://example.com", "http://example.com/notes", "https://example.com/notes?q=math#chapter"]) {
    assert.equal(validate({ ...resource, url }).data.url, new URL(url).toString());
  }
  assert.ok(validate({ ...resource, url: `https://example.com/${"a".repeat(1980)}` }).data);
  for (const url of ["", "not a url", "/notes", "javascript:alert(1)", "data:text/html,test", "ftp://example.com", "https://student:password@example.com", "https://student@example.com", `https://example.com/${"a".repeat(1981)}`, null]) {
    assert.ok(validate({ ...resource, url }).error, `rejected ${url}`);
  }
});

test("RSVPs accept only explicit going/not-going strings", () => {
  assert.equal(validCircleResponse("session", "going", []), true);
  assert.equal(validCircleResponse("session", "not-going", []), true);
  for (const value of ["maybe", "0", "", null, true, 1]) assert.equal(validCircleResponse("session", value, []), false);
});

test("poll responses must be canonical in-range string indices", () => {
  const options = ["A", "B", "C"];
  for (const value of ["0", "1", "2"]) assert.equal(validCircleResponse("poll", value, options), true);
  for (const value of ["3", "-1", "01", "1.0", "1e0", " 1", "A", "", 0, null, {}]) {
    assert.equal(validCircleResponse("poll", value, options), false);
  }
  assert.equal(validCircleResponse("poll", "0", []), false);
});

test("resources cannot collect votes or RSVPs", () => {
  for (const value of ["going", "not-going", "0", null]) assert.equal(validCircleResponse("resource", value, ["A"]), false);
});

test("document metadata accepts only bounded PDF/DOCX documents with safe filenames", () => {
  assert.deepEqual(validateCircleDocument(" Notes.PDF ", MAX_CIRCLE_DOCUMENT_BYTES).data, {
    name: "Notes.PDF", size: MAX_CIRCLE_DOCUMENT_BYTES, contentType: "application/pdf",
  });
  assert.equal(validateCircleDocument("Notes.docx", 1).data.contentType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  for (const name of ["", "file.exe", "file.pdf.exe", "file.doc", "../notes.pdf", "folder\\notes.docx", "notes\r\n.pdf", "a".repeat(177) + ".pdf"]) {
    assert.ok(validateCircleDocument(name, 1).error, `rejected ${name}`);
  }
  for (const size of [0, -1, 0.5, NaN, MAX_CIRCLE_DOCUMENT_BYTES + 1]) {
    assert.ok(validateCircleDocument("notes.pdf", size).error);
  }
});

test("only server-selected document mode permits a resource without a URL", () => {
  const draft = { kind: "resource", title: "Lecture notes" };
  assert.ok(validateCircleDraft(draft, now).error);
  assert.equal(validateCircleDraft(draft, now, "document").data.url, "");
  assert.ok(validateCircleDraft({ ...draft, title: "" }, now, "document").error);
});
