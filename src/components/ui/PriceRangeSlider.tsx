'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    step: number;
    initialMin?: number;
    initialMax?: number;
    onChange: (minPrice: number, maxPrice: number) => void;
    formatValue?: (value: number) => string;
    /** URL 同期までの待ち（ms）。小さいほど反応が速い */
    debounceMs?: number;
}

export default function PriceRangeSlider({
    min,
    max,
    step,
    initialMin,
    initialMax,
    onChange,
    formatValue = (v) => v.toString(),
    debounceMs = 200,
}: PriceRangeSliderProps) {
    const [minValue, setMinValue] = useState(initialMin ?? min);
    const [maxValue, setMaxValue] = useState(initialMax ?? max);
    const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

    const minValRef = useRef(initialMin ?? min);
    const maxValRef = useRef(initialMax ?? max);
    const rangeRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    // Effect to handle external resets (e.g., clearing filters)
    useEffect(() => {
        if (!isInitialMount.current && initialMin === undefined && initialMax === undefined) {
            setMinValue(min);
            setMaxValue(max);
            minValRef.current = min;
            maxValRef.current = max;
        }
    }, [initialMin, initialMax, min, max]);

    // Convert to percentage（max === min 時は除算を避ける）
    const getPercent = useCallback(
        (value: number) => {
            const span = max - min;
            if (span <= 0) return 0;
            return Math.round(((value - min) / span) * 100);
        },
        [min, max]
    );

    // Set width of the range to decrease from the left side
    useEffect(() => {
        const minPercent = getPercent(minValue);
        const maxPercent = getPercent(maxValRef.current);

        if (rangeRef.current) {
            rangeRef.current.style.left = `${minPercent}%`;
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minValue, getPercent]);

    // Set width of the range to decrease from the right side
    useEffect(() => {
        const minPercent = getPercent(minValRef.current);
        const maxPercent = getPercent(maxValue);

        if (rangeRef.current) {
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxValue, getPercent]);

    // Debounced onChange
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            onChange(minValue, maxValue);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [minValue, maxValue, onChange, debounceMs]);

    // React to prop changes (e.g. switching between rent and sell tabs)
    useEffect(() => {
        if (initialMin !== undefined && initialMin >= min && initialMin <= max) {
            setMinValue(initialMin);
            minValRef.current = initialMin;
        } else {
            setMinValue(min);
            minValRef.current = min;
        }

        if (initialMax !== undefined && initialMax >= min && initialMax <= max) {
            setMaxValue(initialMax);
            maxValRef.current = initialMax;
        } else {
            setMaxValue(max);
            maxValRef.current = max;
        }
    }, [initialMin, initialMax, min, max]);

    const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.min(Number(event.target.value), maxValue - step);
        setMinValue(value);
        minValRef.current = value;
    };

    const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(Number(event.target.value), minValue + step);
        setMaxValue(value);
        maxValRef.current = value;
    };

    // Generate price options for the dropdown
    const priceOptions = useMemo(() => {
        const options = [];
        for (let i = min; i <= max; i += step) {
            options.push(i);
        }
        // Ensure max is always included if step doesn't land on it perfectly
        if (options[options.length - 1] !== max) {
            options.push(max);
        }
        return options;
    }, [min, max, step]);

    return (
        <div className="w-full flex flex-col pt-6 pb-4">
            {/* Dropdown Selects Row */}
            <div className="flex items-center gap-2 mb-8">
                <div className="relative flex-1">
                    <span className="absolute -top-5 left-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">Price Min</span>
                    <select
                        value={minValue}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            const nextMin = Math.min(val, maxValue - step);
                            setMinValue(nextMin);
                            minValRef.current = nextMin;
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-bold text-navy-secondary outline-none focus:ring-2 focus:ring-navy-primary appearance-none cursor-pointer"
                    >
                        {priceOptions.map((option: number) => (
                            <option key={`min-${option}`} value={option} disabled={option > maxValue - step}>
                                {formatValue(option)}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                <span className="text-slate-300 font-black mt-1">~</span>

                <div className="relative flex-1">
                    <span className="absolute -top-5 left-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">Price Max</span>
                    <select
                        value={maxValue}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            const nextMax = Math.max(val, minValue + step);
                            setMaxValue(nextMax);
                            maxValRef.current = nextMax;
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-bold text-navy-secondary outline-none focus:ring-2 focus:ring-navy-primary appearance-none cursor-pointer"
                    >
                        {priceOptions.map((option: number) => (
                            <option key={`max-${option}`} value={option} disabled={option < minValue + step}>
                                {option === max ? '上限なし' : formatValue(option)}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* Visual Slider */}
            <div className="relative w-full h-1.5 bg-slate-100 rounded-full mb-8 px-1">
                {/* Active Range Line */}
                <div
                    ref={rangeRef}
                    className="absolute h-1.5 bg-navy-primary rounded-full z-10"
                ></div>

                {/* Min/Max Thumb Inputs overlays */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                  .dual-slider-input {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: none;
                    position: absolute;
                    width: 100%;
                    top: -10px;
                    height: 20px;
                    opacity: 0;
                    z-index: 30;
                    margin: 0;
                  }
                  .dual-slider-input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: auto;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                  }
                  .dual-slider-input::-moz-range-thumb {
                    pointer-events: auto;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                  }
                `}} />

                {/* Min Thumb Input */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minValue}
                    onChange={handleMinChange}
                    onMouseOver={() => setActiveThumb('min')}
                    onMouseLeave={() => setActiveThumb(null)}
                    onTouchStart={() => setActiveThumb('min')}
                    onTouchEnd={() => setActiveThumb(null)}
                    className="dual-slider-input"
                    style={{ zIndex: activeThumb === 'min' || minValue > max - step * 2 ? 40 : 30 }}
                />

                {/* Max Thumb Input */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxValue}
                    onChange={handleMaxChange}
                    onMouseOver={() => setActiveThumb('max')}
                    onMouseLeave={() => setActiveThumb(null)}
                    onTouchStart={() => setActiveThumb('max')}
                    onTouchEnd={() => setActiveThumb(null)}
                    className="dual-slider-input"
                    style={{ zIndex: activeThumb === 'max' ? 40 : 30 }}
                />

                {/* Tick marks */}
                <div className="absolute top-5 left-0 w-full flex justify-between px-1 text-[9px] text-slate-300 font-black pointer-events-none uppercase tracking-tighter">
                    <span>{formatValue(min)}</span>
                    <span className="opacity-0 sm:opacity-100">{formatValue(min + (max - min) / 2)}</span>
                    <span>{formatValue(max)}+</span>
                </div>

                {/* Custom Min Thumb Visual */}
                <div
                    className={`absolute w-6 h-6 bg-white border-2 border-navy-primary rounded-full shadow-lg top-1/2 -mt-3 -ml-3 pointer-events-none transition-all flex items-center justify-center ${activeThumb === 'min' ? 'scale-125 ring-4 ring-navy-primary/10' : ''}`}
                    style={{ left: `${getPercent(minValue)}%`, zIndex: activeThumb === 'min' || minValue > max - step * 2 ? 40 : 30 }}
                >
                    <div className="w-1.5 h-1.5 bg-navy-primary rounded-full" />
                </div>

                {/* Custom Max Thumb Visual */}
                <div
                    className={`absolute w-6 h-6 bg-white border-2 border-navy-primary rounded-full shadow-lg top-1/2 -mt-3 -ml-3 pointer-events-none transition-all flex items-center justify-center ${activeThumb === 'max' ? 'scale-125 ring-4 ring-navy-primary/10' : ''}`}
                    style={{ left: `${getPercent(maxValue)}%`, zIndex: activeThumb === 'max' ? 40 : 30 }}
                >
                    <div className="w-1.5 h-1.5 bg-navy-primary rounded-full" />
                </div>
            </div>

            {/* Current Range Note */}
            <div className="mt-2 text-center">
                <p className="text-[11px] font-bold text-slate-400">
                    選択中: <span className="text-navy-primary">{formatValue(minValue)}</span> 〜 <span className="text-navy-primary">{maxValue === max ? '上限なし' : formatValue(maxValue)}</span>
                </p>
            </div>
        </div>
    );
}
