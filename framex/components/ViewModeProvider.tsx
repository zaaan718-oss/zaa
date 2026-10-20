"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ViewMode = "auto" | "desktop" | "mobile";

const ViewModeContext = createContext<{
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}>({ mode: "auto", setMode: () => {} });

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("auto");

  useEffect(() => {
    const saved = localStorage.getItem("framex-view-mode") as ViewMode | null;
    if (saved) setModeState(saved);
  }, []);

  const setMode = (m: ViewMode) => {
    setModeState(m);
    localStorage.setItem("framex-view-mode", m);
  };

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      <div
        className={
          mode === "mobile"
            ? "@container mx-auto max-w-[420px] border-x border-yellow-500/10 min-h-screen"
            : mode === "desktop"
            ? "@container min-w-[1024px] min-h-screen"
            : "@container min-h-screen"
        }
      >
        {children}
      </div>
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
