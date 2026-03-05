/** Reusable skeleton loading components for the admin dashboard. */

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`h-4 bg-rp-border/50 rounded animate-pulse ${className}`} />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-rp-card border border-rp-border rounded-xl p-5 ${className}`}>
      <SkeletonLine className="w-24 h-3 mb-3" />
      <SkeletonLine className="w-16 h-8 mb-2" />
      <SkeletonLine className="w-32 h-3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-rp-card border border-rp-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-rp-border">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="flex-1 h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-rp-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine
              key={c}
              className={`flex-1 h-3 ${c === 0 ? 'w-28' : ''}`}
              style-delay={`${(r * cols + c) * 50}ms`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ cards = 3, tableRows = 5 }: { cards?: number; tableRows?: number }) {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <SkeletonLine className="w-40 h-7 mb-2" />
          <SkeletonLine className="w-24 h-3" />
        </div>
        <SkeletonLine className="w-28 h-9 rounded-lg" />
      </div>
      {/* Cards */}
      {cards > 0 && (
        <div className={`grid grid-cols-${cards} gap-4 mb-6`}>
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {/* Table */}
      <SkeletonTable rows={tableRows} />
    </div>
  );
}
