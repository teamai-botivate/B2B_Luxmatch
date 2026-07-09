'use client';

import Link from "next/link";
import Image from "next/image";
import { Shield, Award, Camera, Users, Sparkles } from "lucide-react";

const trustBadges = [
  { icon: Shield, label: "BIS Hallmarked" },
  { icon: Award, label: "Certified Jewellers" },
  { icon: Camera, label: "Virtual Try-On" },
  { icon: Users, label: "Staff Assisted" },
];

const columns = [
  {
    heading: "Discover",
    links: [
      { label: "Catalog", href: "/catalog" },
      { label: "Collections", href: "/collections" },
      { label: "Virtual Try-On", href: "/try-on" },
      { label: "Style Quiz", href: "/style-quiz" },
      { label: "Size Guide", href: "/size-guide" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Camera Permissions", href: "/help" },
      { label: "Contact Support", href: "/help" },
      { label: "Visit Support", href: "/help" },
    ],
  },
  {
    heading: "For Jewellers",
    links: [
      { label: "Store Portal", href: "/store/login" },
      { label: "Manufacturer Portal", href: "/manufacturer/login" },
      { label: "Staff Portal", href: "/portal" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/" },
      { label: "Terms of Service", href: "/" },
      { label: "Cookie Policy", href: "/" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white" data-testid="footer">
      {/* Trust Badges */}
      <div className="border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <span className="text-sm font-medium text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {columns.map(col => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">{col.heading}</h3>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href}>
                      <span className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="Jewel Factory"
              width={36}
              height={36}
              className="h-9 w-auto object-contain"
            />
            <span className="text-white/30 text-sm">Intelligent Jewellery, Made for You.</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/40">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>Powered by AT Jewellers</span>
            <span className="mx-2">·</span>
            <span>© 2025 Jewel Factory. All rights reserved.</span>
            <span className="mx-2">·</span>
            <Link href="/portal">
              <span className="text-white/20 hover:text-white/40 transition-colors cursor-pointer text-xs">Staff Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
