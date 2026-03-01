'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    step: number;
    initialMin?: number;
    initialMax?: number;
    onChange: (minPrice: number, maxPrice: number) => void;
    formatValue?: (value: number) => string;
}

export default function PriceRangeSlider({
    min,
    max,
    step,
    initialMin,
    initialMax,
    onChange,
    formatValue = (v) => v.toString()
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

    // Convert to percentage
    const getPercent = useCallback(
        (value: number) => Math.round(((value - min) / (max - min)) * 100),
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
        }, 500); // 500ms delay to prevent too many re-renders/searches

        return () => clearTimeout(timer);
    }, [minValue, maxValue, onChange]);

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

    return (
        <div className="w-full flex flex-col pt-10 pb-4">
            {/* Visual Slider */}
            <div className="relative w-full h-1 bg-slate-200 rounded-full mb-6 mt-4">
                {/* Active Range Line */}
                <div
                    ref={rangeRef}
                    className="absolute h-1 bg-navy-primary rounded-full z-10"
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
                    top: -6px;
                    height: 4px;
                    opacity: 0;
                    z-index: 30;
                    margin: 0;
                  }
                  .dual-slider-input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: auto;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    cursor: pointer;
                  }
                  .dual-slider-input::-moz-range-thumb {
                    pointer-events: auto;
                    width: 20px;
                    height: 20px;
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
                <div className="absolute top-4 left-0 w-full flex justify-between px-1 text-[9px] text-slate-300 font-medium pointer-events-none">
                    <span>{formatValue(min)}</span>
                    <span>{formatValue(min + (max - min) / 2)}</span>
                    <span>{formatValue(max)}</span>
                </div>

                {/* Custom Min Thumb Visual */}
                <div
                    className={`absolute w-5 h-5 bg-white border-2 border-navy-primary rounded-full shadow-md top-1/2 -mt-2.5 -ml-2.5 pointer-events-none transition-transform ${activeThumb === 'min' ? 'scale-110' : ''}`}
                    style={{ left: `${getPercent(minValue)}%`, zIndex: activeThumb === 'min' || minValue > max - step * 2 ? 40 : 30 }}
                />

                {/* Custom Max Thumb Visual */}
                <div
                    className={`absolute w-5 h-5 bg-white border-2 border-navy-primary rounded-full shadow-md top-1/2 -mt-2.5 -ml-2.5 pointer-events-none transition-transform ${activeThumb === 'max' ? 'scale-110' : ''}`}
                    style={{ left: `${getPercent(maxValue)}%`, zIndex: activeThumb === 'max' ? 40 : 30 }}
                />
            </div>

            {/* Values Display */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full">
                    <span className="absolute -top-5 text-[10px] text-slate-400 font-bold">下限</span>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-navy-primary text-center">
                        {formatValue(minValue)}
                    </div>
                </div>
                <span className="text-slate-300 font-black">-</span>
                <div className="relative w-full">
                    <span className="absolute -top-5 text-[10px] text-slate-400 font-bold">上限</span>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-navy-primary text-center">
                        {formatValue(maxValue) === formatValue(max) ? '上限なし' : formatValue(maxValue)}
                    </div>
                </div>
            </div>
        </div>
    );
}
