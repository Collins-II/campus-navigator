import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { MIN_CIRCLE_BOOKING_MEMBERS } from "@/lib/booking-policy";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import Conversation from "@/lib/database/models/Conversation";
import type { Types } from "mongoose";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    await connectToDatabase();
    const circles = await Conversation.find({ type: "group", members: session.user.id })
      .select("name members").sort({ name: 1 }).lean();
    return NextResponse.json({
      circles: circles.map((circle) => {
        const memberCount = new Set(circle.members.map((member: Types.ObjectId) => String(member))).size;
        return {
          id: String(circle._id),
          name: circle.name || "Study Circle",
          memberCount,
          eligible: memberCount >= MIN_CIRCLE_BOOKING_MEMBERS,
        };
      }),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "bookings.circles", "Unable to verify your Study Circle membership.");
  }
}
