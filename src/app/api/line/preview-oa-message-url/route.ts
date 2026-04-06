import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import {
  isLineOfficialAccountAddFriendUrl,
  isLineOfficialConnectionUrl,
} from '@/lib/line-official-account-url'
import {
  buildLineOaMessageUrl,
  resolveLineOfficialBasicIdForOaMessage,
} from '@/lib/line-oa-message-inquiry-url'

export const dynamic = 'force-dynamic'

const PREVIEW_TEXT =
  '【テスト】管理画面からの動作確認です。下書き付きのトーク画面が開けば成功です（未友だちの場合は先に友だち追加が出ることがあります）。'

function isValidPreviewRawUrl(raw: string): boolean {
  const t = raw.trim()
  if (/^@[A-Za-z0-9._-]{2,128}$/.test(t)) return true
  return isLineOfficialConnectionUrl(t) || isLineOfficialAccountAddFriendUrl(t)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { rawUrl?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const rawUrl = body.rawUrl?.trim() ?? ''
    if (!rawUrl || !isValidPreviewRawUrl(rawUrl)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const host = hostHeaderFromRequest(req)
    const basicId = await resolveLineOfficialBasicIdForOaMessage(rawUrl, host)
    if (!basicId) {
      return NextResponse.json(
        { error: 'Basic ID を URL から取得できませんでした。lin.ee または line.me の友だち追加URLを確認してください。' },
        { status: 422 }
      )
    }

    const url = buildLineOaMessageUrl(basicId, PREVIEW_TEXT)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[preview-oa-message-url]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
