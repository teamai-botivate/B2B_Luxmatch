'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, Package, Phone, User } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { useCustomer } from '@/hooks/use-customer';

export default function AccountPage() {
  const router = useRouter();
  const { customer, loading, logout } = useCustomer();

  if (loading) {
    return <CustomerLayout><div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></CustomerLayout>;
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-medium">Sign in to your account</h2>
          <Button className="mt-6 rounded-full" onClick={() => router.push('/login')}>Login / Sign up</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-xl px-4 py-24 md:px-6">
        <h1 className="mb-8 text-3xl font-medium tracking-tight">My Account</h1>

        <div className="mb-6 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{customer.name ?? 'Customer'}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {customer.phone}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/orders">
            <div className="flex items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">My Orders</p>
                  <p className="text-xs text-muted-foreground">View and track your orders</p>
                </div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </Link>
        </div>

        <Button variant="outline" className="mt-8 w-full rounded-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={async () => { await logout(); router.push('/'); }}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </CustomerLayout>
  );
}
