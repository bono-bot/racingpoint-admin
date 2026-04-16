'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SkeletonTable } from '@/components/Skeleton';

interface MembershipTier {
  id: string;
  name: string;
  monthly_fee_paise: number;
  hours_included: number;
  discount_percent: number;
  perks: string;
}

interface Membership {
  id: string;
  driver_id: string;
  driver_name: string;
  tier_name: string;
  status: string;
  hours_used: number;
  hours_included: number;
  started_at: string;
  expires_at: string;
}

function MembersList() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/rc/customer/membership/active');
        if (res.ok) {
          const data = await res.json();
          setMembers(data.memberships || data || []);
        }
      } catch { /* graceful fallback */ }
      setMembersLoading(false);
    }
    loadMembers();
  }, []);

  if (membersLoading) return <SkeletonTable rows={5} cols={6} />;

  if (members.length === 0) {
    return (
      <div className="text-center text-rp-grey py-8">
        No active members yet — members appear when customers subscribe via the PWA.
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-rp-grey border-b border-rp-border">
            <th className="pb-3 font-medium">Driver</th>
            <th className="pb-3 font-medium">Tier</th>
            <th className="pb-3 font-medium">Hours</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Started</th>
            <th className="pb-3 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rp-border">
          {members.map(m => {
            const expiresAt = new Date(m.expires_at);
            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const statusColor = m.status === 'active' && daysLeft > 7
              ? 'text-emerald-400 bg-emerald-400/10'
              : m.status === 'active' && daysLeft <= 7
              ? 'text-yellow-400 bg-yellow-400/10'
              : 'text-red-400 bg-red-400/10';
            const pct = m.hours_included > 0 ? Math.min(100, (m.hours_used / m.hours_included) * 100) : 0;

            return (
              <tr key={m.id} className="hover:bg-rp-card/50">
                <td className="py-3 text-white font-medium">{m.driver_name}</td>
                <td className="py-3 text-neutral-300">{m.tier_name}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-rp-border rounded-full overflow-hidden">
                      <div className="h-full bg-rp-red rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-neutral-400 text-xs">{m.hours_used}/{m.hours_included}h</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                    {m.status === 'active' && daysLeft <= 7 ? `${daysLeft}d left` : m.status}
                  </span>
                </td>
                <td className="py-3 text-neutral-400">{m.started_at ? new Date(m.started_at).toLocaleDateString() : '--'}</td>
                <td className="py-3 text-neutral-400">{expiresAt.toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MembershipsPage() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'tiers' | 'members'>('tiers');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPackages();
        // Membership tiers come from a different endpoint but let's use what's available
        // For now fetch from rc-core
        const tiersRes = await fetch('/api/rc/customer/membership/tiers');
        if (tiersRes.ok) {
          const tiersData = await tiersRes.json();
          setTiers(tiersData.tiers || []);
        }
      } catch { /* ignore tier error */ }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Memberships</h1>
      <p className="text-rp-grey text-sm mb-6">Membership tiers and active subscribers</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('tiers')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'tiers' ? 'bg-rp-red/10 text-rp-red' : 'text-rp-grey hover:text-white'}`}>
          Tiers
        </button>
        <button onClick={() => setTab('members')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'members' ? 'bg-rp-red/10 text-rp-red' : 'text-rp-grey hover:text-white'}`}>
          Active Members
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : tab === 'tiers' ? (
        tiers.length === 0 ? (
          <div className="text-center text-rp-grey py-8">No membership tiers configured. Tiers are seeded at database init.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map(t => (
              <div key={t.id} className="bg-rp-card border border-rp-border rounded-xl p-5">
                <h2 className="text-white font-bold text-lg mb-1">{t.name}</h2>
                <p className="text-rp-red font-bold text-2xl mb-4">
                  {'\u20B9'}{(t.monthly_fee_paise / 100).toLocaleString()}<span className="text-sm text-rp-grey font-normal">/mo</span>
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-rp-grey">Hours Included</span>
                    <span className="text-white">{t.hours_included}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rp-grey">Discount</span>
                    <span className="text-emerald-400">{t.discount_percent}% off</span>
                  </div>
                </div>
                {t.perks && (
                  <div className="mt-4 pt-3 border-t border-rp-border">
                    <p className="text-xs text-rp-grey mb-1">Perks</p>
                    <p className="text-white text-sm">{t.perks}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <MembersList />
      )}
    </div>
  );
}
