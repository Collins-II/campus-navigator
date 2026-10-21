import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import Booking from "@/lib/database/models/Booking";
import Room from "@/lib/database/models/Room";
import mongoose from "mongoose";
import { bookingBody, bookingErrorResponse, BookingPolicyError, parseBookingInput, requireStudentBookingAccess, validateBookingResources } from "@/lib/bookings";
import { requestAdminBookings } from "@/lib/admin-bookings";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requireStudentBookingAccess(session.user.role);
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new BookingPolicyError("Booking not found.", 404);
    }
    const body = bookingBody(await request.json());
    await connectToDatabase();

    const booking = await Booking.findOne({ _id: id, user: session.user.id }).lean();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (body.status === "cancelled") {
      if (Object.keys(body).some((key) => key !== "status")) {
        throw new BookingPolicyError("Cancel a booking separately from other changes.");
      }
      await requestAdminBookings(session.user.studentId, "PATCH", {}, id);
      return NextResponse.json({ message: "Booking cancelled successfully." });
    }
    if (body.status !== undefined && body.status !== booking.status) {
      throw new BookingPolicyError("Only campus staff can confirm bookings.", 403);
    }
    if (booking.status === "cancelled") {
      throw new BookingPolicyError("Cancelled bookings cannot be edited. Create a new request.", 409);
    }
    if (booking.conversation && body.conversationId !== undefined &&
        body.conversationId !== String(booking.conversation)) {
      throw new BookingPolicyError("The Study Circle attached to a booking cannot be changed.");
    }

    const currentRoom = await Room.findById(booking.room).lean();
    const input = parseBookingInput({
      purpose: booking.purpose,
      title: booking.title,
      tutorialGroup: booking.tutorialGroup,
      room: currentRoom?.code,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      attendees: booking.attendees ?? 1,
      ...body,
      conversationId: booking.conversation ? String(booking.conversation) : body.conversationId,
    });
    const { room, attendees } = await validateBookingResources(input, session.user.id, id);
    const result = await requestAdminBookings(session.user.studentId, "PATCH", {
      roomId: String(room._id), purpose: input.purpose, title: input.title, attendees,
      ...(input.tutorialGroup ? { tutorialGroup: input.tutorialGroup } : {}),
      conversationId: input.conversationId,
      startTime: input.startTime.toISOString(), endTime: input.endTime.toISOString(),
    }, id);
    return NextResponse.json({ message: "Changes submitted for staff approval.", booking: result.booking });
  } catch (error) {
    return bookingErrorResponse(error, "bookings.update", "Unable to update this booking right now.");
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requireStudentBookingAccess(session.user.role);
    if (!mongoose.isObjectIdOrHexString(id)) throw new BookingPolicyError("Booking not found.", 404);
    await requestAdminBookings(session.user.studentId, "PATCH", {}, id);
    return NextResponse.json({ message: "Booking cancelled successfully." });
  } catch (error) {
    return bookingErrorResponse(error, "bookings.delete", "Unable to cancel this booking right now.");
  }
}
