// Maps product slugs to local image paths
// These images are stored in public/images/products/
const productImageMap: Record<string, string> = {
  "designer-leather-handbag": "/images/products/handbags-collection.jpg",
  "ankara-maxi-dress": "/images/products/ankara-dress.png",
  "ankara-tailored-suit": "/images/products/ankara-dress.png",
  "professional-makeup-kit": "/images/products/makeup-kit.png",
  "designer-sunglasses": "/images/products/designer-bags.png",
  "gold-chain-necklace": "/images/products/handbags-collection.jpg",
  "silver-bead-bracelet": "/images/products/designer-bags.png",
  "mens-luxury-watch": "/images/products/handbags-collection.jpg",
};

// Category slug to image mapping
const categoryImageMap: Record<string, string> = {
  "fashion-accessories": "/images/products/handbags-collection.jpg",
  "shoes": "/images/products/designer-bags.png",
  "jewelry": "/images/products/handbags-collection.jpg",
  "watches-accessories": "/images/products/handbags-collection.jpg",
  "health-beauty": "/images/products/makeup-kit.png",
  "home-living": "/images/products/luxury-interior.jpg",
  "electronics": "/images/products/blender-set.png",
  "fashion": "/images/products/ankara-dress.png",
};

export function getProductImage(slug: string, categorySlug?: string): string {
  if (productImageMap[slug]) return productImageMap[slug];
  if (categorySlug && categoryImageMap[categorySlug]) return categoryImageMap[categorySlug];
  return "/images/products/handbags-collection.jpg"; // fallback
}

export function getCategoryImage(slug: string): string {
  return categoryImageMap[slug] || "/images/products/handbags-collection.jpg";
}
