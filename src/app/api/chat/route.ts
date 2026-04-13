import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

Categories: Fashion & Accessories, Shoes, Jewelry, Watches & Accessories, Health & Beauty, Electronics, Home & Living

CRITICAL RULES (YOU MUST FOLLOW THESE):
1. You have access to Winipat's real product catalogue via PRODUCT SEARCH RESULTS injected below.
2. ABSOLUTELY NEVER suggest, mention, or recommend any other website, platform, marketplace, or store. Not Amazon, Jumia, Konga, AliExpress, eBay, or ANY other platform. Winipat is the ONLY place to shop.
3. If the exact product isn't available, ALWAYS recommend similar/related products from the search results. For example, if someone asks for "Toyota car" and we don't sell cars, suggest something creative like "We don't have cars yet, but check out these great products we do have!" then list alternatives.
4. If no products match at all, say something like "We're still growing our catalogue in that area! In the meantime, here are some popular items you might love:" then list suggestions. NEVER say "try another platform" or "search elsewhere."
5. When products ARE found, list them with name and price in ₦. Pick the 3-5 most relevant ones.
6. Use warm, friendly Nigerian-flavoured English. Light expressions like "No wahala", "E dey", "Omo" are welcome.
7. Keep responses concise — 3-5 sentences plus product list.
8. Always encourage browsing the category page for more options.
9. Prices in search results are in kobo — divide by 100 for Naira display.
10. You are a Winipat-ONLY assistant. You exist to help people shop on Winipat, nowhere else.`;

type Message = { role: "user" | "assistant" | "system"; content: string };

// Extract search keywords from user message
function extractSearchTerms(message: string): string[] {
  const stopWords = new Set([
    "i", "me", "my", "we", "our", "you", "your", "it", "its", "the", "a", "an",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "about", "between", "through", "after", "before", "above", "below",
    "and", "but", "or", "not", "no", "so", "if", "then", "than", "that", "this",
    "what", "which", "who", "whom", "how", "when", "where", "why", "all", "each",
    "any", "some", "such", "only", "very", "just", "also", "now", "here", "there",
    "want", "need", "looking", "find", "show", "get", "buy", "purchase", "order",
    "please", "thanks", "thank", "hi", "hello", "hey", "good", "morning", "afternoon",
    "evening", "like", "something", "anything", "thing", "stuff", "item", "product",
    "much", "many", "more", "most", "other", "another", "same", "different",
    "price", "cost", "cheap", "expensive", "affordable", "budget",
    "do", "you", "have", "sell", "available", "stock", "winipat",
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  return words;
}

// Search products in database
async function searchProducts(userMessage: string): Promise<string> {
  const terms = extractSearchTerms(userMessage);
  if (terms.length === 0) return "";

  // Build OR query for ilike matching
  const searchResults: Record<string, unknown>[] = [];

  // Search each term
  for (const term of terms.slice(0, 5)) {
    const { data } = await supabase
      .from("products")
      .select("name, price, categories(name)")
      .eq("status", "active")
      .ilike("name", `%${term}%`)
      .limit(8);

    if (data) {
      for (const product of data) {
        // Deduplicate by name
        if (!searchResults.find((r) => r.name === product.name)) {
          searchResults.push(product);
        }
      }
    }
  }

  // Also search by category name
  for (const term of terms.slice(0, 3)) {
    const { data: catProducts } = await supabase
      .from("products")
      .select("name, price, categories!inner(name)")
      .eq("status", "active")
      .ilike("categories.name", `%${term}%`)
      .limit(6);

    if (catProducts) {
      for (const product of catProducts) {
        if (!searchResults.find((r) => r.name === product.name)) {
          searchResults.push(product);
        }
      }
    }
  }

  if (searchResults.length === 0) {
    // Try to guess the best category based on keywords
    const categoryKeywords: Record<string, string[]> = {
      "fashion-accessories": ["dress", "bag", "handbag", "cloth", "shirt", "trouser", "skirt", "fashion", "wear", "outfit", "gown", "suit", "top", "blouse", "jacket", "cap", "hat", "durag"],
      "shoes": ["shoe", "sneaker", "boot", "heel", "sandal", "slipper", "loafer", "trainer", "footwear"],
      "jewelry": ["necklace", "bracelet", "ring", "earring", "chain", "pendant", "bead", "gold", "silver", "jewelry", "jewellery"],
      "watches-accessories": ["watch", "sunglasses", "glasses", "wristwatch", "timepiece"],
      "health-beauty": ["perfume", "cream", "skincare", "makeup", "hair", "wig", "beauty", "cosmetic", "lotion", "soap", "fragrance", "cologne"],
      "electronics": ["phone", "laptop", "tv", "television", "headphone", "earphone", "speaker", "charger", "cable", "power", "battery", "inverter", "solar", "fan", "gadget", "tech", "smart", "bluetooth", "wireless", "camera"],
      "home-living": ["cooker", "fridge", "blender", "kettle", "iron", "fan", "air conditioner", "ac", "fryer", "oven", "microwave", "kitchen", "home", "appliance", "furniture", "dispenser", "juicer"],
    };

    let bestCategory: string | null = null;
    let bestScore = 0;
    for (const [catSlug, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      for (const term of terms) {
        if (keywords.some((kw) => kw.includes(term) || term.includes(kw))) score++;
      }
      if (score > bestScore) { bestScore = score; bestCategory = catSlug; }
    }

    // Fetch products from the guessed category
    let relatedProducts: Record<string, unknown>[] = [];
    if (bestCategory) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", bestCategory)
        .single();

      if (catData) {
        const { data } = await supabase
          .from("products")
          .select("name, price, categories(name)")
          .eq("status", "active")
          .eq("category_id", catData.id)
          .limit(8);
        relatedProducts = data || [];
      }
    }

    // If still nothing, get popular products across all categories
    if (relatedProducts.length === 0) {
      const { data } = await supabase
        .from("products")
        .select("name, price, categories(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      relatedProducts = data || [];
    }

    const list = relatedProducts
      .map((p) => {
        const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
        return `- ${p.name} — ₦${((p.price as number) / 100).toLocaleString()} (${(cat as { name: string })?.name || "General"})`;
      })
      .join("\n");

    const categoryName = bestCategory?.replace("-", " & ").replace(/^\w/, (c) => c.toUpperCase()) || "our catalogue";

    return `\n\nPRODUCT SEARCH RESULTS for "${terms.join(" ")}": No exact name match, but here are related products from ${categoryName} that the customer might like:\n${list}\n\nINSTRUCTION: The exact item wasn't found by name, but these are from a related category. Recommend these alternatives enthusiastically. Say something like "We don't have [exact item] listed right now, but check out these similar items!" NEVER mention any other website or platform. Suggest browsing the ${categoryName} category for more.`;
  }

  const list = searchResults
    .slice(0, 10)
    .map((p) => {
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      return `- ${p.name} — ₦${((p.price as number) / 100).toLocaleString()} (${(cat as { name: string })?.name || "General"})`;
    })
    .join("\n");

  return `\n\nPRODUCT SEARCH RESULTS for "${terms.join(" ")}" (${searchResults.length} found):\n${list}\n\nUse these results to recommend products to the user. List the relevant ones with names and prices. If there are many results, pick the most relevant 3-5. Always mention the price in Naira.`;
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const lastMessage = messages[messages.length - 1]?.content || "";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Search products based on user's message
  const productContext = await searchProducts(lastMessage);

  // If no API key, use smart fallback with product data
  if (!apiKey) {
    const reply = await getSmartReply(lastMessage.toLowerCase(), productContext);
    return NextResponse.json({ reply });
  }

  // Build system prompt with product search results
  const enhancedSystem = SYSTEM_PROMPT + productContext;

  // Call Claude API
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: enhancedSystem,
      messages: messages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const reply = await getSmartReply(lastMessage.toLowerCase(), productContext);
    return NextResponse.json({ reply });
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text || "I'm here to help! What would you like to know about Winipat?";

  return NextResponse.json({ reply });
}

