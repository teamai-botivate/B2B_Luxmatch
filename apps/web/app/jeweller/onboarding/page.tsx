'use client';

import { motion } from "motion/react";
import OnboardingWizard from "@/components/jeweller/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16" data-testid="jeweller-onboarding-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-10">
          <span className="text-2xl font-semibold">
            <span style={{ color: "#C9A84C" }}>Luxe</span>Match
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-2">Jeweller Portal</p>
          <h1 className="text-3xl font-medium tracking-tight mt-3">Set Up Your Store</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
            Join India&apos;s premium jewellery discovery platform. Reach thousands of customers looking for exactly what you create.
          </p>
        </div>
        <OnboardingWizard />
      </motion.div>
    </div>
  );
}
