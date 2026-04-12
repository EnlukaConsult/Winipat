import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Winipat Assistant — a friendly, helpful AI shopping assistant for Winipat, Nigeria's trust-first commerce platform.

About Winipat:
- Winipat connects buyers with verified sellers through escrow-backed payments
- All sellers are KYC-verified (government ID, bank account, phone)
- Payments are held in escrow until the buyer confirms delivery
- Buyers choose their own logistics partner (GIG, DHL, etc.)
- After delivery confirmation, there's a 2-day hold period before seller gets paid
- Winipat charges 12% commission on sales
- Buyers can open disputes with photo/video evidence
- Only completed-order buyers can leave reviews

Product Categories: Fashion & Accessories, Shoes, Jewelry, Watches & Accessories, Health & Beauty

Key Features: Escrow payments, verified sellers, in-app messaging, delivery tracking, dispute resolution, verified reviews

Guidelines:
- Be warm, conversational, use simple English
- Use Naira (₦) for prices
- Keep responses concise (2-4 sentences)
- You can use light Nigerian expressions naturally`;

type Message = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no API key, use smart fallback responses
  if (!apiKey) {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    let reply = getSmartReply(lastMessage);
    return NextResponse.json({ reply });
  }

  // Call Claude API directly
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const reply = getSmartReply(messages[messages.length - 1]?.content?.toLowerCase() || "");
    return NextResponse.json({ reply });
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text || "I'm here to help! What would you like to know about Winipat?";

  return NextResponse.json({ reply });
}

function getSmartReply(input: string): string {
  if (input.includes("escrow") || input.includes("payment") || input.includes("pay") || input.includes("safe")) {
    return "Great question! On Winipat, your payment is held securely in escrow when you place an order. The seller only receives payment after you confirm delivery and a 2-day hold period passes. If anything goes wrong, you can open a dispute and your funds remain protected. No wahala!";
  }
  if (input.includes("sell") || input.includes("seller") || input.includes("vendor")) {
    return "To sell on Winipat, you need to complete our verification process: submit your government ID, verify your bank account, and confirm your phone number. Once approved, you can list products with photos and videos. You'll receive payments through our daily settlement system, minus a 12% commission. Click 'Apply to Sell' to get started!";
  }
  if (input.includes("product") || input.includes("buy") || input.includes("shop") || input.includes("available")) {
    return "We have a great selection of products from verified sellers! Browse categories like Fashion & Accessories (designer bags, Ankara outfits), Shoes (heels, sneakers, sandals), Jewelry (gold chains, silver bracelets), Watches & Accessories, and Health & Beauty (skincare, makeup, wigs, perfumes). Head to the Browse page to explore!";
  }
  if (input.includes("delivery") || input.includes("logistics") || input.includes("shipping") || input.includes("track")) {
    return "With Winipat, YOU choose your preferred logistics partner at checkout — whether it's GIG, DHL, or others. You can track your delivery status in-app from pickup to your door. Every handoff includes photo proof, so you always know where your package is.";
  }
  if (input.includes("dispute") || input.includes("refund") || input.includes("wrong") || input.includes("problem")) {
    return "If something goes wrong with your order, you can open a dispute within the allowed period. Upload photo or video evidence, and our team will review it fairly. While the dispute is open, your funds remain safely held in escrow. We'll resolve it by releasing payment to the seller, issuing a partial or full refund, or arranging a return.";
  }
  if (input.includes("review") || input.includes("rating") || input.includes("trust")) {
    return "Trust is at the heart of Winipat! Only buyers who have completed an order and confirmed delivery can leave reviews — no fake reviews allowed. Sellers earn trust badges like 'Verified', 'Trusted Seller', and 'Fast Dispatch' based on their performance. Check seller ratings before you buy!";
  }
  if (input.includes("hello") || input.includes("hi") || input.includes("hey") || input.includes("good")) {
    return "Hello! Welcome to Winipat! I'm here to help you shop safely or answer any questions about our platform. What would you like to know? You can ask about our products, how escrow payments work, selling on Winipat, or anything else!";
  }
  return "Thanks for reaching out! I can help you with: finding products, understanding our escrow payment system, learning how to sell on Winipat, delivery and tracking, disputes and refunds, or reviews and trust scores. What would you like to know?";
}
