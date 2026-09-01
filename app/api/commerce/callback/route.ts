import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import CommerceOrder from "@/lib/database/models/CommerceOrder";
import { parseDpoCallback } from "@/lib/dpo";

export async function POST(request: Request) {
  const callback = await parseDpoCallback(request);
  if (!callback.reference) return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  await connectToDatabase();
  const order = await CommerceOrder.findOne({ reference: callback.reference });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  order.dpoTransactionId = callback.transactionId;
  order.dpoResult = callback.result;
  if (callback.result === "000") {
    order.status = "paid";
    order.paidAt = new Date();
  } else if (callback.result) {
    order.status = "failed";
  }
  await order.save();
  return NextResponse.json({ received: true });
}