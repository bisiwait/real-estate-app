"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type SearchCountContextValue = {
  propertiesHitCount: number | null;
  setPropertiesHitCount: (count: number | null) => void;
};

const noopSetCount = () => {};

const defaultSearchCountValue: SearchCountContextValue = {
  propertiesHitCount: null,
  setPropertiesHitCount: noopSetCount,
};

const SearchCountContext = createContext<SearchCountContextValue>(defaultSearchCountValue);

export function SearchCountProvider({ children }: { children: React.ReactNode }) {
  const [propertiesHitCount, setCount] = useState<number | null>(null);

  const setPropertiesHitCount = useCallback((count: number | null) => {
    setCount(typeof count === "number" && Number.isFinite(count) ? count : null);
  }, []);

  const value = useMemo(
    () => ({ propertiesHitCount, setPropertiesHitCount }),
    [propertiesHitCount, setPropertiesHitCount]
  );

  return <SearchCountContext.Provider value={value}>{children}</SearchCountContext.Provider>;
}

/** Provider 外では no-op（レンダーツリー境界のずれで全体が落ちるのを防ぐ） */
export function useSearchCount() {
  return useContext(SearchCountContext);
}