async function getSmartReply(input: string, productContext: string): Promise<string> {
  // If we have product search results, use them
  if (productContext && productContext.includes("PRODUCT SEARCH RESULTS")) {
    // Extract product list from context
    const lines = productContext.split("\n").filter((l) => l.startsWith("- "));
    if (lines.length > 0) {
      const productList = lines.slice(0, 5).join("\n");
      return `Here's what I found on Winipat:\n\n${productList}\n\nYou can view and purchase any of these from our Browse page. All purchases are escrow-protected!`;
    }
  }

  if (input.includes("escrow") || input.includes("payment") || input.includes("pay") || input.includes("safe")) {
    return "Great question! On Winipat, your payment is held securely in escrow when you place an order. The seller only receives payment after you confirm delivery and a 2-day hold period passes. If anything goes wrong, you can open a dispute and your funds remain protected. No wahala!";
  }
  if (input.includes("sell") || input.includes("seller") || input.includes("vendor")) {
    return "To sell on Winipat, you need to complete our verification process: submit your government ID, verify your bank account, and confirm your phone number. Once approved, you can list products with photos and videos. You'll receive payments through our daily settlement system, minus a 12% commission. Click 'Apply to Sell' to get started!";
  }
  if (input.includes("delivery") || input.includes("logistics") || input.includes("shipping") || input.includes("track")) {
    return "With Winipat, YOU choose your preferred logistics partner at checkout — whether it's GIG, DHL, or others. You can track your delivery status in-app from pickup to your door. Every handoff includes photo proof, so you always know where your package is.";
  }
  if (input.includes("dispute") || input.includes("refund") || input.includes("wrong") || input.includes("problem")) {
    return "If something goes wrong with your order, you can open a dispute within the allowed period. Upload photo or video evidence, and our team will review it fairly. While the dispute is open, your funds remain safely held in escrow.";
  }
  if (input.includes("hello") || input.includes("hi") || input.includes("hey") || input.includes("good")) {
    return "Hello! Welcome to Winipat! I'm here to help you find products, answer questions about our platform, or help you with orders. What are you looking for today?";
  }

  // Default: search for products
  if (productContext) {
    const lines = productContext.split("\n").filter((l) => l.startsWith("- "));
    if (lines.length > 0) {
      return `Here are some products you might like on Winipat:\n\n${lines.slice(0, 5).join("\n")}\n\nBrowse our full catalogue for more options. All purchases are escrow-protected!`;
    }
  }

  return "I can help you find products on Winipat! Try asking me about specific items like 'fans', 'sneakers', 'handbags', 'phones', or any product category. I'll search our catalogue and show you what's available with prices.";
}
