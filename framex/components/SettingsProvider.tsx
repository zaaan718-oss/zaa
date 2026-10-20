"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "framex-bg-network";

const SettingsContext = createContext<{
  networkBackground: boolean;
  setNetworkBackground: (v: boolean) => void;
}>({ networkBackground: false, setNetworkBackground: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [networkBackground, setState] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setState(saved === "1");
  }, []);

  function setNetworkBackground(v: boolean) {
    setState(v);
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }

  return (
    <SettingsContext.Provider value={{ networkBackground, setNetworkBackground }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
