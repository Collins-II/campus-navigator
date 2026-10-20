import { BookingPolicyError } from "@/lib/bookings";

export type CentralBooking = {
  _id: string;
  room: { name?: string; code?: string } | null;
  purpose: string;
  title?: string;
  attendees: number;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  conversation?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  cancellationReason?: string;
};

export function requestAdminBookings(studentId: string | undefined, method: "GET"): Promise<{ bookings: CentralBooking[] }>;
export function requestAdminBookings(
  studentId: string | undefined, method: "POST" | "PATCH", body?: Record<string, unknown>, id?: string
): Promise<{ booking: CentralBooking }>;
export async function requestAdminBookings(
  studentId: string | undefined,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>,
  id?: string
): Promise<{ bookings: CentralBooking[] } | { booking: CentralBooking }> {
  const baseUrl = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  const key = process.env.STUDENT_APP_API_KEY;
  if (!baseUrl || !key) throw new BookingPolicyError("Central admin booking integration is not configured.", 503);
  if (!studentId) throw new BookingPolicyError("Please sign in again with your student ID.", 401);
  const url = new URL(`${baseUrl}/api/integration/bookings${id ? `/${encodeURIComponent(id)}` : ""}`);
  if (method === "GET") url.searchParams.set("studentId", studentId);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-student-app-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      ...(method !== "GET" ? { body: JSON.stringify({ ...body, studentId }) } : {}),
    });
  } catch (error) {
    console.error("Central booking service is unreachable", { error: error instanceof Error ? error.name : "UnknownError" });
    throw new BookingPolicyError("Central booking approval is temporarily unavailable. Please retry.", 502);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new BookingPolicyError("Central admin returned an invalid booking response.", 502);
  }
  if (!response.ok) {
    throw new BookingPolicyError(typeof result?.error === "string" ? result.error : "Central admin could not process this request.", response.status);
  }
  if (method === "GET" ? !Array.isArray(result?.bookings) : !result?.booking?._id) {
    throw new BookingPolicyError("Central admin returned an invalid booking response.", 502);
  }
  return result;
}
