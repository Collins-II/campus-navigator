export const BOOKING_PURPOSES = ["Tutorial Group", "Event"] as const;
export type BookingAccess =
  | { allowed: true }
  | { allowed: false; message: string; adminUrl: string | null };

export type BookingPurpose = (typeof BOOKING_PURPOSES)[number];
export type TutorialGroupDetails = { groupName: string; courseCode: string; topic: string; leaderName: string };

export function parseTutorialGroup(value: unknown): TutorialGroupDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const details = value as Record<string, unknown>;
  const limits = { groupName: 120, courseCode: 30, topic: 1000, leaderName: 120 };
  if (Object.keys(details).some((key) => !(key in limits))) return null;
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof details[key] !== "string" || !details[key].trim() || details[key].trim().length > limit) return null;
  }
  return {
    groupName: String(details.groupName).trim(),
    courseCode: String(details.courseCode).trim().toUpperCase(),
    topic: String(details.topic).trim(),
    leaderName: String(details.leaderName).trim(),
  };
}
export const MIN_CIRCLE_BOOKING_MEMBERS = 50;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const LECTURE_ROOM_FILTER = { spaceType: "lecture_room" };

export function campusAvailabilitySlot(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = (date: Date) => Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  const from = parts(start);
  const to = parts(end);
  if (["year", "month", "day"].some((key) => from[key] !== to[key])) return null;
  return { dayOfWeek: from.weekday, startTime: `${from.hour}:${from.minute}`, endTime: `${to.hour}:${to.minute}` };
}

export function isBookingPurpose(value: unknown): value is BookingPurpose {
  return value === "Tutorial Group" || value === "Event";
}

export function bookingWindow(purpose: BookingPurpose, now = Date.now()) {
  return {
    earliest: new Date(now + (purpose === "Event" ? 7 : 2) * DAY_MS),
    latest: purpose === "Event" ? new Date(now + 14 * DAY_MS) : null,
  };
}

export function validateBookingSchedule(
  purpose: BookingPurpose,
  start: Date,
  end: Date,
  now = Date.now()
): string | null {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return "Choose a valid start and end time.";
  }
  if (end <= start) return "End time must be later than start time.";
  const { earliest, latest } = bookingWindow(purpose, now);
  if (start < earliest || (latest && start > latest)) {
    return purpose === "Event"
      ? "Events must be booked between 7 and 14 days before the start time."
      : "Tutorial Groups must be booked at least 48 hours before the start time.";
  }
  return null;
}

export function localDateKey(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export type BookingRoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
};

export type BookingCircleOption = {
  id: string;
  name: string;
  memberCount: number;
  eligible: boolean;
};
