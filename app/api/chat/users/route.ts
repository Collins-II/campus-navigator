import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/database";
import { withDatabaseErrorHandling } from "@/lib/database/errors";
import User from "@/lib/database/models/User";
import { getChatUserId } from "@/lib/chat";

export const dynamic = "force-dynamic";

export const GET = withDatabaseErrorHandling(async function GET(request: Request) {
  const userId = await getChatUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 50);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "i");
  await connectToDatabase();
  const me = await User.findById(userId).select("email studentId").lean();
  const users = await User.find({
    $and: [
      { _id: { $ne: userId } },
      ...(me?.email ? [{ email: { $ne: me.email } }] : []),
      ...(me?.studentId ? [{ studentId: { $ne: me.studentId } }] : []),
      { role: "student" },
      ...(q ? [{ $or: [{ name: pattern }, { program: pattern }] }] : []),
    ],
  })
    .select("name program year")
    .sort({ name: 1 })
    .limit(50)
    .lean();
  const others = users.filter((u) => u._id.toString() !== userId);

  const lower = q.toLowerCase();
  const rank = (name: string) => {
    const n = name.toLowerCase();
    if (n.startsWith(lower)) return 0;
    return n.split(/\s+/).some((w) => w.startsWith(lower)) ? 1 : 2;
  };
  const sorted = q ? others.sort((a, b) => rank(a.name) - rank(b.name)) : others;

  return NextResponse.json({
    users: sorted.slice(0, 20).map((u) => ({ id: u._id.toString(), name: u.name, program: u.program, year: u.year })),
  });
}, "chat.users.get", "Unable to load students right now.");
