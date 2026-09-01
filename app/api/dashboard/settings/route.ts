import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/User";

const defaultNotificationSettings = {
  email: true,
  sms: false,
  push: true,
  weeklyDigest: true,
};

const defaultAppSettings = {
  compactMode: false,
  campusAlerts: true,
  autoConfirmBookings: false,
  darkMode: true,
};

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
      settings: {
        notifications: user.notifications || defaultNotificationSettings,
        app: user.appSettings || defaultAppSettings,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const notifications = {
      ...defaultNotificationSettings,
      ...(body?.notifications || {}),
    };
    const app = {
      ...defaultAppSettings,
      ...(body?.app || {}),
    };

    await connectToDatabase();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.notifications = notifications;
    user.appSettings = app;
    await user.save();

    return NextResponse.json({
      message: "Settings updated successfully.",
      settings: {
        notifications: user.notifications,
        app: user.appSettings,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update settings." }, { status: 500 });
  }
}
