'use client';

/**
 * /fleet/content-drift — Content Drift diagnostic page.
 *
 * Phase 361-03: Surfaces per-pod inventory divergence between:
 *   - TOML-declared content (GET /api/v1/pods/{id}/inventory)
 *   - Live disk scan     (GET /api/v1/debug/pod-content-dirs/{id})
 *
 * Drift computation is CLIENT-SIDE and FUNCTIONAL today (not Phase 366 placeholder).
 * Degrade-open games (FH5, F1 25, iRacing) are excluded from drift when
 * cars_enumerable / tracks_enumerable === false.
 *
 * Auto-refreshes every 30s, respecting document.visibilityState.
 */

import useSWR from 'swr';
import { useState } from 'react';
import { fleetApi } from '@/lib/api/fleet';
import type {
  PodInventory,
  ContentDirsResponse,
  ContentDriftRow,
  GameDrift,
} from '@/lib/types';

// ─── IST time helper ──────────────────────────────────────────────────────────

function toIstTime(date: Date): string {
  // CLAUDE.md: Git Bash TZ fails on Windows — use Intl.DateTimeFormat for IST.
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' IST';
}

// ─── Drift computation ────────────────────────────────────────────────────────

/**
 * Compute drift between TOML-declared inventory and live disk scan.
 *
 * Rules:
 * - If cars_enumerable === false → skip car drift (degrade-open)
 * - If tracks_enumerable === false → skip track drift (degrade-open)
 * - missing = expected (TOML) - actual (disk) → blocks launches
 * - extra   = actual (disk) - expected (TOML) → informational
 */
function computeDrift(
  inventory: PodInventory,
  dirs: ContentDirsResponse,
): {
  hasDrift: boolean;
  missing_per_game: Record<string, GameDrift>;
  extra_per_game: Record<string, GameDrift>;
} {
  const missing_per_game: Record<string, GameDrift> = {};
  const extra_per_game: Record<string, GameDrift> = {};
  let hasDrift = false;

  for (const game of inventory.games) {
    const diskGame = dirs.games.find((g) => g.game_key === game.key);
    if (!diskGame) continue;

    const missingCars =
      diskGame.cars_enumerable
        ? game.cars.filter((c) => !diskGame.cars_on_disk.includes(c))
        : [];
    const extraCars =
      diskGame.cars_enumerable
        ? diskGame.cars_on_disk.filter((c) => !game.cars.includes(c))
        : [];
    const missingTracks =
      diskGame.tracks_enumerable
        ? game.tracks.filter((t) => !diskGame.tracks_on_disk.includes(t))
        : [];
    const extraTracks =
      diskGame.tracks_enumerable
        ? diskGame.tracks_on_disk.filter((t) => !game.tracks.includes(t))
        : [];

    if (
      missingCars.length > 0 ||
      extraCars.length > 0 ||
      missingTracks.length > 0 ||
      extraTracks.length > 0
    ) {
      hasDrift = true;
      if (missingCars.length > 0 || missingTracks.length > 0) {
        missing_per_game[game.key] = { cars: missingCars, tracks: missingTracks };
      }
      if (extraCars.length > 0 || extraTracks.length > 0) {
        extra_per_game[game.key] = { cars: extraCars, tracks: extraTracks };
      }
    }
  }

  return { hasDrift, missing_per_game, extra_per_game };
}

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

/**
 * Fan-out fetcher: for each pod 1..8, fetch inventory + content-dirs in parallel.
 * Uses Promise.allSettled — a single pod failure does not abort the rest.
 * Returns ContentDriftRow[] (one row per pod, sorted by pod_id).
 */
async function fetchAllPodDrift(): Promise<ContentDriftRow[]> {
  const now = toIstTime(new Date());
  const POD_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

  const results = await Promise.allSettled(
    POD_IDS.map(async (id) => {
      const [invResult, dirsResult] = await Promise.allSettled([
        fleetApi.podInventory(id),
        fleetApi.podContentDirs(id),
      ]);

      if (invResult.status === 'rejected' || dirsResult.status === 'rejected') {
        const reason =
          invResult.status === 'rejected'
            ? String(invResult.reason)
            : String((dirsResult as PromiseRejectedResult).reason);
        const row: ContentDriftRow = {
          pod_id: id,
          status: 'UNREACHABLE',
          missing_per_game: {},
          extra_per_game: {},
          last_check_ist: now,
          unreachable_reason: reason,
        };
        return row;
      }

      const inventory = invResult.value;
      const dirs = dirsResult.value;
      const { hasDrift, missing_per_game, extra_per_game } = computeDrift(inventory, dirs);

      const row: ContentDriftRow = {
        pod_id: id,
        status: hasDrift ? 'DRIFT' : 'OK',
        missing_per_game,
        extra_per_game,
        last_check_ist: now,
      };
      return row;
    }),
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    // Outer allSettled layer — individual pod errors already handled above.
    const row: ContentDriftRow = {
      pod_id: POD_IDS[i],
      status: 'UNREACHABLE',
      missing_per_game: {},
      extra_per_game: {},
      last_check_ist: now,
      unreachable_reason: String(r.reason),
    };
    return row;
  });
}

