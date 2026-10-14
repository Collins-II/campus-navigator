import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";

type RoomDoc = {
  _id?: string | { toString: () => string };
  name?: string;
  code?: string;
  floor?: string;
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

    await connectToDatabase();
    const rooms = await Room.find().sort({ name: 1 }).lean();

    const defaultDate = new Date();
    const defaultStart = new Date(defaultDate);
    const defaultEnd = new Date(defaultDate);
    defaultStart.setHours(9, 0, 0, 0);
    defaultEnd.setHours(17, 0, 0, 0);

    const selectedDate = date || defaultDate.toISOString().slice(0, 10);
    const selectedStartTime = start || "09:00";
    const selectedEndTime = end || "17:00";
    const selectedStart = new Date(`${selectedDate}T${selectedStartTime}:00`);
    const selectedEnd = new Date(`${selectedDate}T${selectedEndTime}:00`);

    const availableRooms = await Promise.all(
      rooms.map(async (room: RoomDoc) => {
        const conflict = await Booking.findOne({
          room: room._id,
          status: { $ne: "cancelled" },
          startTime: { $lt: selectedEnd },
          endTime: { $gt: selectedStart },
        }).lean();

        return {
          id: String(room._id),
          name: room.name,
          code: room.code,
          floor: room.floor,
          capacity: room.capacity,
          description: room.description,
          isAvailable: !conflict && room.isAvailable !== false,
        };
      })
    );

    if (!date || !start || !end) {
      return NextResponse.json({
        rooms: availableRooms,
      });
    }

    const filteredRooms = roomName
      ? availableRooms.filter((room) => room.name === roomName)
      : availableRooms;

    return NextResponse.json({ rooms: filteredRooms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load available rooms." },
      { status: 500 }
    );
  }
}
