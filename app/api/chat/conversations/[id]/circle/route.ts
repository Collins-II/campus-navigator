import { NextResponse } from "next/server";
import { getChatUserId, getMemberConversation, isObjectId } from "@/lib/chat";
import { withDatabaseErrorHandling } from "@/lib/database/errors";
import CircleActivity from "@/lib/database/models/CircleActivity";
import Room from "@/lib/database/models/Room";
import { validateCircleDraft, validCircleResponse, validateCircleDocument, type CircleDocument } from "@/lib/study-circles";
import { readCircleUpload, validateCircleDocumentContents } from "@/lib/circle-documents";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

async function memberCircle(id: string) {
  const userId = await getChatUserId();
  if (!userId) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const conversation = await getMemberConversation(id, userId);
  if (!conversation) return { response: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) };
  if (conversation.type !== "group") {
    return { response: NextResponse.json({ error: "Study Circles are available in group conversations." }, { status: 400 }) };
  }
  return { userId, conversation };
}

export const GET = withDatabaseErrorHandling(async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await memberCircle(id);
  if (access.response) return access.response;
  const search = new URL(request.url).searchParams;
  const before = search.get("before");
  const kind = search.get("kind");
  if (before && !isObjectId(before)) return NextResponse.json({ error: "Invalid activity cursor." }, { status: 400 });
  if (kind !== null && kind !== "session" && kind !== "poll" && kind !== "resource") {
    return NextResponse.json({ error: "Invalid activity filter." }, { status: 400 });
  }
  const activities = await CircleActivity.find({
    conversation: id,
    ...(kind ? { kind } : {}),
    ...(before ? { _id: { $lt: before } } : {}),
  }).sort({ _id: -1 }).limit(31).lean();
  const page = activities.slice(0, 30);
  return NextResponse.json({
    activities: page.map((activity) => ({
      id: activity._id.toString(),
      kind: activity.kind,
      title: activity.title,
      description: activity.description,
      location: activity.location,
      startsAt: activity.startsAt?.toISOString() ?? "",
      options: activity.options,
      url: activity.url,
      createdBy: activity.createdBy.toString(),
      createdAt: activity.createdAt.toISOString(),
      responses: activity.responses,
      ...(activity.document ? { document: activity.document } : {}),
    })),
    nextCursor: activities.length > 30 ? page.at(-1)?._id.toString() : null,
  }, { headers: { "Cache-Control": "no-store" } });
}, "chat.circle.get", "Unable to load this Study Circle right now.");

export const POST = withDatabaseErrorHandling(async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await memberCircle(id);
  if (access.response) return access.response;
  let input: unknown;
  let document: CircleDocument | undefined;
  let documentData: Buffer | undefined;
  if (request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    const upload = await readCircleUpload(request);
    if (!upload.data) return NextResponse.json({ error: upload.error }, { status: upload.status });
    const form = upload.data;
    const files = form.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return NextResponse.json({ error: "Choose one PDF or DOCX document." }, { status: 400 });
    }
    const file = files[0];
    const metadata = validateCircleDocument(file.name, file.size);
    if (!metadata.data) return NextResponse.json({ error: metadata.error }, { status: 400 });
    documentData = Buffer.from(await file.arrayBuffer());
    const contentError = validateCircleDocumentContents(file.name, documentData);
    if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
    document = metadata.data;
    input = { kind: "resource", title: form.get("title"), description: form.get("description") };
  } else {
    input = await request.json();
  }
  const result = validateCircleDraft(input, Date.now(), document ? "document" : "link");
  if (!result.data) return NextResponse.json({ error: result.error }, { status: 400 });
  const { startsAt, ...draft } = result.data;
  if (draft.kind === "session" && !(await Room.exists({ name: draft.location }))) {
    return NextResponse.json({ error: "Choose a published campus meeting place." }, { status: 400 });
  }
  const activity = await CircleActivity.create({
    ...draft,
    ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
    conversation: id,
    createdBy: access.userId,
    ...(document ? { document, documentData } : {}),
  });
  return NextResponse.json({ id: activity._id.toString() }, { status: 201 });
}, "chat.circle.create", "Unable to share this activity right now.");

export const PATCH = withDatabaseErrorHandling(async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await memberCircle(id);
  if (access.response) return access.response;
  const body = await request.json();
  if (!isObjectId(body?.activityId)) return NextResponse.json({ error: "Invalid activity." }, { status: 400 });
  const activity = await CircleActivity.findOne({ _id: body.activityId, conversation: id }).lean();
  if (!activity) return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  if (!validCircleResponse(activity.kind, body.value, activity.options)) {
    return NextResponse.json({ error: "Choose a valid RSVP or poll option." }, { status: 400 });
  }
  if (activity.kind === "session" && (!activity.startsAt || activity.startsAt.getTime() <= Date.now())) {
    return NextResponse.json({ error: "This session has already started." }, { status: 409 });
  }
  // One atomic map entry per member: changing a vote cannot add a second vote.
  const result = await CircleActivity.updateOne(
    { _id: activity._id, conversation: id },
    { $set: { [`responses.${access.userId}`]: body.value } },
    { runValidators: true }
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Activity no longer exists." }, { status: 404 });
  return NextResponse.json({ updated: true });
}, "chat.circle.respond", "Unable to save your response right now.");

export const DELETE = withDatabaseErrorHandling(async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  const access = await memberCircle(id);
  if (access.response) return access.response;
  const body = await request.json();
  if (!isObjectId(body?.activityId)) return NextResponse.json({ error: "Invalid activity." }, { status: 400 });
  const canManage = access.conversation.createdBy.toString() === access.userId;
  const result = await CircleActivity.deleteOne({
    _id: body.activityId,
    conversation: id,
    ...(!canManage ? { createdBy: access.userId } : {}),
  });
  if (!result.deletedCount) return NextResponse.json({ error: "Activity not found or you cannot remove it." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}, "chat.circle.delete", "Unable to remove this activity right now.");