// ─── Badge component ──────────────────────────────────────────────────────────

function DriftStatusBadge({ status }: { status: ContentDriftRow['status'] }) {
  if (status === 'OK') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-400/20 text-emerald-400">
        OK
      </span>
    );
  }
  if (status === 'DRIFT') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-rp-red text-white">
        DRIFT
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-rp-grey/20 text-rp-grey">
      UNREACHABLE
    </span>
  );
}

// ─── Drift game bullet list ───────────────────────────────────────────────────

function DriftGameList({
  perGame,
  label,
  labelColor,
}: {
  perGame: Record<string, GameDrift>;
  label: string;
  labelColor: string;
}) {
  const entries = Object.entries(perGame);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2">
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>{label}</p>
      <ul className="mt-1 space-y-0.5">
        {entries.map(([gameKey, drift]) => {
          const items = [...drift.cars, ...drift.tracks];
          if (items.length === 0) return null;
          return (
            <li key={gameKey} className="text-xs text-neutral-400 pl-2">
              <span className="text-neutral-300">{gameKey}:</span>{' '}
              {items.join(', ')}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Drift row counts ─────────────────────────────────────────────────────────

function countItems(perGame: Record<string, GameDrift>): number {
  return Object.values(perGame).reduce(
    (sum, g) => sum + g.cars.length + g.tracks.length,
    0,
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentDriftPage() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, mutate, isLoading } = useSWR<ContentDriftRow[]>(
    'content-drift',
    fetchAllPodDrift,
    {
      refreshInterval: 30000,
      // Respect document.visibilityState — do NOT refresh when tab is hidden
      refreshWhenHidden: false,
      revalidateOnFocus: true,
    },
  );

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  // All-failure state: every pod is UNREACHABLE
  const allUnreachable =
    data !== undefined &&
    data.length > 0 &&
    data.every((r) => r.status === 'UNREACHABLE');

  // All-OK state: no drift on any pod
  const allOk =
    data !== undefined &&
    data.length > 0 &&
    data.every((r) => r.status === 'OK');

  // ── Full-page error ──
  if (allUnreachable) {
    return (
      <div>
        <PageHeader onRefresh={handleRefreshNow} refreshing={refreshing} />
        <div className="mt-8 bg-rp-card border border-rp-red/40 rounded-lg p-6 text-center">
          <p className="text-rp-red font-semibold text-base mb-1">
            Content drift API unreachable. Check racecontrol server on :8080.
          </p>
          <p className="text-rp-grey text-sm mb-4">
            All 8 pods returned errors. The server may be offline or the staff
            session may have expired.
          </p>
          <button
            onClick={handleRefreshNow}
            disabled={refreshing}
            className="text-sm px-4 py-2 rounded bg-rp-red/20 text-rp-red hover:bg-rp-red/30 transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // ── Error state (SWR-level, not all-pod failure) ──
  if (error && !data) {
    return (
      <div>
        <PageHeader onRefresh={handleRefreshNow} refreshing={refreshing} />
        <div className="mt-8 bg-rp-card border border-rp-red/40 rounded-lg p-6 text-center">
          <p className="text-rp-red font-semibold">Failed to load content drift data.</p>
          <button
            onClick={handleRefreshNow}
            className="mt-3 text-sm px-3 py-1.5 rounded bg-rp-red/20 text-rp-red hover:bg-rp-red/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader onRefresh={handleRefreshNow} refreshing={refreshing} />

      <p className="text-sm text-rp-grey mt-1 mb-6">
        Per-pod inventory reconciliation. Compares each pod&apos;s TOML-declared
        content against files on disk.
      </p>

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-rp-card rounded border border-rp-border" />
          ))}
        </div>
      )}

      {/* Empty state — all pods OK */}
      {allOk && (
        <div className="mt-4 bg-rp-card border border-rp-border rounded-lg p-8 text-center">
          <p className="text-emerald-400 font-semibold text-lg">All pods in sync</p>
          <p className="text-rp-grey text-sm mt-1">
            Every pod&apos;s installed content matches its TOML manifest. Last
            check:{' '}
            {data[0]?.last_check_ist ?? '—'}.
          </p>
        </div>
      )}

      {/* Main table */}
      {data && !allOk && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rp-border pb-2">
                <th className="text-left text-xs text-rp-grey uppercase tracking-wide py-2 pr-4">
                  Pod
                </th>
                <th className="text-left text-xs text-rp-grey uppercase tracking-wide py-2 pr-4">
                  Status
                </th>
                <th className="text-left text-xs text-rp-grey uppercase tracking-wide py-2 pr-4">
                  Missing
                </th>
                <th className="text-left text-xs text-rp-grey uppercase tracking-wide py-2 pr-4">
                  Extra
                </th>
                <th className="text-left text-xs text-rp-grey uppercase tracking-wide py-2">
                  Last Check
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const missingCount = countItems(row.missing_per_game);
                const extraCount = countItems(row.extra_per_game);

                if (row.status === 'UNREACHABLE') {
                  return (
                    <tr
                      key={row.pod_id}
                      className="border-b border-rp-border py-4 opacity-60 text-rp-grey"
                    >
                      <td className="py-4 pr-4 text-sm font-medium">Pod {row.pod_id}</td>
                      <td className="py-4 pr-4">
                        <DriftStatusBadge status="UNREACHABLE" />
                      </td>
                      <td className="py-4 pr-4 text-xs text-rp-grey">—</td>
                      <td className="py-4 pr-4 text-xs text-rp-grey">—</td>
                      <td className="py-4 text-xs text-rp-grey">
                        {row.unreachable_reason
                          ? `Unreachable — last seen ${row.last_check_ist}`
                          : row.last_check_ist}
                      </td>
                    </tr>
                  );
                }

                if (row.status === 'OK') {
                  return (
                    <tr key={row.pod_id} className="border-b border-rp-border">
                      <td className="py-4 pr-4 text-sm font-medium text-white">
                        Pod {row.pod_id}
                      </td>
                      <td className="py-4 pr-4">
                        <DriftStatusBadge status="OK" />
                      </td>
                      <td className="py-4 pr-4 text-xs text-rp-grey">0</td>
                      <td className="py-4 pr-4 text-xs text-rp-grey">0</td>
                      <td className="py-4 text-xs text-rp-grey">{row.last_check_ist}</td>
                    </tr>
                  );
                }

                // DRIFT row — auto-expanded via <details open>
                return (
                  <tr
                    key={row.pod_id}
                    className="border-b border-rp-border border-l-4 border-l-rp-red"
                  >
                    <td colSpan={5} className="py-4 px-2">
                      <details open>
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-sm font-medium text-white">
                              Pod {row.pod_id}
                            </span>
                            <DriftStatusBadge status="DRIFT" />
                            <span className="text-xs text-rp-grey">
                              {missingCount} files missing &middot; {extraCount} files
                              extra
                            </span>
                            <span className="ml-auto text-xs text-rp-grey">
                              {row.last_check_ist}
                            </span>
                          </div>
                        </summary>

                        {/* Drift detail sections */}
                        <div className="mt-3 pl-4 space-y-3">
                          {Object.keys(row.missing_per_game).length > 0 && (
                            <DriftGameList
                              perGame={row.missing_per_game}
                              label="Missing from disk (blocks launches)"
                              labelColor="text-rp-red"
                            />
                          )}
                          {Object.keys(row.extra_per_game).length > 0 && (
                            <DriftGameList
                              perGame={row.extra_per_game}
                              label="Extra on disk (informational)"
                              labelColor="text-rp-grey"
                            />
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-rp-grey mt-4">Auto-refreshes every 30 seconds</p>
    </div>
  );
}

// ─── Page header (extracted to avoid duplication in error states) ─────────────

function PageHeader({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-2xl font-bold">Content Drift</h1>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="text-sm px-3 py-1.5 rounded bg-rp-card border border-rp-border text-neutral-300 hover:border-neutral-500 transition-colors disabled:opacity-50"
      >
        {refreshing ? 'Refreshing...' : 'Refresh now'}
      </button>
    </div>
  );
}
