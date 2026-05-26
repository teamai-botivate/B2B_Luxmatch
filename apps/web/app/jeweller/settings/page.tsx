export default function SettingsPage() {
  return (
    <div
      className="mx-auto max-w-3xl px-6 py-10"
      data-testid="jeweller-settings-page"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight">Shop settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage store info, PIN, and idle-reset behaviour.
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
        <p>
          Phase 3 wires this page to <code className="rounded bg-muted px-1 py-0.5">PATCH /api/shop</code>{' '}
          for editing store_name, city, owner_name, phone, and logo.
        </p>
        <p>
          PIN change goes through <code className="rounded bg-muted px-1 py-0.5">POST /api/shop/pin/change</code>{' '}
          (already PIN-gated) once <code className="rounded bg-muted px-1 py-0.5">jewellers.pin_hash</code>{' '}
          lands in Phase 3.
        </p>
        <p>
          Idle-reset (<code className="rounded bg-muted px-1 py-0.5">idle_reset_enabled</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5">idle_reset_seconds</code>) ships in Phase 2
          alongside the IdleResetProvider component.
        </p>
      </div>
    </div>
  );
}
