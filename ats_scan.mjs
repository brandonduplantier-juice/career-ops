#!/usr/bin/env node
// ats_scan.mjs - v3.0 (RETUNE_SPEC_V3_QUALIFY10)
// Main orchestrator for the career-ops ATS scanner.
// Replaces v2.0 with store-backed rolling-window selection and classify-then-score model.
//
// Usage:
//   node ats_scan.mjs                    # full scan
//   node ats_scan.mjs --dry-run          # print summary only, write nothing
//   node ats_scan.mjs --validate-boards  # test tokens, report which return jobs vs 404
//   node ats_scan.mjs --selftest         # run test/qualify10.test.mjs and exit

const SCANNER_VERSION = '3.0';

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import { fetchRoles } from './lib/source.mjs';
import { filterRoles } from './lib/filter.mjs';
import { preScoreRole } from './lib/score.mjs';
import { verifyUrl } from './lib/verify.mjs';
import { writeBrief } from './lib/brief.mjs';
import { reviewShortlist } from './lib/aifit.mjs';
import { loadStore, saveStore, upsertRoles, markApplied, pruneStore } from './lib/store.mjs';
import { load as yamlLoad } from 'js-yaml';
import { fetchAggregated } from './lib/aggregators.mjs';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

const BOARDS_PATH    = join(__dirname, 'config', 'boards.yml');
const DATA_DIR       = join(__dirname, 'data');
const SEEN_PATH      = join(DATA_DIR, 'seen_jobs.json');
const APPLIED_PATH   = join(DATA_DIR, 'applied_jobs.json');
const DISMISSED_PATH = join(DATA_DIR, 'dismissed_jobs.json');

const isDryRun    = process.argv.includes('--dry-run');
const isValidate  = process.argv.includes('--validate-boards');
const isSelfTest  = process.argv.includes('--selftest');
const isNoAi      = process.argv.includes('--no-ai');
const aiEnabled   = !isNoAi && process.env.AI_FITCHECK !== 'false';

// All aggregator ATS source names (for combined-pool logging)
const AGGREGATOR_ATS = new Set([
  'remotive', 'adzuna', 'usajobs', 'jobicy', 'himalayas',
  'arbeitnow', 'weworkremotely', 'remoteok', 'workingnomads'
]);

// ---- Self-test mode ─────────────────────────────────────────────────────────

