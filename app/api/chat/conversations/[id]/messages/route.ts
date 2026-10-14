import { NextResponse } from "next/server";

import Conversation from "@/lib/database/models/Conversation";
import Message from "@/lib/database/models/Message";
import { getChatUserId, getMemberConversation, isObjectId, type ChatMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function markRead(conversationId: string, userId: string) {
  const now = new Date();
  const updated = await Conversation.updateOne(
    { _id: conversationId, "reads.user": userId },
    { $set: { "reads.$.at": now } }
  );
  if (updated.matchedCount === 0) {
    await Conversation.updateOne({ _id: conversationId }, { $push: { reads: { user: userId, at: now } } });
  }
}

export async function GET(request: Request, { params }: Ctx) {
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await getMemberConversation(id, userId);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  const query: Record<string, unknown> = { conversation: id };
  if (after && !Number.isNaN(Date.parse(after))) query.createdAt = { $gt: new Date(after) };
  else if (before && !Number.isNaN(Date.parse(before))) query.createdAt = { $lt: new Date(before) };

  const docs = await Message.find(query)
    .sort({ createdAt: after ? 1 : -1 })
    .limit(50)
    .lean();
  if (!after) docs.reverse();

  const messages: ChatMessage[] = docs.map((m) => ({
    id: m._id.toString(),
    senderId: m.sender.toString(),
    text: m.deletedAt ? "" : m.text,
    createdAt: new Date(m.createdAt).toISOString(),
    deleted: Boolean(m.deletedAt),
  }));

  await markRead(id, userId);
  return NextResponse.json({ messages, hasMore: !after && docs.length === 50 });
}

export async function POST(request: Request, { params }: Ctx) {
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const conversation = await getMemberConversation(id, userId);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Message must be 1-2000 characters" }, { status: 400 });
  }

  const message = await Message.create({ conversation: id, sender: userId, text });
  await Conversation.updateOne(
    { _id: id },
    { $set: { lastMessage: { text: text.slice(0, 120), sender: userId, createdAt: message.createdAt } } }
  );
  await markRead(id, userId);

  const dto: ChatMessage = {
    id: message._id.toString(),
    senderId: userId,
    text,
    createdAt: new Date(message.createdAt).toISOString(),
    deleted: false,
  };
  return NextResponse.json({ message: dto }, { status: 201 });
}
