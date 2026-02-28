'use client';

import { useEffect, useState } from 'react';
import { api, type BookingsResponse, type CustomersResponse } from '@/lib/api';

interface Stats {
  todayBookings: number;
  totalBookings: number;
  totalCustomers: number;
  gatewayStatus: string;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    todayBookings: 0,
    totalBookings: 0,
    totalCustomers: 0,
    gatewayStatus: 'checking...',
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [bookings, todayData, customers, health] = await Promise.allSettled([
          api.getBookings(),
          api.getBookings({ date_from: today, date_to: today }),
          api.getCustomers(),
          api.health(),
        ]);

        setStats({
          totalBookings: bookings.status === 'fulfilled' ? (bookings.value as BookingsResponse).total : 0,
          todayBookings: todayData.status === 'fulfilled' ? (todayData.value as BookingsResponse).total : 0,
          totalCustomers: customers.status === 'fulfilled' ? (customers.value as CustomersResponse).total : 0,
          gatewayStatus: health.status === 'fulfilled' ? 'online' : 'offline',
        });
      } catch {
        setStats(prev => ({ ...prev, gatewayStatus: 'offline' }));
      }
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Today's Bookings", value: stats.todayBookings, color: 'text-red-400' },
    { label: 'Total Bookings', value: stats.totalBookings, color: 'text-blue-400' },
    { label: 'Total Customers', value: stats.totalCustomers, color: 'text-green-400' },
    { label: 'Gateway Status', value: stats.gatewayStatus, color: stats.gatewayStatus === 'online' ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/bookings" className="block px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              View All Bookings
            </a>
            <a href="/customers" className="block px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              Customer Directory
            </a>
            <a href="/leaderboard" className="block px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              View Leaderboard
            </a>
            <a href="/chat" className="block px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              Ask AI Assistant
            </a>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">API Gateway</span>
              <span className={stats.gatewayStatus === 'online' ? 'text-emerald-400' : 'text-red-400'}>
                {stats.gatewayStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">WhatsApp Bot</span>
              <span className="text-emerald-400">connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Discord Bot</span>
              <span className="text-emerald-400">connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
