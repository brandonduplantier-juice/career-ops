// lib/select.mjs
// Rolling-window selection logic for the daily apply list.
// Exact port of ref/select.mjs.

export const WINDOW_DAYS = 7;
export const APPLY_BAR = 4.5;
export const APPLY_MAX = 10;
export const STRONG_LO = 4.0;

export function daysSince(dateStr, today) {
  const a = new Date(dateStr + "T00:00:00Z").getTime();
  const b = new Date(today + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

function byFitThenRecency(a, b) {
  if (b.fit !== a.fit) return b.fit - a.fit;
  if (b.last_seen !== a.last_seen) return b.last_seen < a.last_seen ? -1 : 1;
  return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
}

export function selectApply(records, today) {
  const live = records.filter(r => r.applied === false && daysSince(r.last_seen, today) <= WINDOW_DAYS);

  const apply = live
    .filter(r => r.remote_us === true && r.attainability === "high" && r.fit >= APPLY_BAR)
    .sort(byFitThenRecency)
    .slice(0, APPLY_MAX);

  const applyHashes = new Set(apply.map(r => r.hash));
  const strong = live
    .filter(r => r.remote_us === true && !applyHashes.has(r.hash) && r.fit >= STRONG_LO && r.fit < APPLY_BAR)
    .sort(byFitThenRecency);

  const honestLine = apply.length < APPLY_MAX
    ? `Only ${apply.length} role${apply.length === 1 ? "" : "s"} cleared the 4.5 qualify bar in the last 7 days.`
    : null;

  return { apply, strong, honestLine };
}
