'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api';

interface KudosEntry {
  id: string;
  sender_name: string;
  receiver_name: string;
  message: string;
  category: string;
  created_at: string;
}

interface BadgeLeader {
  name: string;
  badge_count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  teamwork: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  service: 'bg-green-500/20 text-green-400 border-green-500/30',
  initiative: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function RecognitionPage() {
  const [kudos, setKudos] = useState<KudosEntry[]>([]);
  const [leaders, setLeaders] = useState<BadgeLeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rcFetch('/hr/recognition')
      .then((data: unknown) => {
        const d = data as { recent_kudos: KudosEntry[]; badge_leaders: BadgeLeader[] };
        setKudos(d.recent_kudos || []);
        setLeaders(d.badge_leaders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Employee Recognition</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#222] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Employee Recognition</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badge Leaders */}
        <div className="bg-[#222] border border-[#333] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top Badge Earners</h2>
          {leaders.length === 0 ? (
            <p className="text-[#5A5A5A] text-sm">No badges earned yet</p>
          ) : (
            <div className="space-y-2">
              {leaders.map((l, i) => (
                <div
                  key={l.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1A1A1A]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : i === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : 'bg-[#333] text-[#5A5A5A]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white text-sm">{l.name}</span>
                  </div>
                  <span className="text-[#E10600] font-bold text-sm">{l.badge_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recognition Wall */}
        <div className="lg:col-span-2 bg-[#222] border border-[#333] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recognition Wall</h2>
          {kudos.length === 0 ? (
            <p className="text-[#5A5A5A] text-sm">
              No kudos yet — send kudos from the Staff Gamification page
            </p>
          ) : (
            <div className="space-y-3">
              {kudos.map((k) => (
                <div
                  key={k.id}
                  className="p-3 rounded-lg bg-[#1A1A1A] border border-[#333]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        CATEGORY_COLORS[k.category] || 'bg-[#333] text-[#5A5A5A] border-[#444]'
                      }`}
                    >
                      {k.category}
                    </span>
                    <span className="text-xs text-[#5A5A5A]">
                      {k.created_at ? new Date(k.created_at + 'Z').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      }) : '--'}
                    </span>
                  </div>
                  <p className="text-sm text-white">
                    <span className="text-[#E10600] font-semibold">{k.sender_name}</span>
                    <span className="text-[#5A5A5A]"> recognized </span>
                    <span className="font-semibold">{k.receiver_name}</span>
                  </p>
                  <p className="text-sm text-[#5A5A5A] mt-1 italic">
                    &ldquo;{k.message}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
