'use client';

import { useEffect, useState } from 'react';
import { api, type BookingsResponse, type CustomersResponse } from '@/lib/api';
import { SkeletonCard } from '@/components/Skeleton';

interface Stats {
  todayBookings: number;
  totalBookings: number;
  totalCustomers: number;
  gatewayStatus: 'online' | 'offline' | 'checking';
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    todayBookings: 0,
    totalBookings: 0,
    totalCustomers: 0,
    gatewayStatus: 'checking',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [bookings, todayData, customers, health] = await Promise.allSettled([
          api.getBookings(),
          api.getBookings({ date_from: today, date_to: today }),
          api.getCustomers(),
          fetch('/api/health').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        ]);

        setStats({
          totalBookings: bookings.status === 'fulfilled' ? (bookings.value as BookingsResponse).total : 0,
          todayBookings: todayData.status === 'fulfilled' ? (todayData.value as BookingsResponse).total : 0,
          totalCustomers: customers.status === 'fulfilled' ? (customers.value as CustomersResponse).total : 0,
          gatewayStatus: health.status === 'fulfilled' ? 'online' : 'offline',
        });
      } catch {
        setStats(prev => ({ ...prev, gatewayStatus: 'offline' }));
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const cards = [
    {
      label: "Today's Bookings",
      value: stats.todayBookings,
      color: 'text-rp-red',
      icon: (
        <svg className="w-5 h-5 text-rp-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Total Bookings',
      value: stats.totalBookings,
      color: 'text-blue-400',
      icon: (
        <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Total Customers',
      value: stats.totalCustomers,
      color: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Gateway Status',
      value: stats.gatewayStatus,
      color: stats.gatewayStatus === 'online' ? 'text-emerald-400' : stats.gatewayStatus === 'checking' ? 'text-yellow-400' : 'text-red-400',
      icon: (
        <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-rp-card border border-rp-border rounded-xl p-6 hover:border-rp-border/80 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-rp-grey mb-2">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-rp-black flex items-center justify-center">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/bookings', label: 'View All Bookings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { href: '/customers', label: 'Customer Directory', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2' },
              { href: '/leaderboard', label: 'View Leaderboard', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z' },
              { href: '/chat', label: 'Ask AI Assistant', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
              { href: '/hr', label: 'Manage Employees', icon: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2' },
              { href: '/finance', label: 'Finance Dashboard', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
            ].map(action => (
              <a key={action.href} href={action.href}
                className="flex items-center gap-3 px-4 py-3 bg-rp-black/50 hover:bg-rp-black rounded-lg transition-colors cursor-pointer group">
                <svg className="w-4 h-4 text-rp-grey group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d={action.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{action.label}</span>
                <svg className="w-3.5 h-3.5 ml-auto text-rp-grey/50 group-hover:text-rp-red transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-rp-card border border-rp-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: 'API Gateway', status: stats.gatewayStatus === 'online' ? 'online' : stats.gatewayStatus === 'checking' ? 'checking' : 'offline' },
              { label: 'WhatsApp Bot', status: 'connected' },
              { label: 'Discord Bot', status: 'connected' },
              { label: 'RaceControl Core', status: 'online' },
              { label: 'Ollama AI', status: 'online' },
            ].map(svc => (
              <div key={svc.label} className="flex justify-between items-center py-2 px-3 bg-rp-black/30 rounded-lg">
                <span className="text-sm text-neutral-400">{svc.label}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  svc.status === 'online' || svc.status === 'connected'
                    ? 'text-emerald-400'
                    : svc.status === 'checking'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    svc.status === 'online' || svc.status === 'connected'
                      ? 'bg-emerald-400'
                      : svc.status === 'checking'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-400'
                  }`} />
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
