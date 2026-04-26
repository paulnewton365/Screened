import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl tracking-tight">
            Screened
          </Link>
          <span className="editorial-meta">Dashboard</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="mb-4">Your library.</h1>
        <p className="editorial-lede text-ink-muted mb-12">
          Search a title, save a screening, build a record over time.
        </p>

        <div className="border border-rule rounded-sm p-12 bg-paper-raised text-center">
          <p className="text-ink-muted">
            The dashboard, search, and library views come next. This page
            exists now so the routing works end-to-end.
          </p>
        </div>
      </div>
    </main>
  );
}
