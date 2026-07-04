'use client';

import { Camera, Eye, EyeOff, Loader2, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ManufacturerProductWithImages } from '@luxematch/db';

type Status = 'draft' | 'active' | 'archived';

type SignedUploadParams = {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
  allowedFormats: string[];
  maxBytes: number;
};

const CATEGORIES = ['rings', 'earrings', 'necklaces', 'bangles', 'pendants', 'sets'];
const METALS = ['Gold', 'Silver', 'Platinum', 'Rose Gold', 'White Gold', 'Mixed Metals'];
const PURITIES = ['14K', '18K', '22K', '24K', '925', '950', '999'];
const JEWELLERY_TYPES = [
  { value: 'necklace', label: 'Necklace' },
  { value: 'earring_left', label: 'Earring (Left)' },
  { value: 'earring_right', label: 'Earring (Right)' },
  { value: 'ring_index', label: 'Ring (Index)' },
  { value: 'ring_middle', label: 'Ring (Middle)' },
  { value: 'bangle', label: 'Bangle / Bracelet' },
];

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: ManufacturerProductWithImages | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = product !== null;
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    category: product?.category ?? '',
    metal: product?.metal ?? '',
    purity: product?.purity ?? '',
    basePrice: product?.base_price?.toString() ?? '',
    description: product?.description ?? '',
    minOrderQty: product?.min_order_qty?.toString() ?? '1',
    status: (product?.status ?? 'active') as Status,
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tryonFile, setTryonFile] = useState<File | null>(null);
  const [tryonType, setTryonType] = useState('necklace');
  const [uploadingTryon, setUploadingTryon] = useState(false);
  const [tryonAsset, setTryonAsset] = useState<{ asset_url: string; jewellery_type: string } | null>(null);
  const [removingTryon, setRemovingTryon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing && product.has_tryon) {
      fetch(`/api/manufacturer/products/${product.id}/tryon-asset`)
        .then((r) => r.json())
        .then((j: { data: { asset_url: string; jewellery_type: string } | null }) => {
          if (j.data) setTryonAsset(j.data);
        })
        .catch(() => null);
    }
  }, [editing, product]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        ...(editing ? {} : { sku: form.sku }),
        name: form.name,
        category: form.category || undefined,
        metal: form.metal || undefined,
        purity: form.purity || undefined,
        basePrice: parseFloat(form.basePrice),
        description: form.description || undefined,
        minOrderQty: parseInt(form.minOrderQty) || 1,
        status: form.status,
      };
      const res = await fetch(
        editing ? `/api/manufacturer/products/${product.id}` : '/api/manufacturer/products',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as
        | { data: { id: string } }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Save failed');
        return;
      }
      const productId = json.data.id;
      if (imageFile) {
        await uploadImage(productId, imageFile);
      }
      if (tryonFile) {
        await uploadTryonAsset(productId, tryonFile, tryonType);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Network error');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(productId: string, file: File) {
    const signRes = await fetch(`/api/manufacturer/products/${productId}/images/sign`, {
      method: 'POST',
    });
    const signJson = (await signRes.json()) as
      | { data: SignedUploadParams }
      | { error: { message: string } };
    if (!signRes.ok || 'error' in signJson) {
      throw new Error('error' in signJson ? signJson.error.message : 'Failed to sign upload');
    }
    const params = signJson.data;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', params.apiKey);
    formData.append('timestamp', String(params.timestamp));
    formData.append('folder', params.folder);
    formData.append('signature', params.signature);
    const uploadRes = await fetch(params.uploadUrl, { method: 'POST', body: formData });
    const uploadJson = (await uploadRes.json()) as {
      public_id?: string;
      secure_url?: string;
      error?: { message?: string };
    };
    if (!uploadRes.ok || !uploadJson.public_id || !uploadJson.secure_url) {
      throw new Error(uploadJson.error?.message ?? 'Cloudinary upload failed');
    }
    await fetch(`/api/manufacturer/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cloudinaryPublicId: uploadJson.public_id,
        secureUrl: uploadJson.secure_url,
        isPrimary: true,
      }),
    });
  }

  async function uploadTryonAsset(productId: string, file: File, jewelleryType: string) {
    const signRes = await fetch(`/api/manufacturer/products/${productId}/tryon-asset/sign`, {
      method: 'POST',
    });
    const signJson = (await signRes.json()) as
      | { data: SignedUploadParams }
      | { error: { message: string } };
    if (!signRes.ok || 'error' in signJson) {
      throw new Error('error' in signJson ? signJson.error.message : 'Failed to sign tryon upload');
    }
    const params = signJson.data;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', params.apiKey);
    formData.append('timestamp', String(params.timestamp));
    formData.append('folder', params.folder);
    formData.append('signature', params.signature);
    const uploadRes = await fetch(params.uploadUrl, { method: 'POST', body: formData });
    const uploadJson = (await uploadRes.json()) as {
      public_id?: string;
      secure_url?: string;
      error?: { message?: string };
    };
    if (!uploadRes.ok || !uploadJson.public_id || !uploadJson.secure_url) {
      throw new Error(uploadJson.error?.message ?? 'Cloudinary upload failed');
    }
    await fetch(`/api/manufacturer/products/${productId}/tryon-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetUrl: uploadJson.secure_url,
        cloudinaryPublicId: uploadJson.public_id,
        jewelleryType,
      }),
    });
  }

  async function removeTryon() {
    if (!editing) return;
    setRemovingTryon(true);
    try {
      await fetch(`/api/manufacturer/products/${product.id}/tryon-asset`, { method: 'DELETE' });
      setTryonAsset(null);
      onSaved();
    } finally {
      setRemovingTryon(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>

        <form onSubmit={save} className="px-5 py-4 space-y-4">
          {!editing && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">SKU *</label>
              <Input
                className="mt-1"
                placeholder="e.g. RG-001"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
            <Input
              className="mt-1"
              placeholder="e.g. Kundan Bridal Necklace"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Base Price (₹) *</label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 25000"
                value={form.basePrice}
                onChange={(e) => set('basePrice', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Metal</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.metal}
                onChange={(e) => set('metal', e.target.value)}
              >
                <option value="">Select…</option>
                {METALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purity</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.purity}
                onChange={(e) => set('purity', e.target.value)}
              >
                <option value="">Select…</option>
                {PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Order Qty</label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                value={form.minOrderQty}
                onChange={(e) => set('minOrderQty', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => set('status', e.target.value as Status)}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="Optional product description…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Catalog Image</label>
            <Input
              className="mt-1"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* AR Try-On Section */}
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary">AR Try-On Asset</span>
              {editing && product.has_tryon && (
                <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Upload a transparent-background PNG. Customers can virtually try on this product in AR.
            </p>

            {editing && tryonAsset ? (
              <div className="flex items-center gap-3">
                <Image
                  src={tryonAsset.asset_url}
                  alt="Try-on preview"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg border object-contain bg-white"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{JEWELLERY_TYPES.find(t => t.value === tryonAsset.jewellery_type)?.label ?? tryonAsset.jewellery_type}</p>
                  <p className="text-[11px] text-muted-foreground">Try-on asset uploaded</p>
                </div>
                <button
                  type="button"
                  onClick={removeTryon}
                  disabled={removingTryon}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {removingTryon ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Jewellery Type *</label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={tryonType}
                    onChange={(e) => setTryonType(e.target.value)}
                  >
                    {JEWELLERY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Transparent PNG</label>
                  <Input
                    className="mt-1"
                    type="file"
                    accept="image/png"
                    onChange={(e) => setTryonFile(e.target.files?.[0] ?? null)}
                  />
                  {tryonFile && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{tryonFile.name}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || uploadingTryon}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManufacturerProductsPage() {
  const [products, setProducts] = useState<ManufacturerProductWithImages[] | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [filterTryon, setFilterTryon] = useState(false);
  const [editTarget, setEditTarget] = useState<ManufacturerProductWithImages | null | undefined>(
    undefined,
  );
  const routeActionHandled = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/manufacturer/products?status=all', { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: ManufacturerProductWithImages[] }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) { window.location.assign('/manufacturer/login'); return; }
        setError('error' in json ? json.error.message : 'Failed to load');
        return;
      }
      setProducts(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!products || routeActionHandled.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      routeActionHandled.current = true;
      setEditTarget(null);
      return;
    }
    const editId = params.get('edit');
    if (editId) {
      const product = products.find((p) => p.id === editId);
      if (product) {
        routeActionHandled.current = true;
        setEditTarget(product);
      }
    }
  }, [products]);

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/manufacturer/products/${id}`, { method: 'DELETE' });
      if (res.ok) await load();
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleStatus(p: ManufacturerProductWithImages) {
    const next = p.status === 'active' ? 'draft' : 'active';
    await fetch(`/api/manufacturer/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    await load();
  }

  const visible = (products ?? []).filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterTryon && !p.has_tryon) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <>
      {editTarget !== undefined && (
        <ProductModal
          product={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={load}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Products</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {products ? `${products.length} product${products.length !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
          <Button onClick={() => setEditTarget(null)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Input
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="button"
            onClick={() => setFilterTryon((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              filterTryon
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            AR Try-On only
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {products === null && !error ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading products…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filterTryon ? 'No products have AR try-on assets yet.' : 'Click "Add Product" to create your first design.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Metal</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((p) => {
                  const primary = p.images.find((i) => i.is_primary) ?? p.images[0];
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {primary ? (
                            <Image
                              src={primary.secure_url}
                              alt={p.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium truncate">{p.name}</p>
                              {p.has_tryon && (
                                <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary flex items-center gap-0.5">
                                  <Camera className="h-2.5 w-2.5" /> AR
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground capitalize">
                        {p.category ?? '—'}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                        {p.metal ? `${p.metal}${p.purity ? ` ${p.purity}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        ₹{p.base_price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[p.status] ?? ''}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title={p.status === 'active' ? 'Set to draft' : 'Set to active'}
                            onClick={() => toggleStatus(p)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {p.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            title="Edit"
                            onClick={() => setEditTarget(p)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => deleteProduct(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          >
                            {deletingId === p.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
