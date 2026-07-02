export type Niche = {
  niche_id: string;
  title: string;
  category: string;
  status: string;
  top_search_term: string;
  image: string;
  search_volume: number;
  growth_pct: number | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  min_units_360: number | null;
  max_units_360: number | null;
  return_rate: number | null;
  product_count: number | null;
  brand_count: number | null;
  successful_launch: number | null;
  new_launch: number | null;
  conv_rate_7: number | null;
  updated_at: string;
};

export type Asin = {
  asin: string;
  title: string;
  image: string;
  brand: string;
  category: string;
  launch: string;
  price: number | null;
  rating: number | null;
  reviews: number | null;
  bsr: number | null;
  clicks: number;
  click_share: number | null;
  status: string;
};

export type Meta = {
  total_niches_kept: number;
  total_niches_source: number;
  total_asins_kept: number;
  total_asins_source: number;
  top_asins_per_niche: number;
  generated_at: string;
};

export type Snapshot = {
  niches: Niche[];
  asins_by_niche: Record<string, Asin[]>;
  meta: Meta;
};

export type Segment = "hot" | "rising" | "stable" | "cool" | "dec" | "na";
