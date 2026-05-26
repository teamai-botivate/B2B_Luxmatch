'use client';

import { Shield, Award, Camera, Users } from "lucide-react";

type Variant = "BIS Hallmarked" | "Certified" | "Virtual Try-On" | "Staff Assisted";

const config: Record<Variant, { icon: typeof Shield; label: string }> = {
  "BIS Hallmarked": { icon: Shield, label: "BIS Hallmarked" },
  "Certified": { icon: Award, label: "Certified" },
  "Virtual Try-On": { icon: Camera, label: "Virtual Try-On" },
  "Staff Assisted": { icon: Users, label: "Staff Assisted" },
};

export default function TrustBadge({ variant }: { variant: Variant }) {
  const { icon: Icon, label } = config[variant];
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#15803D]/20">
      <Icon className="w-3 h-3 text-[#15803D]" />
      <span className="text-xs font-medium text-[#15803D]">{label}</span>
    </div>
  );
}
