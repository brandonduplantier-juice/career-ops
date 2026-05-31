Set-Location C:\Users\brand\career-ops
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
Add-Content -Path "data\scan_log.txt" -Value "`n=== Scan started: $timestamp ==="

claude --dangerously-skip-permissions -p "Run a job scan. Pull 25 remote data analyst roles. Score each A-F based on my profile below. Save results to data/daily_queue.md sorted by score. Flag all A and B scores as PRIORITY at the top. Include URL, company, role, pay if listed, score, and one-line gap summary for each.

MY CURRENT SKILLS - NO LONGER GAPS:
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
- Roles requiring Snowflake, dbt, BigQuery as HARD requirements = flag as gap but still score.
- 0-2 years experience required = REALISTIC_FIT.
- Durability: ongoing roles get +0.4, temporary/summer only get -0.5.
- Post-graduation full-time conversion language = +0.4 bonus.
- Healthcare domain match = +0.3 bonus.
- Flag STABLE for companies with 200+ employees and real revenue.
- Flag GIG for contract/freelance platforms like Mindrift, Outlier, Scale AI.

SEARCH TARGETS:
Health systems, CROs, health tech startups, payer/PBM companies, government health agencies, academic medical centers, population health companies, revenue cycle companies, clinical analytics firms.

Remote required. Do not include on-site roles." >> data\scan_log.txt 2>&1

Add-Content -Path "data\scan_log.txt" -Value "=== Scan complete: $(Get-Date -Format 'yyyy-MM-dd HH:mm') ==="