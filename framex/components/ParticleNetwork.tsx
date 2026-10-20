"use client";

import { useEffect, useRef } from "react";

const COUNT = 140;
const LINK_DIST = 78;
const STICK_RADIUS = 130;
const MAX_STICK = 5; // cuma beberapa titik terdekat yang nempel ke kursor

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Props {
  // true = nempel di seluruh viewport di belakang semua konten (dipakai buat
  // background global dari pengaturan). false (default) = ngisi parent
  // "relative"-nya aja, kayak pemakaian lama di halaman /banned.
  fixed?: boolean;
  // "red" (default, dipakai /banned - kesan warning) atau "yellow" (warna
  // brand FrameX, dipakai buat background umum di seluruh web).
  accent?: "red" | "yellow";
}

export default function ParticleNetwork({ fixed = false, accent = "red" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stickColor = accent === "yellow" ? "234,179,8" : "239,68,68";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const points: Point[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    const pointer = { x: -9999, y: -9999, active: false };

    function onMove(e: MouseEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }
    function onLeave() {
      pointer.active = false;
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      pointer.x = t.clientX;
      pointer.y = t.clientY;
      pointer.active = true;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave);

    let raf = 0;
    function step() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      }

      // Jaring antar titik terdekat
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(234,179,8,${(1 - d / LINK_DIST) * 0.28})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      // Cuma MAX_STICK titik TERDEKAT yang ketarik & nyambung ke kursor,
      // sisanya tetap gerak bebas - biar gak semua jaring narik ke kursor.
      if (pointer.active) {
        const near = points
          .map((p) => ({ p, d: Math.hypot(pointer.x - p.x, pointer.y - p.y) }))
          .filter((o) => o.d < STICK_RADIUS)
          .sort((a, b) => a.d - b.d)
          .slice(0, MAX_STICK);

        for (const { p, d } of near) {
          p.x += (pointer.x - p.x) * 0.07;
          p.y += (pointer.y - p.y) * 0.07;
          ctx.strokeStyle = `rgba(${stickColor},${(1 - d / STICK_RADIUS) * 0.75})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${stickColor},0.9)`;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of points) {
        ctx.fillStyle = "rgba(245,245,245,0.75)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    }
    step();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={
        fixed
          ? "fixed inset-0 w-screen h-screen -z-10 pointer-events-none"
          : "absolute inset-0 w-full h-full pointer-events-none"
      }
      aria-hidden="true"
    />
  );
}
