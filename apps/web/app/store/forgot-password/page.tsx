'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StoreForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/store/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } };
        setError(json.error?.message ?? 'Something went wrong');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 py-6">
      <div className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Retailer Portal
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Reset Store Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your store email to receive a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            If that email is registered, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Input
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
            <Button className="h-11 w-full" disabled={!email || submitting}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/store/login"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Back to Store Login
          </Link>
        </p>
      </div>
    </div>
  );
}
