import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import Notification from "@/lib/database/models/Notification";

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

    const unreadCount = await Notification.countDocuments({
      user: session.user.id,
      isRead: false,
      isDeleted: false,
    });

    const totalCount = await Notification.countDocuments({
      user: session.user.id,
      isDeleted: false,
    });

    return NextResponse.json(
      {
        unreadCount,
        totalCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "notifications.unread.get", "Unable to load notification status right now.");
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Mark all unread notifications as read
    const result = await Notification.updateMany(
      {
        user: session.user.id,
        isRead: false,
        isDeleted: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return NextResponse.json(
      {
        message: "All notifications marked as read",
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "notifications.unread.update", "Unable to update notifications right now.");
  }
}
