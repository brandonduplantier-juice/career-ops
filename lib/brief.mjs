// lib/brief.mjs - RETUNE_SPEC_V3
// Writes data/morning_brief.json and prepends to data/daily_queue.md.
//
// Signature: writeBrief(store, today, dataDir, { aiReview, nonAssessedRoles })
//
// Sections (top to bottom):
//   Apply List  = high attainability, fit >= 4.5, unapplied, last 7 days (up to 10)
//   Strong      = high/medium attainability, fit 4.0-4.4, unapplied, last 7 days
//   Consider    = verdict "consider" from remaining store records
//   Awareness   = verdict "skip" + nonAssessedRoles + store skip records

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { selectApply, daysSince, WINDOW_DAYS } from './select.mjs';

function cell(val) {
  return String(val == null ? '' : val).replace(/\|/g, '/').replace(/\n/g, ' ').trim();
}

function sortByFitDesc(roles) {
  return [...roles].sort((a, b) => {
    const bandA = Math.round((a.fit != null ? a.fit : a.score || 0) * 10);
    const bandB = Math.round((b.fit != null ? b.fit : b.score || 0) * 10);
    if (bandB !== bandA) return bandB - bandA;
    if (a.is_new && !b.is_new) return -1;
    if (!a.is_new && b.is_new) return 1;
    return 0;
  });
}

// Map a store record to the shape morning_brief.json / morning_brief.mjs expects.
// Store uses: fit, attainability, missing, reason, verdict
// Brief uses: score, ai_attainability, ai_missing, ai_reason, ai_verdict
function mapStoreRecord(r) {
  const score = r.fit != null ? r.fit : (r.score != null ? r.score : 0);
  return {
    rank:               r.rank,
    score,
    pre_score:          r.pre_score != null ? r.pre_score : score,
    reason:             r.reason || '',
    company:            r.company,
    title:              r.title,
    url:                r.url,
    pay:                r.pay || 'not listed',
    location:           r.location || 'not listed',
    employer_size:      r.employer_size || 'not listed',
    screen:             r.screen || 'RESUME',
    warm_path:          r.warm_path || 'Cold: no contact found',
    is_new:             r.is_new === true,
    hash:               r.hash,
    verification:       r.verification || 'VERIFIED',
    ai_verdict:         r.verdict       || null,
    ai_attainability:   r.attainability || null,
    ai_missing:         Array.isArray(r.missing) ? r.missing : [],
    ai_reason:          r.reason        || null,
    ai_blocking_reason: r.verdict === 'skip' ? (r.reason || null) : null,
  };
}

// Map a non-assessed (no AI) role to the brief shape
function mapNonAssessed(r) {
  const score = r.score != null ? r.score : 0;
  return {
    rank:               r.rank,
    score,
    pre_score:          r.pre_score != null ? r.pre_score : score,
    reason:             r.reason || '',
    company:            r.company,
    title:              r.title,
    url:                r.url,
    pay:                r.pay || 'not listed',
    location:           r.location || 'not listed',
    employer_size:      r.employer_size || 'not listed',
    screen:             r.screen || 'RESUME',
    warm_path:          r.warm_path || 'Cold: no contact found',
    is_new:             r.is_new === true,
    hash:               r.hash,
    verification:       r.verification || 'VERIFIED',
    ai_verdict:         null,
    ai_attainability:   null,
    ai_missing:         [],
    ai_reason:          null,
    ai_blocking_reason: null,
  };
}

// ---- Row builders for daily_queue.md ----------------------------------------

function fullRow(r, rankNum) {
  const roleName = r.is_new ? `${cell(r.title)} (NEW)` : cell(r.title);
  const attain   = r.ai_attainability ? r.ai_attainability.toUpperCase() : '-';
  const missing  = Array.isArray(r.ai_missing) && r.ai_missing.length > 0
    ? cell(r.ai_missing[0])
    : '';
  return (
    `| ${rankNum}` +
    ` | ${r.score.toFixed(1)}` +
    ` | ${attain}` +
    ` | ${cell(r.company)}` +
    ` | [${roleName}](${r.url})` +
    ` | ${cell(r.pay || 'not listed')}` +
    ` | ${cell(r.location || 'not listed')}` +
    ` | ${cell(r.employer_size || 'not listed')}` +
    ` | ${cell(r.screen || 'RESUME')}` +
    ` | ${cell(r.warm_path || 'Cold: no contact found')}` +
    ` | ${missing} |`
  );
}

