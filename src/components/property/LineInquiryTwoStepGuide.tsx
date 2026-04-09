'use client'

import { useMemo, useState, useCallback } from 'react'
import { MessageCircle, ClipboardCopy, ExternalLink, Loader2 } from 'lucide-react'
import { copyTextToClipboard } from '@/lib/clipboard-copy'
import { buildLineInquiryShareText } from '@/lib/line-inquiry-share-text'

export type LineInquiryTwoStepDict = {
    line_inquiry_two_step_note: string
    line_inquiry_step1_btn: string
    line_inquiry_step2_btn: string
    line_inquiry_copy_toast: string
    line_inquiry_desktop_qr_sub: string
    line_open_line_direct_link: string
    line_inquiry_sending_btn?: string
}

export function LineInquiryTwoStepGuide({
    propertyName,
    propertyPageUrl,
    shareTextTemplate,
    isSmartphone,
    isLineLaunching,
    onLaunchLine,
    showDirectLineFallback,
    directLineUrl,
    onDirectLineClick,
    dict,
}: {
    propertyName: string
    propertyPageUrl: string
    shareTextTemplate: string
    isSmartphone: boolean
    isLineLaunching: boolean
    onLaunchLine: () => void
    showDirectLineFallback: boolean
    directLineUrl: string | null
    onDirectLineClick?: () => void
    dict: LineInquiryTwoStepDict
}) {
    const shareText = useMemo(
        () => buildLineInquiryShareText(shareTextTemplate, propertyName, propertyPageUrl),
        [shareTextTemplate, propertyName, propertyPageUrl]
    )
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async () => {
        const ok = await copyTextToClipboard(shareText)
        if (ok) {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2500)
        }
    }, [shareText])

    const step1Pending = isSmartphone && isLineLaunching
    const sendingLabel = dict.line_inquiry_sending_btn ?? '送信中…'

    return (
        <div className="space-y-4">
            <p className="text-center text-[11px] font-bold leading-relaxed text-slate-700">{dict.line_inquiry_two_step_note}</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch md:gap-5">
                <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#06C755]/35 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-xl font-black leading-none text-white shadow-md ring-2 ring-white"
                            aria-hidden
                        >
                            ①
                        </span>
                        <p className="min-w-0 flex-1 text-left text-xs font-black leading-snug text-navy-secondary">
                            {dict.line_inquiry_step1_btn}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onLaunchLine}
                        disabled={step1Pending}
                        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#05a649] disabled:opacity-85"
                    >
                        {step1Pending ? (
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                        ) : (
                            <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                        )}
                        <span>{step1Pending ? sendingLabel : dict.line_inquiry_step1_btn}</span>
                        {!step1Pending ? <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden /> : null}
                    </button>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border-2 border-navy-primary/25 bg-white/95 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-primary text-xl font-black leading-none text-white shadow-md ring-2 ring-white"
                            aria-hidden
                        >
                            ②
                        </span>
                        <p className="min-w-0 flex-1 text-left text-xs font-black leading-snug text-navy-secondary">
                            {dict.line_inquiry_step2_btn}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-navy-primary/35 bg-white py-3 text-sm font-black text-navy-primary shadow-sm transition hover:bg-slate-50"
                    >
                        <ClipboardCopy className="h-5 w-5 shrink-0" aria-hidden />
                        {dict.line_inquiry_step2_btn}
                    </button>
                    {copied ? (
                        <p className="text-center text-xs font-black text-emerald-600" role="status" aria-live="polite">
                            {dict.line_inquiry_copy_toast}
                        </p>
                    ) : null}
                </div>
            </div>

            {!isSmartphone ? (
                <p className="text-center text-[10px] font-medium leading-relaxed text-slate-600">{dict.line_inquiry_desktop_qr_sub}</p>
            ) : null}

            {showDirectLineFallback && directLineUrl ? (
                <a
                    href={directLineUrl}
                    onClick={onDirectLineClick}
                    className="flex w-full min-h-[44px] items-center justify-center rounded-xl border-2 border-[#06C755] bg-white py-2.5 text-center text-sm font-black text-[#047c3d] hover:bg-[#06C755]/5"
                    rel="noopener noreferrer"
                >
                    {dict.line_open_line_direct_link}
                </a>
            ) : null}
        </div>
    )
}
