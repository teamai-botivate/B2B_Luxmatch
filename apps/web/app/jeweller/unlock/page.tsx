'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function UnlockForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') ?? '/jeweller/dashboard';

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/shop/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = (await res.json()) as
        | { data: { ok: true } }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError(
          'error' in json ? json.error.message : 'Unlock failed. Try again.',
        );
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
    >
      <div className="text-center">
        <span className="text-2xl font-semibold">
          <span style={{ color: '#C9A84C' }}>Luxe</span>Match
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Jeweller mode
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Enter PIN</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock the back-office for this shop.
        </p>
      </div>

      <Input
        type="password"
        inputMode="numeric"
        autoFocus
        maxLength={6}
        pattern="[0-9]{6}"
        placeholder="••••••"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="text-center text-2xl tracking-[0.5em]"
        aria-label="6-digit PIN"
        aria-invalid={error ? 'true' : 'false'}
      />

      {error ? (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pin.length !== 6 || submitting}>
        {submitting ? 'Unlocking…' : 'Unlock'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Forgot the PIN? Ask the device operator to reset it with{' '}
        <code className="rounded bg-muted px-1 py-0.5">pnpm reset-pin</code>.
      </p>
    </form>
  );
}

export default function UnlockPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4"
      data-testid="jeweller-unlock-page"
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <UnlockForm />
      </Suspense>
    </div>
  );
}
