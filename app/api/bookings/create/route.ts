import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const booking = await Booking.create({
      user: body.user || "507f1f77bcf86cd799439011",
      room: body.room || "507f1f77bcf86cd799439012",
      purpose: body.purpose || "General meeting",
      startTime: new Date(body.startTime || Date.now()),
      endTime: new Date(body.endTime || Date.now() + 60 * 60 * 1000),
      status: body.status || "pending",
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}
