'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Overview', icon: '◻' },
  { href: '/bookings', label: 'Bookings', icon: '◻' },
  { href: '/calendar', label: 'Calendar', icon: '◻' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '◻' },
  { href: '/customers', label: 'Customers', icon: '◻' },
  { href: '/cafe', label: 'Cafe Menu', icon: '◻' },
  { href: '/cafe/inventory', label: 'Inventory', icon: '◻' },
  { href: '/sales', label: 'Sales', icon: '◻' },
  { href: '/purchases', label: 'Purchases', icon: '◻' },
  { href: '/finance', label: 'Finance', icon: '◻' },
  { href: '/chat', label: 'AI Assistant', icon: '◻' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-red-500">RacingPoint</h1>
          <p className="text-xs text-zinc-500 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-red-500/10 text-red-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              )}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">Bono v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
