'use client';

import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="not-found-page">
      <div className="text-center max-w-sm">
        <p className="text-8xl font-semibold text-primary/30 mb-4">404</p>
        <h1 className="text-2xl font-medium text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground text-sm mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/">
          <Button className="rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 mx-auto">
            <HomeIcon className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
