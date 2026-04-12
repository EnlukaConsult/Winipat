-- =============================================================================
-- Winipat — Demo Product Seed
-- Run AFTER schema.sql has been applied.
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
--
-- Demo seller: Peace Fashions (UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- NOTE: Because profiles.id is a FK to auth.users(id), this insert will only
--       succeed if you first create the auth user manually in the Supabase
--       Auth dashboard (or via service-role API) using the same UUID.
--       Alternatively, run this file via the Supabase SQL Editor with the
--       service role, and ensure RLS bypass is active (it is in the editor).
-- =============================================================================

-- =============================================================================
-- STEP 1 — Extra categories needed for these products
-- These sit alongside the top-level categories already seeded in schema.sql.
-- =============================================================================

INSERT INTO categories (name, slug, icon) VALUES
  ('Fashion & Accessories', 'fashion-accessories', '👜'),
  ('Shoes',                 'shoes',               '👠'),
  ('Jewelry',               'jewelry',             '💍'),
  ('Watches & Accessories', 'watches-accessories', '⌚')
ON CONFLICT (slug) DO NOTHING;

-- Also ensure Health & Beauty exists (already in schema seed, but defensive):
INSERT INTO categories (name, slug, icon) VALUES
  ('Health & Beauty', 'health-beauty', '💊')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- STEP 2 — Demo seller profile
-- Fixed UUID so the seed is idempotent and products always point to same seller.
-- IMPORTANT: Create the matching auth.users row first (same UUID) before running
-- this file, otherwise the FK constraint on profiles(id) will reject the insert.
-- =============================================================================

INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'peace@winipat.demo',
  'Peace Fashions',
  'seller'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 3 — Seller record
-- =============================================================================

INSERT INTO sellers (id, business_name, description, pickup_address, status, approved_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Peace Fashions Lagos',
  'Premium fashion items, handbags, and accessories. Verified seller on Winipat.',
  '25 Balogun Street, Lagos Island, Lagos',
  'approved',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 4 — Trust score for the demo seller
-- =============================================================================

INSERT INTO trust_scores (
  seller_id,
  average_rating,
  total_reviews,
  dispute_rate,
  on_time_rate,
  badge,
  updated_at
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  4.80,
  127,
  0.0079,  -- less than 1% dispute rate
  0.9685,  -- 96.85% on-time delivery
  'trusted_seller',
  now()
)
ON CONFLICT (seller_id) DO NOTHING;

-- =============================================================================
-- STEP 5 — Products
-- All prices stored in kobo (₦ × 100). All status = 'active'.
-- seller_id = Peace Fashions demo seller.
-- category_id resolved via subquery on slug for safety.
-- =============================================================================

INSERT INTO products (
  seller_id,
  category_id,
  name,
  slug,
  description,
  price,
  stock_quantity,
  status
)
VALUES

-- ── Fashion & Accessories ────────────────────────────────────────────────────

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'fashion-accessories'),
  'Designer Leather Handbag',
  'designer-leather-handbag',
  'Crafted from genuine full-grain leather, this statement handbag features brass-toned hardware and a spacious interior with multiple pockets. Perfect for the Lagos woman who demands both style and substance. Available in classic black and rich tan.',
  4500000,  -- ₦45,000
  15,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'fashion-accessories'),
  'Ankara Maxi Dress',
  'ankara-maxi-dress',
  'A floor-length stunner made from 100% authentic Ankara fabric sourced from Aba market. The vibrant print and flattering A-line silhouette make it ideal for owambe ceremonies, family events, and corporate Fridays. One size fits 10–18.',
  1850000,  -- ₦18,500
  30,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'fashion-accessories'),
  'Ankara Tailored Suit',
  'ankara-tailored-suit',
  'Two-piece Ankara suit expertly tailored for a sharp, contemporary African look. The blazer and matching trousers are cut from premium Dutch-wax fabric and fully lined for comfort. Available in sizes S–XL; custom sizing available on request.',
  3500000,  -- ₦35,000
  12,
  'active'
),

-- ── Shoes ────────────────────────────────────────────────────────────────────

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'shoes'),
  'Stiletto Heels (Red)',
  'stiletto-heels-red',
  'Turn heads with these bold red patent-leather stilettos featuring a pointed toe and 12 cm heel. Anti-slip sole and cushioned insole ensure you stay comfortable from cocktails to closing time. Available in EU sizes 36–42.',
  2200000,  -- ₦22,000
  20,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'shoes'),
  'Men''s Sneakers (White)',
  'mens-sneakers-white',
  'Clean, versatile low-top sneakers with a breathable mesh upper and premium rubber outsole. The minimalist white-on-white design pairs effortlessly with joggers, chinos, or shorts. Available in EU sizes 40–46.',
  1500000,  -- ₦15,000
  40,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'shoes'),
  'Leather Sandals (Brown)',
  'leather-sandals-brown',
  'Handcrafted brown leather sandals with an adjustable ankle strap and a cushioned footbed for all-day comfort. Ideal for casual outings or beach trips. Available in EU sizes 37–45.',
  1400000,  -- ₦14,000
  25,
  'active'
),

