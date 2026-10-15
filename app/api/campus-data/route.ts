import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

// Server-side proxy to the central admin app so the API key never reaches the browser.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const baseUrl = (process.env.ADMIN_APP_URL || "").replace(/\/$/, "");
  const apiKey = process.env.STUDENT_APP_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Admin integration is not configured." }, { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const upstream = new URL(`${baseUrl}/api/integration/campus`);
  for (const key of ["type", "academicYear", "semester", "department"]) {
    const value = incoming.get(key);
    if (value) upstream.searchParams.set(key, value.slice(0, 80));
  }

  try {
    const res = await fetch(upstream, {
      headers: { "x-student-app-key": apiKey },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({ error: "Invalid response from admin app." }));
    return NextResponse.json(body, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "Admin app is unreachable." }, { status: 502 });
  }
}
