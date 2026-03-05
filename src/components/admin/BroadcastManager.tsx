'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Send,
    Search,
    Users,
    Mail,
    MessageSquare,
    Eye,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Building2,
    MapPin,
    Calendar,
    ChevronRight,
    X,
    Bell
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function BroadcastManager() {
    const [properties, setProperties] = useState<any[]>([])
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Message states
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [segmentType, setSegmentType] = useState<'all' | 'area_favorites' | 'saved_search_match'>('all')
    const [segmentValue, setSegmentValue] = useState('')

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const [showConfirm, setShowConfirm] = useState(false)
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

    const supabase = createClient()

    useEffect(() => {
        fetchRecentProperties()
    }, [])

    const fetchRecentProperties = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('properties')
            .select('*, area:areas(name)')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            setErrorMessage(getErrorMessage(error))
        } else {
            setProperties(data || [])
        }
        setLoading(false)
    }

    const toggleProperty = (id: string) => {
        setSelectedPropertyIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        )
    }

    const handleBroadcast = async () => {
        if (selectedPropertyIds.length === 0) {
            alert('物件を1件以上選択してください。')
            return
        }
        if (!title || !content) {
            alert('タイトルと内容を入力してください。')
            return
        }

        setSending(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            // 1. Create Log Entry
            console.log('Step 1: Creating broadcast log entry...')
            const { data: log, error: logError } = await supabase
                .from('broadcast_logs')
                .insert([{
                    property_ids: selectedPropertyIds,
                    title,
                    content,
                    segment_type: segmentType,
                    segment_value: segmentValue,
                    status: 'pending'
                }])
                .select()
                .single()

            if (logError) {
                console.error('Log creation error:', logError)
                throw logError
            }
            console.log('Log created successfully. ID:', log.id)

            console.log('Step 2: Updating UI and triggering function...')
            setSuccessMessage(`${selectedPropertyIds.length}件の物件情報を配信プロセスに登録しました。`)
            setShowConfirm(false)

            // 2. Trigger Edge Function (Background processing - do not await to avoid UI hang)
            console.log('Step 3: Background triggering broadcast function for ID:', log.id)
            supabase.functions.invoke('process-broadcast', {
                body: { broadcastId: log.id }
            }).then(({ data, error }) => {
                if (error) {
                    console.error('Background trigger error returned:', error)
                    setErrorMessage(`関数呼び出しエラー: ${error.message}`)
                } else {
                    console.log('Background trigger success response:', data)
                }
            }).catch(e => {
                console.error('Background trigger exception caught:', e)
                setErrorMessage(`システム例外: ${e.message}`)
            })

            // Reset form
            setSelectedPropertyIds([])
            setTitle('')
            setContent('')
        } catch (err: any) {
            console.error('Broadcast error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setSending(false)
        }
    }

    const filteredProperties = properties.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.area?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const selectedProperties = properties.filter(p => selectedPropertyIds.includes(p.id))

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden min-h-[600px]">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-navy-secondary flex items-center gap-3">
                        <Bell className="text-navy-primary w-6 h-6" />
                        新着物件一括通知配信
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Property Broadcasting System (LINE & Email)
                    </p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setViewMode('edit')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all",
                            viewMode === 'edit' ? "bg-navy-primary text-white shadow-sm" : "text-slate-500 hover:text-navy-primary"
                        )}
                    >
                        編集
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-black transition-all",
                            viewMode === 'preview' ? "bg-navy-primary text-white shadow-sm" : "text-slate-500 hover:text-navy-primary"
                        )}
                    >
                        プレビュー
                    </button>
                </div>
            </div>

            <div className="p-8">
                {errorMessage && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Panel: Configuration */}
                    <div className={cn("lg:col-span-7 space-y-10", viewMode === 'preview' && "hidden lg:block")}>
                        {/* 1. Property Selection */}
                        <section>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                                1. 通知する物件を選択 ({selectedPropertyIds.length}件選択中)
                            </label>

                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="最近の物件から検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary/20 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {loading ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                                    ))
                                ) : filteredProperties.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => toggleProperty(p.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                                            selectedPropertyIds.includes(p.id)
                                                ? "bg-navy-primary/5 border-navy-primary shadow-sm"
                                                : "bg-white border-slate-100 hover:border-navy-primary/30"
                                        )}
                                    >
                                        <div className="relative">
                                            <img src={p.images?.[0]} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                            {selectedPropertyIds.includes(p.id) && (
                                                <div className="absolute -top-1 -right-1 bg-navy-primary text-white rounded-full p-0.5">
                                                    <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-navy-secondary truncate">{p.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {p.area?.name || 'Unknown Area'} • {p.price?.toLocaleString()} ฿
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* 2. Message Editor */}
                        <section className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    2. メッセージタイトル
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="例: 今週のおすすめ新着物件情報！"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    3. 紹介メッセージ（冒頭）
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="例: パタヤエリアに待望のコンドミニアムが登場しました。詳細をチェックしてください。"
                                    rows={4}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary/20 outline-none transition-all resize-none"
                                />
                            </div>
                        </section>

                        {/* 3. Segmentation */}
                        <section>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                                4. 配信ターゲット設定
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSegmentType('all')}
                                    className={cn(
                                        "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left",
                                        segmentType === 'all' ? "bg-navy-primary/5 border-navy-primary" : "bg-white border-slate-100 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl transition-colors", segmentType === 'all' ? "bg-navy-primary text-white" : "bg-slate-100 text-slate-400")}>
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-navy-secondary">全ユーザー</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">登録済み全ユーザーに配信</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSegmentType('area_favorites')}
                                    className={cn(
                                        "flex items-center gap-4 p-5 rounded-2xl border transition-all text-left",
                                        segmentType === 'area_favorites' ? "bg-navy-primary/5 border-navy-primary" : "bg-white border-slate-100 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl transition-colors", segmentType === 'area_favorites' ? "bg-navy-primary text-white" : "bg-slate-100 text-slate-400")}>
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-navy-secondary">エリア別抽出</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">特定のエリアを好むユーザー</p>
                                    </div>
                                </button>
                            </div>

                            {segmentType === 'area_favorites' && (
                                <div className="mt-4 animate-in fade-in duration-300">
                                    <select
                                        value={segmentValue}
                                        onChange={(e) => setSegmentValue(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary/20 outline-none transition-all"
                                    >
                                        <option value="">エリアを選択してください...</option>
                                        <option value="Pattaya">パタヤ (Pattaya)</option>
                                        <option value="Sriracha">シラチャ (Sriracha)</option>
                                        <option value="Bangkok">バンコク (Bangkok)</option>
                                    </select>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Panel: Preview & Submit */}
                    <div className={cn("lg:col-span-5 space-y-8", viewMode === 'edit' && "hidden lg:block")}>
                        {/* LINE Flex Message Preview */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={14} className="text-emerald-500" />
                                LINE Flex Message Preview
                            </label>

                            <div className="bg-slate-100 rounded-[2rem] p-6 max-w-[320px] mx-auto shadow-inner border border-slate-200">
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                                    {selectedProperties[0] ? (
                                        <>
                                            <div className="relative aspect-[4/3]">
                                                <img src={selectedProperties[0].images?.[0]} className="w-full h-full object-cover" />
                                                <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                                                    New Listing
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                <h4 className="text-sm font-black text-navy-secondary line-clamp-1">{selectedProperties[0].title}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-black text-navy-primary">{selectedProperties[0].price?.toLocaleString()} ฿</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{selectedProperties[0].area?.name}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-bold line-clamp-2 leading-relaxed h-8">
                                                    {content || "メッセージ内容がここに表示されます..."}
                                                </p>
                                                <div className="pt-2">
                                                    <button className="w-full py-3 bg-navy-primary text-white rounded-xl text-xs font-black shadow-lg shadow-navy-primary/20">
                                                        詳細を見る
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="aspect-[4/3] flex flex-col items-center justify-center bg-slate-50 text-slate-300 p-8 text-center">
                                            <Eye size={32} className="mb-4 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No properties selected</p>
                                        </div>
                                    )}
                                </div>
                                {selectedPropertyIds.length > 1 && (
                                    <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                                        + {selectedPropertyIds.length - 1} more properties in carousel
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Email Preview Snippet */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={14} className="text-navy-primary" />
                                Email Preview
                            </label>
                            <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-6 text-center space-y-4">
                                <div className="text-sm font-black text-navy-secondary">{title || "件名なし"}</div>
                                <div className="h-px bg-slate-200 w-full" />
                                <div className="text-[11px] text-slate-400 font-bold">
                                    {content ? content.substring(0, 50) + "..." : "メール本文の冒頭..."}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4">
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={selectedPropertyIds.length === 0 || !title || sending}
                                className="w-full py-5 bg-navy-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-navy-primary/30 hover:bg-navy-secondary transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                            >
                                {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={18} />}
                                <span>最終確認へ進む</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-8">
                    <div className="absolute inset-0 bg-navy-secondary/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !sending && setShowConfirm(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-500">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="text-xl font-black text-navy-secondary mb-4">配信を確定しますか？</h3>
                            <div className="space-y-3 mb-10 text-sm text-slate-500 font-bold text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex justify-between">
                                    <span>配信物件数</span>
                                    <span className="text-navy-primary">{selectedPropertyIds.length}件</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>配信ターゲット</span>
                                    <span className="text-navy-primary">{segmentType === 'all' ? '全ユーザー' : 'セグメント抽出'}</span>
                                </div>
                                <div className="h-px bg-slate-200 w-full my-2" />
                                <p className="text-[11px] text-amber-600">※ 一度実行すると取り消すことはできません。</p>
                            </div>

                            <div className="flex flex-col space-y-4">
                                <button
                                    onClick={handleBroadcast}
                                    disabled={sending}
                                    className="w-full py-5 bg-navy-primary text-white rounded-2xl font-black text-sm hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20 flex items-center justify-center gap-3"
                                >
                                    {sending && <Loader2 size={18} className="animate-spin" />}
                                    確認して送信を開始する
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={sending}
                                    className="w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
