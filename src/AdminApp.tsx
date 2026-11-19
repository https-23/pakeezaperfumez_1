import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AdminView } from './views/AdminView';

export default function AdminApp() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D0D] text-[#F5F2EB]">
      <header className="sticky top-0 z-40 h-16 border-b border-white/[0.08] bg-[#0D0D0D]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a
            href="/admin"
            className="font-serif text-xl font-bold tracking-tight text-[#F5F2EB] whitespace-nowrap shrink-0 sm:text-2xl"
          >
            Pakeeza Perfumez Seller
          </a>

          <div className="flex items-center gap-4 shrink-0">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-white/15 px-4 py-2 text-xs font-medium text-[#A19D94] transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37] whitespace-nowrap shrink-0"
            >
              <span>Open Storefront</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <AdminView onCatalogUpdated={() => {}} />
      </main>

      <footer className="mt-16 border-t border-white/[0.08] bg-[#09090A]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-[#A19D94] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>Pakeeza Perfumez · Private Seller Portal</p>
          <p>All inventory and order updates sync immediately with the public store.</p>
        </div>
      </footer>
    </div>
  );
}
