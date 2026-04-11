'use client'

import { useRouter } from 'next/navigation'

export default function StatusFilter({ filter, status, onChange }: { filter: string, status: string, onChange?: (status: string) => void }) {
    const router = useRouter()

    const handleStatusChange = (newStatus: string) => {
        if (onChange) {
            onChange(newStatus)
        } else {
            router.push(`?tab=properties&filter=${filter}&status=${newStatus}`)
        }
    }

    return (
        <div className="flex relative items-center w-full">
            <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl px-4 py-2 pr-8 hover:border-navy-primary transition-colors focus:outline-none focus:ring-2 focus:ring-navy-primary/20 cursor-pointer shadow-sm w-full"
            >
                <option value="all">全ステータス</option>
                <option value="draft">下書き</option>
                <option value="pending">承認待ち</option>
                <option value="published">公開中</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
        </div>
    )
}