if (isSelfTest) {
  const testFile = join(__dirname, 'test', 'qualify10.test.mjs');
  const result = spawnSync(process.execPath, [testFile], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

// ---- Hash helper ────────────────────────────────────────────────────────────

function makeHash(company, title) {
  const key = `${company.toLowerCase().trim()}:${title.toLowerCase().trim()}`;
  return createHash('md5').update(key).digest('hex');
}

// ---- JSON helpers ───────────────────────────────────────────────────────────

function loadJson(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

// ---- Pay extraction ─────────────────────────────────────────────────────────

function extractPay(jdText) {
  if (!jdText) return 'not listed';
  const patterns = [
    /\$[\d,]+k?\s*[-to]+\s*\$[\d,]+k?/i,
    /\$[\d]+k\s*[-to]+\s*[\d]+k?/i,
    /\$[\d,]+\s*[-to]+\s*[\d,]+/i,
    /\$[\d]+(?:\.\d+)?\/hr/i,
    /\$[\d]+k/i,
    /\$[\d,]{5,}/i
  ];
  for (const pat of patterns) {
    const m = jdText.match(pat);
    if (m) return m[0].replace(/[,.\s]+$/, '').trim();
  }
  return 'not listed';
}

// ---- Screen type detection ──────────────────────────────────────────────────

function detectScreen(jdText) {
  if (!jdText) return 'RESUME';
  const lower = jdText.toLowerCase();
  if (/take-home|coding challenge|technical exercise|skills assessment|work sample|technical test|practical exercise/.test(lower)) {
    return 'TAKE-HOME';
  }
  if (/hirevue|online assessment|coding test/.test(lower)) {
    return 'ASSESSMENT';
  }
  return 'RESUME';
}

// ---- Location normalizer ────────────────────────────────────────────────────

function normalizeLocation(role) {
  if (role.is_remote) return 'Remote, US';
  return role.location || 'not listed';
}

// ---- Entry-analyst-title override ───────────────────────────────────────────
// Roles matching this pattern go to AI regardless of pre-score rank

const ANALYST_TITLE_RE = /\b(data|business|operations|bi|analytics|reporting)\b.*\banalyst\b/i;
const ANALYST_LEVEL_RE = /junior|associate|analyst\s+i\b|entry|early.career/i;

function isEntryAnalystTitle(title) {
  const t = title || '';
  return ANALYST_TITLE_RE.test(t) || ANALYST_LEVEL_RE.test(t);
}

// ---- Bio/longevity override ─────────────────────────────────────────────────

const BIO_LONGEVITY_RE = /bioinformat|genomic|longevity|crispr|life sciences/i;

// ---- Validate boards mode ───────────────────────────────────────────────────

async function validateBoards() {
  console.log('Validating boards...\n');
  const raw = readFileSync(BOARDS_PATH, 'utf8');
  const cfg = yamlLoad(raw);

  const tests = [];

  for (const b of (cfg.greenhouse || [])) {
    tests.push({ ats: 'greenhouse', token: b.token, name: b.name,
      url: `https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs` });
  }
  for (const b of (cfg.lever || [])) {
    tests.push({ ats: 'lever', token: b.token, name: b.name,
      url: `https://api.lever.co/v0/postings/${b.token}?mode=json` });
  }
  for (const b of (cfg.ashby || [])) {
    tests.push({ ats: 'ashby', token: b.token, name: b.name,
      url: `https://api.ashbyhq.com/posting-api/job-board/${b.token}` });
  }
  for (const b of (cfg.smartrecruiters || [])) {
    tests.push({ ats: 'smartrecruiters', token: b.token, name: b.name,
      url: `https://api.smartrecruiters.com/v1/companies/${b.token}/postings?limit=1` });
  }
  for (const b of (cfg.workable || [])) {
    tests.push({ ats: 'workable', token: b.token, name: b.name,
      url: `https://apply.workable.com/api/v1/widget/accounts/${b.token}/jobs` });
  }
  for (const b of (cfg.recruitee || [])) {
    tests.push({ ats: 'recruitee', token: b.token, name: b.name,
      url: `https://${b.token}.recruitee.com/api/offers/` });
  }
  for (const b of (cfg.bamboohr || [])) {
    tests.push({ ats: 'bamboohr', token: b.token, name: b.name,
      url: `https://${b.token}.bamboohr.com/jobs/embed2.php` });
  }

  let ok = 0, notFound = 0, empty = 0, errors = 0;

  for (const t of tests) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(t.url, { signal: controller.signal,
        headers: { 'User-Agent': 'career-ops-validator/1.0' } });
      clearTimeout(timer);

      if (res.status === 404) {
        console.log(`  404  [${t.ats}] ${t.token} - ${t.name}`);
        notFound++;
        continue;
      }
      if (!res.ok) {
        console.log(`  ${res.status}  [${t.ats}] ${t.token} - ${t.name}`);
        errors++;
        continue;
      }
      const data = await res.json();
      const count = Array.isArray(data) ? data.length
        : Array.isArray(data?.jobs) ? data.jobs.length
        : Array.isArray(data?.content) ? data.content.length
        : Array.isArray(data?.results) ? data.results.length
        : Array.isArray(data?.offers) ? data.offers.length
        : Array.isArray(data?.result) ? data.result.length
        : 0;
      if (count === 0) {
        console.log(`  EMPTY [${t.ats}] ${t.token} - ${t.name} (0 jobs)`);
        empty++;
      } else {
        console.log(`  OK    [${t.ats}] ${t.token} - ${t.name} (${count} jobs)`);
        ok++;
      }
    } catch (err) {
      console.log(`  ERR   [${t.ats}] ${t.token} - ${t.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResults: ${ok} OK, ${empty} empty, ${notFound} 404, ${errors} errors`);
  console.log('Add "# returns-nothing" to empty tokens in config/boards.yml for pruning.');
}

// ---- Main scan ──────────────────────────────────────────────────────────────

async function main() {
  if (isValidate) {
    await validateBoards();
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  console.log(`career-ops ATS scan v${SCANNER_VERSION} - ${today}${isDryRun ? ' (DRY RUN)' : ''}`);
  console.log('');

  // Step 1: Fetch
  console.log('Fetching roles from ATS boards...');
  const rawRoles = await fetchRoles(BOARDS_PATH);
  console.log(`  Fetched: ${rawRoles.length} total roles`);

  console.log('Fetching from aggregator sources...');
  const aggRoles = await fetchAggregated();
  console.log(`  Aggregators: ${aggRoles.length} total roles`);

  // Combine ATS and aggregator roles, deduplicating by company+title hash.
  // Prefer the direct-ATS record when the same hash appears in both.
  const roleMap = new Map();
  for (const role of rawRoles) {
    const h = role.hash || makeHash(role.company, role.title);
    role.hash = h;
    roleMap.set(h, role);
  }
  for (const role of aggRoles) {
    const h = role.hash || makeHash(role.company, role.title);
    role.hash = h;
    if (!roleMap.has(h)) roleMap.set(h, role);
  }
  const combinedRoles = [...roleMap.values()];
  const aggUnique = combinedRoles.filter(r => AGGREGATOR_ATS.has(r.ats)).length;
  console.log(`  Combined pool: ${combinedRoles.length} roles (${rawRoles.length} ATS + ${aggUnique} aggregator-only)`);

  // Step 2: Filter
  const { kept, dropped } = filterRoles(combinedRoles);
  console.log(`  Filtered: ${kept.length} kept, ${dropped.length} dropped`);

  // Step 3: Pre-score (heuristic ranking for shortlist selection only)
  const scoredRoles = kept.map(role => {
    const { score, reason } = preScoreRole(role);
    return { ...role, score, reason };
  });

  // Step 3b: Collapse exact duplicates (same company + title from different board listings)
  const seenTitles = new Set();
  const dedupedByTitle = scoredRoles.filter(r => {
    const key = makeHash(r.company, r.title);
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
  if (dedupedByTitle.length < scoredRoles.length) {
    console.log(`  Collapsed ${scoredRoles.length - dedupedByTitle.length} exact duplicate(s)`);
  }

  // Step 4: Load exclusion lists
  const applied   = loadJson(APPLIED_PATH);
  const dismissed = loadJson(DISMISSED_PATH);
  const seen      = loadJson(SEEN_PATH);

  const excluded = new Set([...Object.keys(applied), ...Object.keys(dismissed)]);

  // Step 5: Dedupe against applied + dismissed
  const dedupedRoles = dedupedByTitle.filter(r => {
    const h = r.hash || makeHash(r.company, r.title);
    r.hash = h;
    return !excluded.has(h);
  });

  // Step 6: Mark is_new and enrich display fields
  const markedRoles = dedupedRoles.map(r => ({
    ...r,
    is_new:    !seen[r.hash],
    pay:       extractPay(r.jd_text),
    screen:    detectScreen(r.jd_text),
    warm_path: 'Cold: no contact found',
    location:  normalizeLocation(r)
  }));

  console.log(`  After dedup (applied+dismissed): ${markedRoles.length} candidates`);
  console.log(`  New (not seen before): ${markedRoles.filter(r => r.is_new).length}`);

  // Step 7: Verify URLs
  console.log('Verifying URLs...');
  const verifiedRoles = [];
  let verifyDropped = 0;

  for (const role of markedRoles) {
    const result = await verifyUrl(role.url, role.title, 10000, role.ats);
    if (result === 'VERIFIED') {
      verifiedRoles.push({ ...role, verification: 'VERIFIED' });
    } else if (result === 'UNVERIFIED') {
      verifiedRoles.push({ ...role, verification: 'UNVERIFIED', _link_unverified: true });
    } else {
      verifyDropped++;
    }
  }

  const unverifiedCount = verifiedRoles.filter(r => r._link_unverified).length;
  console.log(
    `  Verified: ${verifiedRoles.length - unverifiedCount} confirmed` +
    ` + ${unverifiedCount} unverified (aggregator), dropped: ${verifyDropped}`
  );

  // Step 7b: AI classify-and-score (v3 - per-role, top-80 + overrides)
  let assessedMap = new Map();
  let aiReview = false;

  if (aiEnabled && verifiedRoles.length > 0) {
    // Sort by pre-score descending
    const sortedByScore = [...verifiedRoles].sort((a, b) => b.score - a.score);

    // Top-80 by pre-score
    const top80 = sortedByScore.slice(0, 80);
    const shortlistSet = new Set(top80.map(r => r.hash));

    // Entry-analyst-title override: any role whose normalized title matches the pattern
    for (const r of verifiedRoles) {
      if (isEntryAnalystTitle(r._normalized_title || r.title || '')) {
        shortlistSet.add(r.hash);
      }
    }

    // Bio/longevity override
    for (const r of verifiedRoles) {
      if (BIO_LONGEVITY_RE.test(r.title || '') || BIO_LONGEVITY_RE.test(r.jd_text || '')) {
        shortlistSet.add(r.hash);
      }
    }

    const aiShortlist = verifiedRoles.filter(r => shortlistSet.has(r.hash));

    const entryOverrideCount = verifiedRoles.filter(r =>
      isEntryAnalystTitle(r._normalized_title || r.title || '')
    ).length;
    const bioCount = verifiedRoles.filter(r =>
      BIO_LONGEVITY_RE.test(r.title || '') || BIO_LONGEVITY_RE.test(r.jd_text || '')
    ).length;

    console.log(
      `Running AI classify on ${aiShortlist.length} roles` +
      ` (top-${Math.min(80, verifiedRoles.length)} + ${entryOverrideCount} entry-analyst + ${bioCount} bio/longevity)...`
    );

    const verdicts = await reviewShortlist(aiShortlist);
    if (verdicts) {
      aiReview = true;
      for (const v of verdicts) assessedMap.set(v.hash, v);
    } else {
      console.log('  AI classify skipped - awareness-only brief');
    }
  } else if (!aiEnabled) {
    console.log('AI fit-check disabled (--no-ai or AI_FITCHECK=false)');
  }

  // Step 8: Build store records for assessed roles and upsert to store
  const assessedHashes = new Set(assessedMap.keys());
  const nonAssessedRoles = verifiedRoles.filter(r => !assessedHashes.has(r.hash));

  // Build store-shaped records for each assessed role
  const newStoreRecords = [];
  for (const role of verifiedRoles) {
    const v = assessedMap.get(role.hash);
    if (!v) continue;

    newStoreRecords.push({
      hash:          role.hash,
      company:       role.company,
      title:         role.title,
      url:           role.url,
      pay:           role.pay           || 'not listed',
      location:      role.location      || 'not listed',
      fit:           v.fit,
      attainability: v.attainability,
      verdict:       v.verdict,
      remote_us:     v.remote_us === true,
      missing:       v.missing_requirements || [],
      reason:        v.reason           || '',
      pre_score:     role.score,
      // display extras
      employer_size: role.employer_size || 'not listed',
      screen:        role.screen        || 'RESUME',
      warm_path:     role.warm_path     || 'Cold: no contact found',
      verification:  role.verification  || 'VERIFIED',
    });
  }

  // Load, upsert, mark applied, prune, and save the store
  let store = loadStore(DATA_DIR);
  store = upsertRoles(store, newStoreRecords, today);

  const appliedHashSet = new Set(Object.keys(loadJson(APPLIED_PATH)));
  store = markApplied(store, appliedHashSet);
  store = pruneStore(store, today);

  if (!isDryRun) {
    saveStore(DATA_DIR, store);
  }

  if (isDryRun) {
    console.log('\n--- DRY RUN SUMMARY (nothing written) ---\n');
    console.log(aiReview ? 'AI review: enabled (v3 classify)' : 'AI review: not run');
    console.log('');

    // Show store-based selection for dry-run
    const { apply: applyList, strong: strongList, honestLine } =
      await import('./lib/select.mjs').then(m => m.selectApply(store, today));

    // Also show non-assessed in awareness
    const considerList = store.filter(r => r.verdict === 'consider' && r.applied === false);
    const skipList     = store.filter(r => r.verdict === 'skip');

    console.log(`Apply List (${applyList.length} cleared 4.5 qualify bar):`);
    for (const r of applyList) {
      const attain = r.attainability ? ` [${r.attainability}]` : '';
      console.log(`  [${r.fit.toFixed(1)}${attain}] ${r.company} - ${r.title}${r.is_new ? ' (NEW)' : ''}`);
      if (r.reason) console.log(`         ${r.reason}`);
    }
    if (honestLine) console.log(`\n  ${honestLine}`);

    if (strongList.length > 0) {
      console.log(`\nStrong (${strongList.length}):`);
      for (const r of strongList) {
        console.log(`  [${r.fit.toFixed(1)}] ${r.company} - ${r.title}${r.is_new ? ' (NEW)' : ''}`);
      }
    }

    if (considerList.length > 0) {
      console.log(`\nConsider (${considerList.length}):`);
      for (const r of considerList) {
        const missing = r.missing && r.missing.length > 0 ? ` - confirm: ${r.missing[0]}` : '';
        console.log(`  [${r.fit.toFixed(1)}] ${r.company} - ${r.title}${r.is_new ? ' (NEW)' : ''}${missing}`);
      }
    }

    if (nonAssessedRoles.length > 0) {
      console.log(`\nAwareness non-assessed (${nonAssessedRoles.length}):`);
      for (const r of nonAssessedRoles.slice(0, 10)) {
        console.log(`  [${r.score.toFixed(1)}] ${r.company} - ${r.title}${r.is_new ? ' (NEW)' : ''}`);
      }
      if (nonAssessedRoles.length > 10) console.log(`  ... and ${nonAssessedRoles.length - 10} more`);
    }

    console.log('');
    return;
  }

  // Step 9: Write brief using store
  const counts = writeBrief(store, today, DATA_DIR, { aiReview, nonAssessedRoles });
  const overflowNote = counts.applyTotal > counts.applyCount
    ? ` (${counts.applyTotal} total cleared, top ${counts.applyCount} shown)` : '';
  console.log(
    `  Brief written: ${counts.applyCount} apply${overflowNote}` +
    `, ${counts.strongCount} strong, ${counts.considerCount} consider, ${counts.awarenessCount} awareness`
  );

  // Step 10: Update seen_jobs.json
  const updatedSeen = { ...seen };
  let newSeenCount = 0;
  for (const r of markedRoles) {
    if (!updatedSeen[r.hash]) {
      updatedSeen[r.hash] = {
        first_seen: today,
        company:    r.company,
        title:      r.title
      };
      newSeenCount++;
    }
  }
  writeFileSync(SEEN_PATH, JSON.stringify(updatedSeen, null, 2), 'utf8');

  const boardsCfg = yamlLoad(readFileSync(BOARDS_PATH, 'utf8'));
  const boardsCount = (boardsCfg.greenhouse?.length || 0)
    + (boardsCfg.lever?.length || 0)
    + (boardsCfg.ashby?.length || 0)
    + (boardsCfg.smartrecruiters?.length || 0)
    + (boardsCfg.workable?.length || 0)
    + (boardsCfg.recruitee?.length || 0)
    + (boardsCfg.bamboohr?.length || 0);

  console.log('');
  console.log('Summary:');
  console.log(`  Boards scanned:   ${boardsCount}`);
  console.log(`  Total fetched:    ${rawRoles.length}`);
  console.log(`  Aggregator roles: ${aggRoles.length}`);
  console.log(`  After filtering:  ${kept.length}`);
  console.log(`  After dedup:      ${markedRoles.length}`);
  console.log(`  Verified:         ${verifiedRoles.length}`);
  console.log(`  Store records:    ${store.length}`);
  console.log(`  New seen roles:   ${newSeenCount}`);
  console.log('');
  console.log('Output:');
  console.log('  data/morning_brief.json');
  console.log('  data/daily_queue.md');
  console.log('  data/seen_jobs.json');
  console.log('  data/role_store.json');
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
