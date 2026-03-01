import { ReactNode } from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-navy-primary mb-2">{title}</h2>
                {subtitle && <p className="text-gray-600">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
