'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion } from "motion/react";
import { ImagePlus, X, Star, Upload, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import JewellerLayout from "@/components/layout/JewellerLayout";
import TryOnAssetCalibratorPlaceholder from "@/components/jeweller/TryOnAssetCalibratorPlaceholder";

const CATEGORIES = ["Necklace", "Earrings", "Ring", "Bangle", "Pendant", "Choker"];
const METALS = ["Gold", "Silver", "Platinum", "Rose Gold", "White Gold"];
const PURITIES = ["22K", "18K", "14K", "925", "950"];
const OCCASION_OPTIONS = ["Wedding", "Daily Wear", "Festival", "Anniversary", "Gift"];

const MOCK_THUMBS = [
  "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=300&q=80",
  "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&q=80",
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function splitList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function optionalNumber(value?: string) {
  if (!value?.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface FormValues {
  name: string;
  category: string;
  metal: string;
  purity: string;
  gemstones: string;
  styleTags: string;
  priceMin: string;
  priceMax: string;
  weight: string;
  description: string;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-card-border bg-card p-4 md:p-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [occasions, setOccasions] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>(MOCK_THUMBS);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [tryOnUploaded, setTryOnUploaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>();

  const toggleOccasion = (occ: string) => {
    setOccasions(prev => prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]);
  };

  const removeImage = (i: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== i));
    if (primaryIndex >= i && primaryIndex > 0) setPrimaryIndex(p => p - 1);
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const slugBase = slugify(data.name);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: `${slugBase}-${Date.now().toString(36)}`,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          metal: data.metal || null,
          purity: data.purity || null,
          gemstones: splitList(data.gemstones),
          styleTags: splitList(data.styleTags),
          occasionTags: occasions.map((o) => slugify(o)),
          priceMin: optionalNumber(data.priceMin),
          priceMax: optionalNumber(data.priceMax),
          weightGrams: optionalNumber(data.weight),
          stockCount: 1,
          isActive: true,
          isFeatured: false,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Product creation failed");
      toast({ title: "Product created successfully", description: "Your product is now live on Jewel Factory." });
      router.push("/jeweller/products");
    } catch (e) {
      toast({
        title: "Could not create product",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <JewellerLayout>
      <motion.div className="mx-auto w-full max-w-7xl py-3 sm:py-5 md:py-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="add-product-page">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/jeweller/products")}
            className="p-2 rounded-xl hover:bg-accent transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-medium tracking-tight">Add New Product</h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Fill in the details below to list your product on Jewel Factory</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/*
            Mobile: single column, images section first (order-first)
            Desktop: two-column side by side
          */}
          <div className="flex flex-col items-start gap-4 lg:grid lg:grid-cols-2 lg:gap-5">

            {/* ── RIGHT column: Images (appears FIRST on mobile via order) ── */}
            <div className="space-y-4 w-full lg:order-2">

              {/* Product Images */}
              <SectionCard title="Product Images" subtitle="Add up to 8 photos. First image is shown in search results.">
                {/* Upload drop zone */}
                <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2.5 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Drop images here or tap to browse</p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP · max 10MB each</p>
                  </div>
                </div>

                {/* Thumbnails */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-1">
                    {uploadedImages.map((url, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={url} alt="" className={`w-full h-full object-cover rounded-xl border-2 transition-all ${i === primaryIndex ? "border-primary shadow-sm" : "border-border"}`} />
                        {/* Primary star */}
                        {i === primaryIndex && (
                          <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                            <Star className="w-2.5 h-2.5 text-primary-foreground fill-current" />
                          </span>
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                        {/* Set primary */}
                        {i !== primaryIndex && (
                          <button
                            type="button"
                            onClick={() => setPrimaryIndex(i)}
                            className="absolute inset-0 rounded-xl flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="text-[9px] font-bold bg-black/60 text-white rounded px-1.5 py-0.5">Set primary</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Add more slot */}
                    {uploadedImages.length < 8 && (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                        <ImagePlus className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Try-On Asset */}
              <SectionCard title="Try-On Asset" subtitle="Upload a transparent PNG so customers can virtually try on this piece.">
                {!tryOnUploaded ? (
                  <div
                    className="border-2 border-dashed border-primary/20 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    onClick={() => setTryOnUploaded(true)}
                    data-testid="tryon-upload-zone"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">Upload transparent PNG</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Only .png accepted for AR overlay</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-primary/5 border border-primary/15">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold">jewellery_tryon.png</p>
                          <p className="text-[10px] text-muted-foreground">Uploaded · 2.4 MB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setTryOnUploaded(false)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Remove</button>
                    </div>
                    <TryOnAssetCalibratorPlaceholder />
                  </>
                )}
              </SectionCard>
            </div>

            {/* ── LEFT column: Form fields ── */}
            <div className="space-y-4 w-full lg:order-1">

              {/* Basic Info */}
              <SectionCard title="Basic Information">
                <div>
                  <Label htmlFor="name" className="text-xs font-semibold mb-1.5 block">Product Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g. Kundan Polki Bridal Necklace"
                    className="rounded-xl"
                    {...register("name", { required: "Product name is required" })}
                    data-testid="input-name"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Category <span className="text-destructive">*</span></Label>
                    <Select onValueChange={v => setValue("category", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <input type="hidden" {...register("category", { required: true })} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Metal <span className="text-destructive">*</span></Label>
                    <Select onValueChange={v => setValue("metal", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Metal" /></SelectTrigger>
                      <SelectContent>{METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <input type="hidden" {...register("metal", { required: true })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Purity <span className="text-destructive">*</span></Label>
                    <Select onValueChange={v => setValue("purity", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Purity" /></SelectTrigger>
                      <SelectContent>{PURITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <input type="hidden" {...register("purity", { required: true })} />
                  </div>
                  <div>
                    <Label htmlFor="weight" className="text-xs font-semibold mb-1.5 block">Weight (g)</Label>
                    <Input id="weight" placeholder="e.g. 12" className="rounded-xl" {...register("weight")} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-semibold mb-1.5 block">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Describe the piece, craftsmanship, and what makes it special..."
                    className="rounded-xl resize-none"
                    {...register("description")}
                  />
                </div>
              </SectionCard>

              {/* Pricing */}
              <SectionCard title="Pricing">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="priceMin" className="text-xs font-semibold mb-1.5 block">Min Price (₹) <span className="text-destructive">*</span></Label>
                    <Input
                      id="priceMin" type="number" placeholder="25000" className="rounded-xl"
                      {...register("priceMin", { required: "Required" })}
                      data-testid="input-price-min"
                    />
                    {errors.priceMin && <p className="text-xs text-destructive mt-1">{errors.priceMin.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="priceMax" className="text-xs font-semibold mb-1.5 block">Max Price (₹)</Label>
                    <Input id="priceMax" type="number" placeholder="35000" className="rounded-xl" {...register("priceMax")} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Enter a range if the price varies by customisation or making charges.</p>
              </SectionCard>

              {/* Discovery */}
              <SectionCard title="Discovery & Tags" subtitle="Help customers find your product through search and filters.">
                <div>
                  <Label htmlFor="gemstones" className="text-xs font-semibold mb-1.5 block">Gemstones</Label>
                  <Input id="gemstones" placeholder="e.g. Diamonds, Rubies, Emeralds" className="rounded-xl" {...register("gemstones")} />
                </div>
                <div>
                  <Label htmlFor="styleTags" className="text-xs font-semibold mb-1.5 block">Style Tags</Label>
                  <Input id="styleTags" placeholder="Traditional, Bridal, Contemporary…" className="rounded-xl" {...register("styleTags")} />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Occasion Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {OCCASION_OPTIONS.map(occ => {
                      const active = occasions.includes(occ);
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => toggleOccasion(occ)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          }`}
                          data-testid={`pill-occasion-${occ.toLowerCase().replace(" ", "-")}`}
                        >
                          {active && <span className="mr-1">✓</span>}{occ}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Form actions — sticky on mobile */}
          <div className="sticky bottom-0 z-10 mt-6 -mx-3 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              onClick={() => router.push("/jeweller/products")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-6 bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-save-product"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </motion.div>
    </JewellerLayout>
  );
}
