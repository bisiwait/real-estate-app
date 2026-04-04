namespace NodeJS {
    interface ProcessEnv {
        NEXT_PUBLIC_SUPABASE_URL: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
        SUPABASE_SERVICE_ROLE_KEY: string;
        /** 本番: https://chonburihome.com（末尾スラッシュなし）。Vercel Production では必須。 */
        NEXT_PUBLIC_SITE_URL?: string;
        NEXT_PUBLIC_BASE_URL?: string;
        /** Vercel が注入（production / preview / development） */
        VERCEL_ENV?: string;
        VERCEL_URL?: string;
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
        /** サーバー専用（任意）。未設定時は Geocoding 逆引きに NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を使う */
        GOOGLE_MAPS_SERVER_KEY?: string;
        STRIPE_SECRET_KEY: string;
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
        RESEND_API_KEY?: string;
        /**
         * Resend の From（必須に近い: 任意宛先へ送るには resend.com/domains でドメイン検証後、
         * 「Chonburi Home <noreply@検証済みドメイン>」形式で設定。未設定だとテスト用制限のまま）
         */
        RESEND_FROM?: string;
        /** next.config の旧ホスト → 本番への 308 用（カンマ区切りホスト名） */
        LEGACY_REDIRECT_HOSTS?: string;
        /**
         * 任意。LINE Official Account Manager の「続きはチャットで」ボタン先を全文指定。
         * 未設定時は `/account/@basicId/`（アカウントホーム）。旧 `/chat/` は 404 になり得る。
         */
        NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL?: string;
    }
}
