"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const INTERVAL_MS = 60 * 1000;

export default function Heartbeat() {
  const pathname = usePathname();
  const skip = pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/banned");

  useEffect(() => {
    if (skip) return;

    const ping = () => {
      fetch("/api/heartbeat", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          if (data?.banned) {
            // Akun baru kena ban selagi user lagi browsing - langsung
            // logout paksa otomatis, gak perlu aksi manual dari user.
            window.location.href = "/api/force-logout";
          }
        })
        .catch(() => {});
    };

    ping();
    const interval = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [skip]);

  return null;
}
