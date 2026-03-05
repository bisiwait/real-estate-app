"use client";

import { motion } from "framer-motion";

interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
}

export default function Switch({ checked, onCheckedChange, label }: SwitchProps) {
    return (
        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onCheckedChange(!checked)}>
            {label && <span className="text-sm font-bold text-navy-secondary select-none">{label}</span>}
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-navy-primary' : 'bg-slate-200'}`}>
                <motion.div
                    animate={{ x: checked ? 22 : 2 }}
                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </div>
        </div>
    );
}
