import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { zipSync, strToU8 } from "fflate";

// Resolve the application's aliases without loading authentication or connecting to MongoDB.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) {
      let url = new URL(`../${specifier.slice(2)}.ts`, import.meta.url);
      if (!existsSync(fileURLToPath(url))) url = new URL(`../${specifier.slice(2)}/index.ts`, import.meta.url);
      return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const userId = "000000000000000000000001";
const ownerId = "000000000000000000000002";
const conversationId = "000000000000000000000003";
const activityId = "000000000000000000000004";
let authenticated;
let member;
let conversationType;
let conversationOwner;
let rows;
let found;
let publishedPlace;
let calls;
let databaseFailure;
let matchedCount;
let deletedCount;

mock.module(new URL("./chat.ts", import.meta.url).href, {
  namedExports: {
    getChatUserId: async () => authenticated ? userId : null,
    getMemberConversation: async () => {
      if (databaseFailure) throw Object.assign(new Error("private database connection details"), { name: "MongoNetworkError" });
      return member ? { type: conversationType, createdBy: conversationOwner } : null;
    },
    isObjectId: (id) => typeof id === "string" && /^[a-f0-9]{24}$/.test(id),
  },
});
mock.module(new URL("./database/models/CircleActivity.ts", import.meta.url).href, {
  defaultExport: {
    find: (query) => {
      calls.find = query;
      return { sort: (order) => { calls.sort = order; return { limit: (limit) => { calls.limit = limit; return { lean: async () => rows }; } }; } };
    },
    findOne: (query) => { calls.findOne = query; return {
      lean: async () => found,
      select: async (projection) => { calls.projection = projection; return found; },
    }; },
    create: async (draft) => { calls.create = draft; return { _id: activityId }; },
    updateOne: async (...args) => { calls.update = args; return { matchedCount }; },
    deleteOne: async (query) => { calls.delete = query; return { deletedCount }; },
  },
});
mock.module(new URL("./database/models/Room.ts", import.meta.url).href, {
  defaultExport: { exists: async (query) => { calls.room = query; return publishedPlace; } },
});
const api = await import("../app/api/chat/conversations/[id]/circle/route.ts");
const documentApi = await import("../app/api/chat/conversations/[id]/circle/[activityId]/document/route.ts");
const { MAX_CIRCLE_UPLOAD_BYTES, readCircleUpload, validateCircleDocumentContents } = await import("./circle-documents.ts");
const context = { params: Promise.resolve({ id: conversationId }) };
const request = (method, body, query = "") => new Request(`http://localhost/api/chat/conversations/${conversationId}/circle${query}`, {
  method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
});
const invoke = (method, body, query) => api[method](request(method, body, query), context);
const activity = () => ({
  _id: activityId, conversation: conversationId, createdBy: ownerId, kind: "poll",
  title: "Next topic?", description: "", location: "", options: ["A", "B"], url: "",
  createdAt: new Date("2030-01-01T08:00:00Z"), responses: { [userId]: "0" },
});

beforeEach(() => {
  authenticated = true;
  member = true;
  conversationType = "group";
  conversationOwner = ownerId;
  rows = [];
  found = activity();
  publishedPlace = true;
  databaseFailure = false;
  matchedCount = 1;
  deletedCount = 1;
  calls = {};
});

test("every activity action requires authentication and group membership", async () => {
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    authenticated = false;
    assert.equal((await invoke(method)).status, 401);
    authenticated = true;
    member = false;
    assert.equal((await invoke(method)).status, 404);
    member = true;
    conversationType = "direct";
    assert.equal((await invoke(method)).status, 400);
    conversationType = "group";
  }
  assert.deepEqual(calls, {});
});

test("board queries paginate within the member's conversation and selected kind", async () => {
  rows = Array.from({ length: 31 }, (_, i) => ({ ...activity(), _id: String(100 - i).padStart(24, "0") }));
  const response = await invoke("GET", undefined, `?kind=poll&before=${activityId}`);
  const data = await response.json();
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(data.activities.length, 30);
  assert.equal(data.nextCursor, rows[29]._id);
  assert.deepEqual(calls.find, { conversation: conversationId, kind: "poll", _id: { $lt: activityId } });
  assert.deepEqual(calls.sort, { _id: -1 });
  assert.equal(calls.limit, 31);
  assert.equal(data.activities[0].responses[userId], "0");
  assert.equal(data.activities[0].createdAt, "2030-01-01T08:00:00.000Z");
});

test("rejects invalid cursors and filters before querying activities", async () => {
  assert.equal((await invoke("GET", undefined, "?before=invalid")).status, 400);
  assert.equal((await invoke("GET", undefined, "?kind=invalid")).status, 400);
  assert.equal((await invoke("GET", undefined, "?kind=")).status, 400);
  assert.equal(calls.find, undefined);
});

test("empty boards return an explicit empty page, not an error", async () => {
  const response = await invoke("GET");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { activities: [], nextCursor: null });
});

