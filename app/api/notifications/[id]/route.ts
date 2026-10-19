import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import Notification from "@/lib/database/models/Notification";
import type { NotificationResponse } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { isRead, action } = body;

    await connectToDatabase();

    const notification = await Notification.findOne({
      _id: id,
      user: session.user.id,
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Handle mark as read/unread
    if (typeof isRead === "boolean") {
      notification.isRead = isRead;
      if (isRead && !notification.readAt) {
        notification.readAt = new Date();
      } else if (!isRead) {
        notification.readAt = null;
      }
    }

    // Handle other actions
    if (action === "delete") {
      notification.isDeleted = true;
      notification.deletedAt = new Date();
    }

    await notification.save();

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

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error, "notifications.update", "Unable to update this notification right now.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectToDatabase();

    const result = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: session.user.id,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Notification deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "notifications.delete", "Unable to delete this notification right now.");
  }
}
