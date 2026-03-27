namespace NodeJS {
    interface ProcessEnv {
        NEXT_PUBLIC_SUPABASE_URL: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
        SUPABASE_SERVICE_ROLE_KEY: string;
        NEXT_PUBLIC_SITE_URL?: string;
        NEXT_PUBLIC_BASE_URL?: string;
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
        /** サーバー専用（任意）。未設定時は Geocoding 逆引きに NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を使う */
        GOOGLE_MAPS_SERVER_KEY?: string;
        STRIPE_SECRET_KEY: string;
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    }
}
