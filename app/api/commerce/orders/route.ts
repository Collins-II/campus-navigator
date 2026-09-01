import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import CommerceOrder from "@/lib/database/models/CommerceOrder";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  await connectToDatabase();
  const orders = await CommerceOrder.find({ user: session.user.id }).sort({ createdAt: -1 }).limit(20).lean();
  return NextResponse.json({ orders });
}