"use client";

import { useSettings } from "@/components/SettingsProvider";
import ParticleNetwork from "@/components/ParticleNetwork";

export default function GlobalBackground() {
  const { networkBackground } = useSettings();
  if (!networkBackground) return null;
  return <ParticleNetwork fixed accent="yellow" />;
}
