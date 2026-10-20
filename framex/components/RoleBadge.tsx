import { CheckCircle2 } from "lucide-react";

type Role = "user" | "developer" | "admin";
type Plan = "free" | "pro" | "max";

export default function RoleBadge({ role, plan }: { role: Role; plan: Plan }) {
  if (role === "developer" || role === "admin") {
    const color = role === "admin" ? "text-yellow-400" : "text-emerald-400";
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${color}`}>
        {role}
        <CheckCircle2 size={12} className={color} fill="currentColor" fillOpacity={0.15} />
      </span>
    );
  }

  return (
    <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full px-1.5 py-0.5">
      user {plan}
    </span>
  );
}
