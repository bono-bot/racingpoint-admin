'use client';

import { useEffect, useState } from 'react';

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', pin: '', role: 'staff', department: '',
  });

  async function load() {
    const res = await fetch('/api/hr/employees');
    const data = await res.json();
    setEmployees(data.employees || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addEmployee() {
    if (!form.name || !form.phone || !form.pin || form.pin.length !== 4) return;
    await fetch('/api/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        pin: form.pin,
        role: form.role,
        department: form.department || 'operations',
        hire_date: new Date().toISOString().slice(0, 10),
      }),
    });
    setForm({ name: '', phone: '', pin: '', role: 'staff', department: '' });
    setShowAdd(false);
    load();
  }

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch('/api/hr/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  }

  const activeCount = employees.filter(e => e.status === 'active').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-rp-grey mt-1">{activeCount} active / {employees.length} total</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-rp-red hover:bg-rp-red rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input placeholder="Full Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red" />
            <input placeholder="Phone Number" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red" />
            <input placeholder="4-digit PIN" type="password" maxLength={4} value={form.pin}
              onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
            <input placeholder="Department" value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
              className="bg-rp-card border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red" />
            <button onClick={addEmployee} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">
              Save Employee
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-rp-grey py-8">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="text-center text-rp-grey py-8">No employees added yet</div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
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
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-rp-border/50 hover:bg-rp-card/30">
                  <td className="px-4 py-3 font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-neutral-400">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rp-red/10 text-rp-red capitalize">{emp.role}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 capitalize">{emp.department}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      emp.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleStatus(emp.id, emp.status)}
                      className={`text-xs px-3 py-1 rounded-full ${
                        emp.status === 'active'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}>
                      {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
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
