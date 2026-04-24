'use client'

import { ADMIN_LIST_LIMIT_OPTIONS, type AdminListLimit } from '@/lib/admin-list-url'

type Props = {
    value: AdminListLimit
    onChange: (next: AdminListLimit) => void
    id?: string
    className?: string
}

export default function AdminRowsPerPageSelect({ value, onChange, id, className = '' }: Props) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                表示件数
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(Number(e.target.value) as AdminListLimit)}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-[11px] font-bold text-navy-secondary shadow-sm outline-none focus:ring-2 focus:ring-navy-primary/20"
            >
                {ADMIN_LIST_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
        </div>
    )
}
