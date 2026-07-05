import leatherBag from "@/assets/leather-bag.jpg";
import coffee from "@/assets/coffee.jpg";
import gabi from "@/assets/gabi.jpg";
import jewelry from "@/assets/jewelry.jpg";
import courier from "@/assets/courier.jpg";

export { leatherBag, coffee, gabi, jewelry, courier };

export type Lang = "en" | "am";
export type Category = "coffee" | "textiles" | "jewelry" | "leather";

export const CATEGORIES: { key: Category; en: string; am: string; img: string }[] = [
  { key: "coffee", en: "Coffee", am: "ቡና", img: coffee },
  { key: "textiles", en: "Textiles", am: "ጨርቅ", img: gabi },
  { key: "jewelry", en: "Jewelry", am: "ጌጣጌጥ", img: jewelry },
  { key: "leather", en: "Leather", am: "ቆዳ", img: leatherBag },
];

export type Product = {
  id: string;
  slug: string;
  name: string;
  nameAm: string;
  description: string;
  descriptionAm: string;
  price: number;
  category: Category;
  sellerId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  img: string;
  tags: string[];
  commissionPct: number;
};

export type Seller = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  taglineAm: string;
  region: string;
  verified: boolean;
  rating: number;
  since: number;
  phone: string;
  avatar: string;
  commissionPct: number;
  dotClass: string;
};

export const SELLERS: Seller[] = [
  { id: "s-yirga", slug: "yirgacheffe-farms", name: "Yirgacheffe Farms", tagline: "Single-origin coffee from Gedeo Zone", taglineAm: "ከጌዲዮ ዞን የተመረጠ ቡና", region: "SNNPR", verified: true, rating: 4.9, since: 2019, phone: "+251 91 000 1111", avatar: coffee, commissionPct: 8, dotClass: "bg-heritage-green" },
  { id: "s-sheba", slug: "sheba-textiles", name: "Sheba Textiles", tagline: "Handwoven tibeb and gabi from Shiro Meda", taglineAm: "በእጅ የተሠሩ ጋቢና ጥበብ", region: "Addis Ababa", verified: true, rating: 4.8, since: 2017, phone: "+251 91 222 3333", avatar: gabi, commissionPct: 10, dotClass: "bg-heritage-gold" },
  { id: "s-aksum", slug: "aksum-silver", name: "Aksum Silver", tagline: "Meskel crosses and heritage jewelry", taglineAm: "የመስቀል ጌጣጌጥ", region: "Tigray", verified: true, rating: 4.7, since: 2015, phone: "+251 91 444 5555", avatar: jewelry, commissionPct: 12, dotClass: "bg-heritage-red" },
  { id: "s-modjo", slug: "modjo-leather", name: "Modjo Leather Co.", tagline: "Full-grain leather goods, made in Modjo", taglineAm: "ከሞጆ የተሠሩ የቆዳ ውጤቶች", region: "Oromia", verified: false, rating: 4.5, since: 2021, phone: "+251 91 666 7777", avatar: leatherBag, commissionPct: 15, dotClass: "bg-heritage-gold" },
];

export const PRODUCTS: Product[] = [
  { id: "p-1", slug: "yirgacheffe-grade-a", name: "Single Origin Roast", nameAm: "የይርጋጨፌ ቡና", description: "Grade-A washed Yirgacheffe. Bright citrus, jasmine and a silky bergamot finish. Roasted weekly in Addis.", descriptionAm: "ደረጃ ‘ሀ’ የታጠበ የይርጋጨፌ ቡና።", price: 850, category: "coffee", sellerId: "s-yirga", rating: 4.9, reviewCount: 1284, stock: 42, img: coffee, tags: ["bestseller","coffee","yirgacheffe"], commissionPct: 8 },
  { id: "p-2", slug: "traditional-gabi", name: "Traditional Gabi Scarf", nameAm: "ባህላዊ ጋቢ", description: "Handwoven four-layer cotton gabi with a vibrant tibeb border. Made by weavers in Shiro Meda.", descriptionAm: "በሺሮ ሜዳ ሸማኞች የተሠራ የጥበብ ጋቢ።", price: 2400, category: "textiles", sellerId: "s-sheba", rating: 5.0, reviewCount: 342, stock: 12, img: gabi, tags: ["handmade","textiles","gabi","tibeb"], commissionPct: 10 },
  { id: "p-3", slug: "meskel-cross-pendant", name: "Meskel Cross Pendant", nameAm: "የመስቀል ሐብል", description: "Sterling silver Meskel cross with fine filigree. Includes a 45cm woven chain.", descriptionAm: "ከንፁህ ብር የተሠራ የመስቀል ሐብል።", price: 3200, category: "jewelry", sellerId: "s-aksum", rating: 4.8, reviewCount: 176, stock: 8, img: jewelry, tags: ["jewelry","silver","meskel"], commissionPct: 12 },
  { id: "p-4", slug: "modjo-satchel", name: "Handmade Leather Satchel", nameAm: "የቆዳ ሻንጣ", description: "Full-grain vegetable-tanned satchel with brass hardware. Ages beautifully.", descriptionAm: "ከሙሉ ደረጃ ቆዳ የተሠራ ሻንጣ።", price: 5600, category: "leather", sellerId: "s-modjo", rating: 4.5, reviewCount: 89, stock: 5, img: leatherBag, tags: ["leather","bag","handmade"], commissionPct: 15 },
  { id: "p-5", slug: "sidamo-natural", name: "Sidamo Natural Roast", nameAm: "የሲዳሞ ቡና", description: "Naturally-processed Sidamo. Blueberry, dark chocolate, syrupy body.", descriptionAm: "በተፈጥሮ የተዘጋጀ የሲዳሞ ቡና።", price: 720, category: "coffee", sellerId: "s-yirga", rating: 4.7, reviewCount: 512, stock: 60, img: coffee, tags: ["coffee","sidamo","natural"], commissionPct: 8 },
  { id: "p-6", slug: "netela-cotton", name: "Netela Cotton Shawl", nameAm: "ነጠላ", description: "Fine cotton netela with hand-embroidered tilet edges.", descriptionAm: "በእጅ የተጠለፈ ነጠላ።", price: 1500, category: "textiles", sellerId: "s-sheba", rating: 4.6, reviewCount: 208, stock: 22, img: gabi, tags: ["textiles","netela"], commissionPct: 10 },
];

