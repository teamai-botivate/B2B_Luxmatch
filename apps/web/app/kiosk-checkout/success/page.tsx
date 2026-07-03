'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order') ?? '';

  return (
    <CustomerLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-serif font-semibold tracking-tight">Order Placed!</h1>
          {orderNumber && (
            <p className="text-sm text-muted-foreground">
              Order number: <span className="font-semibold text-foreground">{orderNumber}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Store staff will contact you to confirm and arrange delivery or pickup.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/products" className="flex-1">
            <Button className="metal-sheen w-full">Browse More</Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">Back to Home</Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Powered by Botivate
        </p>
      </div>
    </CustomerLayout>
  );
}

export default function KioskSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
