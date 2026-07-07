'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ManagerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/jeweller/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/manager/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as
        | { data: { id: string; naam: string } }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Login failed');
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jewel Factory
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Manager Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage orders and customer requests.
          </p>
        </div>
        <div className="space-y-3">
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
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
        <div className="text-right">
          <Link
            href="/store/manager/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <Button className="h-11 w-full" disabled={!email || !password || submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Store Owner?{' '}
          <Link href="/store/login" className="underline underline-offset-2 hover:text-foreground">
            Sign in here →
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ManagerLoginPage() {
  return (
    <Suspense>
      <ManagerLoginForm />
    </Suspense>
  );
}
