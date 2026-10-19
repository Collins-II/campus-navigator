import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
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
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone || "",
        department: user.department || "",
        program: user.program || "",
        year: user.year || "",
        role: user.role,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "dashboard.profile.get", "Unable to load your profile right now.");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const updates = {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      department: typeof body.department === "string" ? body.department.trim() : undefined,
      program: typeof body.program === "string" ? body.program.trim() : undefined,
      year: typeof body.year === "string" ? body.year.trim() : undefined,
    };

    await connectToDatabase();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        user[key as keyof typeof updates] = value as never;
      }
    });

    await user.save();

    return NextResponse.json({
      message: "Profile updated successfully.",
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone || "",
        department: user.department || "",
        program: user.program || "",
        year: user.year || "",
        role: user.role,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "dashboard.profile.update", "Unable to update your profile right now.");
  }
}
