import type { SupabaseClient } from '@supabase/supabase-js'
import {
    checkPropertySaveDuplicates,
    type PropertySaveDuplicateCheckInput,
} from '@/lib/supabase/property-save-duplicate-guard'

export async function checkPropertySaveDuplicatesAdmin(
    admin: SupabaseClient,
    input: PropertySaveDuplicateCheckInput
) {
    return checkPropertySaveDuplicates(admin, input)
}

/** ListingForm / PresaleListingForm から送る物件フィールド（images 除く） */
export function pickPropertySaveFields(body: Record<string, unknown>) {
    const allowed = [
        'title',
        'description',
        'is_for_rent',
        'is_for_sale',
        'rent_price',
        'sale_price',
        'area_id',
        'project_id',
        'developer_id',
        'building_name',
        'project_name',
        'images',
        'tags',
        'status',
        'has_bathtub',
        'has_washlet',
        'water_heater_type',
        'electricity_bill_type',
        'water_bill_desc',
        'internet_desc',
        'distance_to_supermarket',
        'noise_level',
        'transportation_desc',
        'allows_pets',
        'has_japanese_tv',
        'has_ev_charger',
        'admin_memo',
        'property_type',
        'sqm',
        'floor',
        'bedrooms',
        'bathrooms',
        'year_built',
        'total_floors',
        'total_units',
        'total_buildings',
        'developer',
        'ownership_type',
        'is_presale',
        'description_en',
        'description_th',
        'project_facilities',
        'completion_date',
        'payment_plan',
        'construction_status',
        'land_area',
        'expiry_date',
        'is_approved',
        'showroom_map_url',
    ] as const

    const row: Record<string, unknown> = {}
    for (const key of allowed) {
        if (key in body) row[key] = body[key]
    }
    return row
}
