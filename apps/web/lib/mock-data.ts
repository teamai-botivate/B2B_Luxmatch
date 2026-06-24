export type Category = "Necklace" | "Earrings" | "Ring" | "Bangle" | "Pendant" | "Choker";
export type Occasion = "Wedding" | "Daily Wear" | "Festival" | "Anniversary" | "Gift";

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
}

export interface Jeweller {
  id: string;
  slug: string;
  name: string;
  storeName: string;
  city: string;
  gstin?: string;
  logo?: string;
  rating?: number;
  ownerName: string;
  productCount: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  productCount: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  price: number;
  originalPrice?: number;
  metal: string;
  purity: string;
  weight: string;
  gemstones?: string;
  styleTags?: string[];
  isFeatured: boolean;
  hasTryOn: boolean;
  jewellerId: string;
  occasions: Occasion[];
  images: ProductImage[];
}

export interface SearchResult {
  id: string;
  type: "product" | "collection" | "jeweller";
  title: string;
  subtitle: string;
  imageUrl: string;
  url: string;
}

export interface OccasionData {
  id: string;
  name: Occasion;
  slug: string;
  description: string;
  imageUrl: string;
}

export const MOCK_JEWELLERS: Jeweller[] = [
  { id: "j1", slug: "mehta-sons", name: "Mehta & Sons", storeName: "Mehta & Sons Jewellers", city: "Mumbai", rating: 4.8, ownerName: "Rajesh Mehta", productCount: 48 },
  { id: "j2", slug: "ratan-jewellery", name: "Ratan Jewellery", storeName: "Ratan Jewellery House", city: "Jaipur", rating: 4.9, ownerName: "Suresh Ratan", productCount: 62 },
  { id: "j3", slug: "lakshmi-gold", name: "Lakshmi Gold", storeName: "Lakshmi Gold Palace", city: "Chennai", rating: 4.7, ownerName: "T. Venkataraman", productCount: 35 },
];