function strongRow(r, rankNum) {
  const roleName = r.is_new ? `${cell(r.title)} (NEW)` : cell(r.title);
  const missing  = Array.isArray(r.ai_missing) && r.ai_missing.length > 0
    ? cell(r.ai_missing[0])
    : 'unspecified item';
  return (
    `| ${rankNum}` +
    ` | ${r.score.toFixed(1)}` +
    ` | ${cell(r.company)}` +
    ` | [${roleName}](${r.url})` +
    ` | ${cell(r.reason || '')} |`
  );
}

function considerRow(r, rankNum) {
  const roleName = r.is_new ? `${cell(r.title)} (NEW)` : cell(r.title);
  const missing  = Array.isArray(r.ai_missing) && r.ai_missing.length > 0
    ? cell(r.ai_missing[0])
    : 'unspecified item';
  return (
    `| ${rankNum}` +
    ` | ${r.score.toFixed(1)}` +
    ` | ${cell(r.company)}` +
    ` | [${roleName}](${r.url})` +
    ` | ${cell(r.reason || '')}` +
    ` | ${missing} |`
  );
}

function awarenessRow(r, rankNum) {
  const roleName = r.is_new ? `${cell(r.title)} (NEW)` : cell(r.title);
  const blocker  = r.ai_blocking_reason || r.ai_reason || '';
  return (
    `| ${rankNum}` +
    ` | ${r.score.toFixed(1)}` +
    ` | ${cell(r.company)}` +
    ` | [${roleName}](${r.url})` +
    ` | ${cell(blocker)} |`
  );
}

const FULL_HEADER =
  '| # | Score | Attainability | Company | Role | Pay | Location | Size | Screen | Warm Path | Missing |\n' +
  '|---|-------|---------------|---------|------|-----|----------|------|--------|-----------|---------|';

const STRONG_HEADER =
  '| # | Score | Company | Role | Note |\n' +
  '|---|-------|---------|------|------|';

const CONSIDER_HEADER =
  '| # | Score | Company | Role | Reason | Confirm |\n' +
  '|---|-------|---------|------|--------|---------| ';

