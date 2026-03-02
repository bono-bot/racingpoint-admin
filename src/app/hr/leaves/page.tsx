'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';

interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/hr/leaves');
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  async function updateStatus(id: number, status: 'approved' | 'rejected') {
    await fetch('/api/hr/leaves', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, reviewed_by: 'Admin' }),
    });
    load();
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-sm text-rp-grey mt-1">{counts.pending} pending review</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === tab.key
                ? 'bg-rp-red/10 text-rp-red border border-rp-red/20'
                : 'bg-rp-card border border-rp-border text-neutral-400'
            }`}>
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No leave requests found</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium text-center">Days</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-medium">{req.employee_name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 capitalize">{req.leave_type}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {formatDate(req.start_date)} - {formatDate(req.end_date)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-neutral-300">{req.days}</td>
                  <td className="px-4 py-3 text-neutral-400 max-w-[200px] truncate">{req.reason || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => updateStatus(req.id, 'approved')}
                          className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(req.id, 'rejected')}
                          className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20">
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-rp-grey">
                        {req.reviewed_by && `by ${req.reviewed_by}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
