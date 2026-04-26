/**
 * 物件登録・更新の保存直前にのみ実行する重複チェック（一覧では走らせない）。
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type PropertySaveDuplicateCheckInput = {
    title: string
    /** 編集時は自身の id を除外 */
    excludePropertyId?: string | null
    /** 日本語説明の冒頭一致（任意・30文字以上のときのみ RPC で検査） */
    description?: string | null
    /** true のとき説明の先頭 100 文字が他物件と一致する場合もブロック */
    checkDescriptionPrefix?: boolean
    descriptionPrefixLength?: number
}

export type PropertySaveDuplicateCheckResult =
    | { ok: true }
    | { ok: false; message: string }

/**
 * 保存前にタイトル（および任意で説明プレフィックス）の重複を検査する。
 */
export async function checkPropertySaveDuplicates(
    supabase: SupabaseClient,
    input: PropertySaveDuplicateCheckInput
): Promise<PropertySaveDuplicateCheckResult> {
    const title = (input.title ?? '').trim()
    if (!title) {
        return { ok: false, message: '物件名を入力してください。' }
    }

    const exclude = input.excludePropertyId?.trim() || null

    const { data: dupTitle, error: errTitle } = await supabase.rpc('property_title_is_duplicate', {
        p_title: title,
        p_exclude: exclude,
    })

    if (errTitle) {
        console.warn('[property-save-duplicate-guard] title rpc', errTitle)
        return { ok: true }
    }

    if (dupTitle === true) {
        return { ok: false, message: '同じ名前の物件が既に存在します。' }
    }

    if (input.checkDescriptionPrefix) {
        const desc = (input.description ?? '').trim()
        if (desc.length >= 30) {
            const len = Math.min(100, Math.max(1, input.descriptionPrefixLength ?? 100))
            const { data: dupDesc, error: errDesc } = await supabase.rpc('property_description_prefix_duplicate', {
                p_desc: input.description ?? '',
                p_exclude: exclude,
                p_len: len,
            })
            if (errDesc) {
                console.warn('[property-save-duplicate-guard] desc rpc', errDesc)
                return { ok: true }
            }
            if (dupDesc === true) {
                return {
                    ok: false,
                    message:
                        '説明文の冒頭が既存物件と一致するため、重複登録の可能性があります。内容を区別してから保存してください。',
                }
            }
        }
    }

    return { ok: true }
}