const AWARENESS_HEADER =
  '| # | Score | Company | Role | Note |\n' +
  '|---|-------|---------|------|------|';

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function writeBrief(store, today, dataDir, { aiReview = false, nonAssessedRoles = [] } = {}) {
  // Use selectApply for window-based apply + strong selection
  const { apply: applyRecords, strong: strongRecords, honestLine } = selectApply(store, today);

  // apply and strong from selectApply are store records (have fit, attainability etc.)
  // Mark is_new for store records: first_seen === today
  function tagNew(r) {
    return { ...r, is_new: r.first_seen === today };
  }

  const applyTagged  = applyRecords.map(tagNew);
  const strongTagged = strongRecords.map(tagNew);

  // Consider: store records with verdict "consider", not in apply or strong
  const applyAndStrongHashes = new Set([
    ...applyRecords.map(r => r.hash),
    ...strongRecords.map(r => r.hash),
  ]);

  const live = store.filter(r =>
    r.applied === false && daysSince(r.last_seen, today) <= WINDOW_DAYS
  );

  const considerFromStore = sortByFitDesc(
    live.filter(r => r.verdict === 'consider' && !applyAndStrongHashes.has(r.hash))
  ).map(tagNew);

  // Awareness: store "skip" records + nonAssessedRoles + remaining store records without verdict
  const skipFromStore = sortByFitDesc(
    store.filter(r => r.verdict === 'skip' && !applyAndStrongHashes.has(r.hash))
  ).map(tagNew);

  const noVerdictFromStore = sortByFitDesc(
    store.filter(r => !r.verdict && !applyAndStrongHashes.has(r.hash))
  ).map(tagNew);

  const nonAssessedTagged = nonAssessedRoles.map(r => ({
    ...r,
    is_new:      r.is_new === true,
    fit:         r.score  != null ? r.score : 0,
    attainability: null,
    verdict:     null,
    missing:     [],
    reason:      r.reason || '',
  }));

  const awarenessAll = sortByFitDesc([
    ...skipFromStore,
    ...nonAssessedTagged,
    ...noVerdictFromStore,
  ]);

  // Sequential rank across all sections
  let rank = 1;
  const applyRanked     = applyTagged.map(r    => ({ ...r, rank: rank++ }));
  const strongRanked    = strongTagged.map(r   => ({ ...r, rank: rank++ }));
  const considerRanked  = considerFromStore.map(r => ({ ...r, rank: rank++ }));
  const awarenessRanked = awarenessAll.map(r   => ({ ...r, rank: rank++ }));

  const applyTotal = applyRanked.length;

  // ---- Write morning_brief.json ------------------------------------------------

  const briefJson = {
    scan_date:         today,
    ai_review:         aiReview,
    apply_total:       applyTotal,
    honest_count_line: honestLine,
    apply_list:        applyRanked.map(mapStoreRecord),
    strong:            strongRanked.map(mapStoreRecord),
    consider:          considerRanked.map(mapStoreRecord),
    awareness:         awarenessRanked.map(r => r.verdict != null ? mapStoreRecord(r) : mapNonAssessed(r)),
  };

  writeFileSync(
    join(dataDir, 'morning_brief.json'),
    JSON.stringify(briefJson, null, 2),
    'utf8'
  );

  // ---- Write daily_queue.md ---------------------------------------------------

  const queuePath = join(dataDir, 'daily_queue.md');
  const existing  = existsSync(queuePath) ? readFileSync(queuePath, 'utf8') : '';

  const aiReviewLine = aiReview
    ? 'AI review: enabled (v3 classify)'
    : 'AI review: not run';

  // Apply section
  const applyMapped = applyRanked.map(mapStoreRecord);
  const applyRows = applyMapped.length > 0
    ? applyMapped.map(r => fullRow(r, r.rank)).join('\n')
    : '| - | - | - | - | No roles cleared the attainability bar this scan | - | - | - | - | - | - |';

  const honestLineMd = honestLine
    ? `\n> ${honestLine}\n`
    : '';

  // Strong section
  const strongMapped = strongRanked.map(mapStoreRecord);
  const strongSection = strongMapped.length > 0
    ? '\n### Strong - worth reviewing before next scan\n\n' +
      STRONG_HEADER + '\n' +
      strongMapped.map(r => strongRow(r, r.rank)).join('\n') + '\n'
    : '';

  // Consider section
  const considerMapped = considerRanked.map(mapStoreRecord);
  const considerSection = considerMapped.length > 0
    ? '\n### Consider - confirm one item before applying\n\n' +
      CONSIDER_HEADER + '\n' +
      considerMapped.map(r => considerRow(r, r.rank)).join('\n') + '\n'
    : '';

  // Awareness section
  const awarenessMapped = awarenessRanked.map(r =>
    r.verdict != null ? mapStoreRecord(r) : mapNonAssessed(r)
  );
  const awarenessSection = awarenessMapped.length > 0
    ? '\n### Awareness\n\n' +
      AWARENESS_HEADER + '\n' +
      awarenessMapped.map(r => awarenessRow(r, r.rank)).join('\n') + '\n'
    : '';

  const newSection = [
    `## Scan ${today} (${aiReviewLine})`,
    '',
    `### Apply List (${applyMapped.length} of ${applyTotal >= 10 ? '10+' : applyTotal})`,
    '',
    FULL_HEADER,
    applyRows,
    honestLineMd,
    strongSection,
    considerSection,
    awarenessSection,
    '---',
    ''
  ].join('\n');

  writeFileSync(
    queuePath,
    existsSync(queuePath) ? `${newSection}\n${existing}` : newSection,
    'utf8'
  );

  return {
    applyCount:     applyRanked.length,
    applyTotal,
    strongCount:    strongRanked.length,
    considerCount:  considerRanked.length,
    awarenessCount: awarenessRanked.length,
  };
}
