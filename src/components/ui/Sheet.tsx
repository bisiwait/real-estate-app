"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, ReactNode } from "react";
import Portal from "./Portal";

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}

export default function Sheet({ isOpen, onClose, title, description, children }: SheetProps) {
    // Escape key to close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        }
        return () => {
            document.body.style.overflow = "unset";
            document.body.style.touchAction = "auto";
        };
    }, [isOpen]);

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex justify-end">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-navy-secondary/60 backdrop-blur-sm pointer-events-auto"
                        />

                        {/* Side Panel (Right) */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-white shadow-2xl z-[10000] flex flex-col h-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 md:p-8 border-b border-slate-100 shrink-0 flex items-start justify-between bg-white">
                                <div>
                                    <h2 className="text-2xl font-black text-navy-secondary tracking-tight leading-tight">{title}</h2>
                                    {description && <p className="text-sm text-slate-400 font-bold mt-2">{description}</p>}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-navy-secondary focus:outline-none focus:ring-2 focus:ring-navy-primary/10"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            {/* Scrollable Body - Absolute scrollable area to ensure it works in all browsers */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 bg-white">
                                <div className="min-h-full pb-10">
                                    {children}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
}
