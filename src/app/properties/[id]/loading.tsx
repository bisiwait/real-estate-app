import { Loader2, MapPin, Bath, Layers, Calendar, Tag, ChevronLeft } from 'lucide-react'

export default function Loading() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20 animate-pulse">
            {/* Breadcrumb Skeleton */}
            <div className="container mx-auto px-4 pt-6">
                <div className="h-4 w-48 bg-slate-200 rounded-lg"></div>
            </div>

            <div className="container mx-auto px-4 pt-8 md:pt-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Main Info (Left Column) */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Gallery Skeleton */}
                        <div className="aspect-[16/9] w-full bg-slate-200 rounded-3xl shadow-lg"></div>

                        {/* Title and Key Stats Skeleton */}
                        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 mt-6">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-8 border-b border-slate-50">
                                <div className="space-y-4 flex-1">
                                    <div className="h-8 w-3/4 bg-slate-200 rounded-xl"></div>
                                    <div className="h-4 w-1/4 bg-slate-100 rounded-lg"></div>
                                </div>
                                <div className="h-12 w-32 bg-slate-200 rounded-2xl"></div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-20 bg-slate-50 rounded-2xl border border-slate-100"></div>
                                ))}
                            </div>
                        </div>

                        {/* Description Skeleton */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-4">
                            <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-slate-100 rounded"></div>
                                <div className="h-4 w-full bg-slate-100 rounded"></div>
                                <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Skeleton */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 h-64"></div>
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 h-96"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
