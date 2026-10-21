import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { isBookingPurpose, LECTURE_ROOM_FILTER, MIN_CIRCLE_BOOKING_MEMBERS, parseTutorialGroup, validateBookingSchedule, type BookingAccess } from "@/lib/booking-policy";
import { apiErrorResponse } from "@/lib/database/errors";
import Booking from "@/lib/database/models/Booking";
import Conversation from "@/lib/database/models/Conversation";
import Room from "@/lib/database/models/Room";

export class BookingPolicyError extends Error {
  constructor(message: string, readonly status = 400, readonly bookingAccess?: BookingAccess) {
    super(message);
    this.name = "BookingPolicyError";
  }
}

export function getBookingAccess(role: string | undefined): BookingAccess {
  if (role === "student") return { allowed: true };
  return {
    allowed: false,
    message: "Room bookings in this app are for student accounts only. You are signed in with a staff or admin account. Use Central Admin to manage room bookings, or sign in with a student account.",
    adminUrl: process.env.ADMIN_APP_URL ? new URL("/admin", process.env.ADMIN_APP_URL).href : null,
  };
}

export function requireStudentBookingAccess(role: string | undefined) {
  const access = getBookingAccess(role);
  if (!access.allowed) throw new BookingPolicyError(access.message, 403, access);
}

export function bookingErrorResponse(error: unknown, operation: string, message: string) {
  if (error instanceof BookingPolicyError) {
    return NextResponse.json({
      error: error.message,
      ...(error.bookingAccess ? { bookingAccess: error.bookingAccess } : {}),
    }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  return apiErrorResponse(error, operation, message);
}

export function bookingBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BookingPolicyError("A booking request object is required.");
  }
  return value as Record<string, unknown>;
}

function bookingDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new BookingPolicyError("Start and end times must include a date and timezone.");
  }
  return new Date(value);
}

export function parseBookingInput(body: Record<string, unknown>) {
  if (!isBookingPurpose(body.purpose)) {
    throw new BookingPolicyError("Choose Tutorial Group or Event as the booking purpose.");
  }
  if (typeof body.room !== "string" || !body.room.trim() || body.room.length > 160) {
    throw new BookingPolicyError("Choose a lecture room.");
  }
  const startTime = bookingDate(body.startTime);
  const endTime = bookingDate(body.endTime);
  const scheduleError = validateBookingSchedule(body.purpose, startTime, endTime);
  if (scheduleError) throw new BookingPolicyError(scheduleError);
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim().length > 120)) {
    throw new BookingPolicyError("The booking title must be at most 120 characters.");
  }
  const tutorialGroup = body.purpose === "Tutorial Group" ? parseTutorialGroup(body.tutorialGroup) : null;
  if (body.purpose === "Tutorial Group" && !tutorialGroup) {
    throw new BookingPolicyError("Tutorial Groups require a group name, course code, topic, and tutor or group-leader name.");
  }
  if (body.purpose === "Event" && (typeof body.title !== "string" || !body.title.trim())) {
    throw new BookingPolicyError("Provide the event name as the booking title.");
  }
  const attendees = body.attendees;
  if (typeof attendees !== "number" || !Number.isSafeInteger(attendees) || attendees < 1) {
    throw new BookingPolicyError("Enter a positive whole number of attendees.");
  }
  const conversationId = body.conversationId;
  if (conversationId !== undefined && conversationId !== null &&
      (typeof conversationId !== "string" || !mongoose.isObjectIdOrHexString(conversationId))) {
    throw new BookingPolicyError("Choose a valid Study Circle.");
  }
  if (conversationId && body.purpose !== "Tutorial Group") {
    throw new BookingPolicyError("Study Circles can book for Tutorial Groups only.");
  }
  return {
    purpose: body.purpose,
    tutorialGroup,
    title: typeof body.title === "string" ? body.title.trim() : "",
    room: body.room.trim(),
    startTime,
    endTime,
    attendees,
    conversationId: typeof conversationId === "string" ? conversationId : null,
  };
}

export async function validateBookingResources(
  input: ReturnType<typeof parseBookingInput>,
  userId: string,
  excludeBookingId?: string
) {
  const room = await Room.findOne({
    $and: [
      LECTURE_ROOM_FILTER,
      { $or: [{ name: input.room }, { code: input.room }] },
    ],
  }).lean();
  if (!room) throw new BookingPolicyError("Choose a published lecture room. Other campus spaces cannot be booked.", 404);
  if (room.isAvailable === false) throw new BookingPolicyError("This lecture room is not accepting bookings.", 409);

  let attendees = input.attendees;
  if (input.conversationId) {
    const circle = await Conversation.findOne({
      _id: input.conversationId,
      type: "group",
      members: userId,
    }).lean();
    if (!circle) throw new BookingPolicyError("Study Circle not found or you are not a member.", 403);
    attendees = new Set(circle.members.map((member: mongoose.Types.ObjectId) => String(member))).size;
    if (attendees < MIN_CIRCLE_BOOKING_MEMBERS) {
      throw new BookingPolicyError("A Study Circle needs at least 50 members, including you, to book a lecture room.", 403);
    }
  }
  if (room.capacity > 0 && attendees > room.capacity) {
    throw new BookingPolicyError(`This lecture room accommodates at most ${room.capacity} people.`);
  }

  const conflict = await Booking.findOne({
    room: room._id,
    status: { $ne: "cancelled" },
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime },
  });
  if (conflict) throw new BookingPolicyError("This lecture room is already reserved for the selected time. Choose another slot.", 409);
  return { room, attendees };
}
