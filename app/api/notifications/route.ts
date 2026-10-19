import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import Notification from "@/lib/database/models/Notification";
import type { NotificationResponse } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const filter = url.searchParams.get("filter") || "all"; // all, unread, read

    await connectToDatabase();

    const query: Record<string, unknown> = {
      user: session.user.id,
      isDeleted: false,
    };

    if (filter === "unread") {
      query.isRead = false;
    } else if (filter === "read") {
      query.isRead = true;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Notification.countDocuments(query);

    const formattedNotifications: NotificationResponse[] = notifications.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (notif: Record<string, any>) => ({
        id: notif._id.toString(),
        user: notif.user.toString(),
        type: notif.type,
        priority: notif.priority,
        title: notif.title,
        message: notif.message,
        description: notif.description,
        icon: notif.icon,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        relatedId: notif.relatedId,
        isRead: notif.isRead,
        readAt: notif.readAt,
        isDeleted: notif.isDeleted,
        createdAt: notif.createdAt,
        updatedAt: notif.updatedAt,
      })
    );

    return NextResponse.json(
      {
        notifications: formattedNotifications,
        total,
        limit,
        skip,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "notifications.get", "Unable to load notifications right now.");
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

    const body = await request.json();
    const {
      type,
      priority = "normal",
      title,
      message,
      description,
      icon,
      actionUrl,
      actionLabel = "View Details",
      relatedId,
      metadata,
      expiresAt,
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const notification = await Notification.create({
      user: session.user.id,
      type,
      priority,
      title,
      message,
      description: description || undefined,
      icon: icon || undefined,
      actionUrl: actionUrl || undefined,
      actionLabel,
      relatedId: relatedId || {},
      metadata: metadata || {},
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    const response: NotificationResponse = {
      id: notification._id.toString(),
      user: notification.user.toString(),
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      description: notification.description,
      icon: notification.icon,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      relatedId: notification.relatedId,
      isRead: notification.isRead,
      readAt: notification.readAt,
      isDeleted: notification.isDeleted,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "notifications.create", "Unable to create this notification right now.");
  }
}
