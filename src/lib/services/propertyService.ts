import { createClient } from '@/lib/supabase/server';

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

export async function getRecommendedRentals(limit = 4) {
    const supabase = await createClient();

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
    const supabase = await createClient();

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
