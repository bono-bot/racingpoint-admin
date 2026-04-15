'use client';

import { useEffect, useState } from 'react';
import { rcFetch } from '@/lib/api/base';
import { SkeletonTable } from '@/components/Skeleton';
import { toast } from 'sonner';

interface BusinessRule {
  key: string;
  category: string;
  value: string;
  value_type: string;
  description: string;
  updated_at: string | null;
  updated_by: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  psychology: 'Psychology & Engagement',
  billing: 'Billing & Sessions',
  marketing: 'Marketing & Comms',
  pricing: 'Pricing Tiers',
};

const CATEGORY_COLORS: Record<string, string> = {
  psychology: 'bg-purple-500/10 text-purple-400',
  billing: 'bg-blue-500/10 text-blue-400',
  marketing: 'bg-green-500/10 text-green-400',
  pricing: 'bg-amber-500/10 text-amber-400',
};

export default function BusinessRulesPage() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await rcFetch('/business-rules');
      setRules(data.rules || []);
    } catch {
      toast.error('Failed to load business rules');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = [...new Set(rules.map(r => r.category))];
  const filtered = filter === 'all' ? rules : rules.filter(r => r.category === filter);

  const startEdit = (rule: BusinessRule) => {
    setEditingKey(rule.key);
    setEditValue(rule.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (key: string) => {
    setSaving(true);
    try {
      const res = await rcFetch(`/business-rules/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: editValue }),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Updated ${key}`);
        setEditingKey(null);
        await load();
      }
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const formatValue = (rule: BusinessRule) => {
    const v = rule.value;
    if (rule.key.includes('paise')) {
      const credits = parseInt(v) / 100;
      return `${v} paise (${credits} credits)`;
    }
    if (rule.key.includes('secs') && !rule.key.includes('per_min')) {
      const s = parseInt(v);
      if (s >= 86400) return `${v} (${s / 86400}d)`;
      if (s >= 3600) return `${v} (${s / 3600}h)`;
      if (s >= 60) return `${v} (${s / 60}m)`;
      return `${v}s`;
    }
    if (rule.key.includes('seconds')) {
      const s = parseInt(v);
      return `${v} (${Math.round(s / 60)}m)`;
    }
    if (rule.value_type === 'float') {
      const f = parseFloat(v);
      return `${v} (${(f * 100).toFixed(0)}%)`;
    }
    return v;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Business Rules</h1>
          <p className="text-rp-grey text-sm mt-1">
            Runtime-configurable constants. Changes take effect on next use without restart.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 text-sm bg-rp-card border border-rp-border rounded-lg hover:border-neutral-500 transition"
        >
          Refresh
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-full transition ${
            filter === 'all' ? 'bg-rp-red text-white' : 'bg-rp-card text-rp-grey border border-rp-border'
          }`}
        >
          All ({rules.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 text-xs rounded-full transition ${
              filter === cat ? 'bg-rp-red text-white' : `${CATEGORY_COLORS[cat] || 'bg-rp-card text-rp-grey'} border border-rp-border`
            }`}
          >
            {CATEGORY_LABELS[cat] || cat} ({rules.filter(r => r.category === cat).length})
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={10} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="text-center text-rp-grey py-12">No business rules found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(rule => (
            <div
              key={rule.key}
              className="bg-rp-card border border-rp-border rounded-xl p-4 hover:border-neutral-600 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{rule.key}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[rule.category] || 'bg-rp-card'}`}>
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-rp-grey">{rule.description}</p>
                  {rule.updated_at && (
                    <p className="text-[10px] text-neutral-600 mt-1">
                      Last updated: {rule.updated_at} by {rule.updated_by}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editingKey === rule.key ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-32 px-2 py-1 text-sm bg-neutral-900 border border-rp-border rounded font-mono focus:border-rp-red outline-none"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(rule.key);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(rule.key)}
                        disabled={saving || editValue === rule.value}
                        className="px-2 py-1 text-xs bg-rp-red text-white rounded hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs text-rp-grey hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-sm text-neutral-300">
                        {formatValue(rule)}
                      </span>
                      <button
                        onClick={() => startEdit(rule)}
                        className="px-2 py-1 text-xs bg-rp-card border border-rp-border rounded hover:border-neutral-500 transition"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
