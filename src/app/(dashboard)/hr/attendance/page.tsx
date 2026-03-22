'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  total_minutes: number;
  status: string;
  notes: string | null;
}

interface Employee {
  id: number;
  name: string;
  status: string;
}

function formatTime(time: string | null): string {
  if (!time) return '\u2014';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHours(minutes: number): string {
  if (!minutes) return '\u2014';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`/api/hr/attendance?date=${date}`).then(r => r.json()),
        fetch('/api/hr/employees').then(r => r.json()),
      ]);
      setRecords(attRes.records || []);
      setEmployees(empRes.employees || []);
    } catch {
      toast('Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [date]);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = Math.max(0, activeEmployees.length - presentCount);

  const filtered = records.filter(r =>
    !search || r.employee_name.toLowerCase().includes(search.toLowerCase())
  );

  const isToday = date === new Date().toISOString().slice(0, 10);

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  }
  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-rp-grey mt-1">
            {isToday ? 'Today' : new Date(date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-2 bg-rp-card border border-rp-border rounded-lg hover:bg-rp-black transition-colors cursor-pointer" aria-label="Previous day">
            <svg className="w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer" />
          <button onClick={nextDay} className="p-2 bg-rp-card border border-rp-border rounded-lg hover:bg-rp-black transition-colors cursor-pointer" aria-label="Next day">
            <svg className="w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-rp-card border border-rp-border rounded-xl p-4">
            <p className="text-xs text-rp-grey mb-1">Staff</p>
            <p className="text-2xl font-bold">{activeEmployees.length}</p>
          </div>
          <div className="bg-rp-card border border-rp-border rounded-xl p-4">
            <p className="text-xs text-rp-grey mb-1">Present</p>
            <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
            {activeEmployees.length > 0 && (
              <div className="mt-2 h-1.5 bg-rp-black rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(presentCount / activeEmployees.length) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="bg-rp-card border border-rp-border rounded-xl p-4">
            <p className="text-xs text-rp-grey mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-400">{lateCount}</p>
          </div>
          <div className="bg-rp-card border border-rp-border rounded-xl p-4">
            <p className="text-xs text-rp-grey mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-400">{absentCount}</p>
          </div>
        </div>
      )}

      {/* Search */}
      {!loading && records.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-rp-card border border-rp-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-rp-card border border-rp-border rounded-xl">
          <svg className="w-12 h-12 mx-auto text-rp-grey/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <p className="text-rp-grey font-medium">No attendance records for this date</p>
          <p className="text-rp-grey/70 text-xs mt-1">Employees check in via the Employee PWA</p>
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rp-border text-rp-grey text-left">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Total Hours</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => (
                  <tr key={rec.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rp-red/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-rp-red">{rec.employee_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-medium">{rec.employee_name}</span>
                          {rec.notes && <p className="text-[10px] text-rp-grey truncate max-w-[150px]">{rec.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-neutral-300">{formatTime(rec.check_in)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-neutral-300">{formatTime(rec.check_out)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-neutral-300">{formatHours(rec.total_minutes)}</span>
                      {rec.total_minutes > 0 && (
                        <div className="mt-1 h-1 bg-rp-black rounded-full overflow-hidden w-16">
                          <div className={`h-full rounded-full ${rec.total_minutes >= 480 ? 'bg-emerald-500' : rec.total_minutes >= 240 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, (rec.total_minutes / 540) * 100)}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                        rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                        rec.status === 'late' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          rec.status === 'present' ? 'bg-emerald-400' :
                          rec.status === 'late' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rec.check_in_lat && rec.check_in_lng ? (
                        <span className="text-xs text-rp-grey font-mono">
                          {rec.check_in_lat.toFixed(4)}, {rec.check_in_lng.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-rp-grey">{'\u2014'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-rp-grey text-sm">No matching records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
