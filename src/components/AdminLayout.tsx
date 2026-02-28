'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NavSection {
  title: string;
  items: { href: string; label: string }[];
}

const navSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { href: '/', label: 'Overview' },
      { href: '/analytics', label: 'Analytics' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/bookings', label: 'Bookings' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/customers', label: 'Customers' },
      { href: '/waivers', label: 'Waivers' },
    ],
  },
  {
    title: 'Racing',
    items: [
      { href: '/leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    title: 'Cafe',
    items: [
      { href: '/cafe', label: 'Menu' },
      { href: '/cafe/inventory', label: 'Inventory' },
      { href: '/sales', label: 'Sales' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/purchases', label: 'Purchases' },
      { href: '/finance', label: 'Dashboard' },
    ],
  },
  {
    title: 'AI',
    items: [
      { href: '/chat', label: 'Assistant' },
    ],
  },
];

const allPages = navSections.flatMap(s => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(prev => !prev);
      setSearchQuery('');
    }
    if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const filteredPages = searchQuery.trim()
    ? allPages.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : allPages;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className={cn(
        'border-r border-zinc-800 flex flex-col transition-all duration-200 shrink-0',
        sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
      )}>
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-red-500">RacingPoint</h1>
          <p className="text-[10px] text-zinc-600 mt-0.5">Admin Dashboard</p>
        </div>
        <nav className="flex-1 overflow-auto p-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 px-2 mb-1">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                      pathname === item.href
                        ? 'bg-red-500/10 text-red-400 font-medium'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <Link href="/settings" className={cn(
            'block px-3 py-1.5 rounded-lg text-sm transition-colors',
            pathname === '/settings' ? 'bg-red-500/10 text-red-400' : 'text-zinc-500 hover:text-zinc-300'
          )}>
            Settings
          </Link>
          <p className="text-[10px] text-zinc-700 px-3 mt-1">Bono v2.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-zinc-500 hover:text-zinc-300 text-sm px-1">
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <button onClick={() => { setSearchOpen(true); setSearchQuery(''); }}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-sm text-zinc-500 hover:border-zinc-700 flex-1 max-w-xs">
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Search modal (Cmd+K) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60"
          onClick={() => setSearchOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="w-full bg-transparent px-4 py-3 text-sm border-b border-zinc-800 focus:outline-none"
            />
            <div className="max-h-64 overflow-auto p-2">
              {filteredPages.map(page => (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={() => setSearchOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === page.href ? 'bg-red-500/10 text-red-400' : 'text-zinc-300 hover:bg-zinc-800'
                  )}
                >
                  {page.label}
                </Link>
              ))}
              {filteredPages.length === 0 && (
                <p className="text-sm text-zinc-500 px-3 py-4 text-center">No pages found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
