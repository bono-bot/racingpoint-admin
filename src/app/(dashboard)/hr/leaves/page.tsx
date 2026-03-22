'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonTable } from '@/components/Skeleton';

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

const leaveTypeColors: Record<string, string> = {
  casual: 'bg-blue-500/10 text-blue-400',
  sick: 'bg-orange-500/10 text-orange-400',
  paid: 'bg-purple-500/10 text-purple-400',
};

export default function LeavesPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ id: number; name: string; action: 'approved' | 'rejected' } | null>(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/hr/leaves');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      toast('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = requests
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !search || r.employee_name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  async function updateStatus(id: number, status: 'approved' | 'rejected') {
    setProcessing(true);
    try {
      await fetch('/api/hr/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reviewed_by: 'Admin' }),
      });
      toast(`Leave request ${status}`, status === 'approved' ? 'success' : 'info');
      load();
    } catch {
      toast('Failed to update request', 'error');
    }
    setProcessing(false);
    setConfirm(null);
  }

  const tabs: { key: FilterTab; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '' },
    { key: 'pending', label: 'Pending', color: 'text-yellow-400' },
    { key: 'approved', label: 'Approved', color: 'text-emerald-400' },
    { key: 'rejected', label: 'Rejected', color: 'text-red-400' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-sm text-rp-grey mt-1">
            {counts.pending > 0 ? (
              <span><span className="text-yellow-400 font-medium">{counts.pending}</span> pending review</span>
            ) : (
              'All caught up'
            )}
          </p>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                filter === tab.key
                  ? 'bg-rp-red/10 text-rp-red border border-rp-red/20'
                  : 'bg-rp-card border border-rp-border text-neutral-400 hover:text-white'
              }`}>
              {tab.label}
              <span className={`ml-1.5 ${filter === tab.key ? '' : tab.color || 'text-rp-grey'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-rp-card border border-rp-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-rp-card border border-rp-border rounded-xl">
          <svg className="w-12 h-12 mx-auto text-rp-grey/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
          </svg>
          <p className="text-rp-grey font-medium">
            {requests.length === 0 ? 'No leave requests yet' : 'No matching requests'}
          </p>
          <p className="text-rp-grey/70 text-xs mt-1">
            {requests.length === 0 ? 'Employees submit requests via the Employee PWA' : 'Try a different filter or search term'}
          </p>
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
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
                  <tr key={req.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rp-red/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-rp-red">{req.employee_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-medium">{req.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${leaveTypeColors[req.leave_type] || 'bg-rp-card text-neutral-400'}`}>
                        {req.leave_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {formatDate(req.start_date)} {'\u2014'} {formatDate(req.end_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-neutral-300 bg-rp-black px-2 py-0.5 rounded text-xs">{req.days}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 max-w-[200px] truncate text-xs">{req.reason || '\u2014'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          req.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                          req.status === 'approved' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setConfirm({ id: req.id, name: req.employee_name, action: 'approved' })}
                            className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors">
                            Approve
                          </button>
                          <button onClick={() => setConfirm({ id: req.id, name: req.employee_name, action: 'rejected' })}
                            className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors">
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
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={`${confirm.action === 'approved' ? 'Approve' : 'Reject'} Leave`}
          message={`${confirm.action === 'approved' ? 'Approve' : 'Reject'} the leave request from ${confirm.name}?`}
          confirmLabel={confirm.action === 'approved' ? 'Approve' : 'Reject'}
          danger={confirm.action === 'rejected'}
          loading={processing}
          onConfirm={() => updateStatus(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
