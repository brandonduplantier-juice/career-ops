Set-Location C:\Users\brand\career-ops
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Add-Content -Path "data\scan_log.txt" -Value "`n=== Scan started: $timestamp ==="

$prompt = @'
Run a job scan for remote analyst roles, then save a ranked queue.

ACCURACY RULES (highest priority):
- Use web search. Only include REAL, currently-open postings, each with a working URL to the live listing.
- Do NOT invent or guess companies, roles, pay, or URLs. Never pad the list.
- Only include postings from the last 14 days. Undated postings only if clearly still open.
- Target 25 roles. If fewer are real, return fewer and state how many you actually found.
- Plain text only. No emoji or special symbols.

DEDUP:
- Read data/seen_jobs.json. Skip any role already listed there. After producing the queue, append the new roles (company + role + URL) to it.

REMOTE ONLY:
- Fully remote (US-based) only. Exclude both hybrid and on-site roles entirely.

CANDIDATE:
- Bioinformatics student, graduating December 2027, Dayton OH. Former pathologist assistant. Target level: entry / junior / associate / Analyst I.
- Domain strength: 15+ years navigating prior authorization and healthcare/insurance systems firsthand. Treat this as a scoring BOOST on healthcare, prior-authorization, and revenue-cycle roles, not as a filter that narrows the whole search.

PAY:
- No pay ceiling. Do not exclude or down-rank any role based on salary.
- Informational only: add the flag BENEFITS when a posting lists employer-sponsored health insurance.

SKILLS (current):
- Microsoft Excel: native .xlsx, pivot-style summary tables, COUNTIFS, AVERAGEIF, INDEX/MATCH, linked KPI dashboard
- R: logistic regression (glm), odds ratios with confidence intervals, ROC/AUC
- Snowflake: cloud data warehouse, loaded via Python connector, SQL with IFF, QUALIFY, RATIO_TO_REPORT, window functions
- Power BI: 2 portfolio projects with DAX, CALCULATE, RANKX, slicers, KPI cards
- Tableau: live public dashboard with choropleth map and trend line
- Looker Studio: live dashboard connected to Google Sheets
- Google Sheets: pivot tables, COUNTIFS, INDEX/MATCH, dashboard tab
- SQL: CTEs, window functions, conditional aggregation, subqueries, DATE_TRUNC, PostgreSQL, Snowflake
- Python: Pandas, NumPy, Matplotlib, Seaborn, scikit-learn, Random Forest, logistic regression
- Machine Learning: ROC-AUC, class imbalance, feature importance, confusion matrix

TARGET ROLES (any of these at entry / junior / associate / Analyst I level, any industry unless noted):
General analyst:
- Data Analyst
- Business Intelligence / BI Analyst
- Reporting Analyst
- Analytics Analyst
- Data Quality Analyst
- Operations Analyst (data-focused)
- Research or Research Data Analyst
- Marketing, Product, or Financial Analyst (data-heavy)
- Junior Data Scientist
Healthcare-weighted (extra scoring boost - domain edge):
- Healthcare Data Analyst / Clinical Data Analyst
- Health Informatics Analyst
- Population Health Analyst
- Bioinformatics Analyst
- Revenue Cycle Management (RCM) Data Analyst
- Prior Authorization analyst / analytics
- CRO Clinical Data Analyst
- Government health data via USAJobs (GS-5 / GS-7): IHS, CMS, HRSA

SCORING (A-F):
- Fully remote required (hard). Exclude hybrid and on-site entirely.
- Skill fit: Power BI OR Tableau OR Looker; SQL + Python; Snowflake, R, or Excel = realistic fit. dbt or BigQuery as a HARD requirement = note as gap but still score.
- Level fit: 0-2 years / entry / associate / Analyst I = realistic fit; 3+ years required lowers the score.
- Bonuses: healthcare or prior-auth / RCM domain +0.4; ongoing role +0.3; post-graduation full-time or benefits conversion +0.3; student-flexible or through-December-2027 language +0.2.
- Penalty: temporary or summer-only -0.5.
- Flag STABLE for companies with 200+ employees and real revenue.

