'use client';

import { useEffect, useState, useCallback } from 'react';
import { staffApi } from '@/lib/api/staff';
import type { StaffMember } from '@/lib/api/staff';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

const ROLES = ['staff', 'cashier', 'manager', 'superadmin'] as const;

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-rp-red/20 text-rp-red',
  manager: 'bg-amber-500/20 text-amber-400',
  cashier: 'bg-blue-500/20 text-blue-400',
  staff: 'bg-neutral-500/20 text-neutral-400',
};

interface StaffForm {
  name: string;
  phone: string;
  pin: string;
  role: string;
}

const emptyForm: StaffForm = { name: '', phone: '', pin: '', role: 'staff' };

export default function StaffManagePage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<StaffForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StaffForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // PIN visibility
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await staffApi.list();
      setStaff(res.staff || []);
    } catch {
      toast.error('Failed to load staff');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim() || !createForm.pin.trim()) {
      toast.error('Name, phone, and PIN are required');
      return;
    }
    setCreating(true);
    try {
      const res = await staffApi.create({
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        pin: createForm.pin.trim(),
      });
      if (res.status === 'ok') {
        // Set role if not default
        if (createForm.role !== 'staff') {
          await staffApi.update(res.id, { role: createForm.role });
        }
        toast.success(`Created ${createForm.name}`);
        setCreateForm({ ...emptyForm });
        setShowCreate(false);
        await loadStaff();
      } else {
        toast.error((res as Record<string, string>).error || 'Failed to create');
      }
    } catch (e) {
      toast.error(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setCreating(false);
  };

  const startEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, phone: s.phone, pin: s.pin, role: s.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!editingId) return;
    const original = staff.find(s => s.id === editingId);
    if (!original) return;

    const changes: Record<string, string | boolean> = {};
    if (editForm.name.trim() !== original.name) changes.name = editForm.name.trim();
    if (editForm.phone.trim() !== original.phone) changes.phone = editForm.phone.trim();
    if (editForm.pin.trim() !== original.pin) changes.pin = editForm.pin.trim();
    if (editForm.role !== original.role) changes.role = editForm.role;

    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }

    setSaving(true);
    try {
      const res = await staffApi.update(editingId, changes);
      if (res.status === 'ok') {
        toast.success(`Updated ${editForm.name}`);
        cancelEdit();
        await loadStaff();
      } else {
        toast.error((res as Record<string, string>).error || 'Failed to update');
      }
    } catch (e) {
      toast.error(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await staffApi.deactivate(deactivateTarget.id);
      if (res.status === 'ok') {
        toast.success(`Deactivated ${deactivateTarget.name}`);
        setDeactivateTarget(null);
        await loadStaff();
      } else {
        toast.error((res as Record<string, string>).error || 'Failed to deactivate');
      }
    } catch (e) {
      toast.error(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setDeactivating(false);
  };

  const handleReactivate = async (s: StaffMember) => {
    try {
      const res = await staffApi.update(s.id, { is_active: true });
      if (res.status === 'ok') {
        toast.success(`Reactivated ${s.name}`);
        await loadStaff();
      }
    } catch {
      toast.error('Failed to reactivate');
    }
  };

  const togglePin = (id: string) => {
    setVisiblePins(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = staff.filter(s => showInactive || s.is_active);
  const activeCount = staff.filter(s => s.is_active).length;
  const inactiveCount = staff.length - activeCount;

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-rp-card rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-rp-grey mt-1">
            {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showCreate ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-rp-card border border-rp-border rounded-xl p-5 animate-scale-in">
          <h2 className="text-sm font-semibold text-rp-grey uppercase tracking-wider mb-4">New Staff Member</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-rp-grey mb-1 block">Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Full name"
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              />
            </div>
            <div>
              <label className="text-xs text-rp-grey mb-1 block">Phone</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="9876543210"
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              />
            </div>
            <div>
              <label className="text-xs text-rp-grey mb-1 block">PIN</label>
              <input
                type="text"
                value={createForm.pin}
                onChange={e => setCreateForm({ ...createForm, pin: e.target.value })}
                placeholder="4-digit PIN"
                maxLength={6}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-rp-grey mb-1 block">Role</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full bg-rp-black border border-rp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rp-red"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim() || !createForm.phone.trim() || !createForm.pin.trim()}
              className="bg-rp-red hover:bg-rp-red/90 text-white text-sm font-semibold px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-rp-grey cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="accent-rp-red"
          />
          Show inactive
        </label>
      </div>

      {/* Staff Table */}
      {filtered.length === 0 ? (
        <div className="text-center text-rp-grey py-12">
          {staff.length === 0 ? 'No staff members yet. Click "+ Add Staff" to create one.' : 'No matching staff members.'}
        </div>
      ) : (
        <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rp-border text-rp-grey text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">PIN</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr
                  key={s.id}
                  className={`border-b border-rp-border/50 ${!s.is_active ? 'opacity-50' : 'hover:bg-rp-black/30'}`}
                >
                  {editingId === s.id ? (
                    /* Edit mode */
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full bg-rp-black border border-rp-border rounded px-2 py-1 text-sm focus:outline-none focus:border-rp-red"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full bg-rp-black border border-rp-border rounded px-2 py-1 text-sm focus:outline-none focus:border-rp-red"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.pin}
                          onChange={e => setEditForm({ ...editForm, pin: e.target.value })}
                          maxLength={6}
                          className="w-full bg-rp-black border border-rp-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-rp-red"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="bg-rp-black border border-rp-border rounded px-2 py-1 text-sm focus:outline-none focus:border-rp-red"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-500/10 text-neutral-500'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-rp-grey text-xs">
                        {s.last_login_at || 'Never'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-rp-grey hover:text-white px-2 py-1 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* View mode */
                    <>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-rp-grey">{s.phone}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePin(s.id)}
                          className="font-mono text-xs bg-rp-black border border-rp-border rounded px-2 py-1 hover:border-rp-red/50 transition-colors cursor-pointer"
                          title={visiblePins.has(s.id) ? 'Click to hide' : 'Click to reveal'}
                        >
                          {visiblePins.has(s.id) ? s.pin : '\u2022\u2022\u2022\u2022'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[s.role] || ROLE_COLORS.staff}`}>
                          {s.role.charAt(0).toUpperCase() + s.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-500/10 text-neutral-500'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-rp-grey text-xs">
                        {s.last_login_at || 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(s)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Edit
                          </button>
                          {s.is_active ? (
                            <button
                              onClick={() => setDeactivateTarget(s)}
                              className="text-xs text-rp-red hover:text-rp-red-light transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(s)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate Staff Member"
        message={deactivateTarget ? `Deactivate ${deactivateTarget.name}? They will no longer be able to log in with their PIN.` : ''}
        confirmLabel="Deactivate"
        danger
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
