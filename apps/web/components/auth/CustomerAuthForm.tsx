'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  Lock,
  Mail,
  Package,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ApiErrorResponse = { error?: { message?: string } };

type Mode = 'signin' | 'signup';

const COPY: Record<Mode, {
  eyebrow: string;
  title: string;
  subtitle: string;
  switchPrompt: string;
  switchCta: string;
  switchHref: string;
}> = {
  signin: {
    eyebrow: 'Customer Sign In',
    title: 'Welcome back',
    subtitle: 'Sign in with your email and password to reach your orders and saved pieces.',
    switchPrompt: 'New to AT Jewellers?',
    switchCta: 'Create an account',
    switchHref: '/signup',
  },
  signup: {
    eyebrow: 'Create Account',
    title: 'Join AT Jewellers',
    subtitle: 'Set a password and verify your email once — then sign in with the password from now on.',
    switchPrompt: 'Already have an account?',
    switchCta: 'Sign in',
    switchHref: '/login',
  },
};

const MIN_PASSWORD = 6;

export default function CustomerAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const copy = COPY[mode];
  const isSignup = mode === 'signup';

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  const normalizedEmail = email.trim().toLowerCase();
  const passwordValid = password.length >= MIN_PASSWORD;
  const passwordsMatch = password === confirmPassword;

  const signinValid = !!normalizedEmail && !!password;
  const signupValid = !!normalizedEmail && !!phone.trim() && !!name.trim() && passwordValid && passwordsMatch;

  // Sign-up step 1 — send the one-time verification code (the only OTP in the flow).
  async function sendOtp() {
    if (!signupValid) return;
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
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(json?.error?.message || 'Failed to send the code. Try again.');
      }
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send the code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // Sign-up step 2 — confirm the code and set the password in one call.
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
          password,
        }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        const json = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setError(json?.error?.message || 'Invalid code. Please try again.');
      }
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // Sign-in — password only.
  async function signIn() {
    if (!signinValid) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/customer/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        const json = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setError(json?.error?.message || 'Incorrect email or password.');
      }
    } catch {
      setError('Sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const switchHref = next && next !== '/'
    ? `${copy.switchHref}?next=${encodeURIComponent(next)}`
    : copy.switchHref;

  const benefits = [
    { icon: Heart, title: 'Save & compare pieces', sub: 'Build a shortlist and weigh options side by side.' },
    { icon: Camera, title: 'Photo & virtual try-on', sub: 'Search by picture and see jewellery on you in AR.' },
    { icon: Package, title: 'Orders & click-and-collect', sub: 'Track deliveries or pick up in store.' },
    { icon: ShieldCheck, title: 'Saved addresses & profile', sub: 'Faster checkout with a personalised account.' },
  ];

  return (
    <div className="relative flex min-h-[calc(100svh-88px)] items-center justify-center overflow-hidden px-3 py-4 sm:px-4 sm:py-6">
      {/* Ambient gold wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(232,217,168,0.24)_0%,rgba(251,249,245,0)_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 rounded-full bg-[#e8d9a8]/20 blur-3xl" />

      {/* Single unified card */}
      <div className={isSignup
        ? 'relative w-full max-w-[780px] overflow-hidden rounded-xl border border-[#e4d8c6] bg-[#fffdf8] shadow-[0_20px_50px_rgba(31,24,18,0.14)]'
        : 'relative w-full max-w-[380px] overflow-hidden rounded-xl border border-[#e4d8c6] bg-[#fffdf8] shadow-[0_16px_40px_rgba(31,24,18,0.10)]'}>

        {/* Gold hairline */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d8b863] to-transparent" />

        <div className={isSignup
          ? 'grid lg:grid-cols-[1fr_1.1fr] lg:items-stretch'
          : ''}>

          {/* Velvet display-case panel — signup only, desktop */}
          {isSignup && (
            <div className="hidden border-r border-[#3a2f20] bg-[#1c150d] px-6 py-5 text-[#f3ead8] lg:flex lg:flex-col lg:justify-center lg:px-7 lg:py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d8b863]">AT Jewellers Account</p>
              <h2 className="font-display mt-2 text-[1.35rem] font-medium leading-[1.2] tracking-tight">
                Everything you love,<br />kept in one place.
              </h2>
              <div className="mt-2.5 h-px w-12 bg-gradient-to-r from-[#d8b863] to-transparent" />
              <p className="mt-2.5 max-w-xs text-[12px] leading-relaxed text-[#c9bda4]">
                A free account to shop, save, and try on fine jewellery — secured with your own password.
              </p>
              <ul className="mt-4 space-y-3">
                {benefits.map(b => (
                  <li key={b.title} className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#4a3d28] bg-[#261e13]">
                      <b.icon className="h-3 w-3 text-[#d8b863]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight text-[#f3ead8]">{b.title}</p>
                      <p className="text-[11px] leading-snug text-[#a99d84]">{b.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[#3a2f20] pt-3 text-[9px] uppercase tracking-[0.18em] text-[#7d7159]">
                Passwordless verification · 256-bit secured
              </p>
            </div>
          )}

          {/* Form column */}
          <div className="flex flex-col justify-center px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
            <div className="mb-2.5 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-[#e0d09f] bg-[#fffdf8] shadow-[0_3px_10px_rgba(176,138,46,0.18)]">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{copy.eyebrow}</p>
              <h1 className="font-display text-[1.3rem] font-medium leading-tight tracking-tight text-foreground sm:text-[1.4rem]">{copy.title}</h1>
              <p className="mx-auto mt-1 max-w-[300px] text-[11px] leading-relaxed text-muted-foreground sm:text-[12px]">{copy.subtitle}</p>
            </div>

            {/* Mode toggle */}
            <div className="mx-auto mb-3 grid w-full max-w-[240px] grid-cols-2 rounded-md border border-[#e4d8c6] bg-[#f5f0e6] p-0.5 text-[13px] font-medium">
              <Link
                href={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                className={`rounded py-1 text-center transition-colors ${mode === 'signin' ? 'bg-[#fffdf8] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign In
              </Link>
              <Link
                href={next && next !== '/' ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
                className={`rounded py-1 text-center transition-colors ${mode === 'signup' ? 'bg-[#fffdf8] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign Up
              </Link>
            </div>

            {/* SIGN IN — password only */}
            {!isSignup && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="priya@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void signIn()}
                    className="h-9 rounded-md border-[#d8ccba] bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void signIn()}
                      className="h-9 rounded-md border-[#d8ccba] bg-white pr-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{error}</div>
                )}
                <Button className="metal-sheen h-9 w-full rounded-md border-0 text-[13px] font-semibold text-[#17120b]" onClick={() => void signIn()} disabled={loading || !signinValid}>
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </div>
            )}

            {/* SIGN UP — details + password, then one-time OTP */}
            {isSignup && step === 'details' && (
              <div className="space-y-2.5">
                <div>
                  <label className="mb-0.5 block text-xs font-medium">Your name</label>
                  <Input
                    placeholder="Priya Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                    className="h-8 rounded-md border-[#d8ccba] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="priya@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                    className="h-8 rounded-md border-[#d8ccba] bg-white text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium">
                    Mobile number <span className="text-muted-foreground">(for orders)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <span className="flex items-center rounded-md border border-[#d8ccba] bg-[#f5f0e6] px-2.5 text-xs text-muted-foreground">+91</span>
                    <Input
                      type="tel" placeholder="9876543210" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                      maxLength={10} className="h-8 rounded-md border-[#d8ccba] bg-white text-[13px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={`At least ${MIN_PASSWORD} characters`}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                      className="h-8 rounded-md border-[#d8ccba] bg-white pr-8 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className={`mt-0.5 text-[10px] leading-tight ${password && !passwordValid ? 'text-red-600' : 'text-muted-foreground'}`}>
                    You&apos;ll use this to sign in. We&apos;ll verify your email once with a code.
                  </p>
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium">Confirm password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void sendOtp()}
                    className="h-8 rounded-md border-[#d8ccba] bg-white text-[13px]"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-0.5 text-[10px] text-red-600">Passwords don&apos;t match.</p>
                  )}
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{error}</div>
                )}
                <Button className="metal-sheen h-9 w-full rounded-md border-0 text-[13px] font-semibold text-[#17120b]" onClick={() => void sendOtp()} disabled={loading || !signupValid}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  {loading ? 'Sending…' : 'Send verification code'}
                </Button>
              </div>
            )}

            {isSignup && step === 'otp' && (
              <div className="space-y-3">
                <div className="rounded-md border border-[#e4d8c6] bg-[#fbf9f5] px-2.5 py-1.5 text-xs text-muted-foreground">
                  We&apos;ve sent a one-time code to <span className="font-medium text-foreground">{normalizedEmail}</span>.
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Enter the code</label>
                  <Input
                    type="text" inputMode="numeric" maxLength={8} placeholder="Enter the code"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={e => e.key === 'Enter' && void verifyOtp()}
                    className="h-9 rounded-md border-[#d8ccba] bg-white text-center text-lg font-semibold tracking-[0.35em]"
                  />
                </div>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{error}</div>
                )}
                <Button className="metal-sheen h-9 w-full rounded-md border-0 text-[13px] font-semibold text-[#17120b]" onClick={() => void verifyOtp()} disabled={loading || otp.length < 6}>
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  {loading ? 'Creating account…' : 'Verify & create account'}
                </Button>
                <button className="w-full text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => { setStep('details'); setOtp(''); setError(null); }}>
                  ← Change details
                </button>
              </div>
            )}

            {/* Footer links */}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {copy.switchPrompt}{' '}
              <Link href={switchHref} className="font-semibold text-primary hover:underline">{copy.switchCta}</Link>
            </p>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              By continuing you agree to AT Jewellers&apos; terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
