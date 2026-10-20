import mongoose, { Schema, type Document } from "mongoose";
import type { TutorialGroupDetails } from "@/lib/booking-policy";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  purpose: string;
  title?: string;
  attendees: number;
  tutorialGroup?: TutorialGroupDetails;
  requestedAt?: Date;
  cancellationReason?: string;
  conversation?: mongoose.Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: "pending" | "confirmed" | "cancelled";
}

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    purpose: { type: String, required: true, trim: true },
    title: { type: String, trim: true, maxlength: 120 },
    attendees: { type: Number, min: 1, default: 1 },
    tutorialGroup: {
      type: new Schema({
        groupName: { type: String, required: true, trim: true, maxlength: 120 },
        courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
        topic: { type: String, required: true, trim: true, maxlength: 1000 },
        leaderName: { type: String, required: true, trim: true, maxlength: 120 },
      }, { _id: false }),
    },
    requestedAt: Date,
    cancellationReason: { type: String, enum: ["student_cancelled", "staff_cancelled", "timetable_conflict"] },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model<IBooking>("Booking", bookingSchema);
