import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    const booking = await Booking.findOne({ _id: id, user: session.user.id });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const nextRoom = body.room ? await Room.findOne({ $or: [{ name: body.room }, { code: body.room }] }) : null;
    const nextStart = body.startTime ? new Date(body.startTime) : booking.startTime;
    const nextEnd = body.endTime ? new Date(body.endTime) : booking.endTime;

    if (nextRoom && nextRoom._id.toString() !== booking.room.toString()) {
      const hasConflict = await Booking.findOne({
        room: nextRoom._id,
        status: { $ne: "cancelled" },
        _id: { $ne: booking._id },
        startTime: { $lt: nextEnd },
        endTime: { $gt: nextStart },
      });

      if (hasConflict) {
        return NextResponse.json({ error: `The room "${nextRoom.name}" is unavailable for the selected time slot.` }, { status: 409 });
      }
    }

    if (nextRoom) {
      booking.room = nextRoom._id;
    }

    if (typeof body.purpose === "string" && body.purpose.trim()) {
      booking.purpose = body.purpose.trim();
    }

    if (body.startTime) {
      booking.startTime = nextStart;
    }

    if (body.endTime) {
      booking.endTime = nextEnd;
    }

    if (nextEnd <= nextStart) {
      return NextResponse.json({ error: "End time must be later than start time." }, { status: 400 });
    }

    if (body.status) {
      booking.status = body.status;
    }

    await booking.save();
    return NextResponse.json({ message: "Booking updated successfully.", booking });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update booking." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await connectToDatabase();
    const deleted = await Booking.findOneAndDelete({ _id: id, user: session.user.id });

    if (!deleted) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Booking cancelled successfully." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete booking." }, { status: 500 });
  }
}
