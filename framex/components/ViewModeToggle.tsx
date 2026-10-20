"use client";

import { Monitor, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useViewMode } from "./ViewModeProvider";

export default function ViewModeToggle() {
  const { mode, setMode } = useViewMode();
  const [open, setOpen] = useState(false);

  const options: { key: "auto" | "desktop" | "mobile"; label: string; icon: React.ReactNode }[] = [
    { key: "auto", label: "Otomatis", icon: <span className="text-xs font-bold">A</span> },
    { key: "desktop", label: "Tampilan PC", icon: <Monitor size={16} /> },
    { key: "mobile", label: "Tampilan HP", icon: <Smartphone size={16} /> },
  ];

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 left-0 mb-1 w-44 rounded-xl border border-yellow-500/20 bg-zinc-900/95 backdrop-blur-xl p-1.5 shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]"
          >
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setMode(opt.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  mode === opt.key
                    ? "bg-yellow-400 text-black font-medium"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Ganti tampilan layar"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-500/30 bg-zinc-900/90 backdrop-blur-xl text-yellow-400 shadow-[0_0_30px_-10px_rgba(234,179,8,0.5)] hover:border-yellow-400"
      >
        {mode === "mobile" ? <Smartphone size={18} /> : <Monitor size={18} />}
      </motion.button>
    </div>
  );
}
