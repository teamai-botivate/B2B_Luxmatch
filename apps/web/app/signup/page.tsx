'use client';

import { Suspense } from 'react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import CustomerAuthForm from '@/components/auth/CustomerAuthForm';

export default function SignupPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={null}>
        <CustomerAuthForm mode="signup" />
      </Suspense>
    </CustomerLayout>
  );
}
