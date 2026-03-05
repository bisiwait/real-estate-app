"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, ReactNode } from "react";
import Portal from "./Portal";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
}

export default function Dialog({ isOpen, onClose, title, description, children }: DialogProps) {
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
                    <div className="fixed inset-0 z-[9999] overflow-y-auto">
                        {/* Backdrop - fixed to screen */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-navy-secondary/60 backdrop-blur-sm pointer-events-auto"
                        />

                        {/* Content wrapper with flex alignment */}
                        <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-8">
                            {/* Modal Content */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 z-[10000] my-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-6 md:p-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="pr-6">
                                            <h2 className="text-2xl md:text-3xl font-black text-navy-secondary tracking-tight leading-tight">{title}</h2>
                                            {description && <p className="text-sm text-slate-400 font-bold mt-2">{description}</p>}
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-navy-secondary shrink-0 focus:outline-none"
                                        >
                                            <X size={28} />
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {children}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
}
