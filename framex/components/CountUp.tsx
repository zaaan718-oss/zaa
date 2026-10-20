"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

function formatCompact(n: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function CountUp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => formatCompact(Math.round(v)));
  const [text, setText] = useState("0");

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [display]);

  return <motion.span>{text}</motion.span>;
}
