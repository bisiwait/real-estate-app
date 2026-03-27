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

    useEffect(() => {
        const end = () => setActiveThumb(null);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        return () => {
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
    }, []);

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

    // 2 本の range を重ねるため、デフォルトは MIN を手前に（左つまみが反応する）。
    // ドラッグ中はアクティブ側を最前面にし、トラックは pointer-events:none で貫通させる。
    const minInputZ = activeThumb === 'max' ? 32 : 50;
    const maxInputZ = activeThumb === 'min' ? 32 : 45;

    return (
        <div className="w-full min-w-0 max-w-full flex flex-col pt-6 pb-4">
            {/* Dropdown Selects Row */}
            <div className="flex min-w-0 items-center gap-2 mb-8">
                <div className="relative min-w-0 flex-1">
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

                <span className="shrink-0 text-slate-300 font-black mt-1">~</span>

                <div className="relative min-w-0 flex-1">
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

            {/* Visual Slider: padding では bg が全幅に見えるため、lg 未満は幅を絞った子でトラックを短く表示 */}
            <div className="mb-8 w-full min-w-0">
                <div className="mx-auto w-[82%] min-w-0 max-w-full lg:w-full">
                    <div
                        className="flex flex-col gap-2 px-8 lg:px-4"
                        onMouseLeave={(e) => {
                            if (e.buttons === 0) setActiveThumb(null);
                        }}
                    >
                        {/* 縦方向の余白で大きなつまみがはみ出してもタッチしやすい */}
                        <div className="flex min-h-[64px] w-full min-w-0 items-center">
                            <div className="relative h-1.5 w-full min-w-0 overflow-visible rounded-full bg-slate-100">
                                {/* Active Range Line */}
                                <div
                                    ref={rangeRef}
                                    className="absolute top-0 h-1.5 bg-navy-primary rounded-full z-10"
                                ></div>

                                {/* Min/Max Thumb Inputs（thumb 56px = 十分なターゲットサイズ） */}
                                <style dangerouslySetInnerHTML={{
                                    __html: `
                  .dual-slider-input {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: none;
                    position: absolute;
                    left: 0;
                    right: 0;
                    width: 100%;
                    top: 50%;
                    height: 64px;
                    transform: translateY(-50%);
                    opacity: 0;
                    margin: 0;
                    touch-action: none;
                    box-sizing: border-box;
                  }
                  .dual-slider-input::-webkit-slider-runnable-track {
                    pointer-events: none;
                    height: 6px;
                    border-radius: 9999px;
                  }
                  .dual-slider-input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: auto;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    cursor: pointer;
                    margin-top: -25px;
                    border: none;
                    background: transparent;
                    box-shadow: none;
                  }
                  .dual-slider-input::-moz-range-track {
                    pointer-events: none;
                    height: 6px;
                    border-radius: 9999px;
                  }
                  .dual-slider-input::-moz-range-thumb {
                    pointer-events: auto;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                    background: transparent;
                  }
                `}} />

                                <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={maxValue}
                                    onChange={handleMaxChange}
                                    onPointerDown={() => setActiveThumb('max')}
                                    className="dual-slider-input"
                                    style={{ zIndex: maxInputZ }}
                                />

                                <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={minValue}
                                    onChange={handleMinChange}
                                    onPointerDown={() => setActiveThumb('min')}
                                    className="dual-slider-input"
                                    style={{ zIndex: minInputZ }}
                                />

                                {/* Custom Min Thumb Visual（見た目も操作域に合わせて拡大） */}
                                <div
                                    className={`pointer-events-none absolute top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-navy-primary bg-white shadow-lg transition-transform ${activeThumb === 'min' ? 'scale-110 ring-4 ring-navy-primary/10' : ''}`}
                                    style={{ left: `${getPercent(minValue)}%`, zIndex: minInputZ + 5 }}
                                >
                                    <div className="h-2 w-2 rounded-full bg-navy-primary" />
                                </div>

                                <div
                                    className={`pointer-events-none absolute top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-navy-primary bg-white shadow-lg transition-transform ${activeThumb === 'max' ? 'scale-110 ring-4 ring-navy-primary/10' : ''}`}
                                    style={{ left: `${getPercent(maxValue)}%`, zIndex: maxInputZ + 5 }}
                                >
                                    <div className="h-2 w-2 rounded-full bg-navy-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between px-0 text-[9px] font-black uppercase tracking-tighter text-slate-300">
                            <span>{formatValue(min)}</span>
                            <span className="opacity-0 sm:opacity-100">{formatValue(min + (max - min) / 2)}</span>
                            <span>{formatValue(max)}+</span>
                        </div>
                    </div>
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
