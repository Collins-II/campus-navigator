import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";
import User from "@/lib/database/models/User";

type BookingDoc = {
  _id?: string | { toString: () => string };
  room?: { name?: string; code?: string; floor?: string } | string | null;
  purpose?: string;
  status?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  createdAt?: string | Date;
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

    const [profile, bookings, totalRooms] = await Promise.all([
      User.findById(session.user.id).lean(),
      Booking.find({ user: session.user.id }).populate("room", "name code floor capacity").sort({ startTime: 1 }).lean(),
      Room.countDocuments(),
    ]);

    const mappedBookings = bookings.map((booking: BookingDoc) => {
      const startTime = booking.startTime ? new Date(booking.startTime) : new Date();
      return {
        id: String(booking._id ?? "booking-id"),
        purpose: booking.purpose || "Campus booking",
        room: typeof booking.room === "object" && booking.room ? booking.room.name : "Unknown room",
        roomCode: typeof booking.room === "object" && booking.room ? booking.room.code : "L1",
        floor: typeof booking.room === "object" && booking.room ? booking.room.floor : "Ground Floor",
        status: booking.status || "pending",
        date: getLocalDateKey(startTime),
        startTime: startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        endTime: booking.endTime ? new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:30",
        createdAt: booking.createdAt ? new Date(booking.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    const todayKey = getLocalDateKey(new Date());
    const activeBookings = mappedBookings.filter((booking) => booking.status !== "cancelled").length;
    const upcomingClasses = mappedBookings.filter((booking) => booking.date >= todayKey).length;
    const bookedRoomsToday = new Set(
      mappedBookings
        .filter((booking) => booking.status !== "cancelled" && booking.date === todayKey)
        .map((booking) => booking.room)
    ).size;
    const roomUsage = totalRooms > 0 ? Math.min(100, Math.round((bookedRoomsToday / totalRooms) * 100)) : 0;

    return NextResponse.json({
      profile: {
        id: String(profile?._id || session.user.id),
        name: profile?.name || session.user.name || "Student",
        email: profile?.email || session.user.email || "",
        studentId: profile?.studentId || session.user.studentId || "",
        phone: profile?.phone || "",
        department: profile?.department || "",
        program: profile?.program || "",
        year: profile?.year || "",
        role: profile?.role || session.user.role || "student",
      },
      summary: {
        totalBookings: mappedBookings.length,
        activeBookings,
        upcomingClasses,
        roomUsage,
      },
      bookings: mappedBookings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load dashboard data.",
      },
      { status: 500 }
    );
  }
}
