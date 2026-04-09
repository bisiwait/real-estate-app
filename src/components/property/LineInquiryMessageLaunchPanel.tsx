'use client'

import { MessageCircle, ExternalLink, Loader2 } from 'lucide-react'

export type LineInquiryMessageLaunchPanelDict = {
    line_inquiry_main_btn: string
    line_inquiry_paste_after_friend_note: string
    /** 友だち済みで下書きが空になりやすい旨（クリップボード保険の案内） */
    line_inquiry_already_friend_note: string
    line_inquiry_desktop_qr_sub: string
    line_open_line_direct_link: string
    line_inquiry_sending_btn?: string
}

export function LineInquiryMessageLaunchPanel({
    isSmartphone,
    isSending,
    onMainClick,
    showFallback,
    fallbackUrl,
    onFallbackClick,
    dict,
}: {
    isSmartphone: boolean
    isSending: boolean
    onMainClick: () => void
    showFallback: boolean
    fallbackUrl: string
    onFallbackClick?: () => void
    dict: LineInquiryMessageLaunchPanelDict
}) {
    const sendingLabel = dict.line_inquiry_sending_btn ?? '送信中…'
    const step1Pending = isSmartphone && isSending

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={onMainClick}
                disabled={step1Pending}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#05a649] disabled:opacity-85"
            >
                {step1Pending ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                ) : (
                    <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                )}
                <span>{step1Pending ? sendingLabel : dict.line_inquiry_main_btn}</span>
                {!step1Pending ? <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden /> : null}
            </button>

            <p className="text-center text-[11px] font-bold leading-relaxed text-slate-700">
                {dict.line_inquiry_paste_after_friend_note}
            </p>
            <p className="text-center text-[10px] font-medium leading-relaxed text-slate-600">
                {dict.line_inquiry_already_friend_note}
            </p>

            {!isSmartphone ? (
                <p className="text-center text-[10px] font-medium leading-relaxed text-slate-600">
                    {dict.line_inquiry_desktop_qr_sub}
                </p>
            ) : null}

            {showFallback && fallbackUrl ? (
                <a
                    href={fallbackUrl}
                    onClick={onFallbackClick}
                    className="flex w-full min-h-[44px] items-center justify-center rounded-xl border-2 border-[#06C755] bg-white py-2.5 text-center text-sm font-black text-[#047c3d] hover:bg-[#06C755]/5"
                    rel="noopener noreferrer"
                >
                    {dict.line_open_line_direct_link}
                </a>
            ) : null}
        </div>
    )
}
