-- 管理者がエージェントとしてログインする際、元の管理者セッションを一時退避する（anon/authenticated からは不可）

CREATE TABLE IF NOT EXISTS public.admin_impersonation_revert_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    admin_user_id uuid NOT NULL,
    target_user_id uuid NOT NULL,
    return_locale text NOT NULL,
    admin_access_token text NOT NULL,
    admin_refresh_token text NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_impersonation_revert_tokens_expires_at_idx
    ON public.admin_impersonation_revert_tokens (expires_at);

ALTER TABLE public.admin_impersonation_revert_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_impersonation_revert_tokens FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_impersonation_revert_tokens FROM anon;
REVOKE ALL ON TABLE public.admin_impersonation_revert_tokens FROM authenticated;
GRANT ALL ON TABLE public.admin_impersonation_revert_tokens TO service_role;
