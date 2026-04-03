-- エージェント利用停止時に物件 status を退避し、再開時に復元する

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS status_before_suspension TEXT;

COMMENT ON COLUMN public.properties.status_before_suspension IS
  '利用停止前の status。停止時に退避し、再開時は status=draft かつ本列が非NULLの行のみ復元する。';

-- 停止: まだ退避していない行だけ snapshot してから draft（二重停止で上書きしない）
CREATE OR REPLACE FUNCTION public.backup_and_draft_properties_for_agent_suspend(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.properties
  SET
    status_before_suspension = status,
    status = 'draft',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status_before_suspension IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 再開: draft のまま退避値がある行だけ復元（停止中非 draft にした物件は対象外）
CREATE OR REPLACE FUNCTION public.restore_properties_after_agent_resume(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.properties
  SET
    status = CASE
      WHEN status_before_suspension IN (
        'draft',
        'published',
        'expired',
        'pending',
        'under_negotiation',
        'contracted'
      ) THEN status_before_suspension
      ELSE 'draft'
    END,
    status_before_suspension = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status_before_suspension IS NOT NULL
    AND status = 'draft';

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.backup_and_draft_properties_for_agent_suspend(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_properties_after_agent_resume(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backup_and_draft_properties_for_agent_suspend(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_properties_after_agent_resume(uuid) TO service_role;
