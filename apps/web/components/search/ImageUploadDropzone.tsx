'use client';

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImageUploadDropzoneProps {
  onResults?: () => void;
  onSearch?: (file: File) => Promise<void> | void;
  loadingLabel?: string;
}

type State = "idle" | "dragging" | "preview" | "loading" | "done";

export default function ImageUploadDropzone({
  onResults,
  onSearch,
  loadingLabel = "Searching for similar items...",
}: ImageUploadDropzoneProps) {
  const [state, setState] = useState<State>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.match(/image\/(jpeg|png|webp)/)) return;
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreview(url);
    setState("preview");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSearch = async () => {
    if (!selectedFile) return;
    setState("loading");
    try {
      await onSearch?.(selectedFile);
      setState("done");
      onResults?.();
    } catch {
      setState("preview");
    }
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full" data-testid="image-upload-dropzone">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        data-testid="input-image-upload"
      />

      <AnimatePresence mode="wait">
        {state === "idle" || state === "dragging" ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
            onDragLeave={() => setState("idle")}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${state === "dragging" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${state === "dragging" ? "bg-primary/20" : "bg-accent"}`}>
              <Camera className={`w-7 h-7 ${state === "dragging" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop an image or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP accepted</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Upload className="w-3.5 h-3.5" />
              <span>Browse files</span>
            </div>
          </motion.div>
        ) : state === "preview" ? (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative rounded-2xl overflow-hidden border border-border">
            {preview && <img src={preview} alt="Upload preview" className="w-full max-h-64 object-cover" />}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
              <button onClick={reset} className="text-white/80 hover:text-white text-xs flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
              <button onClick={handleSearch} className="text-xs font-semibold px-4 py-2 rounded-full text-primary-foreground" style={{ background: "#C9A84C" }} data-testid="button-visual-search">
                Search Similar
              </button>
            </div>
          </motion.div>
        ) : state === "loading" ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 p-10 rounded-2xl border border-border bg-muted/30">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{loadingLabel}</p>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-2xl overflow-hidden border-2 border-primary">
            {preview && <img src={preview} alt="Search image" className="w-full max-h-64 object-cover opacity-70" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 rounded-2xl px-4 py-2 text-sm font-semibold text-primary">Results found</div>
            </div>
            <button onClick={reset} className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