export function getSeller(id: string): Seller | undefined {
  return SELLERS.find((s) => s.id === id || s.slug === id);
}
export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id || p.slug === id);
}
export function sellerProducts(sellerId: string): Product[] {
  return PRODUCTS.filter((p) => p.sellerId === sellerId);
}

export type SearchFilters = { q: string; category?: Category; min?: number; max?: number; verifiedOnly?: boolean };
export type SearchHit = Product & { seller: Seller };
export type SearchResult = {
  hits: SearchHit[];
  suggestions: string[];
  facets: { categories: Record<Category, number>; priceRange: [number, number]; verified: number };
};

const ALL_TERMS = ["coffee","yirgacheffe","sidamo","gabi","netela","tibeb","meskel","silver","leather","satchel","handmade","traditional"];

export function searchCatalog(filters: SearchFilters): SearchResult {
  const q = filters.q.trim().toLowerCase();
  let hits: SearchHit[] = PRODUCTS.map((p) => ({ ...p, seller: SELLERS.find((s) => s.id === p.sellerId)! }));
  if (q) {
    hits = hits.filter((p) =>
      [p.name, p.nameAm, p.description, p.tags.join(" "), p.seller.name].join(" ").toLowerCase().includes(q),
    );
  }
  if (filters.category) hits = hits.filter((p) => p.category === filters.category);
  if (typeof filters.min === "number") hits = hits.filter((p) => p.price >= filters.min!);
  if (typeof filters.max === "number") hits = hits.filter((p) => p.price <= filters.max!);
  if (filters.verifiedOnly) hits = hits.filter((p) => p.seller.verified);

  const prices = PRODUCTS.map((p) => p.price);
  const facets = {
    categories: PRODUCTS.reduce(
      (acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }),
      {} as Record<Category, number>,
    ),
    priceRange: [Math.min(...prices), Math.max(...prices)] as [number, number],
    verified: PRODUCTS.filter((p) => SELLERS.find((s) => s.id === p.sellerId)?.verified).length,
  };
  const suggestions = q ? ALL_TERMS.filter((t) => t.includes(q) && t !== q).slice(0, 5) : ["yirgacheffe","gabi","meskel cross","leather satchel"];
  return { hits, suggestions, facets };
}

export const ETB = (n: number) => `${n.toLocaleString()} ETB`;

// Map DB image paths (or category) to bundled asset URLs
export function resolveImg(img: string | null | undefined, category?: string | null): string {
  const map: Record<string, string> = {
    "/src/assets/coffee.jpg": coffee,
    "/src/assets/gabi.jpg": gabi,
    "/src/assets/jewelry.jpg": jewelry,
    "/src/assets/leather-bag.jpg": leatherBag,
    "/src/assets/courier.jpg": courier,
  };
  if (img && map[img]) return map[img];
  if (img && (img.startsWith("http") || img.startsWith("data:"))) return img;
  switch (category) {
    case "coffee": return coffee;
    case "textiles": return gabi;
    case "jewelry": return jewelry;
    case "leather": return leatherBag;
    default: return coffee;
  }
}

export const COUPONS: Record<string, { type: "percent" | "flat"; value: number; label: string }> = {
  ETHIO20: { type: "percent", value: 20, label: "20% off" },
  ADDIS100: { type: "flat", value: 100, label: "100 ETB off" },
  FREESHIP: { type: "flat", value: 60, label: "Free delivery" },
};

export const DELIVERY_FEE = 60;
