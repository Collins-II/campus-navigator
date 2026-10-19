import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import CommerceOrder from "@/lib/database/models/CommerceOrder";
import User from "@/lib/database/models/User";
import { createDpoCheckout } from "@/lib/dpo";

const catalog: Record<string, { name: string; amount: number; itemType: "campus-service" | "merchandise" }> = {
  transcript: { name: "Official transcript request", amount: 50, itemType: "campus-service" },
  "id-replacement": { name: "Student ID replacement", amount: 35, itemType: "campus-service" },
  "graduation-gown": { name: "Graduation gown deposit", amount: 250, itemType: "merchandise" },
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const item = catalog[body.itemId];
    if (!item) return NextResponse.json({ error: "That campus item is unavailable." }, { status: 400 });

    await connectToDatabase();
    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const reference = `CAMPUS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const currency = process.env.DPO_CURRENCY || "ZMW";
    const order = await CommerceOrder.create({ user: user._id, reference, ...item, currency, customerEmail: user.email, customerName: user.name });
    const origin = new URL(request.url).origin;
    const checkout = await createDpoCheckout({ itemName: item.name, amount: item.amount, currency, reference, customerName: user.name, customerEmail: user.email, backUrl: `${origin}/commerce`, redirectUrl: `${origin}/commerce?reference=${reference}` });
    order.dpoToken = checkout.token;
    await order.save();
    return NextResponse.json({ reference, paymentUrl: checkout.paymentUrl });
  } catch (error) {
    return apiErrorResponse(error, "commerce.checkout", "Unable to start checkout right now.");
  }
}