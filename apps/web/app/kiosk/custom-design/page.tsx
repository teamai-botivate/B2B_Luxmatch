'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, PencilLine, Upload, X, ImageIcon } from 'lucide-react';

import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
  'Necklace',
  'Earrings',
  'Ring',
  'Bangle',
  'Pendant',
  'Choker',
  'Bracelet',
  'Other',
];

const PURITY_OPTIONS = ['24K', '22K', '18K', '14K', '10K', '916', '750', '585'];


type FormState = {
  customerNaam: string;
  customerPhone: string;
  category: string;
  weightGrams: string;
  purity: string;
  notes: string;
  referenceImageUrl: string;
};

const EMPTY_FORM: FormState = {
  customerNaam: '',
  customerPhone: '',
  category: '',
  weightGrams: '',
  purity: '',
  notes: '',
  referenceImageUrl: '',
};

export default function CustomDesignPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedImagePreview(dataUrl);
      // Store data URL as referenceImageUrl — backend accepts it as a URL string
      set('referenceImageUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setUploadedImagePreview(null);
    set('referenceImageUrl', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customerNaam.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.customerPhone.trim() || form.customerPhone.trim().length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    const body: Record<string, unknown> = {
      customerNaam: form.customerNaam.trim(),
      customerPhone: form.customerPhone.trim(),
    };
    if (form.category) body.category = form.category;
    if (form.weightGrams && !isNaN(Number(form.weightGrams))) {
      body.weightGrams = Number(form.weightGrams);
    }
    if (form.purity.trim()) body.purity = form.purity.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    if (form.referenceImageUrl.trim()) body.referenceImageUrl = form.referenceImageUrl.trim();

    setLoading(true);
    try {
      const res = await fetch('/api/kiosk/custom-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { data: { id: string } }
        | { error: { message: string } };

      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Failed to submit request. Please try again.');
        return;
      }

      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f0e8] border border-[#e4d8c6]">
              <CheckCircle2 className="h-8 w-8 text-[#a0824a]" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#2c1810]">
              Request Submitted!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your custom design request has been received. Store staff will review it and contact you shortly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              onClick={() => setSubmitted(false)}
              variant="outline"
              className="border-[#e4d8c6]"
            >
              Submit Another Request
            </Button>
            <Link href="/catalog">
              <Button className="metal-sheen w-full sm:w-auto">
                Browse Catalog
              </Button>
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#a0824a] mb-1">
            <PencilLine className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Custom Design</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#2c1810] sm:text-3xl">
            Request a Custom Design
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tell us what you have in mind. Our store staff will review your request and get in touch.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact details */}
          <section className="rounded-xl border border-[#e4d8c6] bg-[#FBF9F5] p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customerNaam">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="customerNaam"
                  placeholder="Your full name"
                  value={form.customerNaam}
                  onChange={(e) => set('customerNaam', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">Phone <span className="text-destructive">*</span></Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.customerPhone}
                  onChange={(e) => set('customerPhone', e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Design details */}
          <section className="rounded-xl border border-[#e4d8c6] bg-[#FBF9F5] p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Design Specifications
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="category">Jewellery Type</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select type (optional)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="weightGrams">Weight (grams)</Label>
                <Input
                  id="weightGrams"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 5.5"
                  value={form.weightGrams}
                  onChange={(e) => set('weightGrams', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purity">Purity</Label>
                <select
                  id="purity"
                  value={form.purity}
                  onChange={(e) => set('purity', e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select purity (optional)</option>
                  {PURITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Description / Notes</Label>
              <textarea
                id="notes"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Describe your design — style, occasion, inspirations, any specific requirements…"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                maxLength={1000}
              />
              {form.notes.length > 900 && (
                <p className="text-xs text-muted-foreground text-right">
                  {form.notes.length}/1000
                </p>
              )}
            </div>
          </section>

          {/* Reference image */}
          <section className="rounded-xl border border-[#e4d8c6] bg-[#FBF9F5] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Reference Image (optional)
              </h2>
            </div>

            {/* Toggle: URL vs Upload */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setImageMode('url'); clearImage(); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  imageMode === 'url'
                    ? 'border-[#a0824a] bg-[#a0824a]/10 text-[#a0824a]'
                    : 'border-[#e4d8c6] bg-white text-muted-foreground hover:border-[#a0824a]/40'
                }`}
              >
                Paste Image URL
              </button>
              <button
                type="button"
                onClick={() => { setImageMode('upload'); clearImage(); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  imageMode === 'upload'
                    ? 'border-[#a0824a] bg-[#a0824a]/10 text-[#a0824a]'
                    : 'border-[#e4d8c6] bg-white text-muted-foreground hover:border-[#a0824a]/40'
                }`}
              >
                <Upload className="inline h-3 w-3 mr-1" />
                Upload from Device
              </button>
            </div>

            {imageMode === 'url' ? (
              <div className="space-y-1.5">
                <Label htmlFor="referenceImageUrl">Image URL</Label>
                <Input
                  id="referenceImageUrl"
                  type="url"
                  placeholder="https://example.com/design-reference.jpg"
                  value={form.referenceImageUrl}
                  onChange={(e) => set('referenceImageUrl', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link from Pinterest, Google Images, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {!uploadedImagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-[#e4d8c6] bg-white px-4 py-8 text-center hover:border-[#a0824a]/50 hover:bg-[#fdf8f1] transition-colors"
                  >
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Tap to upload image</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP supported</p>
                  </button>
                ) : (
                  <div className="relative">
                    <img
                      src={uploadedImagePreview}
                      alt="Reference"
                      className="w-full max-h-48 object-contain rounded-lg border border-[#e4d8c6] bg-muted"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 rounded-full bg-white border border-[#e4d8c6] p-1 shadow-sm hover:bg-red-50"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* URL mode preview */}
            {imageMode === 'url' && form.referenceImageUrl && (
              <div className="relative overflow-hidden rounded-lg border border-[#e4d8c6]">
                <img
                  src={form.referenceImageUrl}
                  alt="Reference"
                  className="w-full max-h-48 object-contain bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="metal-sheen flex-1 h-11 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <PencilLine className="h-4 w-4 mr-2" />
                  Submit Design Request
                </>
              )}
            </Button>
            <Link href="/catalog" className="flex-1 sm:flex-none">
              <Button type="button" variant="outline" className="w-full h-11 border-[#e4d8c6]">
                Back to Catalog
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By submitting this request, you agree to be contacted by store staff regarding your custom design.
          </p>
        </form>
      </div>
    </CustomerLayout>
  );
}
