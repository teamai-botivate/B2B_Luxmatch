'use client';

import { useState } from "react";
import { Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type JewelleryType = "necklace" | "earring_left" | "earring_right" | "ring_index" | "ring_middle" | "bangle";

interface TryOnAssetCalibratorPlaceholderProps {
  jewelleryType?: JewelleryType;
  productName?: string;
}

const TYPE_OPTIONS: { value: JewelleryType; label: string }[] = [
  { value: "necklace", label: "Necklace" },
  { value: "earring_left", label: "Earring (Left)" },
  { value: "earring_right", label: "Earring (Right)" },
  { value: "ring_index", label: "Ring (Index)" },
  { value: "ring_middle", label: "Ring (Middle)" },
  { value: "bangle", label: "Bangle" },
];

export default function TryOnAssetCalibratorPlaceholder({
  jewelleryType = "necklace",
  productName,
}: TryOnAssetCalibratorPlaceholderProps) {
  const { toast } = useToast();
  const [type, setType] = useState<JewelleryType>(jewelleryType);
  const [pivotX, setPivotX] = useState(0.5);
  const [pivotY, setPivotY] = useState(0.5);
  const [offsetX, setOffsetX] = useState([0]);
  const [offsetY, setOffsetY] = useState([0]);
  const [scale, setScale] = useState([1.0]);
  const [rotation, setRotation] = useState([0]);
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [active, setActive] = useState(true);

  const placeholderBoxStyle: Record<JewelleryType, { top: string; left: string; width: string; height: string }> = {
    necklace: { top: "45%", left: "30%", width: "40%", height: "14%" },
    earring_left: { top: "30%", left: "20%", width: "14%", height: "18%" },
    earring_right: { top: "30%", left: "66%", width: "14%", height: "18%" },
    ring_index: { top: "62%", left: "44%", width: "12%", height: "16%" },
    ring_middle: { top: "62%", left: "57%", width: "12%", height: "16%" },
    bangle: { top: "70%", left: "28%", width: "44%", height: "12%" },
  };

  const box = placeholderBoxStyle[type];

  return (
    <div className="space-y-4" data-testid="tryon-calibrator">
      {productName && (
        <p className="text-sm text-muted-foreground">
          Calibrating: <span className="font-medium text-foreground">{productName}</span>
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left — Preview panel */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] border border-border"
            style={{ aspectRatio: "3/4" }}
          >
            {/* Silhouette SVG */}
            <svg viewBox="0 0 200 260" className="absolute inset-0 w-full h-full opacity-20" fill="none">
              <ellipse cx="100" cy="50" rx="28" ry="32" fill="#C9A84C" />
              <rect x="72" y="78" width="56" height="90" rx="12" fill="#C9A84C" />
              <rect x="48" y="82" width="24" height="70" rx="10" fill="#C9A84C" />
              <rect x="128" y="82" width="24" height="70" rx="10" fill="#C9A84C" />
              <rect x="78" y="168" width="20" height="80" rx="8" fill="#C9A84C" />
              <rect x="102" y="168" width="20" height="80" rx="8" fill="#C9A84C" />
            </svg>

            {/* Jewellery placement box */}
            <div
              className="absolute border-2 border-[#C9A84C] rounded-md bg-[#C9A84C]/10"
              style={box}
            />

            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-[10px] text-white/30">Preview updates in real time</span>
            </div>
          </div>
        </div>

        {/* Right — Controls panel */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Controls</p>

          {/* Jewellery type */}
          <div>
            <Label className="text-xs mb-2 block">Jewellery Type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                    type === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <input type="radio" className="sr-only" checked={type === opt.value} onChange={() => setType(opt.value)} />
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${type === opt.value ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Pivot point */}
          <div>
            <Label className="text-xs mb-2 block">Pivot Point</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">X (0–1)</p>
                <Input
                  type="number" min={0} max={1} step={0.01}
                  value={pivotX} onChange={e => setPivotX(Number(e.target.value))}
                  className="rounded-xl text-xs h-8"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Y (0–1)</p>
                <Input
                  type="number" min={0} max={1} step={0.01}
                  value={pivotY} onChange={e => setPivotY(Number(e.target.value))}
                  className="rounded-xl text-xs h-8"
                />
              </div>
            </div>
          </div>

          {/* Offsets */}
          <div>
            <Label className="text-xs mb-2 block">X Offset: <span className="text-primary font-semibold">{offsetX[0]!}px</span></Label>
            <Slider min={-100} max={100} step={1} value={offsetX} onValueChange={setOffsetX} />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Y Offset: <span className="text-primary font-semibold">{offsetY[0]!}px</span></Label>
            <Slider min={-100} max={100} step={1} value={offsetY} onValueChange={setOffsetY} />
          </div>

          {/* Scale */}
          <div>
            <Label className="text-xs mb-2 block">Scale: <span className="text-primary font-semibold">{scale[0]!.toFixed(2)}×</span></Label>
            <Slider min={0.5} max={3} step={0.05} value={scale} onValueChange={setScale} />
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-xs mb-2 block">Rotation: <span className="text-primary font-semibold">{rotation[0]!}°</span></Label>
            <Slider min={-180} max={180} step={1} value={rotation} onValueChange={setRotation} />
          </div>

          {/* Dimensions */}
          <div>
            <Label className="text-xs mb-2 block">Physical Size (mm)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Width" value={widthMm} onChange={e => setWidthMm(e.target.value)} className="rounded-xl text-xs h-8" />
              <Input type="number" placeholder="Height" value={heightMm} onChange={e => setHeightMm(e.target.value)} className="rounded-xl text-xs h-8" />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs">Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          className="rounded-full text-sm"
          onClick={() => {
            setOffsetX([0]); setOffsetY([0]); setScale([1]); setRotation([0]); setPivotX(0.5); setPivotY(0.5);
            toast({ title: "Defaults restored" });
          }}
        >
          Reset Defaults
        </Button>
        <Button
          className="rounded-full bg-primary text-primary-foreground text-sm"
          onClick={() => toast({ title: "Calibration saved", description: "Settings have been saved for this product." })}
        >
          Save Calibration
        </Button>
      </div>

      {/* Phase info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Calibration tools will be fully functional in Phase 7. Preview rendering requires MediaPipe integration.
        </p>
      </div>
    </div>
  );
}
