'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RING_SIZES = [
  { indian: "1", us: "1", diameter: "12.04", circumference: "37.8" },
  { indian: "4", us: "4", diameter: "14.86", circumference: "46.7" },
  { indian: "6", us: "6", diameter: "16.51", circumference: "51.9" },
  { indian: "8", us: "8", diameter: "18.14", circumference: "57.0" },
  { indian: "10", us: "10", diameter: "19.76", circumference: "62.1" },
  { indian: "12", us: "12", diameter: "21.39", circumference: "67.2" },
  { indian: "14", us: "14", diameter: "23.01", circumference: "72.3" },
  { indian: "16", us: "16", diameter: "24.64", circumference: "77.4" },
];

const BANGLE_SIZES = [
  { size: "2/2", innerDiameter: "51", wristCircumference: "140–150" },
  { size: "2/4", innerDiameter: "54", wristCircumference: "150–160" },
  { size: "2/6", innerDiameter: "57", wristCircumference: "160–170" },
  { size: "2/8", innerDiameter: "60", wristCircumference: "170–180" },
  { size: "2/10", innerDiameter: "63", wristCircumference: "180–190" },
  { size: "2/12", innerDiameter: "66", wristCircumference: "190–200" },
];

export default function SizeGuidePage() {
  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="size-guide-page">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Reference</p>
          <h1 className="text-3xl font-medium tracking-tight">Size Guide</h1>
          <p className="text-muted-foreground mt-2">Find your perfect fit with our comprehensive sizing charts.</p>
        </motion.div>

        <Tabs defaultValue="rings">
          <TabsList className="mb-6 rounded-xl">
            <TabsTrigger value="rings" className="rounded-xl" data-testid="tab-rings">Ring Sizes</TabsTrigger>
            <TabsTrigger value="bangles" className="rounded-xl" data-testid="tab-bangles">Bangle Sizes</TabsTrigger>
          </TabsList>
          <TabsContent value="rings">
            <div className="rounded-2xl border border-border overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {["Indian Size", "US Size", "Diameter (mm)", "Circumference (mm)"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RING_SIZES.map((row, i) => (
                    <tr key={row.indian} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-3 font-semibold">{row.indian}</td>
                      <td className="px-4 py-3">{row.us}</td>
                      <td className="px-4 py-3">{row.diameter}</td>
                      <td className="px-4 py-3">{row.circumference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl bg-accent/40 p-6">
              <h3 className="text-base font-semibold mb-3">How to Measure Your Ring Size</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Wrap a thin strip of paper around the base of your finger.</li>
                <li>Mark where the paper overlaps with a pen.</li>
                <li>Measure the length of the paper in millimetres — this is your circumference.</li>
                <li>Match to the nearest circumference in the table above.</li>
              </ol>
            </div>
          </TabsContent>
          <TabsContent value="bangles">
            <div className="rounded-2xl border border-border overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {["Size", "Inner Diameter (mm)", "Wrist Circumference (mm)"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BANGLE_SIZES.map((row, i) => (
                    <tr key={row.size} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-3 font-semibold">{row.size}</td>
                      <td className="px-4 py-3">{row.innerDiameter}</td>
                      <td className="px-4 py-3">{row.wristCircumference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl bg-accent/40 p-6">
              <h3 className="text-base font-semibold mb-3">How to Measure Your Wrist</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Wrap a measuring tape around your wrist at the point where you wear bangles.</li>
                <li>Note the measurement in millimetres.</li>
                <li>Add 10–15mm for comfort, then match to the table.</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </CustomerLayout>

  );
}
