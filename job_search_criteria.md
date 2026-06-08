# Job Search Criteria — Source of Truth

Last updated: 2026-06-08. Pay ceiling removed; scope broadened to all appropriate
analyst-level roles, remote required. Master reference for `daily_scan.ps1`, `cv.md`, and
the config files (`config/profile.yml`, `portals.yml`, `modes/_profile.md`).

---

## Candidate snapshot

- Brandon Duplantier, Dayton OH. B.S. Bioinformatics, University of Arizona, graduating
  December 2027.
- Former pathologist assistant (Montgomery County Morgue, 2010–2013); 15+ years across
  engineering, technical support, and startup consulting.
- **Domain strength (not a filter):** 15+ years navigating prior authorization and
  healthcare/insurance systems firsthand. Most analyst candidates have no inside knowledge
  of how prior auth actually works, so this is a genuine edge on healthcare, prior-auth,
  and revenue-cycle roles. It is a scoring *boost* on those roles, not a restriction on the
  overall search.

---

## Pay

- **No pay ceiling.** Roles are not excluded or down-ranked based on salary.
- `BENEFITS` flag is informational only — it marks whether a posting lists employer-
  sponsored health insurance.

## Remote

- **Fully remote (US) only.** Hybrid and on-site are both excluded.

## Level

- Entry-level / junior / associate / Analyst I. 0–2 years required.

---

## Skills (current)

- Microsoft Excel: native .xlsx, pivot-style summary tables, COUNTIFS, AVERAGEIF, INDEX/MATCH, linked KPI dashboard
- R: logistic regression (glm), odds ratios with confidence intervals, ROC/AUC
- Snowflake: cloud data warehouse, loaded via Python connector, SQL with IFF, QUALIFY, RATIO_TO_REPORT, window functions
- Power BI: 2 portfolio projects with DAX (CALCULATE, RANKX, DIVIDE, COUNTROWS, FILTER), slicers, KPI cards
- Tableau: live public dashboard with choropleth map and trend line
- Looker Studio: live dashboard connected to Google Sheets
- Google Sheets: pivot tables, COUNTIFS, INDEX/MATCH, dashboard tab
- SQL: CTEs, window functions, conditional aggregation, subqueries, DATE_TRUNC; PostgreSQL, Snowflake
- Python: Pandas, NumPy, Matplotlib, Seaborn, scikit-learn, Random Forest, logistic regression
- Machine Learning: ROC-AUC, class imbalance, feature importance, confusion matrix

---

## Target roles (entry / junior / associate, remote, any industry unless noted)

**General analyst (any industry):**
- Data Analyst
- Business Intelligence / BI Analyst
- Reporting Analyst
- Analytics Analyst
- Data Quality Analyst
- Operations Analyst (data-focused)
- Research / Research Data Analyst
- Marketing, Product, or Financial Analyst (data-heavy)
- Junior Data Scientist

**Healthcare-weighted (extra boost — domain edge):**
- Healthcare Data Analyst / Clinical Data Analyst
- Health Informatics Analyst
- Population Health Analyst
- Bioinformatics Analyst
- Revenue Cycle Management (RCM) Data Analyst
- Prior Authorization analyst / analytics
- CRO Clinical Data Analyst
- Government health data via USAJobs (GS-5 / GS-7): IHS, CMS, HRSA

---

## Scoring (A–F) and flags

- Fully remote required (hard). Hybrid and on-site both excluded.
- Skill fit: Power BI OR Tableau OR Looker; SQL + Python; Snowflake, R, or Excel = realistic
  fit. dbt or BigQuery as a HARD requirement = note as gap, still score.
- Level fit: 0–2 years / entry / associate / Analyst I = realistic fit; 3+ years lowers score.
- Bonuses: healthcare or prior-auth/RCM domain +0.4; ongoing role +0.3; post-graduation
  FT/benefits conversion +0.3; student-flexible or through-Dec-2027 language +0.2.
- Penalty: temporary / summer-only -0.5.
- Flags: `STABLE` (200+ employees, real revenue), `BENEFITS` (employer health insurance listed).

---

## Screen out / separate

- **Hidden-employer aggregators** — skip unless the real employer is identifiable:
  Jobgether, Calculated Hire, Jobs via Dice, RemoteHunter, generic recruiting LLCs.
- **Title traps** without a research context: Labeling, Annotation, Verification, Migration,
  data entry, encounter-data entry.
- **Unrelated fields** (unless a genuine analyst role): veterinary practice management,
  industrial manufacturing operations.
