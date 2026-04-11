/**
 * Shared TypeScript types for the Racing Point admin dashboard.
 *
 * Phase 361-03: PodInventory + ContentDirsResponse for content drift detection.
 *
 * CRITICAL: field names MUST match Rust serde output exactly (snake_case).
 * See crates/rc-common/src/inventory_types.rs for the canonical source.
 * Renaming any field here WITHOUT updating the Rust struct will cause silent
 * data drops (serde ignores unknown JSON fields, no error).
 */

// ─── Pod Inventory (TOML-sourced, from /api/v1/pods/{id}/inventory) ──────────

export interface AiCountRange {
  min: number;
  max: number;
}

/** Per-game inventory entry from the pod's TOML. */
export interface GameInventory {
  /** Canonical game key: assetto_corsa, f1_25, iracing, etc. */
  key: string;
  /** Human-readable display name. */
  display_name: string;
  /** True if the game is configured in [games.<key>] in the TOML. */
  installed: boolean;
  /** Installed cars. Empty = degrade-open (no car validation for this game). */
  cars: string[];
  /** Installed tracks. Empty = degrade-open. */
  tracks: string[];
}

/**
 * Full pod inventory response from GET /api/v1/pods/{id}/inventory.
 * Sourced from the committed TOML — the canonical fleet content manifest.
 */
export interface PodInventory {
  pod_number: number;
  pod_name: string;
  sim: string;
  games: GameInventory[];
  ai_count_range: AiCountRange;
  /** IST timestamp string: "YYYY-MM-DD HH:MM IST" */
  fetched_at: string;
}

// ─── Content Dirs (live disk scan, from /api/v1/debug/pod-content-dirs/{id}) ─

/** Per-game live disk scan result from rc-agent /debug/content-dirs. */
export interface GameDirs {
  /** Canonical game key — matches GameInventory.key. */
  game_key: string;
  cars_dir: string;
  tracks_dir: string;
  /** Cars found on disk right now (via readdir). */
  cars_on_disk: string[];
  /** Tracks found on disk right now. */
  tracks_on_disk: string[];
  /**
   * False = degrade-open (MS Store / non-enumerable title).
   * When false, skip drift computation for cars (treat as always-OK).
   */
  cars_enumerable: boolean;
  /** False = degrade-open for tracks. */
  tracks_enumerable: boolean;
}

/**
 * Full response from GET /api/v1/debug/pod-content-dirs/{id}.
 * Live disk scan proxied from rc-agent /debug/content-dirs.
 */
export interface ContentDirsResponse {
  games: GameDirs[];
}

// ─── Drift Detection (client-side computed state) ─────────────────────────────

/** Per-game drift detail: lists of missing/extra content names. */
export interface GameDrift {
  cars: string[];
  tracks: string[];
}

/**
 * Client-side computed row for the content drift table.
 * One row per pod (pod IDs 1..8).
 */
export interface ContentDriftRow {
  pod_id: number;
  /** OK = TOML matches disk; DRIFT = mismatch found; UNREACHABLE = fetch failed. */
  status: 'OK' | 'DRIFT' | 'UNREACHABLE';
  /**
   * Per-game missing content (declared in TOML, not on disk).
   * Keyed by game_key. Only present when status === 'DRIFT'.
   */
  missing_per_game: Record<string, GameDrift>;
  /**
   * Per-game extra content (on disk, not in TOML).
   * Keyed by game_key. Only present when status === 'DRIFT'.
   */
  extra_per_game: Record<string, GameDrift>;
  /** IST time string "HH:MM IST" for display. */
  last_check_ist: string;
  /** Set when status === 'UNREACHABLE' with the fetch error reason. */
  unreachable_reason?: string;
}
