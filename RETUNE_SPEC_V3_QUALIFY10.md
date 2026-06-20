# RETUNE SPEC V3: Qualify-10

Goal: the morning brief's Apply List should contain up to 10 roles per day that
Brandon is genuinely likely to qualify for, every one of them fully remote in the
US, scored at fit >= 4.5. The system must be provable (deterministic tests that pass)
and repeatable (same inputs give the same output). It must never pad the Apply List
with weaker roles; when real supply is short, it shows an honest count and routes the
rest to a separate Strong tier.

Honest success definition: the system delivers 10 qualifying roles whenever at least
10 exist in the trailing window. It cannot manufacture openings that do not exist, so
on a genuinely dry stretch it shows the true count. Wide sourcing plus the rolling
window make that rare.

## Candidate profile (the qualify bar, encode exactly)

- About 2 years practical data-analysis experience (independent, freelance, portfolio).
  No full-time analyst title yet.
- No completed bachelor's degree. Bioinformatics B.S. expected December 2027.
- Skills: Python, SQL, R, Power BI, Tableau, Looker Studio, Snowflake, Excel, Flask,
  automation.
- Domain edges: healthcare data, claims, prior authorization (15+ years navigation),
  bioinformatics, genomics. These are preferences and tie-breakers, not requirements.
- No professional certifications or licenses (no ABMGG, CPA, RN, PE, PMP, security
  clearance, board eligibility, etc.).
- Wants: fully remote, US-eligible, entry / junior / associate data, BI, or analyst
  roles.

## Architecture change: AI classifies, code scores

Today the AI is asked to produce the fit number. Move all arithmetic into code so the
result is deterministic and testable. The AI (lib/aifit.mjs) returns only structured
facts per role; lib/score.mjs computes fit and attainability from those facts.

AI JSON schema per role (strict, no prose, no markdown fence):
```
{
  "remote_us": true|false,            // fully remote AND US-eligible
  "work_mode": "remote"|"hybrid"|"onsite"|"unclear",
  "max_years_required": number,        // hard minimum; a "2-4 years" range is 2
  "degree_hard_required": true|false,  // degree required with no equivalent clause
  "credential_required": ""|"<name>",  // license/cert/clearance the posting hard-requires
  "seniority": "entry"|"mid"|"senior"|"lead"|"manager"|"unclear",
  "is_analyst_role": true|false,       // data/BI/analytics/analyst work, not SWE/sales/clinical
  "entry_level": true|false,           // posting confirms entry/junior/<=2yr
  "title_match": true|false,           // title is a data/business/operations/BI/analytics analyst
                                        // or a junior/associate/I/entry variant
  "core_stack_matched": [],            // subset of {SQL,Python,R,Excel,Power BI,Tableau,Looker,Snowflake}
  "domain": "healthcare"|"claims"|"bioinformatics"|"genomics"|"longevity"|"other"|null,
  "posting_complete": true|false,      // whether the full JD was available to judge
  "reason": "one sentence, <= 25 words, no em-dashes"
}
```

Full posting first: aifit must fetch the full job description before classifying. A
truncated snippet alone is not grounds to fail a role; classify from the fullest text
available and set posting_complete accordingly.

## Deterministic attainability (lib/score.mjs)

Hard vetoes (any one => attainability = "low", verdict = "skip"):
1. remote_us == false  OR  work_mode in {hybrid, onsite}.   REMOTE IS NON-NEGOTIABLE.
2. is_analyst_role == false.
3. max_years_required > 2.
4. degree_hard_required == true.
5. credential_required is non-empty.
6. seniority in {senior, lead, manager}.

If no veto:
- attainability = "high" when remote_us == true AND entry_level == true AND
  max_years_required <= 2 AND at least one core tool matched. A truncated posting
  (posting_complete == false) does NOT block high when these are all confirmed.
- attainability = "medium" when remote_us == true and the role qualifies but one core
  signal cannot be confirmed even from the full posting (entry_level unclear and
  seniority unclear, or no core tool explicitly named).
- attainability = "low" otherwise.

## Deterministic fit score (lib/score.mjs)

Computed only for non-vetoed roles:
```
fit  = 3.0
fit += title_match ? 0.6 : 0
fit += entry_level ? 0.4 : 0
fit += min(0.8, 0.3 * core_stack_matched.length)     // 3+ tools => full 0.8
fit += (domain in {healthcare,claims,bioinformatics,genomics,longevity}) ? 0.5 : 0
fit += (attainability == "high") ? 0.5 : 0
fit  = min(fit, 5.0)
if (attainability == "medium") fit = min(fit, 3.9)
if (attainability == "low")    fit = min(fit, 2.5)
fit  = round(fit, 1)
```
Consequence (intended): any genuine high-attainability remote entry analyst role with
the core stack lands at or above 4.5. So "high" and ">= 4.5" coincide, and the Apply
List is exactly the roles Brandon is likely to qualify for.

verdict: "apply" if attainability == high; "consider" if medium; "skip" if low.

## Pull wider (lib/source.mjs, lib/aggregators.mjs, ats_scan.mjs)

