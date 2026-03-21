import { createStaticClient } from '@/lib/supabase/static';

export interface Property {
  id: string;
  title: string;
  price: number;
  rent_price?: number;
  sale_price?: number;
  is_for_rent: boolean;
  is_for_sale: boolean;
  is_presale: boolean;
  images: string[];
  tags: string[];
  sqm?: number;
  bedrooms?: number;
  has_bathtub?: boolean;
  allows_pets?: boolean;
  status: string;
  is_approved: boolean;
  area_name?: string;
  city_name?: string;
  ownership_type?: string;
}

export interface PresaleProject {
  id: string;
  name: string;
  area: string;
  completionYear: string;
  priceRange: string;
  imageUrl: string;
  hasJapaneseSupport: boolean;
  slug: string;
}

export async function getRecommendedPresales(limit = 3) {
  const supabase = createStaticClient();

  // Fetch all properties with is_presale = true to debug
  // Removing all filters and joins to see if data exists at all
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('is_presale', true);

  if (error) {
    console.error('Error fetching recommended presales:', error);
    return [];
  }

  console.log('Raw presale data from Supabase:', data?.length, data);

  if (!data || data.length === 0) {
    return [];
  }

  // Map the raw data to the expected format
  return data.slice(0, limit).map(p => ({
    id: p.id,
    name: p.title, // Use title directly for now
    area: 'Pattaya', // Fallback for debug
    completionYear: 'TBA',
    priceRange: `${p.sale_price?.toLocaleString() || 'TBA'} THB`,
    imageUrl: p.images?.[0] || '',
    hasJapaneseSupport: false,
    slug: p.id,
  })) as PresaleProject[];
}

export async function getRecommendedRentals(limit = 4) {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      area:areas!inner (
        name,
        region:regions!inner (
          name
        )
      )
    `)
    .eq('status', 'published')
    .eq('is_approved', true)
    .eq('is_for_rent', true)
    .eq('is_presale', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recommended rentals:', error);
    return [];
  }

  return data.map(p => ({
    ...p,
    area_name: p.area?.name,
    city_name: p.area?.region?.name
  })) as Property[];
}

export async function getRecommendedSales(limit = 4) {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      area:areas!inner (
        name,
        region:regions!inner (
          name
        )
      )
    `)
    .eq('status', 'published')
    .eq('is_approved', true)
    .eq('is_for_sale', true)
    .eq('is_presale', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recommended sales:', error);
    return [];
  }

  return data.map(p => ({
    ...p,
    area_name: p.area?.name,
    city_name: p.area?.region?.name
  })) as Property[];
}
