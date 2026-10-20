import assert from "node:assert/strict";
import { beforeEach, afterEach, mock, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

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
const bookingId = "000000000000000000000002";
const circleId = "000000000000000000000003";
const roomId = "000000000000000000000004";
const now = Date.parse("2030-01-01T10:00:00Z");
let authenticated, room, circle, conflict, timetableConflict, storedBooking, calls, databaseError;
const originalDb = mongoose.connection.db;
const originalAdminUrl = process.env.ADMIN_APP_URL;
const originalKey = process.env.STUDENT_APP_API_KEY;
const tutorialGroup = { groupName: "Calculus TG", courseCode: "MAT101", topic: "Integration revision", leaderName: "Group leader" };
const memberIds = (count) => Array.from({ length: count }, (_, index) => (index + 100).toString(16).padStart(24, "0"));
const query = (result) => ({
  lean: async () => result,
  sort() { return this; },
  select() { return this; },
  populate() { return this; },
});

mock.module("next-auth", { namedExports: { getServerSession: async () => authenticated ? { user: { id: userId, studentId: "2020123456" } } : null } });
mock.module(new URL("./authOptions.ts", import.meta.url).href, { namedExports: { authOptions: {} } });
mock.module(new URL("./database/index.ts", import.meta.url).href, {
  namedExports: { connectToDatabase: async () => { if (databaseError) throw databaseError; } },
});
mock.module(new URL("./database/models/Room.ts", import.meta.url).href, { defaultExport: {
  findOne(filter) { calls.roomFilter = filter; return query(room); },
  findById(id) { calls.currentRoom = id; return query(room); },
  find(filter) { calls.roomListFilter = filter; return query(room ? [room] : []); },
} });
mock.module(new URL("./database/models/Conversation.ts", import.meta.url).href, { defaultExport: {
  findOne(filter) { calls.circleFilter = filter; return query(circle); },
  find(filter) { calls.circleListFilter = filter; return query(circle ? [circle] : []); },
} });
mock.module(new URL("./database/models/Booking.ts", import.meta.url).href, { defaultExport: {
  findOne(filter) {
    if (filter.user) { calls.ownershipFilter = filter; return query(storedBooking); }
    calls.conflictFilter = filter;
    return Object.assign(Promise.resolve(conflict), { lean: async () => conflict });
  },
  find(filter) { calls.bookingListFilter = filter; return query(storedBooking ? [storedBooking] : []); },
  async create(draft) { calls.created = draft; return { _id: bookingId, ...draft }; },
  async findOneAndDelete(filter) { calls.deleted = filter; return storedBooking; },
} });

const { DAY_MS, LECTURE_ROOM_FILTER, validateBookingSchedule, bookingWindow } = await import("./booking-policy.ts");
const { parseBookingInput } = await import("./bookings.ts");
const { requestAdminBookings } = await import("./admin-bookings.ts");
const api = await import("../app/api/bookings/route.ts");
const detail = await import("../app/api/bookings/[id]/route.ts");
const circlesApi = await import("../app/api/bookings/circles/route.ts");
const roomsApi = await import("../app/api/rooms/route.ts");
const context = { params: Promise.resolve({ id: bookingId }) };
const draft = (overrides = {}) => ({
  room: "LT1", purpose: "Tutorial Group", title: "Calculus revision", attendees: 10, tutorialGroup,
  startTime: new Date(now + 3 * DAY_MS).toISOString(),
  endTime: new Date(now + 3 * DAY_MS + 3600000).toISOString(),
  ...overrides,
});
const request = (body, method = "POST") => new Request("http://localhost/api/bookings", {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const patch = (body) => detail.PATCH(request(body, "PATCH"), context);

beforeEach(() => {
  mock.method(Date, "now", () => now);
  process.env.ADMIN_APP_URL = "http://central.test";
  process.env.STUDENT_APP_API_KEY = "test-integration-key";
  mongoose.connection.db = { collection(name) {
    assert.equal(name, "timetableallocations");
    return { async findOne(filter) { calls.timetableFilter = filter; return timetableConflict; } };
  } };
  mock.method(globalThis, "fetch", async (url, options) => {
    calls.centralUrl = String(url);
    calls.centralOptions = options;
    if (options.method === "GET") return Response.json({ bookings: storedBooking ? [storedBooking] : [] });
    const body = JSON.parse(options.body);
    calls.centralPayload = body;
    if (options.method === "PATCH" && Object.keys(body).length === 1) {
      if (storedBooking?.startTime <= new Date(now)) return Response.json({ error: "Bookings cannot be cancelled after they have started." }, { status: 409 });
      return Response.json({ booking: { ...storedBooking, status: "cancelled" } });
    }
    return Response.json({ booking: { _id: bookingId, ...body, status: "pending" } });
  });
  authenticated = true;
  room = { _id: roomId, name: "Lecture Theatre 1", code: "LT1", spaceType: "lecture_room", capacity: 100, isAvailable: true };
  circle = { _id: circleId, name: "Revision circle", type: "group", members: memberIds(50) };
  conflict = null;
  timetableConflict = null;
  calls = {};
  databaseError = null;
  storedBooking = {
    _id: bookingId, user: userId, room: roomId, purpose: "Tutorial Group",
    title: "Calculus revision", attendees: 10, tutorialGroup,
    startTime: new Date(now + 3 * DAY_MS), endTime: new Date(now + 3 * DAY_MS + 3600000),
    status: "pending",
    async save() { calls.saved = true; },
  };
});
afterEach(() => {
  mock.restoreAll();
  mongoose.connection.db = originalDb;
  for (const [key, value] of [["ADMIN_APP_URL", originalAdminUrl], ["STUDENT_APP_API_KEY", originalKey]]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

for (const [purpose, days, delta, accepted] of [
  ["Tutorial Group", 2, -1, false], ["Tutorial Group", 2, 0, true], ["Tutorial Group", 2, 1, true],
  ["Tutorial Group", 100, 0, true],
  ["Event", 7, -1, false], ["Event", 7, 0, true], ["Event", 7, 1, true],
  ["Event", 14, -1, true], ["Event", 14, 0, true], ["Event", 14, 1, false],
]) {
  test(`${purpose}: ${days} days ${delta}ms is ${accepted ? "accepted" : "rejected"}`, () => {
    const start = new Date(now + days * DAY_MS + delta);
    const error = validateBookingSchedule(purpose, start, new Date(start.getTime() + 3600000), now);
    assert.equal(error === null, accepted);
  });
}

test("booking windows retain full timestamps rather than calendar-day approximations", () => {
  assert.equal(bookingWindow("Tutorial Group", now).earliest.toISOString(), "2030-01-03T10:00:00.000Z");
  assert.equal(bookingWindow("Event", now).latest.toISOString(), "2030-01-15T10:00:00.000Z");
  assert.equal(bookingWindow("Tutorial Group", now).latest, null);
});

test("invalid, equal and reversed date ranges are rejected", () => {
  const start = new Date(now + 3 * DAY_MS);
  for (const [from, to] of [[new Date("invalid"), start], [start, new Date("invalid")], [start, start], [start, new Date(start.getTime() - 1)]]) {
    assert.notEqual(validateBookingSchedule("Tutorial Group", from, to, now), null);
  }
});

test("input validation rejects arbitrary purposes, missing times, invalid attendees and malformed circles", () => {
  for (const overrides of [
    { purpose: "Private study" }, { purpose: "" }, { startTime: undefined }, { endTime: null },
    { startTime: "2030-01-04T10:00" }, { startTime: "invalid" }, { attendees: 0 },
    { attendees: 1.5 }, { attendees: "50" }, { attendees: null }, { room: "" }, { title: "x".repeat(121) },
    { conversationId: "bad" }, { conversationId: circleId, purpose: "Event" },
    { tutorialGroup: undefined }, { tutorialGroup: { ...tutorialGroup, topic: " " } }, { attendees: undefined },
    { purpose: "Event", title: "" },
  ]) assert.throws(() => parseBookingInput(draft(overrides)));
});

test("lecture-room query requires explicit staff classification rather than legacy categories", () => {
  assert.deepEqual(LECTURE_ROOM_FILTER, { spaceType: "lecture_room" });
});

test("all booking operations require authentication", async () => {
  authenticated = false;
  assert.equal((await api.GET()).status, 401);
  assert.equal((await api.POST(request(draft()))).status, 401);
  assert.equal((await patch({ status: "cancelled" })).status, 401);
  assert.equal((await detail.DELETE(request({}, "DELETE"), context)).status, 401);
  assert.equal((await circlesApi.GET()).status, 401);
  assert.deepEqual(calls, {});
});

test("creation delegates complete purpose details to central admin without local writes or client status", async () => {
  const response = await api.POST(request(draft({ status: "confirmed", studentId: "spoofed" })));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).booking.status, "pending");
  assert.equal(calls.created, undefined);
  assert.equal(calls.centralPayload.purpose, "Tutorial Group");
  assert.equal(calls.centralPayload.title, "Calculus revision");
  assert.equal(calls.centralPayload.attendees, 10);
  assert.deepEqual(calls.centralPayload.tutorialGroup, tutorialGroup);
  assert.equal(calls.centralPayload.status, undefined);
  assert.equal(calls.centralPayload.studentId, "2020123456");
  assert.equal(calls.centralPayload.roomId, roomId);
  assert.equal(calls.centralPayload.conversationId, null);
  assert.deepEqual(calls.roomFilter.$and[0], LECTURE_ROOM_FILTER);
});

test("events can only be submitted inside the 7-14 day window", async () => {
  for (const days of [6, 8, 15]) {
    const payload = draft({ purpose: "Event", startTime: new Date(now + days * DAY_MS).toISOString(), endTime: new Date(now + days * DAY_MS + 3600000).toISOString() });
    const response = await api.POST(request(payload));
    assert.equal(response.status, days === 8 ? 201 : 400);
  }
});

test("non-lecture or unpublished rooms, disabled rooms, over-capacity and conflicts cannot be booked", async () => {
  room = null;
  assert.equal((await api.POST(request(draft()))).status, 404);
  assert.equal(calls.created, undefined);
  room = { _id: roomId, isAvailable: false, capacity: 100 };
  assert.equal((await api.POST(request(draft()))).status, 409);
  room.isAvailable = true;
  room.capacity = 5;
  assert.equal((await api.POST(request(draft()))).status, 400);
  room.capacity = 100;
  conflict = { _id: "another-booking" };
  assert.equal((await api.POST(request(draft()))).status, 409);
  assert.equal(calls.created, undefined);
});

for (const count of [49, 50, 51]) {
  test(`Study Circle with ${count} members ${count < 50 ? "cannot" : "can"} book a lecture room`, async () => {
    circle.members = memberIds(count);
    const response = await api.POST(request(draft({ conversationId: circleId, attendees: 1 })));
    assert.equal(response.status, count < 50 ? 403 : 201);
    if (count >= 50) {
      assert.equal(calls.centralPayload.attendees, count);
      assert.equal(calls.centralPayload.conversationId, circleId);
    } else assert.equal(calls.created, undefined);
    assert.deepEqual(calls.circleFilter, { _id: circleId, type: "group", members: userId });
  });
}

test("duplicate members, missing membership and insufficient room capacity cannot bypass circle eligibility", async () => {
  circle.members = [...memberIds(49), ...memberIds(10)];
  assert.equal((await api.POST(request(draft({ conversationId: circleId })))).status, 403);
  circle = null;
  assert.equal((await api.POST(request(draft({ conversationId: circleId })))).status, 403);
  circle = { members: memberIds(50) };
  room.capacity = 49;
  assert.equal((await api.POST(request(draft({ conversationId: circleId })))).status, 400);
  assert.equal(calls.created, undefined);
});

test("rescheduling in the same room checks conflicts and excludes only the edited booking", async () => {
  conflict = { _id: "other" };
  const response = await patch({ startTime: new Date(now + 4 * DAY_MS).toISOString(), endTime: new Date(now + 4 * DAY_MS + 3600000).toISOString() });
  assert.equal(response.status, 409);
  assert.deepEqual(calls.conflictFilter._id, { $ne: bookingId });
  assert.deepEqual(calls.ownershipFilter, { _id: bookingId, user: userId });
  assert.equal(calls.saved, undefined);
});

test("editing cannot bypass purposes, advance notice, date validity or room restrictions", async () => {
  for (const body of [{ purpose: "Private study" }, { startTime: new Date(now + DAY_MS).toISOString() }, { startTime: "bad" }, { endTime: storedBooking.startTime.toISOString() }]) {
    assert.equal((await patch(body)).status, 400);
  }
  room = null;
  assert.equal((await patch({ room: "Library" })).status, 404);
  assert.equal(calls.saved, undefined);
});

test("a circle booking cannot be detached or converted to an event and membership is rechecked on edit", async () => {
  storedBooking.conversation = circleId;
  assert.equal((await patch({ conversationId: null })).status, 400);
  assert.equal((await patch({ purpose: "Event" })).status, 400);
  circle.members = memberIds(49);
  assert.equal((await patch({ title: "Changed title" })).status, 403);
  assert.equal(calls.saved, undefined);
});

test("changes to confirmed bookings require staff approval again", async () => {
  storedBooking.status = "confirmed";
  const response = await patch({ title: "Updated tutorial" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).booking.status, "pending");
  assert.equal(calls.centralPayload.title, "Updated tutorial");
  assert.deepEqual(calls.centralPayload.tutorialGroup, tutorialGroup);
  assert.equal(calls.saved, undefined);
});

test("legacy bookings can be cancelled without new details, but central admin rejects started bookings", async () => {
  storedBooking.purpose = "Legacy study booking";
  storedBooking.startTime = new Date(now - DAY_MS);
  room = null;
  assert.equal((await patch({ status: "cancelled" })).status, 409);
  storedBooking.startTime = new Date(now + DAY_MS);
  assert.equal((await patch({ status: "cancelled" })).status, 200);
  assert.deepEqual(calls.centralPayload, { studentId: "2020123456" });
  assert.equal(calls.saved, undefined);
  assert.equal(calls.roomFilter, undefined);
});

test("students cannot self-confirm, reactivate or edit cancelled bookings", async () => {
  assert.equal((await patch({ status: "confirmed" })).status, 403);
  storedBooking.status = "cancelled";
  assert.equal((await patch({ status: "pending" })).status, 403);
  assert.equal((await patch({ title: "No" })).status, 409);
  assert.equal((await patch({ status: "cancelled", purpose: "Event" })).status, 400);
  assert.equal(calls.saved, undefined);
});

test("unknown bookings and invalid IDs do not modify records", async () => {
  storedBooking = null;
  assert.equal((await patch({ title: "No" })).status, 404);
  assert.equal((await detail.PATCH(request({}, "PATCH"), { params: Promise.resolve({ id: "bad" }) })).status, 404);
});

test("booking lists preserve exact ISO timestamps, title, attendees and circle context", async () => {
  storedBooking.conversation = circleId;
  const response = await api.GET();
  const { bookings } = await response.json();
  assert.equal(bookings[0].startsAt, storedBooking.startTime.toISOString());
  assert.equal(bookings[0].endsAt, storedBooking.endTime.toISOString());
  assert.equal(bookings[0].attendees, 10);
  assert.equal(bookings[0].title, "Calculus revision");
  assert.equal(bookings[0].conversationId, circleId);
});

test("circle eligibility is private and computed from unique database members", async () => {
  circle.members = [...memberIds(49), ...memberIds(2)];
  const response = await circlesApi.GET();
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const { circles } = await response.json();
  assert.equal(circles[0].eligible, false);
  assert.equal(circles[0].memberCount, 49);
  assert.deepEqual(calls.circleListFilter, { type: "group", members: userId });
});

test("room availability lists only lecture rooms and compares timezone-qualified instants", async () => {
  const response = await roomsApi.GET(new Request("http://localhost/api/rooms?room=Lecture%20Theatre%201&startsAt=2030-01-04T10%3A00%3A00%2B02%3A00&endsAt=2030-01-04T11%3A00%3A00%2B02%3A00"));
  assert.equal(response.status, 200);
  assert.deepEqual(calls.roomListFilter, LECTURE_ROOM_FILTER);
  assert.equal(calls.conflictFilter.startTime.$lt.toISOString(), "2030-01-04T09:00:00.000Z");
  assert.equal(calls.conflictFilter.endTime.$gt.toISOString(), "2030-01-04T08:00:00.000Z");
  assert.equal((await response.json()).rooms[0].isAvailable, true);
});

test("room availability rejects invalid or incomplete ranges", async () => {
  for (const search of ["startsAt=invalid&endsAt=invalid", "startsAt=2030-01-04T10:00:00Z", "date=2030-01-04&start=11:00&end=10:00"]) {
    const response = await roomsApi.GET(new Request(`http://localhost/api/rooms?${search}`));
    assert.equal(response.status, 400);
  }
});

test("published classes make lecture rooms unavailable in Lusaka time", async () => {
  timetableConflict = { _id: "class" };
  const response = await roomsApi.GET(new Request("http://localhost/api/rooms?startsAt=2030-01-04T10:00:00Z&endsAt=2030-01-04T11:00:00Z"));
  assert.equal((await response.json()).rooms[0].isAvailable, false);
  assert.equal(calls.timetableFilter.dayOfWeek, "Friday");
  assert.deepEqual(calls.timetableFilter.startTime, { $lt: "13:00" });
  assert.deepEqual(calls.timetableFilter.endTime, { $gt: "12:00" });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("proxy overrides browser identity and sends the secret only to the central server", async () => {
  await requestAdminBookings("trusted-session-id", "PATCH", { studentId: "spoofed" }, bookingId);
  assert.equal(calls.centralPayload.studentId, "trusted-session-id");
  assert.equal(calls.centralOptions.headers["x-student-app-key"], "test-integration-key");
  assert.equal(calls.centralOptions.cache, "no-store");
});

test("missing central configuration fails explicitly without a local write fallback", async () => {
  delete process.env.ADMIN_APP_URL;
  const response = await api.POST(request(draft()));
  assert.equal(response.status, 503);
  assert.equal(calls.created, undefined);
  assert.equal(calls.centralPayload, undefined);
});

test("upstream rejections and malformed responses cannot be mistaken for successful requests", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ error: "A published class has priority." }, { status: 409 }));
  const rejected = await api.POST(request(draft()));
  assert.equal(rejected.status, 409);
  assert.match((await rejected.json()).error, /published class/);
  mock.method(globalThis, "fetch", async () => Response.json({ success: true }));
  assert.equal((await api.POST(request(draft()))).status, 502);
  mock.method(globalThis, "fetch", async () => new Response("not json"));
  assert.equal((await api.GET()).status, 502);
  assert.equal(calls.created, undefined);
});

test("DELETE cancels centrally instead of erasing booking history", async () => {
  assert.equal((await detail.DELETE(request({}, "DELETE"), context)).status, 200);
  assert.deepEqual(calls.centralPayload, { studentId: "2020123456" });
  assert.equal(calls.deleted, undefined);
});

test("midnight booking times are valid HTML time-input values", async () => {
  storedBooking.startTime = new Date(2030, 0, 4, 0, 30);
  const { bookings } = await (await api.GET()).json();
  assert.equal(bookings[0].startTime, "00:30");
});

test("database outages return retryable errors rather than a successful booking", async () => {
  databaseError = Object.assign(new Error("private"), { name: "MongoNetworkError" });
  mock.method(console, "error", () => {});
  const response = await api.POST(request(draft()));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).retryable, true);
  assert.equal(calls.created, undefined);
});
