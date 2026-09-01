import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";

type BookingApiRecord = {
  _id?: string | { toString: () => string };
  room?: { name?: string; code?: string } | string | null;
  purpose?: string;
  status?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  attendees?: number;
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

    await connectToDatabase();
    const bookings = await Booking.find({ user: session.user.id }).populate("room", "name code").sort({ startTime: 1 }).lean();

    return NextResponse.json({
      bookings: bookings.map((booking: BookingApiRecord) => {
        const start = booking.startTime ? new Date(booking.startTime) : new Date();
        return {
          id: String(booking._id ?? "booking-id"),
          purpose: booking.purpose,
          room: typeof booking.room === "object" && booking.room ? booking.room.name || "Main Library" : booking.room || "Main Library",
          roomCode: typeof booking.room === "object" && booking.room ? booking.room.code || "L1" : "L1",
          status: booking.status,
          date: getLocalDateKey(start),
          startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          endTime: booking.endTime ? new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:30",
        };
      }),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "Campus coordination";
    const roomName = typeof body.room === "string" ? body.room.trim() : "Main Library";
    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const endTime = body.endTime ? new Date(body.endTime) : new Date(Date.now() + 60 * 60 * 1000);
    const status = body.status || "pending";

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return NextResponse.json({ error: "A valid start and end time is required." }, { status: 400 });
    }

    if (endTime <= startTime) {
      return NextResponse.json({ error: "End time must be later than start time." }, { status: 400 });
    }

    await connectToDatabase();
    const roomDoc = await Room.findOne({ $or: [{ name: roomName }, { code: roomName }] });

    if (!roomDoc) {
      return NextResponse.json({ error: "Selected lecture room was not found. Please create it first from the admin room modal." }, { status: 404 });
    }

    const hasConflict = await Booking.findOne({
      room: roomDoc._id,
      status: { $ne: "cancelled" },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (hasConflict) {
      return NextResponse.json({ error: `The room "${roomDoc.name}" is unavailable for the selected time slot.` }, { status: 409 });
    }

    const booking = await Booking.create({
      user: session.user.id,
      room: roomDoc._id,
      purpose,
      startTime,
      endTime,
      status,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}
