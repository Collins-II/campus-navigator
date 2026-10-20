import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import "@/lib/database/models/Room";
import { bookingBody, bookingErrorResponse, parseBookingInput, validateBookingResources } from "@/lib/bookings";
import { requestAdminBookings } from "@/lib/admin-bookings";

type BookingApiRecord = {
  _id?: string | { toString: () => string };
  room?: { name?: string; code?: string } | string | null;
  purpose?: string;
  status?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  attendees?: number;
  title?: string;
  conversation?: { toString(): string } | null;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  cancellationReason?: string;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { bookings } = await requestAdminBookings(session.user.studentId, "GET");

    return NextResponse.json({
      bookings: bookings.map((booking: BookingApiRecord) => {
        const start = booking.startTime ? new Date(booking.startTime) : new Date();
        return {
          id: String(booking._id ?? "booking-id"),
          purpose: booking.purpose,
          title: booking.title,
          tutorialGroup: booking.tutorialGroup,
          cancellationReason: booking.cancellationReason,
          attendees: booking.attendees ?? 1,
          conversationId: booking.conversation ? String(booking.conversation) : null,
          room: typeof booking.room === "object" && booking.room ? booking.room.name || "Unknown room" : booking.room || "Unknown room",
          roomCode: typeof booking.room === "object" && booking.room ? booking.room.code || "L1" : "L1",
          status: booking.status,
          startsAt: start.toISOString(),
          endsAt: booking.endTime ? new Date(booking.endTime).toISOString() : null,
          date: getLocalDateKey(start),
          startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
          endTime: booking.endTime ? new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "",
        };
      }),
    }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return bookingErrorResponse(error, "bookings.get", "Unable to load your bookings right now.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const input = parseBookingInput(bookingBody(await request.json()));

    await connectToDatabase();
    const { room: roomDoc, attendees } = await validateBookingResources(input, session.user.id);

    const { booking } = await requestAdminBookings(session.user.studentId, "POST", {
      roomId: String(roomDoc._id),
      purpose: input.purpose,
      title: input.title,
      ...(input.tutorialGroup ? { tutorialGroup: input.tutorialGroup } : {}),
      attendees,
      conversationId: input.conversationId,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
    });

    return NextResponse.json({
      message: "Booking created successfully.",
      booking: {
        id: String(booking._id),
        purpose: booking.purpose,
        room: roomDoc.name,
        roomCode: roomDoc.code,
        status: booking.status,
      },
    }, { status: 201 });
  } catch (error) {
    return bookingErrorResponse(error, "bookings.create", "Unable to create this booking right now.");
  }
}
