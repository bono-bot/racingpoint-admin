'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  sessions_hosted: number;
  rank: number;
}

interface Badge {
  id: string;
  name: string;
  description: string | null;
  badge_icon: string | null;
  earned_at: string;
}

interface Kudos {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  message: string;
  category: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  goal_target: number;
  reward_description: string | null;
  start_date: string;
  end_date: string;
  current_progress: number;
  progress_percent: number;
  status: string;
}

interface AllStaff {
  id: string;
  name: string;
  is_active: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  teamwork: 'bg-blue-500/20 text-blue-400',
  service: 'bg-green-500/20 text-green-400',
  initiative: 'bg-purple-500/20 text-purple-400',
};

export default function StaffGamificationPage() {
  const [leaderboard, setLeaderboard] = useState<StaffMember[]>([]);
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [allStaff, setAllStaff] = useState<AllStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // Kudos form
  const [kudosSender, setKudosSender] = useState('');
  const [kudosReceiver, setKudosReceiver] = useState('');
  const [kudosMessage, setKudosMessage] = useState('');
  const [kudosCategory, setKudosCategory] = useState('teamwork');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      rcFetch('/staff/gamification/leaderboard').catch(() => ({ leaderboard: [] })),
      rcFetch('/staff/gamification/kudos').catch(() => ({ kudos: [] })),
      rcFetch('/staff/gamification/challenges').catch(() => ({ challenges: [] })),
      rcFetch('/staff').catch(() => ({ staff: [] })),
    ]).then(([lb, kd, ch, st]) => {
      setLeaderboard((lb as { leaderboard: StaffMember[] }).leaderboard || []);
      setKudos((kd as { kudos: Kudos[] }).kudos || []);
      setChallenges((ch as { challenges: Challenge[] }).challenges || []);
      setAllStaff((st as { staff: AllStaff[] }).staff || []);
      setLoading(false);
    });
  }, []);

  const handleSendKudos = async () => {
    if (!kudosSender || !kudosReceiver || !kudosMessage.trim()) return;
    setSending(true);
    try {
      await rcFetch('/staff/gamification/kudos', {
        method: 'POST',
        body: JSON.stringify({
          sender_id: kudosSender,
          receiver_id: kudosReceiver,
          message: kudosMessage.trim(),
          category: kudosCategory,
        }),
      });
      setKudosMessage('');
      // Refresh kudos
      const kd = await rcFetch('/staff/gamification/kudos').catch(() => ({ kudos: [] }));
      setKudos((kd as { kudos: Kudos[] }).kudos || []);
    } catch {
      // silently fail
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Staff Gamification</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#222] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Staff Gamification</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="bg-[#222] border border-[#333] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Monthly Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-[#5A5A5A] text-sm">No opted-in staff yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1A1A1A]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                        s.rank === 1
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : s.rank === 2
                            ? 'bg-gray-400/20 text-gray-300'
                            : s.rank === 3
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-[#333] text-[#5A5A5A]'
                      }`}
                    >
                      {s.rank}
                    </span>
                    <span className="text-white text-sm">{s.name}</span>
                  </div>
                  <span className="text-[#E10600] font-bold text-sm">
                    {s.sessions_hosted} sessions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Challenges */}
        <div className="bg-[#222] border border-[#333] rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Active Challenges</h2>
          {challenges.length === 0 ? (
            <p className="text-[#5A5A5A] text-sm">No active challenges</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-[#1A1A1A]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white text-sm font-semibold">{c.name}</p>
                      {c.description && (
                        <p className="text-[#5A5A5A] text-xs mt-0.5">{c.description}</p>
                      )}
                    </div>
                    {c.reward_description && (
                      <span className="text-xs bg-[#E10600]/20 text-[#E10600] px-2 py-0.5 rounded">
                        {c.reward_description}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2">
                    <div
                      className="bg-[#E10600] h-2 rounded-full transition-all"
                      style={{ width: `${c.progress_percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#5A5A5A] mt-1">
                    {c.current_progress}/{c.goal_target} — {c.progress_percent}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kudos Section */}
      <div className="bg-[#222] border border-[#333] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Kudos</h2>

        {/* Send Kudos Form */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-[#1A1A1A] rounded-lg">
          <select
            value={kudosSender}
            onChange={(e) => setKudosSender(e.target.value)}
            className="bg-[#333] text-white text-sm rounded px-2 py-1.5 border border-[#444]"
          >
            <option value="">From...</option>
            {allStaff
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select
            value={kudosReceiver}
            onChange={(e) => setKudosReceiver(e.target.value)}
            className="bg-[#333] text-white text-sm rounded px-2 py-1.5 border border-[#444]"
          >
            <option value="">To...</option>
            {allStaff
              .filter((s) => s.is_active && s.id !== kudosSender)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select
            value={kudosCategory}
            onChange={(e) => setKudosCategory(e.target.value)}
            className="bg-[#333] text-white text-sm rounded px-2 py-1.5 border border-[#444]"
          >
            <option value="teamwork">Teamwork</option>
            <option value="service">Service</option>
            <option value="initiative">Initiative</option>
          </select>
          <input
            type="text"
            value={kudosMessage}
            onChange={(e) => setKudosMessage(e.target.value)}
            placeholder="Great job on..."
            className="flex-1 min-w-[200px] bg-[#333] text-white text-sm rounded px-3 py-1.5 border border-[#444] placeholder-[#5A5A5A]"
          />
          <button
            onClick={handleSendKudos}
            disabled={sending || !kudosSender || !kudosReceiver || !kudosMessage.trim()}
            className="bg-[#E10600] text-white text-sm font-semibold px-4 py-1.5 rounded hover:bg-[#E10600]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send Kudos'}
          </button>
        </div>

        {/* Recent Kudos */}
        {kudos.length === 0 ? (
          <p className="text-[#5A5A5A] text-sm">No kudos yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {kudos.map((k) => (
              <div
                key={k.id}
                className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[#1A1A1A]"
              >
                <span
                  className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                    CATEGORY_COLORS[k.category] || 'bg-[#333] text-[#5A5A5A]'
                  }`}
                >
                  {k.category}
                </span>
                <div className="text-sm">
                  <span className="text-[#E10600] font-semibold">{k.sender_name}</span>
                  <span className="text-[#5A5A5A]"> → </span>
                  <span className="text-white font-semibold">{k.receiver_name}</span>
                  <span className="text-[#5A5A5A]">: </span>
                  <span className="text-white">{k.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
