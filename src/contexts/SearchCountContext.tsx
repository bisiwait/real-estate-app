"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type SearchCountContextValue = {
  propertiesHitCount: number | null;
  setPropertiesHitCount: (count: number | null) => void;
};

const SearchCountContext = createContext<SearchCountContextValue | null>(null);

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

export function useSearchCount() {
  const ctx = useContext(SearchCountContext);
  if (!ctx) {
    throw new Error("useSearchCount must be used within SearchCountProvider");
  }
  return ctx;
}

