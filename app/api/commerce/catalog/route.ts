import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    currency: process.env.DPO_CURRENCY || "ZMW",
    items: [
      { id: "transcript", name: "Official transcript request", description: "Digital processing and verification fee", amount: 50, itemType: "campus-service" },
      { id: "id-replacement", name: "Student ID replacement", description: "Replacement card issue fee", amount: 35, itemType: "campus-service" },
      { id: "graduation-gown", name: "Graduation gown deposit", description: "Refundable campus collection deposit", amount: 250, itemType: "merchandise" },
    ],
  });
}