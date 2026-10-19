import mongoose, { Schema } from "mongoose";
import { MAX_CIRCLE_DOCUMENT_BYTES, type CircleDocument, type CircleKind } from "@/lib/study-circles";

export interface ICircleActivity {
  conversation: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  kind: CircleKind;
  title: string;
  description: string;
  location: string;
  startsAt?: Date;
  options: string[];
  url: string;
  responses: Map<string, string>;
  createdAt: Date;
  document?: CircleDocument;
  documentData?: Buffer;
}

const circleActivitySchema = new Schema<ICircleActivity>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["session", "poll", "resource"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    location: { type: String, default: "", maxlength: 160 },
    startsAt: Date,
    options: { type: [String], default: [] },
    url: { type: String, default: "", maxlength: 2000 },
    responses: { type: Map, of: String, default: {} },
    document: {
      type: new Schema<CircleDocument>({
        name: { type: String, required: true, maxlength: 180 },
        size: { type: Number, required: true, min: 1, max: MAX_CIRCLE_DOCUMENT_BYTES },
        contentType: { type: String, required: true, enum: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
      }, { _id: false }),
      default: undefined,
    },
    documentData: { type: Buffer, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

circleActivitySchema.index({ conversation: 1, _id: -1 });
circleActivitySchema.index({ conversation: 1, kind: 1, _id: -1 });

const CircleActivity = (mongoose.models.CircleActivity as mongoose.Model<ICircleActivity> | undefined)
  || mongoose.model<ICircleActivity>("CircleActivity", circleActivitySchema);

export default CircleActivity;
