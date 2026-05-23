ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS show_whatsapp_in_inquiry BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_whatsapp_in_inquiry IS '公開物件ページでWhatsApp問い合わせを表示するか';