The constraint is funnel width, not board count. Make these changes:

1. Raise the AI-checked shortlist from the top 40 pre-scored roles to the top 80.
2. Entry-analyst-title override: any role whose normalized title matches
   /\b(data|business|operations|bi|analytics|reporting)\b.*\banalyst\b/ or contains
   junior / associate / "analyst i" / entry / early-career goes to the AI regardless
   of pre-score rank. Same bypass that bio/longevity roles already get.
3. Keep the bio/longevity override.
4. Sourcing breadth: ensure remote-first aggregators are active and add any that are
   missing, filtered to US-eligible remote analyst roles. Target set (verify which are
   already wired, add the gaps): Remotive, We Work Remotely, RemoteOK, Working Nomads,
   Jobicy, Himalayas, Arbeitnow, Adzuna (remote filter), plus the existing Greenhouse /
   Lever / Ashby sweep. Do not add a source that cannot be filtered to remote US.
5. Pre-score stays a cheap ranking proxy only; it never decides apply.

## Rolling window store (new: lib/store.mjs + data/role_store.json)

Persist every assessed role so the Apply List can draw from a trailing window instead
of only today's new postings.

Record per role: hash, company, title, url, pay, location, fit, attainability, verdict,
remote_us, missing (array), first_seen (date), last_seen (date), applied (bool).

On each scan:
- upsert by hash; refresh last_seen to today; keep first_seen.
- mark applied == true for any hash present in applied_jobs.json.
- prune records whose last_seen is older than WINDOW_DAYS (default 7).

## Apply List selection (lib/brief.mjs)

```
WINDOW_DAYS = 7
APPLY_BAR   = 4.5
APPLY_MAX   = 10

candidates = store.records.filter(r =>
  r.applied == false &&
  r.remote_us == true &&
  r.attainability == "high" &&
  r.fit >= APPLY_BAR &&
  daysSince(r.last_seen) <= WINDOW_DAYS)

candidates.sort(byFitDescThenLastSeenDesc)
applyList = candidates.slice(0, APPLY_MAX)

strong = store.records.filter(r =>
  r.applied == false && r.remote_us == true &&
  !applyList.includes(r) && r.fit >= 4.0 && r.fit < 4.5)
```

Rendering:
- Apply List (N of M cleared the 4.5 qualify bar in the last 7 days). Up to 10 rows.
- If applyList.length < 10: honest line, "Only {N} roles cleared the 4.5 qualify bar
  in the last 7 days." Never pad Apply from Strong.
- Strong tier (4.0 to 4.5): separate, clearly labeled, not counted as Apply.
- Consider / Awareness sections as before for medium / vetoed roles.

## Proof harness (new: test/qualify10.test.mjs, run via ats_scan.mjs --selftest)

Because scoring and selection are pure functions of the AI's structured output, they
are fully testable with fixtures and no network. Implement these and make --selftest
print PASS/FAIL per case and exit non-zero on any failure.

Fixtures (AI-output objects), at least:
- 12 clean remote entry analyst roles with core stack and varied domains.
- 1 hybrid role, 1 onsite role, 1 non-US (remote_us false) role.
- 1 senior, 1 manager role.
- 1 degree-hard-required role, 1 credential-required (ABMGG) role, 1 "3+ years" role.
- 1 truncated remote entry SQL analyst (posting_complete false but core signals true).
- 1 medium role (entry unclear, no stack named).

Acceptance assertions:
1. score() vetoes every hybrid/onsite/non-US/senior/manager/degree/credential/>2yr
   role to attainability low, verdict skip. None can enter Apply.
2. Every clean role scores >= 4.5 and attainability high.
3. The truncated-but-clear role scores >= 4.5 and attainability high (not capped 3.9).
4. The medium role caps at 3.9 and lands in Strong, never Apply.
5. Selection from a 14+ role store returns exactly 10 in Apply, all fit >= 4.5, all
   remote_us, sorted by fit desc, and the honest count line is absent.
6. Selection from a store with only 6 qualifying returns 6 in Apply plus the honest
   count line, with the medium/Strong roles routed correctly and zero padding.
7. Rolling window: a fit-4.6 role with last_seen 5 days ago and applied false appears;
   the same role with applied true is excluded; a 4.6 role last_seen 9 days ago is
   pruned and absent.
8. Determinism: running selection twice on the same store yields identical ordering.

All eight must pass. That is the provable, repeatable bar.

## Live verification after tests pass

Run a no-email dry run that prints the real Apply List. Expected: 10 rows at >= 4.5,
all remote, or an honest count if the live window genuinely has fewer. This is the
real-world confirmation on top of the deterministic tests.

## Standing rules

- No em-dashes anywhere (grep -c yields 0).
- UTF-8 no-BOM writes.
- Bump the scanner version string to 3.0.
- Do NOT create a new scheduled task or scheduler. The existing 7am task runs
  daily_scan.ps1 and must pick up the new logic automatically.
- Truth Protocol: never invent a requirement not in the posting, never promote a
  vetoed role, never pad the Apply List.