- **Gig / low-rate platforms** — list SEPARATELY at the bottom as GIG: Mindrift, Outlier,
  Scale AI.
- **Recruitment scams** — do not engage: unsolicited recruiter DMs, implausible salaries,
  requests for personal/financial info, off-platform contact.

---

## Sources

- **Company ATS boards:** Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Rippling.
- **Remote-focused boards:** LinkedIn guest jobs API
  (`linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search`), Himalayas, We Work
  Remotely, RemoteOK, Built In.
- **Government:** USAJobs (API key pending).
- **Do not rely on:** Indeed, SimplyHired, Wellfound (Cloudflare-blocked); Arbeitnow (non-US).

---

## Output format (`data/daily_queue.md`)

- First line: summary — scan date, total real roles found, count by grade (A/B/C/D/F),
  new vs. already-seen.
- PRIORITY section: all A and B roles.
- Ranked table sorted by score:
  `Rank | Score | Company | Role | URL | Pay | Remote | Employer Type | Duration | Flags | Gap`
- Main table includes B and above, then C below. Exclude anything already applied to or in
  `data/seen_jobs.json`.
- GIG roles listed separately at the very bottom.

---

## Accuracy rules (non-negotiable)

- Real, currently-open postings only, each with a working URL.
- No fabricated companies, roles, pay, or URLs. Return fewer than 25 rather than pad.
- Plain text only — no emoji or special symbols.

---

## To update the config files (run in the career-ops repo)

Paste into `claude` from inside `C:\Users\brand\career-ops`:

```
Read my cv.md, config/profile.yml, portals.yml, and modes/_profile.md. Apply all of the
following in one pass. Do not ask for confirmation. Then report a short diff of what
changed in each file.

1. REMOVE the pay ceiling entirely. Delete any $49,000 / $50,138 / Medicaid / 1619(b) /
   IN_CEILING / OVER_CEILING logic. Do not exclude or down-rank roles by salary. Keep only
   a BENEFITS flag that marks whether a role lists employer health insurance.
2. FULLY REMOTE only (hard filter). Exclude both hybrid and on-site.
3. SKILLS: list Excel (native .xlsx), R (glm/odds ratios/ROC-AUC), and Snowflake as current
   skills, not gaps.
4. TARGET ROLES: broaden to all appropriate analyst-level roles at entry/junior/associate
   in any industry - Data Analyst, BI Analyst, Reporting Analyst, Analytics Analyst, Data
   Quality Analyst, Operations Analyst, Research Data Analyst, Marketing/Product/Financial
   Analyst, Junior Data Scientist. Give a scoring boost (not a filter) to healthcare-
   weighted roles: healthcare/clinical data analyst, health informatics, population health,
   bioinformatics, RCM, prior authorization, CRO clinical data analyst, USAJobs GS-5/GS-7.
5. SOURCES: prefer Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Rippling,
   LinkedIn guest API, Himalayas, We Work Remotely, RemoteOK, Built In, USAJobs. Drop
   Indeed, SimplyHired, Wellfound, Arbeitnow.
6. SCORING: healthcare/prior-auth/RCM domain +0.4, ongoing +0.3, post-graduation conversion
   +0.3, through-graduation/student-flexible +0.2, temporary/summer-only -0.5. No salary
   penalties.
```

---

## Strategy: beating algorithmic-monoculture screening

Most employers screen with the same few vendors, so more applications through identical
pipelines rarely yield a new evaluation (Bommasani et al., Stanford, 2026). The system is
tuned to favor reachable roles and warm paths over raw volume:

- **Positioning:** lead as a data analyst who *builds* AI-driven automation, plus the
  prior-auth/healthcare domain edge. This counters the entry-level squeeze (employers cut
  junior analyst roles they expect AI to absorb) by placing Brandon on the building side.
- **SCREEN tag** per A/B role: RESUME (resume-parse ATS), ASSESSMENT (gamified/AI video:
  HireVue, Pymetrics, Plum, Harver, Criteria, Koru), or DIRECT. Avoid re-grinding identical
  assessment pipelines.
- **WARM_PATH** per A/B role: a named hiring contact, a University of Arizona alum, or a
  connection to approach for a referral that bypasses the screen. Never invent contacts.
- **Reachability scoring:** +0.3 small/mid employer (<~200), +0.3 direct-apply or warm path,
  -0.3 assessment-only with no warm path (flag, do not exclude).
- **Range over volume:** apply across roles, industries, and geographies; be open to
  contract and adjacent roles; lead every touchpoint with the portfolio.