export const MOCK_COLLECTIONS: Collection[] = [
  { id: "c1", name: "Bridal Elegance", slug: "bridal-elegance", description: "Timeless pieces for your most special day. Curated heirloom-quality jewellery for brides.", imageUrl: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=800&q=80", productCount: 18 },
  { id: "c2", name: "Everyday Luxe", slug: "everyday-luxe", description: "Subtle elegance you can wear every day without compromise.", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80", productCount: 24 },
  { id: "c3", name: "Festival Sparkle", slug: "festival-sparkle", description: "Shine bright during the festive season with bold, celebratory designs.", imageUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=800&q=80", productCount: 15 },
  { id: "c4", name: "Minimalist Edit", slug: "minimalist-edit", description: "Clean lines and modern designs for the contemporary woman.", imageUrl: "https://images.unsplash.com/photo-1602715922011-1a3b8eb488a0?w=800&q=80", productCount: 20 },
  { id: "c5", name: "Heritage Collection", slug: "heritage-collection", description: "Traditional designs passed down through generations of master craftsmen.", imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", productCount: 12 },
  { id: "c6", name: "Gift Sets", slug: "gift-sets", description: "Perfect curated combinations for life's most meaningful moments.", imageUrl: "https://images.unsplash.com/photo-1573408301185-9519f94f4105?w=800&q=80", productCount: 10 },
];

export const MOCK_OCCASIONS: OccasionData[] = [
  { id: "o1", name: "Wedding", slug: "wedding", description: "Bridal and wedding jewellery for your big day.", imageUrl: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=400&q=80" },
  { id: "o2", name: "Daily Wear", slug: "daily-wear", description: "Everyday elegance that complements your routine.", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80" },
  { id: "o3", name: "Festival", slug: "festival", description: "Statement pieces for festive celebrations.", imageUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=400&q=80" },
  { id: "o4", name: "Anniversary", slug: "anniversary", description: "Timeless gifts to mark milestones of love.", imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80" },
  { id: "o5", name: "Gift", slug: "gift", description: "Thoughtful pieces for everyone you love.", imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&q=80" },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1", slug: "kundan-polki-necklace", name: "Kundan Polki Bridal Necklace", category: "Necklace",
    description: "A stunning piece of heritage art, this Kundan Polki necklace is perfect for bridal wear. Features uncut diamonds set in 22K gold with emerald drops and pearl accents. Each piece is handcrafted by master artisans in Jaipur.",
    price: 345000, metal: "Gold", purity: "22K", weight: "45g", gemstones: "Polki Diamonds, Emeralds",
    styleTags: ["Traditional", "Bridal"], isFeatured: true, hasTryOn: true, jewellerId: "j2",
    occasions: ["Wedding", "Festival"],
    images: [
      { id: "i1a", url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80", alt: "Kundan Polki Necklace" },
      { id: "i1b", url: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=800&q=80", alt: "Kundan Polki Necklace Detail" },
    ]
  },
  {
    id: "p2", slug: "diamond-halo-earrings", name: "Diamond Halo Stud Earrings", category: "Earrings",
    description: "Classic round brilliant diamonds surrounded by a sparkling halo. The definition of everyday luxury — brilliant, wearable, timeless.",
    price: 85000, metal: "White Gold", purity: "18K", weight: "5g", gemstones: "Diamonds (VVS, E-F)",
    styleTags: ["Contemporary", "Minimal"], isFeatured: true, hasTryOn: true, jewellerId: "j1",
    occasions: ["Daily Wear", "Gift"],
    images: [
      { id: "i2a", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", alt: "Diamond Halo Earrings" },
    ]
  },
  {
    id: "p3", slug: "solitaire-engagement-ring", name: "Classic Solitaire Ring", category: "Ring",
    description: "A timeless solitaire diamond ring set in 18K white gold. The ultimate symbol of enduring love, crafted with precision and care.",
    price: 150000, metal: "White Gold", purity: "18K", weight: "4g", gemstones: "1ct Diamond",
    styleTags: ["Contemporary", "Minimal"], isFeatured: true, hasTryOn: true, jewellerId: "j1",
    occasions: ["Wedding", "Anniversary"],
    images: [
      { id: "i3a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", alt: "Solitaire Ring" },
    ]
  },
  {
    id: "p4", slug: "antique-temple-bangles", name: "Antique Temple Bangles", category: "Bangle",
    description: "Intricately carved temple bangles inspired by South Indian heritage. Each bangle features deities and floral motifs in 22K yellow gold.",
    price: 210000, metal: "Gold", purity: "22K", weight: "30g",
    styleTags: ["Traditional", "Heritage"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Wedding", "Festival"],
    images: [
      { id: "i4a", url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80", alt: "Temple Bangles" },
    ]
  },
  {
    id: "p5", slug: "sapphire-teardrop-pendant", name: "Sapphire Teardrop Pendant", category: "Pendant",
    description: "A deep blue Ceylon sapphire teardrop encircled by sparkling diamonds. Comes with an 18-inch box chain.",
    price: 65000, originalPrice: 75000, metal: "White Gold", purity: "18K", weight: "6g", gemstones: "Ceylon Sapphire, Diamonds",
    styleTags: ["Contemporary", "Gift-worthy"], isFeatured: true, hasTryOn: true, jewellerId: "j1",
    occasions: ["Gift", "Anniversary"],
    images: [
      { id: "i5a", url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", alt: "Sapphire Pendant" },
    ]
  },
  {
    id: "p6", slug: "polki-choker-set", name: "Royal Polki Choker", category: "Choker",
    description: "Make a statement with this magnificent uncut diamond choker. A masterpiece of Rajasthani craftsmanship featuring polki diamonds and baroque pearls.",
    price: 480000, metal: "Gold", purity: "22K", weight: "65g", gemstones: "Polki, Baroque Pearls",
    styleTags: ["Bridal", "Statement"], isFeatured: true, hasTryOn: true, jewellerId: "j2",
    occasions: ["Wedding"],
    images: [
      { id: "i6a", url: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=800&q=80", alt: "Polki Choker" },
    ]
  },
  {
    id: "p7", slug: "rose-gold-tennis-bracelet", name: "Rose Gold Tennis Bracelet", category: "Bangle",
    description: "A delicate line of brilliant-cut diamonds set in warm 18K rose gold. Perfect for stacking or wearing as a statement solo piece.",
    price: 120000, metal: "Rose Gold", purity: "18K", weight: "12g", gemstones: "Diamonds",
    styleTags: ["Contemporary", "Minimal"], isFeatured: false, hasTryOn: true, jewellerId: "j1",
    occasions: ["Daily Wear", "Gift"],
    images: [
      { id: "i7a", url: "https://images.unsplash.com/photo-1573408301185-9519f94f4105?w=800&q=80", alt: "Tennis Bracelet" },
    ]
  },
  {
    id: "p8", slug: "jadau-jhumkas", name: "Traditional Jadau Jhumkas", category: "Earrings",
    description: "Elaborate Jadau work jhumkas with ruby drops and seed pearls. Essential for every traditional wardrobe, these earrings frame the face beautifully.",
    price: 95000, metal: "Gold", purity: "22K", weight: "18g", gemstones: "Rubies, Uncut Diamonds",
    styleTags: ["Traditional", "Festival"], isFeatured: false, hasTryOn: true, jewellerId: "j2",
    occasions: ["Festival", "Wedding"],
    images: [
      { id: "i8a", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", alt: "Jadau Jhumkas" },
    ]
  },
  {
    id: "p9", slug: "navratna-ring", name: "Auspicious Navratna Ring", category: "Ring",
    description: "Nine precious gemstones set in a traditional pattern believed to bring balance and prosperity. Crafted with care by master goldsmiths.",
    price: 45000, metal: "Gold", purity: "22K", weight: "8g", gemstones: "Navratna (9 gems)",
    styleTags: ["Traditional", "Spiritual"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Daily Wear", "Gift"],
    images: [
      { id: "i9a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", alt: "Navratna Ring" },
    ]
  },
  {
    id: "p10", slug: "pearl-layered-necklace", name: "Layered Pearl Necklace", category: "Necklace",
    description: "Lustrous freshwater pearls in a multi-strand design with a hand-crafted gold filigree clasp. A classic that never goes out of style.",
    price: 55000, metal: "Gold", purity: "18K", weight: "25g", gemstones: "Freshwater Pearls",
    styleTags: ["Classic", "Bridal"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Festival", "Anniversary"],
    images: [
      { id: "i10a", url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80", alt: "Pearl Necklace" },
    ]
  },
  {
    id: "p11", slug: "meenakari-chandbali", name: "Meenakari Chandbali Earrings", category: "Earrings",
    description: "Vibrant Meenakari work in peacock blue and green, set in 22K gold. A riot of colour and craftsmanship that celebrates Rajasthani art.",
    price: 42000, metal: "Gold", purity: "22K", weight: "14g",
    styleTags: ["Traditional", "Festival"], isFeatured: false, hasTryOn: true, jewellerId: "j2",
    occasions: ["Festival", "Wedding"],
    images: [
      { id: "i11a", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", alt: "Meenakari Chandbali" },
    ]
  },
  {
    id: "p12", slug: "diamond-mangalsutra", name: "Contemporary Diamond Mangalsutra", category: "Necklace",
    description: "A modern interpretation of the traditional mangalsutra, featuring brilliant-cut diamonds in a sleek 18K gold pendant.",
    price: 95000, metal: "Gold", purity: "18K", weight: "12g", gemstones: "Diamonds",
    styleTags: ["Contemporary", "Bridal"], isFeatured: true, hasTryOn: true, jewellerId: "j1",
    occasions: ["Wedding", "Daily Wear"],
    images: [
      { id: "i12a", url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80", alt: "Diamond Mangalsutra" },
    ]
  },
  {
    id: "p13", slug: "emerald-cocktail-ring", name: "Colombian Emerald Cocktail Ring", category: "Ring",
    description: "A vivid Colombian emerald, certified natural, surrounded by a halo of brilliant diamonds. Statement jewellery at its finest.",
    price: 280000, metal: "Platinum", purity: "950", weight: "6g", gemstones: "Colombian Emerald, Diamonds",
    styleTags: ["Statement", "Contemporary"], isFeatured: false, hasTryOn: true, jewellerId: "j1",
    occasions: ["Anniversary", "Gift"],
    images: [
      { id: "i13a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", alt: "Emerald Cocktail Ring" },
    ]
  },
  {
    id: "p14", slug: "gold-kangan-pair", name: "22K Gold Kangan Pair", category: "Bangle",
    description: "A classic pair of plain 22K gold kangans with a subtle twisted rope pattern. A timeless investment in pure gold.",
    price: 175000, metal: "Gold", purity: "22K", weight: "42g",
    styleTags: ["Traditional", "Investment"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Wedding", "Daily Wear"],
    images: [
      { id: "i14a", url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80", alt: "Gold Kangan" },
    ]
  },
  {
    id: "p15", slug: "silver-oxidised-necklace", name: "Oxidised Silver Statement Necklace", category: "Necklace",
    description: "Bold, dramatic, and entirely handcrafted — this oxidised silver necklace is perfect for those who prefer a darker, more artistic aesthetic.",
    price: 12500, metal: "Silver", purity: "925", weight: "55g",
    styleTags: ["Contemporary", "Bohemian"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Festival", "Daily Wear"],
    images: [
      { id: "i15a", url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80", alt: "Oxidised Silver Necklace" },
    ]
  },
  {
    id: "p16", slug: "ruby-drop-pendant", name: "Pigeon Blood Ruby Pendant", category: "Pendant",
    description: "A stunning Burmese pigeon-blood ruby of exceptional clarity, cradled in a 22K gold lotus setting with diamond surround.",
    price: 195000, metal: "Gold", purity: "22K", weight: "7g", gemstones: "Burmese Ruby, Diamonds",
    styleTags: ["Statement", "Heritage"], isFeatured: true, hasTryOn: true, jewellerId: "j2",
    occasions: ["Anniversary", "Wedding"],
    images: [
      { id: "i16a", url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", alt: "Ruby Pendant" },
    ]
  },
  {
    id: "p17", slug: "kundan-maang-tikka", name: "Bridal Kundan Maang Tikka", category: "Pendant",
    description: "An elaborate bridal maang tikka with kundan setting and emerald accents. The centrepiece of any bridal ensemble.",
    price: 78000, metal: "Gold", purity: "22K", weight: "20g", gemstones: "Kundan, Emeralds",
    styleTags: ["Bridal", "Traditional"], isFeatured: false, hasTryOn: false, jewellerId: "j2",
    occasions: ["Wedding"],
    images: [
      { id: "i17a", url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80", alt: "Maang Tikka" },
    ]
  },
  {
    id: "p18", slug: "diamond-tennis-choker", name: "Diamond Tennis Choker", category: "Choker",
    description: "A continuous line of brilliant-cut diamonds set in 18K white gold. Modern, bold, and utterly captivating.",
    price: 320000, metal: "White Gold", purity: "18K", weight: "22g", gemstones: "Diamonds (G, VS1)",
    styleTags: ["Contemporary", "Statement"], isFeatured: false, hasTryOn: true, jewellerId: "j1",
    occasions: ["Anniversary", "Wedding"],
    images: [
      { id: "i18a", url: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=800&q=80", alt: "Diamond Tennis Choker" },
    ]
  },
  {
    id: "p19", slug: "silver-toe-rings-set", name: "Silver Toe Rings Set (6 pairs)", category: "Ring",
    description: "A traditional set of six pairs of silver toe rings with floral and vine motifs. A quintessential South Indian bridal accessory.",
    price: 5500, metal: "Silver", purity: "925", weight: "18g",
    styleTags: ["Traditional", "Bridal"], isFeatured: false, hasTryOn: false, jewellerId: "j3",
    occasions: ["Wedding"],
    images: [
      { id: "i19a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", alt: "Silver Toe Rings" },
    ]
  },
  {
    id: "p20", slug: "gold-chain-necklace-22k", name: "22K Gold Rope Chain", category: "Necklace",
    description: "A classic 22K gold rope chain, 22 inches in length. The foundation of every jewellery collection — versatile, investment-worthy, timeless.",
    price: 85000, metal: "Gold", purity: "22K", weight: "18g",
    styleTags: ["Minimal", "Investment"], isFeatured: false, hasTryOn: false, jewellerId: "j3",
    occasions: ["Daily Wear", "Gift"],
    images: [
      { id: "i20a", url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80", alt: "Gold Rope Chain" },
    ]
  },
  {
    id: "p21", slug: "floral-diamond-studs", name: "Floral Diamond Stud Earrings", category: "Earrings",
    description: "Delicate five-petal flower studs with a diamond at the centre. Light as a whisper, brilliant as sunlight.",
    price: 35000, metal: "Gold", purity: "18K", weight: "3g", gemstones: "Diamonds",
    styleTags: ["Minimal", "Contemporary"], isFeatured: false, hasTryOn: true, jewellerId: "j1",
    occasions: ["Daily Wear", "Gift"],
    images: [
      { id: "i21a", url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80", alt: "Floral Diamond Studs" },
    ]
  },
  {
    id: "p22", slug: "platinum-love-band", name: "Platinum Love Band Ring", category: "Ring",
    description: "A sleek 4mm platinum band with a brushed finish and polished edges. Perfect as a wedding band or anniversary gift.",
    price: 28000, metal: "Platinum", purity: "950", weight: "7g",
    styleTags: ["Minimal", "Contemporary"], isFeatured: false, hasTryOn: true, jewellerId: "j1",
    occasions: ["Wedding", "Anniversary"],
    images: [
      { id: "i22a", url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", alt: "Platinum Love Band" },
    ]
  },
  {
    id: "p23", slug: "ruby-gold-choker", name: "South Indian Ruby Choker", category: "Choker",
    description: "A magnificent South Indian-style choker featuring ruby cabochons and emerald accents set in 22K gold. Temple jewellery elevated.",
    price: 265000, metal: "Gold", purity: "22K", weight: "55g", gemstones: "Ruby Cabochons, Emeralds",
    styleTags: ["Traditional", "Bridal"], isFeatured: false, hasTryOn: true, jewellerId: "j3",
    occasions: ["Wedding", "Festival"],
    images: [
      { id: "i23a", url: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=800&q=80", alt: "Ruby Choker" },
    ]
  },
  {
    id: "p24", slug: "antique-gold-haath-phool", name: "Antique Gold Haath Phool", category: "Bangle",
    description: "A hand-harness bracelet (haath phool) combining a bangle with finger ring via golden chains. Exquisite for bridal ceremonies.",
    price: 145000, metal: "Gold", purity: "22K", weight: "35g", gemstones: "Pearl, Meenakari",
    styleTags: ["Bridal", "Heritage"], isFeatured: true, hasTryOn: false, jewellerId: "j2",
    occasions: ["Wedding", "Festival"],
    images: [
      { id: "i24a", url: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80", alt: "Haath Phool" },
    ]
  },
];

export const POPULAR_SEARCHES = [
  "Wedding Necklace", "Gold Earrings", "Diamond Ring", "Bridal Set", "22K Gold",
  "Kundan Jewellery", "Silver Bangles", "Platinum Ring", "Diamond Pendant",
];

export function getProductsByJeweller(jewellerId: string): Product[] {
  return MOCK_PRODUCTS.filter(p => p.jewellerId === jewellerId);
}

export function getProductsByOccasion(occasion: Occasion): Product[] {
  return MOCK_PRODUCTS.filter(p => p.occasions.includes(occasion));
}

export function getFeaturedProducts(): Product[] {
  return MOCK_PRODUCTS.filter(p => p.isFeatured);
}

export function getTryOnProducts(): Product[] {
  return MOCK_PRODUCTS.filter(p => p.hasTryOn);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.metal.toLowerCase().includes(q) ||
    (p.gemstones?.toLowerCase().includes(q)) ||
    p.occasions.some(o => o.toLowerCase().includes(q))
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find(p => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return MOCK_PRODUCTS.find(p => p.id === id);
}

export function getJewellerBySlug(slug: string): Jeweller | undefined {
  return MOCK_JEWELLERS.find(j => j.slug === slug);
}

export interface CategoryData {
  id: string;
  slug: string;
  name: Category;
  productCount: number;
  imageUrl: string;
}

export const MOCK_CATEGORIES: CategoryData[] = [
  { id: "cat1", slug: "necklace", name: "Necklace", productCount: 5, imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&q=80" },
  { id: "cat2", slug: "earrings", name: "Earrings", productCount: 4, imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80" },
  { id: "cat3", slug: "ring", name: "Ring", productCount: 5, imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80" },
  { id: "cat4", slug: "bangle", name: "Bangle", productCount: 4, imageUrl: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=400&q=80" },
  { id: "cat5", slug: "pendant", name: "Pendant", productCount: 3, imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80" },
  { id: "cat6", slug: "choker", name: "Choker", productCount: 3, imageUrl: "https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=400&q=80" },
];
