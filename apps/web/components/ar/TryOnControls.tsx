'use client';

import { X, RotateCcw, Camera } from "lucide-react";
import { motion } from "motion/react";

interface TryOnControlsProps {
  onCapture: () => void;
  onReset: () => void;
  onClose: () => void;
  hintMessage?: string;
  status?: "loading" | "ready" | "tracking" | "low-confidence" | "captured";
  confidence?: number;
}

function confidenceColor(c: number) {
  if (c >= 80) return "text-green-400 bg-green-400/20";
  if (c >= 50) return "text-amber-400 bg-amber-400/20";
  return "text-red-400 bg-red-400/20";
}

export default function TryOnControls({
  onCapture,
  onReset,
  onClose,
  hintMessage,
  status = "ready",
  confidence,
}: TryOnControlsProps) {
  const glassBtnCls = "flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors";

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="try-on-controls">
      {/* Top row */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-3 left-0 right-0 flex items-start justify-between px-4 pointer-events-auto"
      >
        <button className={`${glassBtnCls} w-10 h-10`} onClick={onClose} aria-label="Close">
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Hint banner */}
        {hintMessage && (
          <div className="flex-1 mx-3 mt-1 flex justify-center">
            <span className="bg-black/50 backdrop-blur-md text-white/90 text-[11px] font-medium px-4 py-1.5 rounded-full border border-white/10">
              {hintMessage}
            </span>
          </div>
        )}

        <button className={`${glassBtnCls} w-10 h-10`} onClick={onReset} aria-label="Reset">
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </motion.div>

      {/* Bottom row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute bottom-8 left-0 right-0 flex items-end justify-center px-4 pointer-events-auto"
      >
        {/* Confidence badge — bottom right */}
        {confidence !== undefined && (
          <div className={`absolute right-4 bottom-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${confidenceColor(confidence)}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {confidence}%
          </div>
        )}

        {/* Capture button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={onCapture}
          disabled={status === "loading" || status === "low-confidence"}
          aria-label="Capture"
          data-testid="button-capture"
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: status === "captured" ? "#22c55e" : "#C9A84C" }}
        >
          {status === "loading" ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
