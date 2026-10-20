"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Rocket, Check } from "lucide-react";

const WHATSAPP_NUMBER = "6285849551896";

const plans = [
  {
    key: "pro",
    icon: Zap,
    title: "Pro",
    price: "Hubungi via WhatsApp",
    features: ["Upload video hingga 200MB", "Menjadi prioritas server kami"],
  },
  {
    key: "max",
    icon: Rocket,
    title: "Max",
    price: "Hubungi via WhatsApp",
    features: ["Upload video hingga 500MB", "Menjadi prioritas utama di server kami", "Lebih cepat"],
  },
];

export default function UpgradeModal({
  open,
  onClose,
  username,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
}) {
  function goToWhatsapp(plan: string) {
    const text = `Halo, saya @${username} ingin upgrade akun FrameX saya ke paket ${plan}.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-yellow-500/20 bg-zinc-900/95 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Upgrade Paket
              </h2>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => goToWhatsapp(plan.title)}
                  className="text-left rounded-xl border border-zinc-700 hover:border-yellow-400/60 bg-black/40 p-4 transition group"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                      <plan.icon size={15} />
                    </div>
                    <span className="font-semibold">{plan.title}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-zinc-400">
                        <Check size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-3 inline-block text-[11px] text-yellow-400/80 group-hover:text-yellow-400 transition">
                    Chat via WhatsApp untuk upgrade →
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
