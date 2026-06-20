// test/qualify10.test.mjs - acceptance tests for RETUNE_SPEC_V3_QUALIFY10.
// Proves: vetoes, 4.5-by-construction, truncation handling, 10-at-4.5 selection,
// honest short count, rolling window, determinism. Exits non-zero on any failure.

import { scoreRole } from "../lib/score.mjs";
import { selectApply } from "../lib/select.mjs";

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name); }
}

// ---- AI-output fixtures ----------------------------------------------------
const clean = (over = {}) => ({
  remote_us: true, work_mode: "remote", max_years_required: 2, degree_hard_required: false,
  credential_required: "", seniority: "entry", is_analyst_role: true, entry_level: true,
  title_match: true, core_stack_matched: ["SQL", "Python", "Excel"], domain: "other",
  posting_complete: true, reason: "remote entry analyst, core stack, meets reqs", ...over,
});

const vetoCases = {
  hybrid:     clean({ work_mode: "hybrid", remote_us: true }),
  onsite:     clean({ work_mode: "onsite" }),
  nonUS:      clean({ remote_us: false, work_mode: "remote" }),
  senior:     clean({ seniority: "senior" }),
  manager:    clean({ seniority: "manager" }),
  degree:     clean({ degree_hard_required: true }),
  credential: clean({ credential_required: "ABMGG board eligibility" }),
  years3:     clean({ max_years_required: 3 }),
  notAnalyst: clean({ is_analyst_role: false }),
};

console.log("Tests 1-4: deterministic scoring");

// Test 1: every veto case -> low / skip
for (const [k, v] of Object.entries(vetoCases)) {
  const r = scoreRole(v);
  check(`veto ${k} -> low/skip`, r.attainability === "low" && r.verdict === "skip");
}

// Test 2: clean roles score >= 4.5 and high (varied stack/domain)
const cleanVariants = [
  clean(),
  clean({ domain: "healthcare" }),
  clean({ core_stack_matched: ["SQL", "Tableau"] }),
  clean({ core_stack_matched: ["SQL"], title_match: true }),
  clean({ domain: "claims", core_stack_matched: ["SQL", "Snowflake", "Excel"] }),
];
for (let i = 0; i < cleanVariants.length; i++) {
  const r = scoreRole(cleanVariants[i]);
  check(`clean[${i}] high & >=4.5 (fit ${r.fit})`, r.attainability === "high" && r.fit >= 4.5);
}

// Test 3: truncated but clearly remote entry SQL analyst -> high & >=4.5 (not capped 3.9)
const truncated = clean({ posting_complete: false, core_stack_matched: ["SQL"], domain: "other" });
{
  const r = scoreRole(truncated);
  check(`truncated -> high & >=4.5 (fit ${r.fit})`, r.attainability === "high" && r.fit >= 4.5);
}

// Test 4: medium role (entry unclear, no stack) caps at 3.9, never apply
const mediumRole = clean({ entry_level: false, seniority: "unclear", core_stack_matched: [], title_match: false });
{
  const r = scoreRole(mediumRole);
  check(`medium caps 3.9 & not apply (fit ${r.fit}, ${r.attainability})`,
        r.attainability === "medium" && r.fit <= 3.9 && r.verdict !== "apply");
}

// ---- build a store from fixtures for selection tests -----------------------
const TODAY = "2026-06-19";
function rec(hash, ai, over = {}) {
  const s = scoreRole(ai);
  return {
    hash, company: "Co" + hash, title: "Data Analyst " + hash, url: "u" + hash,
    fit: s.fit, attainability: s.attainability, verdict: s.verdict,
    remote_us: ai.remote_us === true && ai.work_mode === "remote",
    applied: false, first_seen: TODAY, last_seen: TODAY, ...over,
  };
}

console.log("Tests 5-8: rolling-window selection");

// Test 5: 14 qualifying high roles -> exactly 10 apply, all >=4.5, sorted, no honest line
{
  const store = [];
  for (let i = 0; i < 14; i++) {
    const stack = i % 2 ? ["SQL", "Python", "Excel"] : ["SQL", "Tableau"];
    const dom = i % 3 === 0 ? "healthcare" : "other";
    store.push(rec("h" + String(i).padStart(2, "0"), clean({ core_stack_matched: stack, domain: dom })));
  }
  const { apply, honestLine } = selectApply(store, TODAY);
  const sorted = apply.every((r, i) => i === 0 || apply[i - 1].fit >= r.fit);
  check("14 qualifying -> exactly 10 apply", apply.length === 10);
  check("all apply >= 4.5", apply.every(r => r.fit >= 4.5));
  check("all apply remote", apply.every(r => r.remote_us === true));
  check("apply sorted by fit desc", sorted);
  check("no honest line when full", honestLine === null);
}

// Test 6: only 6 qualifying + some medium -> 6 apply + honest line, no padding
{
  const store = [];
  for (let i = 0; i < 6; i++) store.push(rec("q" + i, clean()));
  for (let i = 0; i < 5; i++) store.push(rec("m" + i, mediumRole)); // medium -> Strong/Consider, not apply
  const { apply, strong, honestLine } = selectApply(store, TODAY);
  check("6 qualifying -> 6 apply (no padding)", apply.length === 6);
  check("honest line present", typeof honestLine === "string" && honestLine.includes("6 roles"));
  check("medium not in apply", apply.every(r => r.fit >= 4.5));
}

// Test 7: rolling window behavior
{
  const base = rec("win1", clean({ domain: "healthcare" }));      // fit ~5.0
  const store = [
    { ...base, hash: "win_in",   last_seen: "2026-06-14", applied: false }, // 5 days ago -> in
    { ...base, hash: "win_appl", last_seen: "2026-06-14", applied: true  }, // applied -> out
    { ...base, hash: "win_old",  last_seen: "2026-06-10", applied: false }, // 9 days ago -> pruned
  ];
  const { apply } = selectApply(store, TODAY);
  const hashes = new Set(apply.map(r => r.hash));
  check("window: 5-day unapplied included", hashes.has("win_in"));
  check("window: applied excluded", !hashes.has("win_appl"));
  check("window: 9-day pruned", !hashes.has("win_old"));
}

// Test 8: determinism
{
  const store = [];
  for (let i = 0; i < 14; i++) store.push(rec("d" + String(i).padStart(2, "0"), clean()));
  const a = selectApply(store, TODAY).apply.map(r => r.hash).join(",");
  const b = selectApply(store, TODAY).apply.map(r => r.hash).join(",");
  check("selection deterministic", a === b);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
