import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import CommerceOrder from "@/lib/database/models/CommerceOrder";
import { parseDpoCallback, verifyDpoToken } from "@/lib/dpo";

export async function POST(request: Request) {
  const callback = await parseDpoCallback(request);
  if (!callback.reference) return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  await connectToDatabase();
  const order = await CommerceOrder.findOne({ reference: callback.reference });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ received: true });
  if (!order.dpoToken) return NextResponse.json({ error: "Order has no payment token." }, { status: 400 });

  // Never trust the callback body; confirm with DPO using the token stored at checkout.
  const verification = await verifyDpoToken(order.dpoToken);
  order.dpoTransactionId = verification.transactionId || callback.transactionId;
  order.dpoResult = verification.result;
  if (verification.paid) {
    order.status = "paid";
    order.paidAt = new Date();
  } else if (verification.result && verification.result !== "900") {
    order.status = "failed";
  }
  await order.save();
  return NextResponse.json({ received: true });
}