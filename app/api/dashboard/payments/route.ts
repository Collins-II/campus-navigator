import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      payment: {
        paymentMethod: user.paymentMethod || "card",
        provider: user.paymentProvider || "Visa",
        billingEmail: user.billingEmail || user.email || "",
        cardholderName: user.cardholderName || user.name || "",
        last4: user.last4 || "",
        status: user.paymentStatus || "verified",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load payment details." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "card";
    const provider = typeof body.provider === "string" ? body.provider.trim() : "Visa";
    const billingEmail = typeof body.billingEmail === "string" ? body.billingEmail.trim() : "";
    const cardholderName = typeof body.cardholderName === "string" ? body.cardholderName.trim() : "";
    const last4 = typeof body.last4 === "string" ? body.last4.trim().replace(/\D/g, "").slice(0, 4) : "";

    await connectToDatabase();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.paymentMethod = paymentMethod;
    user.paymentProvider = provider;
    user.billingEmail = billingEmail || user.email;
    user.cardholderName = cardholderName || user.name;
    user.last4 = last4;
    user.paymentStatus = "verified";

    await user.save();

    return NextResponse.json({
      message: "Payment details updated successfully.",
      payment: {
        paymentMethod: user.paymentMethod,
        provider: user.paymentProvider,
        billingEmail: user.billingEmail,
        cardholderName: user.cardholderName,
        last4: user.last4,
        status: user.paymentStatus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update payment details." }, { status: 500 });
  }
}
