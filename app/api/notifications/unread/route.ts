import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import Notification from "@/lib/database/models/Notification";

export async function GET(request: Request) {
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
    console.error("Error fetching notification stats:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch notification stats",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update notifications",
      },
      { status: 500 }
    );
  }
}
