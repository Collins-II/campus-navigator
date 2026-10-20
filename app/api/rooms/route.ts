import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";
import { campusAvailabilitySlot, LECTURE_ROOM_FILTER } from "@/lib/booking-policy";

type RoomDoc = {
  _id?: string | { toString: () => string };
  name?: string;
  code?: string;
  floor?: number;
  capacity?: number;
  description?: string;
  isAvailable?: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const roomName = searchParams.get("room");
    const startsAt = searchParams.get("startsAt");
    const endsAt = searchParams.get("endsAt");

    await connectToDatabase();
    const rooms = await Room.find(LECTURE_ROOM_FILTER).sort({ name: 1 }).lean();

    const defaultDate = new Date();

    const selectedDate = date || defaultDate.toISOString().slice(0, 10);
    const selectedStartTime = start || "09:00";
    const selectedEndTime = end || "17:00";
    const selectedStart = new Date(startsAt ?? `${selectedDate}T${selectedStartTime}:00+02:00`);
    const selectedEnd = new Date(endsAt ?? `${selectedDate}T${selectedEndTime}:00+02:00`);
    if (Boolean(startsAt) !== Boolean(endsAt)) {
      return NextResponse.json({ error: "Both a start and end time are required." }, { status: 400 });
    }
    if (!Number.isFinite(selectedStart.getTime()) || !Number.isFinite(selectedEnd.getTime()) || selectedEnd <= selectedStart) {
      return NextResponse.json({ error: "Choose a valid availability time range." }, { status: 400 });
    }
    const slot = campusAvailabilitySlot(selectedStart, selectedEnd);
    if (!slot) return NextResponse.json({ error: "Choose a time range within one campus day." }, { status: 400 });
    const db = mongoose.connection.db;
    if (!db) throw new Error("The database connection is unavailable.");

    const availableRooms = await Promise.all(
      rooms.map(async (room: RoomDoc) => {
        const [conflict, timetableConflict] = await Promise.all([Booking.findOne({
          room: room._id,
          status: { $ne: "cancelled" },
          startTime: { $lt: selectedEnd },
          endTime: { $gt: selectedStart },
        }).lean(), db.collection("timetableallocations").findOne({
          room: room._id, status: "published", dayOfWeek: slot.dayOfWeek,
          startTime: { $lt: slot.endTime }, endTime: { $gt: slot.startTime },
        }, { projection: { _id: 1 } })]);

        return {
          id: String(room._id),
          name: room.name,
          code: room.code,
          floor: room.floor === undefined ? "Floor not listed" : `Floor ${room.floor}`,
          capacity: room.capacity,
          description: room.description,
          isAvailable: !conflict && !timetableConflict && room.isAvailable !== false,
        };
      })
    );

    if ((!date || !start || !end) && !startsAt) {
      return NextResponse.json({
        rooms: availableRooms,
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const filteredRooms = roomName
      ? availableRooms.filter((room) => room.name === roomName)
      : availableRooms;

    return NextResponse.json({ rooms: filteredRooms }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "rooms.get", "Unable to load available rooms right now.");
  }
}
