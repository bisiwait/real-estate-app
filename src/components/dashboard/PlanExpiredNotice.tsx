/** プロプラン契約終了時：ご利用中プランと訴求の間に置く最小表示 */
export default function PlanExpiredNotice({ dict }: { dict: any }) {
    return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-lg">
            <h3 className="text-base font-black text-red-600">{dict.plan_expired_title}</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600">
                {dict.plan_expired_body}
            </p>
        </div>
    )
}
