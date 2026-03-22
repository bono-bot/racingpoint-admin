'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';

interface Employee {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  department: string;
  hire_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [confirm, setConfirm] = useState<{ id: number; name: string; status: string } | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', pin: '', role: 'staff', department: '',
  });

  async function load() {
    try {
      const res = await fetch('/api/hr/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      toast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addEmployee() {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    if (!form.phone.trim()) { toast('Phone is required', 'error'); return; }
    if (form.pin.length !== 4) { toast('PIN must be 4 digits', 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          pin: form.pin,
          role: form.role,
          department: form.department.trim() || 'operations',
          hire_date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error();
      toast(`${form.name} added successfully`, 'success');
      setForm({ name: '', phone: '', pin: '', role: 'staff', department: '' });
      setShowAdd(false);
      load();
    } catch {
      toast('Failed to add employee', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await fetch('/api/hr/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      toast(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
      load();
    } catch {
      toast('Failed to update status', 'error');
    }
    setConfirm(null);
  }

  const activeCount = employees.filter(e => e.status === 'active').length;
  const roles = Array.from(new Set(employees.map(e => e.role)));

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
      || e.phone.includes(search) || e.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-rp-grey mt-1">
            <span className="text-emerald-400 font-medium">{activeCount}</span> active / {employees.length} total
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-rp-red hover:bg-rp-red-light rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {showAdd ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6 animate-scale-in">
          <h3 className="text-sm font-medium text-rp-grey mb-4">New Employee</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="emp-name" className="block text-xs text-rp-grey mb-1">Full Name *</label>
              <input id="emp-name" placeholder="e.g. Rahul Sharma" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div>
              <label htmlFor="emp-phone" className="block text-xs text-rp-grey mb-1">Phone Number *</label>
              <input id="emp-phone" placeholder="e.g. 9876543210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div>
              <label htmlFor="emp-pin" className="block text-xs text-rp-grey mb-1">4-digit PIN *</label>
              <input id="emp-pin" type="password" maxLength={4} placeholder="****" value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors font-mono" />
            </div>
            <div>
              <label htmlFor="emp-role" className="block text-xs text-rp-grey mb-1">Role</label>
              <select id="emp-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors cursor-pointer">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label htmlFor="emp-dept" className="block text-xs text-rp-grey mb-1">Department</label>
              <input id="emp-dept" placeholder="e.g. operations" value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors" />
            </div>
            <div className="flex items-end">
              <button onClick={addEmployee} disabled={saving}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      {!loading && employees.length > 0 && (
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-grey" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Search name, phone, department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-rp-card border border-rp-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-rp-red transition-colors"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:border-rp-red transition-colors"
          >
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonTable rows={5} cols={6} />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-rp-card border border-rp-border rounded-xl">
          <svg className="w-12 h-12 mx-auto text-rp-grey/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-rp-grey font-medium">No employees added yet</p>
          <p className="text-rp-grey/70 text-xs mt-1">Click "+ Add Employee" to get started</p>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs text-rp-grey mb-1">Total</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs text-rp-grey mb-1">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
            </div>
            <div className="bg-rp-card border border-rp-border rounded-xl p-4">
              <p className="text-xs text-rp-grey mb-1">Inactive</p>
              <p className="text-2xl font-bold text-red-400">{employees.length - activeCount}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rp-border text-rp-grey text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} className="border-b border-rp-border/50 hover:bg-rp-black/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rp-red/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-rp-red">{emp.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 font-mono text-xs">{emp.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          emp.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                          emp.role === 'manager' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-rp-red/10 text-rp-red'
                        } capitalize`}>{emp.role}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 capitalize">{emp.department}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                          emp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirm({ id: emp.id, name: emp.name, status: emp.status })}
                          className={`text-xs px-3 py-1 rounded-full cursor-pointer transition-colors ${
                            emp.status === 'active'
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}>
                          {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-rp-grey text-sm">
                        No employees match your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={confirm.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
          message={`Are you sure you want to ${confirm.status === 'active' ? 'deactivate' : 'activate'} ${confirm.name}?`}
          confirmLabel={confirm.status === 'active' ? 'Deactivate' : 'Activate'}
          danger={confirm.status === 'active'}
          onConfirm={() => toggleStatus(confirm.id, confirm.status)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
