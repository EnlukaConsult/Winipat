// Seller Level system — pure helpers so the dashboard, badges, and the
// hero card all derive the same level from the same inputs.

export type SellerLevelTier = 1 | 2 | 3 | 4 | 5;

export type SellerLevel = {
  tier: SellerLevelTier;
  label: string;     // "New seller", "Verified", etc.
  emoji: string;     // one short symbol shown beside the label
  color: string;     // tailwind color slug (e.g. "slate")
  /** Brief sub-line shown under the level title. */
  blurb: string;
  /** What the seller needs to reach the next tier. Null if at max. */
  nextRequirement: string | null;
  /** 0..1 progress within the current tier toward the next one. */
  progress: number;
  /** Human progress label e.g. "12 / 50 orders". */
  progressLabel: string;
};

export type SellerLevelInputs = {
  /** Has KYC been approved by an admin? */
  isApproved: boolean;
  completedOrders: number;
  averageRating: number; // 0..5
  disputeRate: number;   // 0..1
};

// Tier thresholds (intentionally simple — tweak as the platform grows):
//   1 New        — pre-KYC
//   2 Verified   — KYC approved
//   3 Trusted    — ≥10 completed orders + ≥4.5 rating
//   4 Gold       — ≥50 completed orders + ≥4.7 rating + ≤5% disputes
//   5 Elite      — ≥250 completed orders + ≥4.8 rating + ≤2% disputes
export function getSellerLevel(input: SellerLevelInputs): SellerLevel {
  const { isApproved, completedOrders, averageRating, disputeRate } = input;

  if (!isApproved) {
    return {
      tier: 1,
      label: "New seller",
      emoji: "🌱",
      color: "slate",
      blurb: "Welcome to Winipat — complete KYC to start selling.",
      nextRequirement: "Complete KYC to unlock Verified status",
      progress: 0,
      progressLabel: "KYC pending",
    };
  }

  // Verified onward — progress maths
  const meetsTrusted = completedOrders >= 10 && averageRating >= 4.5;
  const meetsGold    = completedOrders >= 50 && averageRating >= 4.7 && disputeRate <= 0.05;
  const meetsElite   = completedOrders >= 250 && averageRating >= 4.8 && disputeRate <= 0.02;

  if (meetsElite) {
    return {
      tier: 5,
      label: "Elite seller",
      emoji: "👑",
      color: "violet",
      blurb: "Top tier. You're in Winipat's premier seller circle.",
      nextRequirement: null,
      progress: 1,
      progressLabel: `${completedOrders.toLocaleString()} orders · ${averageRating.toFixed(1)}★`,
    };
  }

  if (meetsGold) {
    return {
      tier: 4,
      label: "Gold seller",
      emoji: "🥇",
      color: "gold",
      blurb: "High-volume, low-dispute. One step from Elite.",
      nextRequirement: `Reach 250 orders, 4.8★ rating, ≤2% disputes`,
      progress: Math.min(1, completedOrders / 250),
      progressLabel: `${completedOrders} / 250 orders to Elite`,
    };
  }

  if (meetsTrusted) {
    return {
      tier: 3,
      label: "Trusted seller",
      emoji: "⭐",
      color: "teal",
      blurb: "Buyers trust you. Push for Gold next.",
      nextRequirement: `Reach 50 orders, 4.7★ rating, ≤5% disputes`,
      progress: Math.min(1, completedOrders / 50),
      progressLabel: `${completedOrders} / 50 orders to Gold`,
    };
  }

  // Verified tier — progress toward Trusted
  return {
    tier: 2,
    label: "Verified seller",
    emoji: "✓",
    color: "royal",
    blurb: "KYC complete. Build orders + ratings to climb the tiers.",
    nextRequirement: `Reach 10 orders + 4.5★ rating`,
    progress: Math.min(1, completedOrders / 10),
    progressLabel: `${completedOrders} / 10 orders to Trusted`,
  };
}

export const ALL_TIERS: { tier: SellerLevelTier; label: string; emoji: string; color: string; criteria: string }[] = [
  { tier: 1, label: "New",      emoji: "🌱", color: "slate",  criteria: "Signed up" },
  { tier: 2, label: "Verified", emoji: "✓",  color: "royal",  criteria: "KYC approved" },
  { tier: 3, label: "Trusted",  emoji: "⭐", color: "teal",   criteria: "10 orders + 4.5★" },
  { tier: 4, label: "Gold",     emoji: "🥇", color: "gold",   criteria: "50 orders + 4.7★ + ≤5% dispute" },
  { tier: 5, label: "Elite",    emoji: "👑", color: "violet", criteria: "250 orders + 4.8★ + ≤2% dispute" },
];
