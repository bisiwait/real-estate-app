import { Loader2 } from 'lucide-react'

/** ロケール切替・同一レイアウト内の遷移時に即時表示されるフォールバック */
export default function LocaleSegmentLoading() {
  return (
    <div
      className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center bg-slate-50 px-4"
      role="status"
      aria-busy="true"
      aria-label="読み込み中"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-100 bg-white px-10 py-10 shadow-lg">
        <Loader2 className="h-11 w-11 animate-spin text-navy-primary" aria-hidden />
        <p className="text-center text-sm font-bold text-slate-500">読み込み中です</p>
      </div>
    </div>
  )
}
