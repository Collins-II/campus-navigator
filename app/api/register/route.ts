import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/database";
import User from "@/lib/database/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const studentId = String(body?.studentId || "").trim().toUpperCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const department = String(body?.department || "General Studies").trim();
    const program = String(body?.program || "").trim();
    const year = String(body?.year || "").trim();
    const phone = String(body?.phone || "").trim();
    const role = "student";

    if (!name || !studentId || !email || !password) {
      return NextResponse.json({ error: "Name, student ID, email, and password are required." }, { status: 400 });
    }

    if (!/^\d{6,12}$/.test(studentId.replace(/[^\d]/g, ""))) {
      return NextResponse.json({ error: "Student ID must contain numeric digits only and be 6-12 characters long." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid university email address." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    try {
      await connectToDatabase();
      const existingStudent = await User.findOne({ studentId });
      const existingEmail = await User.findOne({ email });

      if (existingStudent || existingEmail) {
        return NextResponse.json({ error: "An account with this student ID or email already exists." }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        studentId,
        name,
        email,
        password: hashedPassword,
        role,
        department,
        program,
        year,
        phone,
        status: "active",
      });

      return NextResponse.json(
        {
          message: "User registered successfully.",
          user: {
            id: String(user._id),
            studentId: user.studentId,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            program: user.program,
            year: user.year,
            phone: user.phone,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      console.error("Database registration failed:", message);

      return NextResponse.json(
        {
          error:
            "MongoDB registration failed. Please verify that your Atlas cluster is running, your current IP is allowed in Network Access, and the MONGODB_URI environment variable is correct.",
          details: message,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
