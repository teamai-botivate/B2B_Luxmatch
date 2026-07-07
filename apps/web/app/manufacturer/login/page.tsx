'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ManufacturerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    let ok = false;
    try {
      const res = await fetch('/api/manufacturer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as
        | { data: { id: string; name: string } }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Login failed. Try again.');
        return;
      }
      ok = true;
      router.push('/manufacturer/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      if (!ok) setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:space-y-6 sm:p-8"
      >
        <div className="text-center">
          <span className="text-2xl font-semibold">
            <span style={{ color: '#C9A84C' }}>Jewel</span> Factory
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Manufacturer Portal
          </p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your catalog and B2B orders.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={!email || !password || submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
