'use client'

import React from 'react'
import Script from 'next/script'
// import { ... } from 'recharts' // Removed for bundle optimization

interface ChartProps {
    data: { name: string; count: number }[]
    type: 'bar' | 'pie'
    color?: string
}

export default function AnalyticsCharts({ data, type, color = '#3B82F6' }: ChartProps) {
    const chartRef = React.useRef<HTMLCanvasElement>(null)
    const chartInstance = React.useRef<any>(null)
    const [scriptLoaded, setScriptLoaded] = React.useState(false)

    React.useEffect(() => {
        if (!scriptLoaded || !chartRef.current || !data || data.length === 0 || typeof window.Chart === 'undefined') {
            return
        }

        if (chartInstance.current) {
            chartInstance.current.destroy()
            chartInstance.current = null
        }

        const ctx = chartRef.current.getContext('2d')
        if (!ctx) return

        try {
            chartInstance.current = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map((d) => d.name),
                    datasets: [
                        {
                            label: '件数',
                            data: data.map((d) => d.count),
                            backgroundColor: color,
                            borderRadius: 10,
                            barThickness: 32,
                        },
                    ],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#ffffff',
                            titleColor: '#64748b',
                            bodyColor: '#1e293b',
                            bodyFont: { weight: 'bold' },
                            borderColor: '#f1f5f9',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                        },
                    },
                    scales: {
                        x: { display: false },
                        y: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 10, weight: 'bold' },
                                color: '#64748b',
                            },
                        },
                    },
                },
            })
        } catch (e) {
            console.error('[AnalyticsCharts] Chart.js init failed', e)
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy()
                chartInstance.current = null
            }
        }
    }, [data, scriptLoaded, color])

    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic font-medium">
                データがありません
            </div>
        )
    }

    return (
        <div className="h-full w-full relative">
            <canvas ref={chartRef} />
            <Script 
                src="https://cdn.jsdelivr.net/npm/chart.js" 
                strategy="lazyOnload"
                onLoad={() => setScriptLoaded(true)}
            />
        </div>
    )
}
