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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const floor = typeof body.floor === "string" ? body.floor.trim() : "Ground Floor";
    const capacity = Number(body.capacity) || 30;
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const equipment = Array.isArray(body.equipment) ? body.equipment.filter(Boolean) : [];
    const location = body.location && typeof body.location === "object" ? body.location : { lat: -15.3925, lng: 28.3285 };
    const isAvailable = body.isAvailable !== undefined ? Boolean(body.isAvailable) : true;

    if (!name || !code) {
      return NextResponse.json({ error: "Room name and room code are required." }, { status: 400 });
    }

    await connectToDatabase();

    const existingRoom = await Room.findOne({ $or: [{ name }, { code }] });
    if (existingRoom) {
      return NextResponse.json({ error: "A lecture room with this name or code already exists." }, { status: 409 });
    }

    const room = await Room.create({
      name,
      code,
      floor,
      capacity,
      equipment,
      location: {
        lat: Number(location.lat) || -15.3925,
        lng: Number(location.lng) || 28.3285,
      },
      description,
      isAvailable,
    });

    return NextResponse.json({
      message: "Lecture room created successfully.",
      room: {
        id: String(room._id),
        name: room.name,
        code: room.code,
        floor: room.floor,
        capacity: room.capacity,
        description: room.description,
        isAvailable: room.isAvailable,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create lecture room." },
      { status: 500 }
    );
  }
}