test("invalid activity drafts and malformed JSON do not write anything", async () => {
  assert.equal((await invoke("POST", { kind: "poll", title: "Question", options: ["A"] })).status, 400);
  const malformed = new Request("http://localhost/api/circle", { method: "POST", body: "{" });
  assert.equal((await api.POST(malformed, context)).status, 400);
  assert.equal(calls.create, undefined);
});

test("creation persists validated data and derives authorship from the session", async () => {
  const response = await invoke("POST", { kind: "poll", title: " Topic? ", options: [" A ", " B "], createdBy: ownerId, conversation: ownerId });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: activityId });
  assert.equal(calls.create.createdBy, userId);
  assert.equal(calls.create.conversation, conversationId);
  assert.equal(calls.create.title, "Topic?");
  assert.deepEqual(calls.create.options, ["A", "B"]);
});

test("sessions require published campus places and persist a real date", async () => {
  const draft = { kind: "session", title: "Study", location: "Library", startsAt: new Date(Date.now() + 3600000).toISOString() };
  publishedPlace = false;
  assert.equal((await invoke("POST", draft)).status, 400);
  assert.equal(calls.create, undefined);
  publishedPlace = true;
  assert.equal((await invoke("POST", draft)).status, 201);
  assert.deepEqual(calls.room, { name: "Library" });
  assert.equal(calls.create.startsAt.toISOString(), draft.startsAt);
});

test("changing a response updates a single member map key atomically", async () => {
  for (const value of ["0", "1"]) {
    assert.equal((await invoke("PATCH", { activityId, value, userId: ownerId })).status, 200);
    assert.deepEqual(calls.update, [
      { _id: activityId, conversation: conversationId },
      { $set: { [`responses.${userId}`]: value } },
      { runValidators: true },
    ]);
  }
  assert.deepEqual(calls.findOne, { _id: activityId, conversation: conversationId });
});

test("rejects missing activities, invalid votes and already-started sessions", async () => {
  assert.equal((await invoke("PATCH", { activityId, value: "2" })).status, 400);
  assert.equal((await invoke("PATCH", { activityId: "invalid", value: "0" })).status, 400);
  found = null;
  assert.equal((await invoke("PATCH", { activityId, value: "0" })).status, 404);
  found = { ...activity(), kind: "session", startsAt: new Date(Date.now() - 1000) };
  assert.equal((await invoke("PATCH", { activityId, value: "going" })).status, 409);
  assert.equal(calls.update, undefined);
});

test("removal is scoped to the author unless the caller owns the circle", async () => {
  assert.equal((await invoke("DELETE", { activityId, createdBy: ownerId })).status, 200);
  assert.deepEqual(calls.delete, { _id: activityId, conversation: conversationId, createdBy: userId });
  conversationOwner = userId;
  assert.equal((await invoke("DELETE", { activityId })).status, 200);
  assert.deepEqual(calls.delete, { _id: activityId, conversation: conversationId });
});

test("responding to or removing a deleted activity reports a missing record", async () => {
  matchedCount = 0;
  assert.equal((await invoke("PATCH", { activityId, value: "0" })).status, 404);
  deletedCount = 0;
  assert.equal((await invoke("DELETE", { activityId })).status, 404);
});

test("database outages return safe retryable errors rather than internal details", async () => {
  databaseFailure = true;
  const logger = mock.method(console, "error", () => {});
  try {
    const response = await invoke("GET");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "5");
    const data = await response.json();
    assert.equal(data.code, "DATABASE_UNAVAILABLE");
    assert.equal(data.retryable, true);
    assert.ok(!JSON.stringify(data).includes("private"));
    assert.ok(!JSON.stringify(logger.mock.calls).includes("private"));
  } finally {
    logger.mock.restore();
  }
});

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
const docxFiles = {
  "[Content_Types].xml": strToU8('<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" /></Types>'),
  "_rels/.rels": strToU8("<Relationships/>"),
  "word/document.xml": strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'),
};
const uploadRequest = (bytes = pdf, name = "notes.pdf", extras = {}) => {
  const form = new FormData();
  form.set("title", "Lecture notes");
  form.set("description", "Revision material");
  form.set("file", new File([bytes], name));
  for (const [key, value] of Object.entries(extras)) form.set(key, value);
  return new Request("http://localhost/api/circle", { method: "POST", body: form });
};
const download = () => documentApi.GET(new Request("http://localhost/api/document"), {
  params: Promise.resolve({ id: conversationId, activityId }),
});

test("PDF/DOCX content checks reject renamed, malformed and macro-enabled documents", () => {
  assert.equal(validateCircleDocumentContents("notes.pdf", pdf), null);
  assert.equal(validateCircleDocumentContents("notes.docx", zipSync(docxFiles)), null);
  assert.ok(validateCircleDocumentContents("notes.pdf", Buffer.from("not a PDF")));
  assert.ok(validateCircleDocumentContents("notes.pdf", Buffer.from("%PDF-1.7\ntruncated")));
  assert.ok(validateCircleDocumentContents("notes.docx", pdf));
  assert.ok(validateCircleDocumentContents("notes.docx", zipSync({ "file.txt": strToU8("not Word") })));
  assert.ok(validateCircleDocumentContents("notes.docx", zipSync({ ...docxFiles, "word/vbaProject.bin": strToU8("macro") })));
  assert.ok(validateCircleDocumentContents("notes.docx", zipSync({ ...docxFiles, "word/document.xml": new Uint8Array(8 * 1024 * 1024 + 1) })));
  assert.ok(validateCircleDocumentContents("notes.docx", zipSync({ ...docxFiles, "large.dat": new Uint8Array(32 * 1024 * 1024) })));
});

