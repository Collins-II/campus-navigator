import { NextResponse } from "next/server";
import { getChatUserId, getMemberConversation, isObjectId } from "@/lib/chat";
import { withDatabaseErrorHandling } from "@/lib/database/errors";
import CircleActivity from "@/lib/database/models/CircleActivity";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; activityId: string }> };

export const GET = withDatabaseErrorHandling(async function GET(_request: Request, { params }: Context) {
  const { id, activityId } = await params;
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const conversation = await getMemberConversation(id, userId);
  if (!conversation || conversation.type !== "group") {
    return NextResponse.json({ error: "Study Circle not found." }, { status: 404 });
  }
  if (!isObjectId(activityId)) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  const activity = await CircleActivity.findOne({ _id: activityId, conversation: id, kind: "resource" })
    .select("+documentData");
  if (!activity?.document || !activity.documentData) {
    return NextResponse.json({ error: "Document not found or it has been removed." }, { status: 404 });
  }
  const filename = encodeURIComponent(activity.document.name).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(new Uint8Array(activity.documentData), {
    headers: {
      "Content-Type": activity.document.contentType,
      "Content-Length": String(activity.documentData.length),
      "Content-Disposition": `attachment; filename="study-resource.${activity.document.contentType === "application/pdf" ? "pdf" : "docx"}"; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}, "chat.circle.document", "Unable to download this document right now.");
