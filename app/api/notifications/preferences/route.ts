import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/User";

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  weeklyDigest: boolean;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select("notifications");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const preferences = user.notifications || {
      email: true,
      sms: false,
      push: true,
      weeklyDigest: true,
    };

    return NextResponse.json(preferences, { status: 200 });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch preferences",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, sms, push, weeklyDigest } = body;

    if (
      typeof email !== "boolean" &&
      typeof sms !== "boolean" &&
      typeof push !== "boolean" &&
      typeof weeklyDigest !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid preference values" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        notifications: {
          email: typeof email === "boolean" ? email : undefined,
          sms: typeof sms === "boolean" ? sms : undefined,
          push: typeof push === "boolean" ? push : undefined,
          weeklyDigest: typeof weeklyDigest === "boolean" ? weeklyDigest : undefined,
        },
      },
      { new: true }
    ).select("notifications");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user.notifications, { status: 200 });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update preferences",
      },
      { status: 500 }
    );
  }
}
