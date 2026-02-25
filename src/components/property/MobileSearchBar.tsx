'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'

interface MobileSearchBarProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    onFilterClick: () => void
    activeFiltersCount: number
}

export default function MobileSearchBar({
    searchQuery,
    onSearchChange,
    onFilterClick,
    activeFiltersCount
}: MobileSearchBarProps) {
    return (
        <div className="flex items-center space-x-3 w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-navy-primary transition-colors" />
                <input
                    type="text"
                    placeholder="物件名・エリアで検索..."
                    className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-navy-primary focus:border-transparent outline-none font-bold text-navy-secondary transition-all"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            <button
                onClick={onFilterClick}
                className="relative p-4 bg-navy-primary text-white rounded-2xl shadow-lg shadow-navy-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
                <SlidersHorizontal className="w-6 h-6" />
                {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {activeFiltersCount}
                    </span>
                )}
            </button>
        </div>
    )
}
