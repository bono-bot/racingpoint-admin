'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

interface Candidate {
  id: number;
  name: string | null;
  push_name: string | null;
  age: number | null;
  area: string | null;
  availability: string | null;
  phase: string;
  honesty_score: number | null;
  integrity_score: number | null;
  punctuality_score: number | null;
  speaking_score: number | null;
  knowledge_score: number | null;
  knowledge_correct: number | null;
  knowledge_total: number | null;
  fit_probability: number | null;
  character_analysis: string | null;
  speaking_analysis: string | null;
  created_at: string;
  completed_at: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  welcome: 'Not Started',
  basic_name: 'Basic Info',
  basic_age: 'Basic Info',
  basic_area: 'Basic Info',
  basic_availability: 'Basic Info',
  character_intro: 'Character',
  character: 'Character',
  voice_intro: 'Voice',
  voice_waiting: 'Voice',
  quiz_intro: 'Quiz',
  quiz: 'Quiz',
  scoring: 'Scoring...',
  complete: 'Complete',
};

function ScoreBar({ label, score, weight }: { label: string; score: number | null; weight: string }) {
  const s = score ?? 0;
  const pct = Math.min(s * 10, 100);
  const color = s >= 7 ? 'bg-emerald-500' : s >= 5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-24 text-neutral-400">{label}</div>
      <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right font-mono">{s.toFixed(1)}</div>
      <div className="w-10 text-right text-neutral-500 text-xs">{weight}</div>
    </div>
  );
}

export default function HiringPage() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/hr/hiring');
      const data = await res.json();
      setCandidates(data.candidates || []);
      if (data.error) setError(data.error);
    } catch {
      toast('Failed to load candidates', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const completed = candidates.filter(c => c.phase === 'complete');
  const inProgress = candidates.filter(c => c.phase !== 'complete');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hiring</h1>
          <p className="text-sm text-neutral-400 mt-1">
            WhatsApp screening pipeline &middot; {completed.length} complete, {inProgress.length} in progress
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-neutral-400 py-12">Loading candidates...</div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-400 text-lg">No candidates yet</p>
          <p className="text-neutral-500 text-sm mt-2">
            Candidates will appear here when they message APPLY to the hiring WhatsApp number
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate list */}
          <div className="lg:col-span-2 space-y-3">
            {/* Completed candidates first */}
            {completed.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  'bg-[#222] border rounded-xl p-4 cursor-pointer transition-all hover:border-neutral-500',
                  selected?.id === c.id ? 'border-[#E10600]' : 'border-neutral-800'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.name || c.push_name || 'Unknown'}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {c.area && `${c.area} · `}
                      {c.age && `${c.age}y · `}
                      {c.availability || ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-2xl font-bold font-mono',
                      (c.fit_probability ?? 0) >= 70 ? 'text-emerald-400' :
                        (c.fit_probability ?? 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {c.fit_probability ?? 0}%
                    </div>
                    <div className="text-xs text-neutral-500">fit score</div>
                  </div>
                </div>
              </div>
            ))}

            {/* In-progress candidates */}
            {inProgress.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  'bg-[#222] border rounded-xl p-4 cursor-pointer transition-all hover:border-neutral-500 opacity-60',
                  selected?.id === c.id ? 'border-[#E10600]' : 'border-neutral-800'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.name || c.push_name || 'Unknown'}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{c.area || 'No info yet'}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-700 text-neutral-300">
                    {PHASE_LABELS[c.phase] || c.phase}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-[#222] border border-neutral-800 rounded-xl p-5 sticky top-6">
                <h2 className="text-lg font-bold mb-1">{selected.name || selected.push_name || 'Unknown'}</h2>
                <div className="text-xs text-neutral-400 mb-4">
                  {selected.area && `${selected.area} · `}
                  {selected.age && `Age ${selected.age} · `}
                  {selected.availability || ''}
                </div>

                {selected.phase === 'complete' && selected.fit_probability != null ? (
                  <>
                    <div className="text-center mb-5">
                      <div className={cn(
                        'text-4xl font-bold font-mono',
                        selected.fit_probability >= 70 ? 'text-emerald-400' :
                          selected.fit_probability >= 50 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {selected.fit_probability}%
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">likely to be a good fit</div>
                    </div>

                    <div className="space-y-2 mb-5">
                      <ScoreBar label="Honesty" score={selected.honesty_score} weight="30%" />
                      <ScoreBar label="Integrity" score={selected.integrity_score} weight="25%" />
                      <ScoreBar label="Punctuality" score={selected.punctuality_score} weight="20%" />
                      <ScoreBar label="Speaking" score={selected.speaking_score} weight="15%" />
                      <ScoreBar label="Knowledge" score={selected.knowledge_score} weight="10%" />
                    </div>

                    {selected.knowledge_correct != null && (
                      <div className="text-xs text-neutral-400 mb-3">
                        Quiz: {selected.knowledge_correct}/{selected.knowledge_total} correct
                      </div>
                    )}

                    {selected.character_analysis && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-neutral-300 mb-1">Character Assessment</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{selected.character_analysis}</p>
                      </div>
                    )}

                    {selected.speaking_analysis && (
                      <div>
                        <div className="text-xs font-medium text-neutral-300 mb-1">Speaking Assessment</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{selected.speaking_analysis}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-neutral-400">
                    Screening in progress: <span className="text-white">{PHASE_LABELS[selected.phase] || selected.phase}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#222] border border-neutral-800 rounded-xl p-5 text-center text-neutral-500 text-sm">
                Select a candidate to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
