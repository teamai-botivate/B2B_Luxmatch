'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Shield, Sparkles } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  const normalizedEmail = email.trim().toLowerCase();

  async function sendOtp() {
    if (!normalizedEmail || !phone.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: normalizedPhone,
          name: name || undefined,
        }),
      });
      if (!res.ok) throw new Error('send_failed');
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: normalizedPhone,
          otp,
          name: name || undefined,
        }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to AT Jewellers</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {step === 'details' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="priya@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Mobile number <span className="text-muted-foreground">(for orders)</span></label>
                  <div className="flex gap-2">
                    <span className="flex items-center rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground">+91</span>
                    <Input
                      type="tel" placeholder="9876543210" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                      maxLength={10} className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Your name <span className="text-muted-foreground">(optional, first time)</span></label>
                  <Input placeholder="Priya Sharma" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full rounded-xl" onClick={() => void sendOtp()} disabled={loading || !normalizedEmail || !phone.trim()}>
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? 'Sending…' : 'Email me an OTP'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">We&apos;ve sent a 6-digit OTP to {normalizedEmail}.</p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Enter OTP</label>
                  <Input
                    type="text" inputMode="numeric" maxLength={6} placeholder="6-digit OTP"
                    value={otp} onChange={e => setOtp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void verifyOtp()}
                    className="rounded-xl text-center text-xl tracking-[0.4em] font-semibold"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full rounded-xl" onClick={() => void verifyOtp()} disabled={loading || otp.length < 6}>
                  <Shield className="mr-2 h-4 w-4" />
                  {loading ? 'Verifying…' : 'Verify & Login'}
                </Button>
                <button className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setStep('details'); setOtp(''); }}>
                  ← Change details
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to AT Jewellers&apos; terms of service.
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
}
