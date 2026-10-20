"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";

const STORAGE_KEY = "framex-dismissed-announcement";

export default function AnnouncementBanner() {
  const pathname = usePathname();
  const skip = pathname.startsWith("/login") || pathname.startsWith("/admin");
  const [announcement, setAnnouncement] = useState<{ id: string; text: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (skip) return;
    fetch("/api/announcement")
      .then((r) => r.json())
      .then((data) => {
        if (!data.announcement) return;
        const dismissedId = window.localStorage.getItem(STORAGE_KEY);
        if (dismissedId !== data.announcement.id) {
          setAnnouncement(data.announcement);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [skip]);

  function dismiss() {
    if (announcement) window.localStorage.setItem(STORAGE_KEY, announcement.id);
    setVisible(false);
  }

  if (skip) return null;

  return (
    <AnimatePresence>
      {visible && announcement && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-yellow-400 text-black"
        >
          <div className="flex items-center gap-3 px-4 @lg:px-10 py-2.5 text-sm">
            <Megaphone size={15} className="shrink-0" />
            <p className="flex-1 font-medium">{announcement.text}</p>
            <button onClick={dismiss} className="shrink-0 hover:opacity-70 transition">
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
