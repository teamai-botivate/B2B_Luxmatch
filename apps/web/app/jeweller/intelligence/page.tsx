export default function IntelligencePage() {
  return (
    <div
      className="mx-auto max-w-5xl px-6 py-10"
      data-testid="jeweller-intelligence-page"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight">Inventory Intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seasonal demand, category sell-through, and restock recommendations
          for this shop.
        </p>
      </header>

      <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
        Phase 9.5 will populate this page with insight cards (high-interest /
        low-conversion, viewed-but-not-tried, tried-but-not-sold), seasonal
        trend sparklines, and an upcoming-festival readiness widget. The data
        comes from <code className="rounded bg-muted px-1 py-0.5">inventory_signals</code>{' '}
        which is filled nightly by{' '}
        <code className="rounded bg-muted px-1 py-0.5">scripts/seasonal-rollup.ts</code>.
      </div>
    </div>
  );
}
