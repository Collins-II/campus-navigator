import { NextResponse } from "next/server";

import { describeStep, type RouteStep } from "@/lib/routing";

export const dynamic = "force-dynamic";

// Routing backend is configurable so production can use a keyed/self-hosted OSRM instance.
const BASE_URL = (process.env.ROUTING_BASE_URL || "https://routing.openstreetmap.de").replace(/\/$/, "");
const API_KEY = process.env.ROUTING_API_KEY;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; reset: number }>();

function limited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function parsePoint(value: string | null): [number, number] | null {
  const parts = (value ?? "").split(",").map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lat, lng] = parts;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const url = new URL(request.url);
  const from = parsePoint(url.searchParams.get("from"));
  const to = parsePoint(url.searchParams.get("to"));
  const profile = url.searchParams.get("profile") === "bike" ? "bike" : "foot";
  const destinationName = (url.searchParams.get("name") || "your destination").slice(0, 80);
  if (!from || !to) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

  const service = profile === "bike" ? "routed-bike" : "routed-foot";
  const upstream = `${BASE_URL}/${service}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true${
    API_KEY ? `&key=${encodeURIComponent(API_KEY)}` : ""
  }`;

  try {
    const res = await fetch(upstream, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "UNZA-Campus-Navigator/1.0" },
    });
    if (!res.ok) return NextResponse.json({ error: "Routing unavailable" }, { status: 502 });

    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) return NextResponse.json({ error: "No route found" }, { status: 404 });

    type RawStep = Parameters<typeof describeStep>[0];
    const rawSteps: RawStep[] = (route.legs ?? []).flatMap((leg: { steps?: RawStep[] }) => leg.steps ?? []);
    const steps: RouteStep[] = rawSteps.map((s, i) => ({
      instruction: describeStep(s, destinationName, i === rawSteps.length - 1),
      maneuver: s.maneuver.type,
      distance: s.distance,
      location: [s.maneuver.location[1], s.maneuver.location[0]],
    }));

    return NextResponse.json({
      distance: route.distance,
      coordinates: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
      steps,
    });
  } catch {
    return NextResponse.json({ error: "Routing unavailable" }, { status: 502 });
  }
}
