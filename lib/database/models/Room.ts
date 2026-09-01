import mongoose, { Schema, type Document } from "mongoose";

export interface IRoom extends Document {
  name: string;
  code: string;
  floor: string;
  capacity: number;
  equipment: string[];
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  isAvailable: boolean;
}

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    floor: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    equipment: [{ type: String, trim: true }],
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    description: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model<IRoom>("Room", roomSchema);
