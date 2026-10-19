import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/database";
import { withDatabaseErrorHandling } from "@/lib/database/errors";
import Conversation from "@/lib/database/models/Conversation";
import Message from "@/lib/database/models/Message";
import User from "@/lib/database/models/User";
import { getChatUserId, isObjectId, type ChatConversation } from "@/lib/chat";

export const dynamic = "force-dynamic";

type PopulatedMember = { _id: { toString(): string }; name: string; program?: string };

export const GET = withDatabaseErrorHandling(async function GET() {
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const conversations = await Conversation.find({ members: userId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate("members", "name program")
    .lean();

  const result: ChatConversation[] = await Promise.all(
    conversations.map(async (c) => {
      const members = (c.members as unknown as PopulatedMember[]).map((m) => ({
        id: m._id.toString(),
        name: m.name,
        program: m.program,
      }));
      const readAt = c.reads?.find((r: { user: { toString(): string }; at: Date }) => r.user.toString() === userId)?.at;
      const unread = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: userId },
        deletedAt: null,
        ...(readAt ? { createdAt: { $gt: readAt } } : {}),
      });
      const others = members.filter((m) => m.id !== userId);
      return {
        id: c._id.toString(),
        type: c.type,
        createdBy: c.createdBy.toString(),
        title: c.type === "group" ? c.name || "Group chat" : others[0]?.name || "Student",
        members,
        lastMessage: c.lastMessage?.text
          ? {
              text: c.lastMessage.text,
              senderId: c.lastMessage.sender?.toString() ?? "",
              createdAt: new Date(c.lastMessage.createdAt).toISOString(),
            }
          : null,
        unread,
        updatedAt: new Date(c.updatedAt).toISOString(),
      };
    })
  );

  return NextResponse.json({ conversations: result });
}, "chat.conversations.get", "Unable to load your conversations right now.");

export const POST = withDatabaseErrorHandling(async function POST(request: Request) {
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const memberIds: unknown[] = Array.isArray(body?.memberIds) ? body.memberIds : [];
  const ids = Array.from(new Set(memberIds.filter(isObjectId))).filter((id) => id !== userId);
  if (ids.length === 0 || ids.length > 49) {
    return NextResponse.json({ error: "Choose between 1 and 49 students" }, { status: 400 });
  }

  await connectToDatabase();
  const found = await User.countDocuments({ _id: { $in: ids }, role: "student" });
  if (found !== ids.length) {
    return NextResponse.json({ error: "Some students were not found" }, { status: 400 });
  }

  if (ids.length === 1) {
    const directKey = [userId, ids[0]].sort().join(":");
    let conversation = await Conversation.findOne({ directKey });
    if (!conversation) {
      try {
        conversation = await Conversation.create({
          type: "direct",
          members: [userId, ids[0]],
          createdBy: userId,
          directKey,
        });
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) {
          throw error;
        }
        conversation = await Conversation.findOne({ directKey });
      }
    }
    return NextResponse.json({ id: conversation?._id.toString() }, { status: 201 });
  }

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

  const conversation = await Conversation.create({
    type: "group",
    name,
    members: [userId, ...ids],
    createdBy: userId,
  });
  return NextResponse.json({ id: conversation._id.toString() }, { status: 201 });
}, "chat.conversations.create", "Unable to create this conversation right now.");
