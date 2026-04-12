const SUPABASE_URL = "https://duxttjlfxzummkdgwpzi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1eHR0amxmeHp1bW1rZGd3cHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjAxMDg1MywiZXhwIjoyMDkxNTg2ODUzfQ.tz-z5Q0zAZSQOEX5TAwpzDJ0wMB2iWTaAupxx5KmTJo";
const SELLER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const IMG = (id) => `https://kg-s3-assets.s3.amazonaws.com/subfolder/${id}.jpeg`;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  return res.json();
}

function parsePrice(priceStr) {
  return parseInt(priceStr.replace(/[₦,]/g, "")) * 100; // kobo
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

const products = {
  fashion: [
    { name: "Rhinestone Studded Cut Out Bodycon Dress", price: "₦25,000", img: "bce75545-a485-4cf8-8177-62a6d962a808" },
    { name: "Tube Dress – Purple", price: "₦30,000", img: "c773e237-c7d9-4186-927a-71bdf5573938" },
    { name: "Women's Sleeveless Dress – Pink", price: "₦12,500", img: "e74e7364-9c78-4e33-871d-ba3daf39010b" },
    { name: "Crop Wrap Top – Beige", price: "₦12,000", img: "89c61e68-70ee-4e9a-9712-19748ba78c57" },
    { name: "V-Hem Top And Trouser Set – Beige/Navy/Black", price: "₦20,000", img: "8cd7496d-6d04-4287-9f64-f4ca1da7f76a" },
    { name: "DRAVY Fashion Tote Bag Design 5", price: "₦15,500", img: "8bd665a1-cced-422f-9f46-cfec76640c26" },
    { name: "Large Capacity Fashion Handbag For Women", price: "₦17,000", img: "94ca5e93-835a-44da-8930-c9418c73c34e" },
    { name: "Classic Women Bag", price: "₦39,000", img: "c765c24a-2cb5-40c9-8e87-70c096a4e622" },
    { name: "Brown Women Top Bag", price: "₦35,000", img: "6297c499-cd0c-4d1a-973c-44332b07c910" },
    { name: "High Quality Genuine Leather Handbag", price: "₦27,000", img: "4ca69084-749c-499a-a40a-cb6293fe4208" },
    { name: "Quality 2-in-1 Leather Handbag", price: "₦32,000", img: "2200fd71-e484-482f-9b51-2612951a10a3" },
    { name: "Kiddies White High Waisted Pleated Mini Skirt", price: "₦20,000", img: "1e9b81c0-0d78-4537-96e9-a7a4def4e79d" },
    { name: "Kiddies Forever Shirt & White Baggy Pants Combo", price: "₦35,000", img: "dfa759f0-6997-44e4-99a2-c784b3904ab3" },
    { name: "3-in-1 Cotton Singlet Men Underwear Multicolour", price: "₦10,000", img: "c6fb133d-ba4c-464c-974f-16b796ca3f70" },
    { name: "Premium Classic Dotted New Style Durag", price: "₦4,000", img: "a083e71c-921a-4216-8e6a-00f09144a55c" },
    { name: "Glow In The Dark LED Caps", price: "₦3,500", img: "19875b7c-86bc-4f44-bae9-c61298117357" },
  ],
  shoes: [
    { name: "Off-White Be Right Back Sneakers – Black", price: "₦75,000", img: "13047e1c-1bc5-4fbe-88c9-8d3495a1bd9a" },
    { name: "New Balance 530 White Sneakers", price: "₦65,000", img: "9c7ddd74-5916-4604-98c3-f1242b23e9f1" },
    { name: "Asics FW24 Gel Pickax Black Sneakers", price: "₦65,000", img: "fac0ee29-7eab-44a8-b065-c6d56aa55907" },
    { name: "Nike Air Max TN Plus III Triple Black Sneakers", price: "₦65,000", img: "0c74efbf-30d0-4391-a6fd-1cf433fb823d" },
    { name: "Asics FW24 Gel Pickax Green Sneakers", price: "₦65,000", img: "4d370c53-373f-465e-963b-cb4c87e989d7" },
    { name: "Nike Sb Dunk Low Sneakers", price: "₦45,000", img: "cee0612f-b802-4dd0-aa2f-6b91358af153" },
    { name: "Asics Gel-1130 Sport Sneakers", price: "₦65,000", img: "58add403-5925-49b2-98b5-e59e09908961" },
    { name: "Nike Air Force 1 '07 LV8 Men's Shoes", price: "₦31,500", img: "39578552-d4f8-41d8-95dc-11051cc86fc4" },
    { name: "Christian Dior Walk'n'Dior Blue Sneakers", price: "₦38,500", img: "87494f5f-7582-4078-bda2-c0da09e4257c" },
    { name: "Original Female Adidas Samba Sneakers", price: "₦38,500", img: "565f76c2-e969-459d-9217-502b6e000fc2" },
    { name: "Adidas Heat Rdy Breathable Grey Running Sneakers", price: "₦9,000", img: "64415b13-5b03-4402-b7b7-1a397c6b4087" },
    { name: "Converse Chuck Taylor All Star Sneakers", price: "₦16,500", img: "27519c62-f3a2-4158-ad4b-431e8ac6ac11" },
    { name: "Hermes Brown Loafers Shoe", price: "₦46,999", img: "07932130-1731-47f6-8218-fa57231f2c42" },
    { name: "Binbense Men's Leather Half Shoe", price: "₦20,000", img: "70e24518-473d-4550-aa8c-d3ad7c4d3f5d" },
    { name: "Female Chunky Leather Boots", price: "₦24,500", img: "5cbbb3e7-6d10-431f-8c69-47fe2c16ac20" },
    { name: "Kiddies Ankle Black Boot", price: "₦22,000", img: "3e20ac57-20e9-41ed-9172-f7d7884a4bb9" },
    { name: "Asics Gel-NYC Kiddies Sneakers", price: "₦55,000", img: "e585f3a6-eb48-42b0-b708-fcb5bdd38b80" },
    { name: "Nike Air Jordan 1 Mid SE Kiddies Sneakers", price: "₦55,000", img: "9f0c81bb-63ee-4a08-be8b-db592296d233" },
    { name: "Nike Air Jordan Kiddies Jumpman MVP Lucky Green", price: "₦55,000", img: "1bd5f31a-da98-4592-a766-5f669602efaa" },
    { name: "Burberry Kids Vintage Checkered Leather Sandals", price: "₦40,000", img: "6c974ee0-4738-466b-bbdf-ec9b5bb89103" },
    { name: "Sport Fashion Black Breathable Sneakers", price: "₦4,999", img: "9b021062-a59f-434b-a557-d5b79c1f8651" },
    { name: "Nike Air Brown Breathable Sneakers", price: "₦9,000", img: "772bbc6e-bfbe-4917-8a2b-0be7ad6be795" },
    { name: "Eagsouni Breathable Mesh Gymnastics Running Sneakers", price: "₦4,500", img: "d9cb52c4-fcc8-4afb-94ec-f2984f627a74" },
    { name: "Senn Grey Breathable Chunky Sneakers", price: "₦8,500", img: "66042dc5-02d9-4065-8d4b-1d937430297d" },
  ],
  jewelry: [
    { name: "Cross Pendant Necklace", price: "₦6,500", img: "f0402cf4-dbc9-46bd-8a5e-3e424fe0ebcc" },
    { name: "Vintage Charm Butterfly Necklace", price: "₦8,500", img: "96ac8666-52d1-4b2b-b65a-19776f52f74a" },
    { name: "Valentino Jewelry Sets", price: "₦9,500", img: "25e6e3d7-cced-4d56-939d-a33f7cf2ed1d" },
    { name: "CD Jewelry Sets", price: "₦9,500", img: "f3eba478-fb8c-4559-be56-3f820343ecfd" },
    { name: "Men Non Tarnish Gold Wristwatch & Steel Necklace", price: "₦7,200", img: "2af882c1-06a0-4ae4-975e-6d10897649e1" },
  ],
  watches: [
    { name: "Smart 2030 C002 Kiddies Smart Watch", price: "₦20,000", img: "626a4cab-6e95-4bd5-8165-1d7b01a3a469" },
    { name: "Men Non Tarnish Gold Wristwatch & Steel Necklace", price: "₦7,200", img: "2af882c1-06a0-4ae4-975e-6d10897649e1" },
  ],
  beauty: [
    { name: "Dignife Women Perfume Set", price: "₦20,500", img: "2de09e8f-fb96-477a-8cee-89ccd4f2b6f7" },
    { name: "Fascial Gun Muscle Massager KH 320", price: "₦32,000", img: "46929636-fe48-4305-a9f7-019e17032667" },
    { name: "Mayre Perfume Collection Combo – True Love", price: "₦110,000", img: "00edd6af-3576-4e74-85be-72d8927d24c2" },
    { name: "Mayre Perfume Collection Combo – Sugarplum", price: "₦48,000", img: "1e993d63-dedc-4df0-ac3e-1f81b8d0867b" },
    { name: "Kedi Revive", price: "₦55,600", img: "973dd91a-50c2-4110-8990-21a513bf122c" },
    { name: "Jinja Herbal", price: "₦25,000", img: "ea2c8a60-244b-4f5c-afd2-d04795a2d6ca" },
    { name: "Cute Flowery Ladies Combo", price: "₦32,000", img: "d02dfb2d-e6cc-4f8d-9cc6-87fc9a989ba3" },
  ],
  electronics: [
    { name: "ATFLY 17 Pro Max 128GB Smartphone", price: "₦105,000", img: "27af86f4-1814-4704-ad4f-ef51592712ca" },
    { name: "Samsung Galaxy A06 6.7\" 4GB/64GB", price: "₦115,000", img: "6c8b194b-f038-4255-86d6-6b37df57d9db" },
    { name: "Tecno SPARK 40 Pro 128GB 8GB RAM", price: "₦280,000", img: "95582461-a79b-4570-a741-f64cc6f3938e" },
    { name: "XIAOMI REDMI A5 3GB/64GB", price: "₦150,000", img: "6ed2892f-cb95-4dd0-9f4d-f70b04e98e3b" },
    { name: "itel City 100 128GB 4GB RAM", price: "₦112,500", img: "a46a1e0b-a8a9-4970-ac02-cd1613d86fee" },
    { name: "Tecno Pop 10 64GB 3GB RAM", price: "₦114,000", img: "3b03e51f-b5db-4b90-b092-fd582fd53d27" },
    { name: "Hisense 55\" 4K UHD Smart TV", price: "₦575,000", img: "44f78ea7-3cfe-4598-83f9-e4610291a352" },
    { name: "Hisense 43\" Full HD Smart TV", price: "₦365,000", img: "4e6ccf90-5104-43ab-96c1-15866e16b9e7" },
    { name: "LG 50\" Smart UHD 4K TV + Magic Remote", price: "₦570,000", img: "53bd9a4c-d996-4687-acad-123b5e13b231" },
    { name: "LG 55\" Smart UHD 4K TV + Magic Remote", price: "₦690,000", img: "308decb2-8835-49e0-9084-0bad88cd2769" },
    { name: "Anker Soundcore Space One Pro ANC Headphones", price: "₦265,000", img: "604fb1c5-8112-414f-a9b8-b9c7b10c2035" },
    { name: "Anker Soundcore Space Q45 Bluetooth Headphones", price: "₦165,000", img: "238160bc-431a-4eb2-8840-19f9d016df22" },
    { name: "JBL Quantum 100 Headphone", price: "₦55,000", img: "962760ee-cfd2-4813-b878-ee7cf027674f" },
    { name: "Oraimo FreePods 4 ANC True Wireless Earbuds", price: "₦40,000", img: "56bda499-6a7b-4b5f-8b59-ea3b6040c3d5" },
    { name: "Kaiglo Vogue 9 Wireless Bluetooth Headphone & Speaker", price: "₦45,700", img: "5857c698-a2c3-4cdb-bb4f-25bf333bcb16" },
    { name: "Sodo Doqaus Vogue 5 Flip Speaker Bluetooth Headphone", price: "₦32,500", img: "6e29bc1d-77bd-4b5b-997a-478235859a21" },
    { name: "Oraimo 30000mAh Fast Charging Power Bank", price: "₦44,000", img: "21e8208c-c880-4069-b22e-925b1bc88769" },
    { name: "itel PowerPulse 20000mAh Fast Charging Power Bank", price: "₦17,200", img: "edec4e7a-95d3-47e5-851e-2e638d8c58a5" },
    { name: "Dynambyte 5kW Lithium Battery Inverter", price: "₦2,150,000", img: "e3e408a5-31b7-4bb8-b87a-791065f8a069" },
    { name: "HITHIUM HeroEE1 200W Portable Power Inverter", price: "₦350,000", img: "6c1eed38-5bb1-4dff-9987-f67c43b870a8" },
    { name: "Itel Solar Light System", price: "₦46,000", img: "fd6b4972-68c0-4d33-812f-d930c37e3db9" },
    { name: "JD JINDIAN 16-Inch Solar Rechargeable Standing Fan", price: "₦55,000", img: "233e71ae-6492-4956-8f3b-922fcedd49bf" },
    { name: "7-in-1 USB Hub Adapter", price: "₦18,000", img: "b6d7230f-ccdc-44d4-a7dc-9c21b491fcdf" },
    { name: "3.1 Adjustable Laptop Stand", price: "₦35,000", img: "d13248ab-b87b-4ef0-a3ad-eeb50f76dbad" },
    { name: "POOLEE 20W PD Fast Type-C to Lightning Cable", price: "₦6,000", img: "e921b1b1-85b5-4e4f-95a6-4c19e9c67ab3" },
    { name: "Kamisafe Rechargeable Light", price: "₦6,000", img: "9a4ef912-058d-44de-a68b-41b00d9f61bc" },
    { name: "Itel Budsfit 5", price: "₦34,000", img: "07508fa2-5808-4112-b58c-e879b2500b7f" },
  ],
  home: [
    { name: "HYLY Gas Cooker HYG5097", price: "₦156,000", img: "64de106f-ae43-4400-b548-010695032bac" },
    { name: "HYLY 1hp Eco Friendly Air Conditioner", price: "₦295,000", img: "1ec73a5e-f3e6-4253-97cd-d25123eedbf4" },
    { name: "HYLY 1.5hp Eco Friendly Air Conditioner", price: "₦338,000", img: "035da3e2-baad-4106-8106-a5f6332c914a" },
    { name: "Hyly 2hp Standing Air Conditioner", price: "₦880,000", img: "cd9bec0f-9b86-4112-a485-66bf4879eead" },
    { name: "Oraimo SmartTableFan 5W Table Fan", price: "₦41,600", img: "048b4934-22f2-4aec-a03b-74f8f176dbd1" },
    { name: "Iwin 8\" Rechargeable Desktop Fan", price: "₦40,000", img: "3b1400f0-ae99-4c99-b870-2a1caecd0842" },
    { name: "Kamisafe Rechargeable LED Fan 4500mAh", price: "₦19,999", img: "035a061c-3be9-4ab0-a530-62e911ff140b" },
    { name: "KENWOOD 6.5L Air Fryer", price: "₦56,000", img: "ccd2c697-6f4d-43db-9cc0-199dd628d351" },
    { name: "SilverCrest Digital Air Fryer 6L 2400W", price: "₦63,000", img: "0fca28fa-2ce5-46de-b962-fbf099e3464a" },
    { name: "Kenwood Yam Pounder & Food Processor 3000W 8L", price: "₦66,900", img: "30a1302f-6ff6-4657-8eb2-b11ceb257cf5" },
    { name: "Kenwood Commercial Grinder Blender", price: "₦33,000", img: "516e6112-a52b-4965-97a5-270705d55fd8" },
    { name: "Nima 2-in-1 Electric Grinder & Smoothie Maker", price: "₦21,500", img: "7b917fa4-bee1-4604-b76a-e58ccc1783bf" },
    { name: "Syinix 2.2L Electric Kettle", price: "₦13,000", img: "a985a016-e2b1-4aef-a703-6902e535ec66" },
    { name: "Kinelco 2 Slice Sandwich Maker", price: "₦30,000", img: "e9372b96-8f9b-480a-b4dc-4f1b9672159f" },
    { name: "Silver Crest 1500W Juicer And Extractor", price: "₦47,999", img: "de3da8f2-127f-4852-84a5-1b310181559b" },
    { name: "Rechargeable Portable Mini Juicer", price: "₦17,000", img: "36f14c5e-38bb-4603-8bc8-e02fc4792334" },
    { name: "22-in-1 Multifunctional Vegetable Chopper/Slicer", price: "₦23,000", img: "754d106e-2eeb-4e7c-a203-aed3491062c9" },
    { name: "Automatic Water Dispenser", price: "₦7,500", img: "497479a3-c233-496a-8dff-6fff0d59e26d" },
    { name: "VACUUM FLASK Temperature Water Bottle", price: "₦13,000", img: "2e125cff-1679-4315-b8a0-6b30e8f413c8" },
    { name: "TV & Video Remote Stand Organizer", price: "₦9,300", img: "a0c8cc65-f926-4bad-a18d-eef363513d00" },
  ],
};

const categorySlugMap = {
  fashion: "fashion-accessories",
  shoes: "shoes",
  jewelry: "jewelry",
  watches: "watches-accessories",
  beauty: "health-beauty",
  electronics: "electronics",
  home: "home-living",
};

async function main() {
  // Get category IDs
  const categories = await sbFetch("categories?select=id,slug");
  const catIdMap = {};
  categories.forEach((c) => (catIdMap[c.slug] = c.id));
  console.log("Categories loaded:", Object.keys(catIdMap).length);

  let totalInserted = 0;

  for (const [catKey, items] of Object.entries(products)) {
    const catSlug = categorySlugMap[catKey];
    const catId = catIdMap[catSlug];

    if (!catId) {
      console.log(`WARNING: No category found for ${catKey} (${catSlug})`);
      continue;
    }

    // Build product rows
    const rows = items.map((item, i) => ({
      seller_id: SELLER_ID,
      category_id: catId,
      name: item.name,
      slug: slugify(item.name) + "-" + (i + 1),
      description: `${item.name}. Available on Winipat from verified sellers. Escrow-protected purchase.`,
      price: parsePrice(item.price),
      stock_quantity: Math.floor(Math.random() * 40) + 5,
      status: "active",
    }));

    // Insert products in batch
    const inserted = await sbFetch("products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(rows),
    });

    if (Array.isArray(inserted)) {
      // Insert product_media for images
      const mediaRows = inserted.map((product, i) => ({
        product_id: product.id,
        file_url: IMG(items[i].img),
        media_type: "image",
        display_order: 0,
      }));

      await sbFetch("product_media", {
        method: "POST",
        body: JSON.stringify(mediaRows),
      });

      totalInserted += inserted.length;
      console.log(`${catKey}: ${inserted.length} products inserted`);
    } else {
      console.log(`${catKey} ERROR:`, JSON.stringify(inserted).slice(0, 200));
    }
  }

  console.log(`\nTotal: ${totalInserted} products inserted`);
}

main().catch(console.error);
