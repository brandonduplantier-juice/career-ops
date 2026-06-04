Set-Location C:\Users\brand\career-ops
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Add-Content -Path "data\scan_log.txt" -Value "`n=== Scan started: $timestamp ==="

$prompt = @'
Run a job scan for remote data analyst roles.

ACCURACY RULES (most important):
- Use web search to find real, currently-open job postings. Do NOT invent or guess companies, roles, pay, or URLs.
- Every entry MUST come from an actual search result and have a working URL to the live posting.
- Only include roles posted within the last 14 days. If a posting has no date, include it only if it is clearly still open.
- Aim for 25 roles, but if you cannot verify 25 real ones, return fewer and state how many you actually found. Never pad the list with fabricated entries.

DEDUP:
- Read data/seen_jobs.json. Skip any role already listed there.
- After producing the queue, append the new roles (company + role + URL) to data/seen_jobs.json.

OUTPUT:
- Save results to data/daily_queue.md sorted by score (best first).
- At the very top, write a summary line: scan date, total real roles found, count of each grade (A/B/C/D/F), and how many were new vs already seen.
- Flag all A and B scores as PRIORITY in a section at the top.
- For each role include: URL, company, role title, pay if listed, score, and a one-line gap summary.

Score each role A-F based on the profile below.

MY CURRENT SKILLS - NO LONGER GAPS:
- Microsoft Excel: native .xlsx, pivot-style summary tables, COUNTIFS, AVERAGEIF, INDEX/MATCH, linked KPI dashboard
- R: logistic regression (glm), odds ratios with confidence intervals, ROC/AUC
- Snowflake: cloud data warehouse, loaded via Python connector, SQL with IFF, QUALIFY, RATIO_TO_REPORT, window functions
- Power BI: 2 portfolio projects with DAX, CALCULATE, RANKX, slicers, KPI cards
- Tableau: live public dashboard on Tableau Public with choropleth map, trend line
- Looker Studio: live dashboard connected to Google Sheets
- Google Sheets: pivot tables, COUNTIFS, INDEX/MATCH, dashboard tab
- SQL: CTEs, window functions, conditional aggregation, subqueries, DATE_TRUNC, PostgreSQL
- Python: Pandas, NumPy, Matplotlib, Seaborn, scikit-learn, Random Forest, logistic regression
- Machine Learning: ROC-AUC, class imbalance, feature importance, confusion matrix
- DAX: CALCULATE, RANKX, DIVIDE, COUNTROWS, FILTER

TARGET ROLES - SCORE THESE HIGH:
- Healthcare Data Analyst
- Clinical Data Analyst
- Business Intelligence Analyst
- BI Analyst
- Healthcare BI Analyst
- Data Visualization Analyst
- Health Informatics Analyst
- Prior Authorization Analytics
- Revenue Cycle Data Analyst
- Population Health Analyst

SCORING RULES:
- Remote required. Hybrid = max B. On-site = D or F.
- Pay ceiling $49,000/year until December 2027 graduation. Flag OVER_CEILING for awareness.
- Roles requiring Power BI OR Tableau OR Looker = REALISTIC_FIT if other criteria match.
- Roles requiring SQL + Python = REALISTIC_FIT.
- Roles requiring Snowflake, R, or Excel = REALISTIC_FIT (these are current skills, not gaps).
- Roles requiring dbt or BigQuery as HARD requirements = flag as gap but still score.
- 0-2 years experience required = REALISTIC_FIT.
- Durability: ongoing roles get +0.4, temporary/summer only get -0.5.
- Post-graduation full-time conversion language = +0.4 bonus.
- Healthcare domain match = +0.3 bonus.
- Flag STABLE for companies with 200+ employees and real revenue.
- Flag GIG for contract/freelance platforms like Mindrift, Outlier, Scale AI.

SEARCH TARGETS:
Health systems, CROs, health tech startups, payer/PBM companies, government health agencies, academic medical centers, population health companies, revenue cycle companies, clinical analytics firms.

Remote required. Do not include on-site roles.
'@

claude --dangerously-skip-permissions -p $prompt >> data\scan_log.txt 2>&1

Add-Content -Path "data\scan_log.txt" -Value "=== Scan complete: $(Get-Date -Format 'yyyy-MM-dd HH:mm') ==="
