'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormState {
  name: string;
  ownerNaam: string;
  ownerPhone: string;
  email: string;
  password: string;
  logoUrl: string;
  fixedAddressStreet: string;
  fixedAddressCity: string;
  fixedAddressState: string;
  fixedAddressPincode: string;
  fixedAddressLandmark: string;
  managerNaam: string;
  managerEmail: string;
  managerPassword: string;
  managerPhone: string;
}

const INITIAL: FormState = {
  name: '',
  ownerNaam: '',
  ownerPhone: '',
  email: '',
  password: '',
  logoUrl: '',
  fixedAddressStreet: '',
  fixedAddressCity: '',
  fixedAddressState: '',
  fixedAddressPincode: '',
  fixedAddressLandmark: '',
  managerNaam: '',
  managerEmail: '',
  managerPassword: '',
  managerPhone: '',
};

export default function StoreRegisterPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.managerPassword.length < 6) {
      setError('Manager password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/store/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 409) {
        setError('Email already registered.');
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(json?.error?.message ?? 'Registration failed. Please try again.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-3 py-10">
        <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Registration submitted</h2>
          <p className="text-sm text-muted-foreground">
            You will receive access after the manufacturer reviews and approves your store.
          </p>
          <Link
            href="/store/login"
            className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-xl space-y-6 rounded-xl border bg-card p-6 shadow-sm"
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jewel Factory · Store Registration
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Register your store</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your details for manufacturer approval.
          </p>
        </div>

        {/* Store Info */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Store Details
          </h2>
          <Input
            placeholder="Store name"
            value={form.name}
            onChange={set('name')}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Owner name"
              value={form.ownerNaam}
              onChange={set('ownerNaam')}
              required
            />
            <Input
              type="tel"
              placeholder="Owner phone"
              value={form.ownerPhone}
              onChange={set('ownerPhone')}
              required
            />
          </div>
          <Input
            type="email"
            autoComplete="email"
            placeholder="Store email (used for login)"
            value={form.email}
            onChange={set('email')}
            required
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Password (min 6 characters)"
              value={form.password}
              onChange={set('password')}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input
            placeholder="Logo URL (optional)"
            value={form.logoUrl}
            onChange={set('logoUrl')}
          />
        </section>

        {/* Fixed Delivery Address */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Fixed Delivery Address
          </h2>
          <Input
            placeholder="Street address"
            value={form.fixedAddressStreet}
            onChange={set('fixedAddressStreet')}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="City"
              value={form.fixedAddressCity}
              onChange={set('fixedAddressCity')}
              required
            />
            <Input
              placeholder="State"
              value={form.fixedAddressState}
              onChange={set('fixedAddressState')}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Pincode"
              value={form.fixedAddressPincode}
              onChange={set('fixedAddressPincode')}
              required
            />
            <Input
              placeholder="Landmark (optional)"
              value={form.fixedAddressLandmark}
              onChange={set('fixedAddressLandmark')}
            />
          </div>
        </section>

        {/* Manager Account */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Manager Account
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Manager name"
              value={form.managerNaam}
              onChange={set('managerNaam')}
              required
            />
            <Input
              type="tel"
              placeholder="Manager phone (optional)"
              value={form.managerPhone}
              onChange={set('managerPhone')}
            />
          </div>
          <Input
            type="email"
            autoComplete="off"
            placeholder="Manager email"
            value={form.managerEmail}
            onChange={set('managerEmail')}
            required
          />
          <div className="relative">
            <Input
              type={showManagerPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Manager password (min 6 characters)"
              value={form.managerPassword}
              onChange={set('managerPassword')}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowManagerPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showManagerPassword ? 'Hide manager password' : 'Show manager password'}
            >
              {showManagerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </section>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit registration'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already approved?{' '}
          <Link href="/store/login" className="font-medium underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
