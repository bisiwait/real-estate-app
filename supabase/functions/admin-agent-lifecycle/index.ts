import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type Action = "suspend" | "resume" | "delete"
type PropertyHandling = "unpublish" | "keep"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    const authHeader = req.headers.get("Authorization")
    const jwt = authHeader?.replace(/^Bearer\s+/i, "")
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser(jwt)
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminSb = createClient(supabaseUrl, serviceKey)

    const { data: callerProfile } = await adminSb
      .from("profiles")
      .select("is_admin, user_role")
      .eq("id", caller.id)
      .maybeSingle()

    const isCallerAdmin =
      callerProfile?.is_admin === true || callerProfile?.user_role === "admin"
    if (!isCallerAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as Action
    const targetUserId = body.targetUserId as string | undefined
    const property_handling = (body.property_handling ?? "unpublish") as PropertyHandling

    if (!targetUserId || !["suspend", "resume", "delete"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (targetUserId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot target yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: targetProfile, error: targetErr } = await adminSb
      .from("profiles")
      .select("user_role, deleted_at")
      .eq("id", targetUserId)
      .maybeSingle()

    if (targetErr || !targetProfile) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (targetProfile.user_role === "admin") {
      return new Response(JSON.stringify({ error: "Cannot modify admin accounts" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (targetProfile.user_role !== "agent") {
      return new Response(JSON.stringify({ error: "Target is not an agent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (targetProfile.deleted_at) {
      return new Response(
        JSON.stringify({ error: "削除済みエージェントは操作できません。" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const mergeAppMeta = async (uid: string, patch: Record<string, unknown>) => {
      const { data: existing, error: getErr } = await adminSb.auth.admin.getUserById(uid)
      if (getErr) throw getErr
      const prev = (existing?.user?.app_metadata ?? {}) as Record<string, unknown>
      return { ...prev, ...patch }
    }

    if (action === "suspend") {
      if (property_handling !== "keep") {
        const { error: rpcErr } = await adminSb.rpc(
          "backup_and_draft_properties_for_agent_suspend",
          { p_user_id: targetUserId },
        )
        if (rpcErr) throw rpcErr
      }
      const { error: upErr } = await adminSb
        .from("profiles")
        .update({
          status: "suspended",
          is_suspended: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
      if (upErr) throw upErr

      const app_metadata = await mergeAppMeta(targetUserId, { agent_suspended: true })
      const { error: banErr } = await adminSb.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876000h",
        app_metadata,
      })
      if (banErr) throw banErr

      return new Response(JSON.stringify({ ok: true, action: "suspend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "resume") {
      const { data: restored, error: rpcErr } = await adminSb.rpc(
        "restore_properties_after_agent_resume",
        { p_user_id: targetUserId },
      )
      if (rpcErr) throw rpcErr

      const { error: upErr } = await adminSb
        .from("profiles")
        .update({
          status: "active",
          is_suspended: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId)
      if (upErr) throw upErr

      const app_metadata = await mergeAppMeta(targetUserId, { agent_suspended: false })
      const { error: unbanErr } = await adminSb.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
        app_metadata,
      })
      if (unbanErr) throw unbanErr

      return new Response(
        JSON.stringify({
          ok: true,
          action: "resume",
          restoredPropertyCount: typeof restored === "number" ? restored : Number(restored) || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // delete (論理削除 + 物件の退避・下書き化 + Auth ユーザー削除)
    if (property_handling !== "keep") {
      const { error: rpcErr } = await adminSb.rpc(
        "backup_and_draft_properties_for_agent_suspend",
        { p_user_id: targetUserId },
      )
      if (rpcErr) throw rpcErr
    }

    const now = new Date().toISOString()
    const { error: delProfErr } = await adminSb
      .from("profiles")
      .update({
        deleted_at: now,
        status: "suspended",
        is_suspended: true,
        updated_at: now,
      })
      .eq("id", targetUserId)
    if (delProfErr) throw delProfErr

    const { error: delAuthErr } = await adminSb.auth.admin.deleteUser(targetUserId)
    if (delAuthErr) throw delAuthErr

    return new Response(JSON.stringify({ ok: true, action: "delete" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin-agent-lifecycle]", msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