-- ── Jewelry ──────────────────────────────────────────────────────────────────

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'jewelry'),
  'Gold Chain Necklace',
  'gold-chain-necklace',
  'An 18-karat gold-plated Cuban-link chain measuring 60 cm, finished with a lobster-claw clasp for security. Nickel-free and hypoallergenic, making it suitable for sensitive skin. Makes a powerful style statement for any occasion.',
  3500000,  -- ₦35,000
  18,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'jewelry'),
  'Silver Bead Bracelet',
  'silver-bead-bracelet',
  'Elegant sterling-silver bracelet strung with hand-polished beads and a secure toggle clasp. Lightweight and stackable, it pairs beautifully with other bangles or wears perfectly on its own. Comes gift-boxed for easy presentation.',
  850000,   -- ₦8,500
  50,
  'active'
),

-- ── Watches & Accessories ────────────────────────────────────────────────────

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'watches-accessories'),
  'Men''s Luxury Watch',
  'mens-luxury-watch',
  'A commanding timepiece with a scratch-resistant sapphire crystal face, stainless-steel case, and genuine leather strap. Japanese quartz movement guarantees precision to within ±15 seconds per month. Water-resistant up to 50 metres.',
  5500000,  -- ₦55,000
  8,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'watches-accessories'),
  'Designer Sunglasses',
  'designer-sunglasses',
  'Oversized UV400-protected sunglasses with polarised lenses and a lightweight acetate frame. Blocks 99% of UVA/UVB rays while keeping you runway-ready under the Lagos sun. Includes a hard carry case and cleaning cloth.',
  1200000,  -- ₦12,000
  35,
  'active'
),

-- ── Health & Beauty ──────────────────────────────────────────────────────────

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Premium Skincare Set',
  'premium-skincare-set',
  'A complete 5-step Nigerian-weather-tested routine: cleanser, toner, vitamin C serum, moisturiser, and SPF 50 sunscreen. Formulated without hydroquinone or parabens, and dermatologist-tested for melanin-rich skin tones. Visible results in 4 weeks.',
  2800000,  -- ₦28,000
  22,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Professional Makeup Kit',
  'professional-makeup-kit',
  'An all-in-one pro kit containing 24 eyeshadow pans, 4 blushes, 2 contour powders, 3 lip colours, and a full set of vegan brushes. Pigments are richly saturated and long-wearing, tested for up to 16 hours. Suitable for beginners and working makeup artists.',
  4200000,  -- ₦42,000
  10,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Brazilian Hair Extensions (22")',
  'brazilian-hair-extensions-22in',
  'Grade 10A raw Brazilian hair bundle measuring 22 inches; 100 g per pack with natural wave texture that blends seamlessly with a wide range of hair types. Can be dyed, bleached, and heat-styled without damage. Minimum shedding and tangle-free.',
  6500000,  -- ₦65,000
  5,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Oud Perfume Collection',
  'oud-perfume-collection',
  'A gift set of three 50 ml Oud-based Eau de Parfum oils blended with sandalwood, amber, and rose absolute. Each fragrance offers an 8–12 hour sillage that is bold without being overpowering. Presented in an ornate wooden box — ideal as a corporate or celebration gift.',
  3200000,  -- ₦32,000
  14,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Professional Barbing Kit',
  'professional-barbing-kit',
  'A full professional-grade set including a cordless clipper (5-speed motor, 4-hour battery), T-blade trimmer, foil shaver, and 8 comb attachments. The stainless-steel blades stay sharp across 500+ hours of use. Trusted by barbers from Surulere to Abuja.',
  4800000,  -- ₦48,000
  7,
  'active'
),

(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM categories WHERE slug = 'health-beauty'),
  'Lace Wig (Body Wave)',
  'lace-wig-body-wave',
  'Pre-plucked 13×4 HD lace frontal wig in a luscious body-wave pattern, made from 100% human hair. Comes with adjustable straps and combs for a secure fit; bleached knots for a natural hairline finish. Available in 18", 20", and 22" lengths.',
  3800000,  -- ₦38,000
  9,
  'active'
)

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- END OF SEED
-- =============================================================================
