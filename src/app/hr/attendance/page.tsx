'use client';

import { useEffect, useState } from 'react';

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
  if (!time) return '-';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHours(minutes: number): string {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [attRes, empRes] = await Promise.all([
      fetch(`/api/hr/attendance?date=${date}`).then(r => r.json()),
      fetch('/api/hr/employees').then(r => r.json()),
    ]);
    setRecords(attRes.records || []);
    setEmployees(empRes.employees || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = activeEmployees.length - presentCount;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-rp-card border border-rp-border rounded-xl p-5">
          <p className="text-sm text-rp-grey mb-1">Present</p>
          <p className="text-3xl font-bold text-emerald-400">{presentCount}</p>
          <p className="text-xs text-rp-grey mt-1">of {activeEmployees.length} active</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-5">
          <p className="text-sm text-rp-grey mb-1">Late</p>
          <p className="text-3xl font-bold text-yellow-400">{lateCount}</p>
        </div>
        <div className="bg-rp-card border border-rp-border rounded-xl p-5">
          <p className="text-sm text-rp-grey mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-400">{absentCount < 0 ? 0 : absentCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No attendance records for this date</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
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
              {records.map(rec => (
                <tr key={rec.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-medium">{rec.employee_name}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatTime(rec.check_in)}</td>
                  <td className="px-4 py-3 text-neutral-400">{formatTime(rec.check_out)}</td>
                  <td className="px-4 py-3 font-mono text-neutral-300">{formatHours(rec.total_minutes)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      rec.status === 'present' ? 'bg-green-500/10 text-green-400' :
                      rec.status === 'late' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rec.check_in_lat && rec.check_in_lng ? (
                      <span className="text-xs text-rp-grey">{rec.check_in_lat.toFixed(4)}, {rec.check_in_lng.toFixed(4)}</span>
                    ) : (
                      <span className="text-xs text-rp-grey">-</span>
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
