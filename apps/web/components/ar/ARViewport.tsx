'use client';

import { Camera } from "lucide-react";
import { motion } from "motion/react";

interface ARViewportProps {
  className?: string;
}

export default function ARViewport({ className = "" }: ARViewportProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      data-testid="ar-viewport"
    >
      {/* Animated gold shimmer border */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, rgba(201,168,76,0.3) 25%, transparent 50%, rgba(201,168,76,0.3) 75%, transparent 100%)",
          padding: "1px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}
        >
          <Camera className="w-12 h-12" style={{ color: "#C9A84C" }} />
        </motion.div>
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Virtual Try-On</h2>
          <p className="text-sm text-white/60 max-w-xs leading-relaxed">
            Camera-based AR try-on coming soon — you'll be able to see jewellery on yourself in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-xs font-medium text-[#C9A84C]">Phase 6 — Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
