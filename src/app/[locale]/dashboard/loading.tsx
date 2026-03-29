import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[min(70vh,560px)] flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <Loader2 className="h-11 w-11 animate-spin text-navy-primary" aria-hidden />
      <p className="text-center text-sm font-bold text-slate-500">読み込み中…</p>
    </div>
  )
}
