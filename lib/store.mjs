// lib/store.mjs
// Persistent role store backed by data/role_store.json.
// Tracks roles across scans with rolling-window dedup and applied/prune logic.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { daysSince } from './select.mjs';

const STORE_FILE = 'role_store.json';
// Roles not seen in this many days and not applied are pruned from store
const PRUNE_DAYS = 14;

// ---------------------------------------------------------------------------
// loadStore / saveStore
// ---------------------------------------------------------------------------

export function loadStore(dataDir) {
  const path = join(dataDir, STORE_FILE);
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStore(dataDir, records) {
  const path = join(dataDir, STORE_FILE);
  writeFileSync(path, JSON.stringify(records, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// upsertRoles
// Merge newly assessed roles into the store.
// New roles are inserted; existing roles have last_seen + scores updated.
// ---------------------------------------------------------------------------

export function upsertRoles(store, newRoles, today) {
  const byHash = new Map(store.map(r => [r.hash, r]));

  for (const role of newRoles) {
    if (byHash.has(role.hash)) {
      const existing = byHash.get(role.hash);
      // Update last_seen and scores; preserve applied and first_seen
      byHash.set(role.hash, {
        ...existing,
        last_seen:       today,
        fit:             role.fit,
        attainability:   role.attainability,
        verdict:         role.verdict,
        remote_us:       role.remote_us,
        missing:         role.missing || [],
        reason:          role.reason  || existing.reason,
        // display extras - update if provided
        employer_size:   role.employer_size  || existing.employer_size,
        screen:          role.screen         || existing.screen,
        warm_path:       role.warm_path      || existing.warm_path,
        pre_score:       role.pre_score      != null ? role.pre_score : existing.pre_score,
        verification:    role.verification   || existing.verification,
      });
    } else {
      byHash.set(role.hash, {
        hash:          role.hash,
        company:       role.company,
        title:         role.title,
        url:           role.url,
        pay:           role.pay            || 'not listed',
        location:      role.location       || 'not listed',
        fit:           role.fit,
        attainability: role.attainability,
        verdict:       role.verdict,
        remote_us:     role.remote_us,
        missing:       role.missing        || [],
        first_seen:    today,
        last_seen:     today,
        applied:       false,
        // display extras
        employer_size: role.employer_size  || 'not listed',
        screen:        role.screen         || 'RESUME',
        warm_path:     role.warm_path      || 'Cold: no contact found',
        reason:        role.reason         || '',
        pre_score:     role.pre_score      != null ? role.pre_score : null,
        verification:  role.verification   || 'VERIFIED',
      });
    }
  }

  return [...byHash.values()];
}

// ---------------------------------------------------------------------------
// markApplied
// Sets applied=true for any hash in appliedHashSet.
// ---------------------------------------------------------------------------

export function markApplied(records, appliedHashSet) {
  return records.map(r => ({
    ...r,
    applied: appliedHashSet.has(r.hash) ? true : r.applied,
  }));
}

// ---------------------------------------------------------------------------
// pruneStore
// Removes records that are older than PRUNE_DAYS AND not applied.
// Applied records are kept indefinitely for history.
// ---------------------------------------------------------------------------

export function pruneStore(records, today) {
  return records.filter(r => {
    if (r.applied === true) return true;
    return daysSince(r.last_seen, today) <= PRUNE_DAYS;
  });
}
