/** プレミアム契約終了時：ご利用中プランとプレミアム訴求の間に置く最小表示 */
export default function PlanExpiredNotice() {
    return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-lg">
            <h3 className="text-base font-black text-red-600">プラン期限切れ</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600">
                機能制限を解除するにはプランの更新が必要です。
            </p>
        </div>
    )
}
