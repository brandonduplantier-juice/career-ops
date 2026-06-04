<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brandon Duplantier - Data Analyst Portfolio</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0f0f0f;
    --paper: #f5f2ec;
    --accent: #1a3a5c;
    --accent2: #c8401e;
    --mid: #6b6560;
    --rule: #d8d3cb;
    --card-bg: #ffffff;
  }
  html { font-size: 16px; }
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    line-height: 1.6;
    min-height: 100vh;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 0;
  }
  header {
    position: relative;
    z-index: 1;
    padding: 5rem 6rem 3rem;
    border-bottom: 1px solid var(--rule);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 2rem;
  }
  .header-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent2);
    margin-bottom: 1rem;
  }
  h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(2.8rem, 5vw, 4.5rem);
    line-height: 1.05;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  h1 em { font-style: italic; color: var(--accent); }
  .header-meta { text-align: right; }
  .header-meta p {
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    color: var(--mid);
    line-height: 1.8;
  }
  .header-meta a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
    transition: color 0.2s, border-color 0.2s;
  }
  .header-meta a:hover { color: var(--accent2); border-color: var(--accent2); }
  .intro {
    position: relative;
    z-index: 1;
    padding: 2.5rem 6rem;
    border-bottom: 1px solid var(--rule);
    display: flex;
    align-items: center;
    gap: 3rem;
  }
  .intro-text {
    font-size: 1.05rem;
    color: var(--mid);
    max-width: 680px;
    line-height: 1.75;
  }
  .intro-text strong { color: var(--ink); font-weight: 500; }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-left: auto;
    flex-shrink: 0;
  }
  .tag {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--rule);
    border-radius: 2px;
    color: var(--mid);
    white-space: nowrap;
  }
  .tag.highlight { background: var(--accent); color: #fff; border-color: var(--accent); }
  .section-header {
    position: relative;
    z-index: 1;
    padding: 2.5rem 6rem 1rem;
    display: flex;
    align-items: baseline;
    gap: 1.5rem;
  }
  .section-header h2 {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .section-header::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--rule);
  }
  .projects {
    position: relative;
    z-index: 1;
    padding: 0 6rem 4rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
  }
  .card {
    background: var(--card-bg);
    border: 1px solid var(--rule);
    border-radius: 3px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }
  .card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); border-color: transparent; }
  .card:hover::before { transform: scaleX(1); }
  .card.featured::before { background: var(--accent2); transform: scaleX(1); }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .card-type {
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .card-badge {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.2rem 0.6rem;
    background: var(--accent2);
    color: #fff;
    border-radius: 2px;
  }
  .card h3 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.35rem;
    line-height: 1.2;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .card p { font-size: 0.88rem; color: var(--mid); line-height: 1.65; flex: 1; }
  .card-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--rule);
  }
  .pill {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.2rem 0.55rem;
    background: var(--paper);
    border-radius: 2px;
    color: var(--mid);
  }
  footer {
    position: relative;
    z-index: 1;
    padding: 2rem 6rem;
    border-top: 1px solid var(--rule);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  footer p { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--mid); letter-spacing: 0.05em; }
  footer a { color: var(--accent); text-decoration: none; border-bottom: 1px solid currentColor; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  header, .intro, .section-header, .projects, footer { animation: fadeUp 0.5s ease both; }
  .intro { animation-delay: 0.08s; }
  .section-header { animation-delay: 0.14s; }
  .projects { animation-delay: 0.2s; }
  footer { animation-delay: 0.26s; }
  @media (max-width: 900px) {
    header, .intro, .section-header, .projects, footer { padding-left: 2rem; padding-right: 2rem; }
    header { grid-template-columns: 1fr; padding-top: 3rem; }
    .header-meta { text-align: left; }
    .intro { flex-direction: column; }
    .tags { margin-left: 0; }
    .projects { grid-template-columns: 1fr; }
    footer { flex-direction: column; gap: 0.5rem; text-align: center; }
  }
  .tag-all { background: var(--accent); color: #fff; border-color: var(--accent); }
  .tag-all.inactive { background: transparent; color: var(--mid); border-color: var(--rule); }
  .tag { cursor: pointer; transition: all 0.15s ease; user-select: none; }
  .tag:hover { border-color: var(--accent); color: var(--accent); }
  .tag.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .card.hidden { display: none; }
  .filter-label { font-family: "DM Mono", monospace; font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mid); margin-bottom: 0.75rem; margin-top: 1.5rem; }
  .no-results { display: none; grid-column: 1 / -1; text-align: center; padding: 3rem; font-family: "DM Mono", monospace; font-size: 0.8rem; color: var(--mid); }
</style>
</head>
<body>

<header>
  <div>
    <p class="header-label">Portfolio - Data Analytics</p>
    <h1>Brandon<br><em>Duplantier</em></h1>
  </div>
  <div class="header-meta">
    <p>Google Data Analytics Certified</p>
    <p>Python - SQL - Power BI - Tableau - Flask - Looker Studio - Excel</p>
    <p>Dayton, OH</p>
    <p style="margin-top:0.75rem">
      <a href="https://github.com/brandonduplantier-juice" target="_blank">GitHub</a>
    </p>
  </div>
</header>

<div class="intro">
  <p class="intro-text">
    Data analyst and Python developer with a focus on <strong>healthcare analytics</strong>, operational insights, and shipped software. I build end-to-end projects from raw data to dashboards and production applications using Python, SQL, Flask, and BI tools to answer questions that drive decisions.
  </p>
  <p class="filter-label">Filter by skill</p>
  <div class="tags">
    <span class="tag tag-all" data-filter="all">All Projects</span>
    <span class="tag" data-filter="flask">Flask</span>
    <span class="tag" data-filter="power-bi">Power BI</span>
    <span class="tag" data-filter="tableau">Tableau</span>
    <span class="tag" data-filter="looker">Looker Studio</span>
    <span class="tag" data-filter="python">Python</span>
    <span class="tag" data-filter="sql">SQL</span>
    <span class="tag" data-filter="ml">Machine Learning</span>
    <span class="tag" data-filter="sheets">Google Sheets</span>
    <span class="tag" data-filter="excel">Excel</span>
    <span class="tag" data-filter="r">R</span>
    <span class="tag" data-filter="healthcare">Healthcare</span>
    <span class="tag" data-filter="dax">DAX</span>
  </div>
</div>

<div class="section-header">
  <h2>Projects</h2>
</div>

<div class="projects">

  <a class="card featured" href="https://craftpath.onrender.com" data-tags="flask python" target="_blank">
    <div class="card-top">
      <span class="card-type">Flask - Python - REST API - Cloud Deploy</span>
      <span class="card-badge">Shipped</span>
    </div>
    <h3>CraftPath — Path of Exile 2 Optimizer</h3>
    <p>Full-stack Flask web application shipped to production. Features a dual-edition architecture: an online optimizer deployed to Render and a desktop edition with live market pricing via REST API integration. Designed secure in-app session handling following Path of Building's local credential model. Managed full open source release pipeline with GitHub CLI versioned releases and downloadable desktop package.</p>
    <div class="card-footer">
      <span class="pill">Flask</span>
      <span class="pill">Python</span>
      <span class="pill">REST API</span>
      <span class="pill">Render</span>
      <span class="pill">GitHub CLI</span>
      <span class="pill">Open Source</span>
    </div>
  </a>

  <a class="card featured" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/Hospital-Readmission-PowerBI" data-tags="power-bi healthcare dax" target="_blank">
    <div class="card-top">
      <span class="card-type">Power BI - Healthcare</span>
      <span class="card-badge">New</span>
    </div>
    <h3>Hospital 30-Day Readmission Analysis</h3>
    <p>Interactive dashboard analyzing readmission patterns across 300 patients and 5 diagnoses. Heart Failure patients showed a 39% readmission rate, nearly 6x higher than surgical cases. Built with DAX measures and interactive slicers filtering by insurance type, department, and gender.</p>
    <div class="card-footer">
      <span class="pill">Power BI</span>
      <span class="pill">DAX</span>
      <span class="pill">Healthcare</span>
      <span class="pill">CMS HRRP</span>
    </div>
  </a>

  <a class="card featured" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/HR-Attrition-PowerBI" data-tags="power-bi python dax" target="_blank">
    <div class="card-top">
      <span class="card-type">Python - Power BI - HR Analytics</span>
      <span class="card-badge">New</span>
    </div>
    <h3>HR Attrition Risk Dashboard</h3>
    <p>Python engineered a weighted attrition risk score per employee across 8 factors. Power BI dashboard built on the enriched dataset identifies Sales and Marketing at 28% attrition, 8 points above the 15% target. Features a scatter plot, department treemap, gauge, and interactive slicers.</p>
    <div class="card-footer">
      <span class="pill">Python</span>
      <span class="pill">Power BI</span>
      <span class="pill">DAX</span>
      <span class="pill">CALCULATE</span>
      <span class="pill">RANKX</span>
      <span class="pill">HR Analytics</span>
    </div>
  </a>

  <a class="card featured" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/Readmission-Prediction-Model" data-tags="python ml healthcare" target="_blank">
    <div class="card-top">
      <span class="card-type">Python - Machine Learning - Healthcare</span>
      <span class="card-badge">New</span>
    </div>
    <h3>Hospital Readmission Prediction Model</h3>
    <p>Machine learning pipeline predicting 30-day hospital readmission risk from patient records. Applies feature engineering, model training, and evaluation to identify high-risk patients before discharge. Built end-to-end in Python with scikit-learn.</p>
    <div class="card-footer">
      <span class="pill">Python</span>
      <span class="pill">scikit-learn</span>
      <span class="pill">Machine Learning</span>
      <span class="pill">Healthcare</span>
      <span class="pill">Pandas</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/R-Readmission-Logistic-Regression" data-tags="r healthcare ml" target="_blank">
    <div class="card-top">
      <span class="card-type">R - Statistical Modeling - Healthcare</span>
    </div>
    <h3>Readmission Logistic Regression (R)</h3>
    <p>Interpretable logistic-regression companion to the Random Forest model, built in R (glm) on the same 300-patient dataset. Quantifies how each factor shifts the odds of 30-day readmission: relative to surgical patients, Heart Failure carries roughly 20x the odds of readmission (OR 19.7, p&lt;0.001), with COPD, Sepsis, and Pneumonia all 6-10x and significant. Reports odds ratios with 95% confidence intervals and ROC AUC of 0.714.</p>
    <div class="card-footer">
      <span class="pill">R</span>
      <span class="pill">Logistic Regression</span>
      <span class="pill">Odds Ratios</span>
      <span class="pill">glm</span>
      <span class="pill">ROC / AUC</span>
    </div>
  </a>

  <a class="card featured" href="https://public.tableau.com/views/global_happiness_dashboard/GlobalHappinessDashboard2019" data-tags="tableau python" target="_blank">
    <div class="card-top">
      <span class="card-type">Tableau - Global Analytics</span>
      <span class="card-badge">New</span>
    </div>
    <h3>Global Happiness Dashboard</h3>
    <p>Interactive Tableau dashboard analyzing 2019 World Happiness Report data across 156 countries. Choropleth world map, GDP vs happiness scatter plot with trend line, top 20 countries bar chart, and happiness factors comparison. Live and interactive on Tableau Public.</p>
    <div class="card-footer">
      <span class="pill">Tableau</span>
      <span class="pill">Choropleth Map</span>
      <span class="pill">Trend Line</span>
      <span class="pill">World Happiness</span>
      <span class="pill">Python Prep</span>
    </div>
  </a>

  <a class="card" href="https://datastudio.google.com/reporting/7d8410ea-6d2c-4c91-9f24-ab16f2809e22" data-tags="looker healthcare sheets" target="_blank">
    <div class="card-top">
      <span class="card-type">Looker Studio - Healthcare Analytics</span>
    </div>
    <h3>Hospital Readmission Analysis</h3>
    <p>Interactive Looker Studio dashboard analyzing 300-patient hospital readmission dataset. Features scorecards, bar charts by diagnosis and insurance type, pie chart by discharge destination, and a live dropdown filter. Connects directly to Google Sheets as the data source.</p>
    <div class="card-footer">
      <span class="pill">Looker Studio</span>
      <span class="pill">Google Sheets</span>
      <span class="pill">Interactive Filter</span>
      <span class="pill">Healthcare</span>
    </div>
  </a>

  <a class="card" href="https://docs.google.com/spreadsheets/d/15A3XCNeAAntAN3o3DH4Z97v85CsdN2afLzj7Zy2zYhY/edit?usp=sharing" data-tags="sheets healthcare" target="_blank">
    <div class="card-top">
      <span class="card-type">Google Sheets - Healthcare Analytics</span>
    </div>
    <h3>Hospital Readmission Spreadsheet Analysis</h3>
    <p>Advanced spreadsheet analysis using 3 pivot tables, COUNTIFS, COUNTIF, INDEX/MATCH, and calculated readmission rates by diagnosis and insurance type. Dashboard tab pulls live KPIs from formula sheet. Heart Failure readmission rate 39.29% vs 7.04% for Hip/Knee Replacement.</p>
    <div class="card-footer">
      <span class="pill">Google Sheets</span>
      <span class="pill">Pivot Tables</span>
      <span class="pill">COUNTIFS</span>
      <span class="pill">INDEX/MATCH</span>
      <span class="pill">Dashboard</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/Excel-Readmission-Analysis" data-tags="excel healthcare" target="_blank">
    <div class="card-top">
      <span class="card-type">Microsoft Excel - Healthcare Analytics</span>
    </div>
    <h3>Hospital Readmission Excel Analysis</h3>
    <p>Native Excel workbook analyzing the 300-patient readmission dataset. Three pivot-style summary tables (by diagnosis, insurance type, and discharge disposition) built with COUNTIFS and AVERAGEIF, plus an INDEX/MATCH lookup returning the highest-risk diagnosis. Dashboard tab links live to the formula sheet via cross-sheet references with a readmission-rate bar chart. Patients without a scheduled followup readmit at 30.59% vs 24.00% overall.</p>
    <div class="card-footer">
      <span class="pill">Microsoft Excel</span>
      <span class="pill">Pivot Tables</span>
      <span class="pill">COUNTIFS</span>
      <span class="pill">INDEX/MATCH</span>
      <span class="pill">Dashboard</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/SQL-Analytics-Portfolio" data-tags="sql" target="_blank">
    <div class="card-top">
      <span class="card-type">SQL - Multi-Domain Analysis</span>
    </div>
    <h3>SQL Analytics Portfolio</h3>
    <p>6 queries across 4 real PostgreSQL databases demonstrating CTEs, window functions, conditional aggregation, subqueries, and date functions. Key finding: 210 whales generate 52% of game revenue despite being 9% of paying users. NYC Instacart issue rate 3x higher than Chicago.</p>
    <div class="card-footer">
      <span class="pill">PostgreSQL</span>
      <span class="pill">CTEs</span>
      <span class="pill">Window Functions</span>
      <span class="pill">CASE</span>
      <span class="pill">DATE_TRUNC</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/Grammys%20-%20Website%20Analytics%20Project" data-tags="python" target="_blank">
    <div class="card-top">
      <span class="card-type">Python - Analytics</span>
    </div>
    <h3>Grammy Website Analytics</h3>
    <p>End-to-end web analytics project exploring Grammy Awards data. Applies data wrangling, exploratory analysis, and visualization to uncover audience and engagement patterns.</p>
    <div class="card-footer">
      <span class="pill">Python</span>
      <span class="pill">Pandas</span>
      <span class="pill">Matplotlib</span>
      <span class="pill">Jupyter</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio/tree/main/LiveLab" data-tags="python" target="_blank">
    <div class="card-top">
      <span class="card-type">Python - Practice</span>
    </div>
    <h3>LiveLab Exercises</h3>
    <p>Hands-on Python lab exercises covering data manipulation, functions, and analysis workflows. Demonstrates foundational programming competency applied to real datasets.</p>
    <div class="card-footer">
      <span class="pill">Python</span>
      <span class="pill">Data Wrangling</span>
      <span class="pill">Jupyter</span>
    </div>
  </a>

  <a class="card" href="https://github.com/brandonduplantier-juice/python-portfolio" data-tags="python" target="_blank">
    <div class="card-top">
      <span class="card-type">Python - Series</span>
    </div>
    <h3>SkillBuilder Series</h3>
    <p>9-part project series covering progressively advanced analytics techniques from data cleaning and aggregation through statistical analysis and visualization. Datasets include Dunder Mifflin sales, Nike/Adidas, and Lyft bike share data.</p>
    <div class="card-footer">
      <span class="pill">Python</span>
      <span class="pill">Pandas</span>
      <span class="pill">NumPy</span>
      <span class="pill">Seaborn</span>
      <span class="pill">9 Projects</span>
    </div>
  </a>

</div>

<footer>
  <p>Brandon Duplantier - Data Analyst - Dayton, OH</p>
  <p><a href="https://github.com/brandonduplantier-juice" target="_blank">github.com/brandonduplantier-juice</a></p>
</footer>

<script>
  const tags = document.querySelectorAll(".tag[data-filter]");
  const cards = document.querySelectorAll(".card[data-tags]");
  let active = "all";
  tags.forEach(tag => {
    tag.addEventListener("click", () => {
      active = tag.dataset.filter;
      tags.forEach(t => { t.classList.remove("active"); if(t.dataset.filter==="all") t.classList.add("inactive"); });
      tag.classList.add("active");
      if(tag.dataset.filter==="all") tag.classList.remove("inactive");
      let visible = 0;
      cards.forEach(card => {
        const ct = card.dataset.tags.split(" ");
        if(active==="all" || ct.includes(active)) { card.classList.remove("hidden"); visible++; }
        else card.classList.add("hidden");
      });
    });
  });
</script>
</body>
</html>