test("multipart uploads persist metadata and binary together under the authenticated author", async () => {
  for (const [bytes, name] of [[pdf, "notes.pdf"], [zipSync(docxFiles), "notes.docx"]]) {
    const response = await api.POST(uploadRequest(bytes, name, { createdBy: ownerId }), context);
    assert.equal(response.status, 201);
    assert.equal(calls.create.createdBy, userId);
    assert.equal(calls.create.conversation, conversationId);
    assert.equal(calls.create.kind, "resource");
    assert.equal(calls.create.url, "");
    assert.equal(calls.create.document.name, name);
    assert.equal(calls.create.document.size, bytes.length);
    assert.deepEqual(calls.create.documentData, Buffer.from(bytes));
  }
});

test("a PDF at exactly the 4 MB file limit is accepted with multipart overhead", async () => {
  const bytes = Buffer.alloc(4 * 1024 * 1024, 32);
  bytes.set(Buffer.from("%PDF-1.7\n"));
  bytes.set(Buffer.from("%%EOF"), bytes.length - 5);
  assert.equal((await api.POST(uploadRequest(bytes), context)).status, 201);
  assert.equal(calls.create.document.size, 4 * 1024 * 1024);
  assert.deepEqual(calls.create.documentData, bytes);
});

test("uploads require member access, one supported document and valid details", async () => {
  authenticated = false;
  assert.equal((await api.POST(uploadRequest(), context)).status, 401);
  authenticated = true;
  member = false;
  assert.equal((await api.POST(uploadRequest(), context)).status, 404);
  member = true;
  for (const req of [
    uploadRequest(pdf, "notes.exe"),
    uploadRequest(Buffer.from("fake"), "notes.pdf"),
    uploadRequest(pdf, "notes.pdf", { title: "" }),
    uploadRequest(pdf, "notes.pdf", { file: "not a file" }),
    uploadRequest(Buffer.alloc(4 * 1024 * 1024 + 1), "notes.pdf"),
    new Request("http://localhost/api/circle", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=missing" }, body: "broken" }),
  ]) {
    assert.equal((await api.POST(req, context)).status, 400);
  }
  assert.equal(calls.create, undefined);
  const form = new FormData();
  form.set("title", "Notes");
  form.append("file", new File([pdf], "one.pdf"));
  form.append("file", new File([pdf], "two.pdf"));
  assert.equal((await api.POST(new Request("http://localhost/api/circle", { method: "POST", body: form }), context)).status, 400);
  assert.equal(calls.create, undefined);
});

test("bounded upload reader rejects oversized declared and streamed bodies", async () => {
  const declared = new Request("http://localhost/api/circle", { method: "POST", headers: { "Content-Length": String(MAX_CIRCLE_UPLOAD_BYTES + 1) }, body: "small" });
  assert.equal((await readCircleUpload(declared)).status, 413);
  const streamed = new Request("http://localhost/api/circle", { method: "POST", body: new Uint8Array(MAX_CIRCLE_UPLOAD_BYTES + 1) });
  assert.equal((await readCircleUpload(streamed)).status, 413);
});

test("board responses expose file metadata but never binary document contents", async () => {
  rows = [{ ...activity(), kind: "resource", document: { name: "notes.pdf", size: pdf.length, contentType: "application/pdf" }, documentData: pdf }];
  const data = await (await invoke("GET")).json();
  assert.deepEqual(data.activities[0].document, rows[0].document);
  assert.equal(data.activities[0].documentData, undefined);
});

test("downloads are membership-checked, conversation-scoped and served as private attachments", async () => {
  authenticated = false;
  assert.equal((await download()).status, 401);
  authenticated = true;
  member = false;
  assert.equal((await download()).status, 404);
  member = true;
  conversationType = "direct";
  assert.equal((await download()).status, 404);
  conversationType = "group";
  found = { ...activity(), document: { name: "Révision notes.pdf", size: pdf.length, contentType: "application/pdf" }, documentData: pdf };
  const response = await download();
  assert.equal(response.status, 200);
  assert.deepEqual(calls.findOne, { _id: activityId, conversation: conversationId, kind: "resource" });
  assert.equal(calls.projection, "+documentData");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.ok(response.headers.get("Content-Disposition").includes("attachment;"));
  assert.ok(response.headers.get("Content-Disposition").includes("R%C3%A9vision%20notes.pdf"));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  found = null;
  assert.equal((await download()).status, 404);
  found = activity();
  assert.equal((await download()).status, 404);
});
