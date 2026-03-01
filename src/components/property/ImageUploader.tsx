'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImageUploaderProps {
    initialImages?: string[]
    onImagesChange: (files: File[]) => void
    maxImages?: number
}

export default function ImageUploader({
    initialImages = [],
    onImagesChange,
    maxImages = 10
}: ImageUploaderProps) {
    const [previews, setPreviews] = useState<string[]>(initialImages)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    // Sync previews when initialImages prop changes (e.g., from AI import)
    useEffect(() => {
        const filePreviews = previews.filter(p => p.startsWith('blob:'))
        setPreviews([...initialImages, ...filePreviews])
    }, [initialImages])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const remainingSlots = maxImages - previews.length
        const filesToAdd = acceptedFiles.slice(0, remainingSlots)

        if (filesToAdd.length === 0) return

        const newFiles = [...selectedFiles, ...filesToAdd]
        setSelectedFiles(newFiles)
        onImagesChange(newFiles)

        const newPreviews = filesToAdd.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])
    }, [previews, selectedFiles, onImagesChange, maxImages])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        },
        maxSize: 5 * 1024 * 1024, // 5MB
    })

    const removeImage = (index: number) => {
        const newPreviews = [...previews]
        URL.revokeObjectURL(newPreviews[index]) // Clean up memory
        newPreviews.splice(index, 1)
        setPreviews(newPreviews)

        // If it was a newly selected file, remove it from the list
        // This is a bit simplified; real-world apps handle initial vs new images differently
        const newFiles = selectedFiles.filter((_, i) => i !== (index - initialImages.length))
        setSelectedFiles(newFiles)
        onImagesChange(newFiles)
    }

    return (
        <div className="space-y-6">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${isDragActive ? 'border-navy-primary bg-navy-primary/5 scale-[1.01]' : 'border-slate-200 hover:border-navy-primary/30 hover:bg-slate-50'
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-navy-primary/10 rounded-2xl flex items-center justify-center mb-4 text-navy-primary">
                        <Upload className="w-8 h-8" />
                    </div>
                    <p className="text-navy-secondary font-black text-lg mb-1">
                        画像をドラッグ＆ドロップ
                    </p>
                    <p className="text-slate-400 text-sm font-medium">
                        またはクリックしてファイルを選択（最大10枚、5MBまで）
                    </p>
                    <p className="text-[10px] text-slate-300 mt-4 uppercase tracking-widest font-bold">
                        SUPPORTED: JPG, PNG, WEBP
                    </p>
                </div>
            </div>

            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {previews.map((preview, index) => (
                        <div key={index} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm">
                            <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="p-2 bg-white text-red-500 rounded-xl shadow-lg hover:scale-110 transition-transform"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {index === 0 && (
                                <div className="absolute top-2 left-2 bg-navy-primary text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-md uppercase tracking-tighter">
                                    Main
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
