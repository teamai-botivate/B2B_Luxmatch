'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ManagerResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/manager/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { data?: { ok: boolean }; error?: { message: string } };
      if (!res.ok || 'error' in json) {
        setError(json.error?.message ?? 'Reset failed. The link may have expired.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6">
        <div className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jewel Factory
          </p>
          <p className="text-sm text-red-600">Invalid or missing reset link. Please request a new one.</p>
          <Link
            href="/store/manager/forgot-password"
            className="text-sm underline underline-offset-2 hover:text-foreground"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6">
      <div className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jewel Factory
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Set New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a new password for your manager account.
          </p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              Password updated. You can now log in.
            </div>
            <Link
              href="/store/manager/login"
              className="block text-sm underline underline-offset-2 hover:text-foreground"
            >
              Go to Manager Login →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="New password"
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
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
            <Button className="h-11 w-full" disabled={!password || !confirm || submitting}>
              {submitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}

        {!done && (
          <p className="text-center text-xs text-muted-foreground">
            <Link
              href="/store/manager/login"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Back to Manager Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ManagerResetPasswordPage() {
  return (
    <Suspense>
      <ManagerResetPasswordForm />
    </Suspense>
  );
}