REACHABILITY (counters algorithmic-monoculture screening):
- +0.3 if the employer is small or mid-sized (roughly under 200 employees) - more likely a human reads the application.
- +0.3 if there is a direct-apply path, a named hiring contact, or a network/alumni path (see WARM PATH below).
- -0.3 if the only path is a gamified or AI video assessment (HireVue, Pymetrics, Plum, Harver, Criteria, Koru) AND no warm path exists. Do not exclude these; just lower priority.
- Prioritize roles with a warm path and a non-assessment screen.

SCREEN AND WARM PATH (do this for every A and B role):
- SCREEN: identify the application method from the apply URL and JD. RESUME = greenhouse, lever, ashby, workday, smartrecruiters, workable, icims, taleo. ASSESSMENT = pymetrics, hirevue, plum, harver, criteria, koru, or JD mentions of games / assessment / on-demand video interview. DIRECT = email a person or a small-company form with no ATS.
- WARM PATH: using web search and browser tools, find a referral route - a named hiring manager or team lead, a University of Arizona alum at the company, or a plausible connection. Output a concrete next step (e.g., "Referral: msg J. Smith, Analytics Lead, UA alum") or "Cold: no contact found". Never invent names; if none found, say so.

SCREEN OUT / SEPARATE:
- Skip hidden-employer staffing aggregators unless the real employer is identifiable: Jobgether, Calculated Hire, Jobs via Dice, RemoteHunter, generic recruiting LLCs.
- Skip title traps without a research context: Labeling, Annotation, Verification, Migration, data entry, encounter-data entry.
- Skip roles unrelated to data/analytics (for example veterinary practice management or industrial manufacturing operations) unless they are genuine analyst roles.
- List gig / low-rate platforms (Mindrift, Outlier, Scale AI) SEPARATELY at the bottom as GIG, never in the main queue.

SOURCES:
- Prefer company ATS boards: Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Rippling.
- Remote-focused boards: LinkedIn guest jobs API, Himalayas, We Work Remotely, RemoteOK, Built In.
- Government: USAJobs.
- Do not rely on Indeed, SimplyHired, or Wellfound (blocked), or Arbeitnow (non-US).

SECONDARY TRACK - Longevity / Research (run alongside the analyst search):
- Also find remote longevity, bioinformatics, computational biology, and biotech research roles (entry / junior / research associate / intern with conversion or at high-signal labs). Remote-only still applies.
- Cap this at about 5 roles. It must NOT crowd out the primary analyst roles.
- Rationale: Brandon's long-term goal is founding a biomedical longevity company, so keep a real line in the water here.

OUTPUT - save to data/daily_queue.md:
- First line: summary - scan date, total real roles found, count of each grade (A/B/C/D/F), and how many were new vs already seen.
- PRIORITY section at the top: all A and B roles.
- Then a ranked table sorted by score, columns: Rank | Score | Company | Role | URL | Pay | Remote | Employer Type | Duration | Screen | Warm Path | Flags | Gap.
- Screen column: RESUME | ASSESSMENT | DIRECT. Warm Path column: a concrete referral/contact step, or "Cold: no contact found".
- Main table includes B and above, then C below. Exclude anything already applied to or in data/seen_jobs.json.
- After the primary analyst table, add a separate "SECONDARY: Longevity / Research" section (same columns, capped at ~5 roles).
- List GIG roles separately at the very bottom.
'@

claude --dangerously-skip-permissions -p $prompt >> data\scan_log.txt 2>&1

Add-Content -Path "data\scan_log.txt" -Value "=== Scan complete: $(Get-Date -Format 'yyyy-MM-dd HH:mm') ==="
