"""
Free Job Scanner - No AI tokens required
Hits public Greenhouse, Lever, and Ashby APIs + scrapes remotive/jobicy
Saves all matches to career-ops/data/raw_scan.md for manual AI review
"""

import requests
import json
import datetime
import time
import re
from pathlib import Path

OUTPUT_FILE = r"C:\Users\brand\career-ops\data\raw_scan.md"

# ── KEYWORDS TO MATCH (job title or description) ─────────────────────────────
TITLE_KEYWORDS = [
    "data analyst", "bi analyst", "business intelligence analyst",
    "healthcare analyst", "clinical data analyst", "health informatics",
    "health data analyst", "medical data analyst", "public health analyst",
    "research analyst", "revenue cycle analyst", "prior authorization analyst",
    "clinical operations analyst", "real world evidence", "rwe analyst",
    "bioinformatics", "computational biology", "population health",
    "analytics engineer", "junior analyst", "associate analyst",
    "data scientist", "ml engineer", "ai trainer", "ai evaluator",
    "biology expert", "llm evaluator", "data annotation", "biology ai",
    "python analyst", "sql analyst", "tableau analyst", "power bi analyst",
    "looker analyst", "biostatistician", "epidemiologist",
]

EXCLUDE_KEYWORDS = [
    "senior", "staff", "principal", "director", "vp ", "vice president",
    "manager", "head of", "lead ", "architect", "wet lab", "bench",
    "on-site only", "on site only",
]

REMOTE_KEYWORDS = [
    "remote", "work from home", "wfh", "distributed", "anywhere",
    "virtual", "telecommute",
]

# ── GREENHOUSE COMPANIES ──────────────────────────────────────────────────────
GREENHOUSE_COMPANIES = [
    # Healthcare / Health Tech
    "natera", "truveta", "veranahealth", "freenome", "flatironhealth",
    "komodohealth", "strive", "headway", "modernhealth", "doximity",
    "midihealth", "cloverhealth", "omadahealth", "smarterdx", "oscarhealth",
    "springhealth66", "rxsense", "veracyte", "includedhealth", "cityblock",
    "vizai", "pathai", "verily", "relationrx", "talkiatry", "sondermind",
    "commure", "akasa", "ambiencehealthcare", "abridge", "solace",
    "qualifiedhealth", "interrahealth", "wellth", "mcghealth", "sifthealthcare",
    "hsag", "welbehealth", "dreemhealth", "dreem",
    # Biotech / Genomics
    "insitro", "recursion", "benchling", "guardanthealth", "tempus",
    "sagebionetworks", "primemedicine", "pacbio", "roivant", "paradigm",
    "exscientia", "insilico", "owkin", "virtahealth", "paige",
    "schrodinger", "deepgenomics", "arcus", "novavax", "zymo",
    "envedabio", "assemblybio", "arvainas", "vaxcyte",
    # AI / Data
    "scale", "labelbox", "snorkelai", "anthropic", "openai", "cohere",
    "databricks", "hex", "retool", "statsig", "apollo", "clay",
    "windfall", "pitchbook", "datavant", "segment",
    # Tech
    "airbnb", "zapier", "gitlab", "cloudflare", "stripe", "ramp", "brex",
    "dbtlabs", "deel", "remote", "tailscale", "mercury", "workos",
    "attio", "pave", "goody", "acorns", "openx", "perplexity",
    "cursor", "harvey", "linear", "beehiiv", "levels",
    # Staffing / Analytics
    "harnham", "insightglobal", "roberthalf",
]

# ── LEVER COMPANIES ───────────────────────────────────────────────────────────
LEVER_COMPANIES = [
    # Healthcare
    "hsag", "strive", "headway", "modernhealth", "cityblock",
    "virta", "qualified-health-pbc", "interra", "wellth",
    "bighealth", "collaborative-drug-discovery", "teselagen",
    "midi-health", "clover-health", "omada", "included-health",
    # Biotech
    "insitro", "arc-institute", "formation-bio", "generate",
    "newlimit", "retro-biosciences", "gretel", "cradle",
    # AI / Data
    "scale-ai", "outlier-ai", "invisible-technologies", "surge-ai",
    "turing", "snorkel-ai", "cohere", "deepmind",
    # Tech
    "hex", "retool", "statsig", "mercury", "attio", "pave",
    "linear", "beehiiv", "ramp",
]

# ── ASHBY COMPANIES ───────────────────────────────────────────────────────────
ASHBY_COMPANIES = [
    "leavitt", "qualified-health-pbc", "quantilehealth",
    "relationrx", "commure", "akasa", "solace", "wellth",
    "formation-bio", "arc-institute", "newlimit", "cradle",
    "hex", "retool", "cursor", "harvey", "perplexity",
    "goody", "acorns", "levels", "clay", "attio", "pave",
    "statsig", "mercury", "workos", "beehiiv",
]

# ── REMOTIVE RSS ──────────────────────────────────────────────────────────────
REMOTIVE_CATEGORIES = [
    "https://remotive.com/api/remote-jobs?category=data&limit=100",
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=50",
    "https://remotive.com/api/remote-jobs?category=all-others&limit=50",
]

# ── JOBICY RSS ────────────────────────────────────────────────────────────────
JOBICY_URL = "https://jobicy.com/?feed=job_feed&job_categories=analyst,data,science&job_types=full-time,part-time&search_keywords=data+analyst"


def is_title_match(title):
    title_lower = title.lower()
    if any(kw in title_lower for kw in EXCLUDE_KEYWORDS):
        return False
    return any(kw in title_lower for kw in TITLE_KEYWORDS)


def is_remote(text):
    text_lower = text.lower()
    return any(kw in text_lower for kw in REMOTE_KEYWORDS)


def scan_greenhouse(company):
    jobs = []
    try:
        url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            for job in data.get("jobs", []):
                title = job.get("title", "")
                location = job.get("location", {}).get("name", "")
                job_url = job.get("absolute_url", "")
                if is_title_match(title) and is_remote(location + " " + title):
                    jobs.append({
                        "company": company.title(),
                        "title": title,
                        "location": location,
                        "url": job_url,
                        "source": "Greenhouse",
                    })
    except Exception:
        pass
    return jobs


def scan_lever(company):
    jobs = []
    try:
        url = f"https://api.lever.co/v0/postings/{company}?mode=json"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            for job in data:
                title = job.get("text", "")
                categories = job.get("categories", {})
                location = categories.get("location", "")
                commitment = categories.get("commitment", "")
                job_url = job.get("hostedUrl", "")
                if is_title_match(title) and is_remote(location + " " + commitment + " " + title):
                    jobs.append({
                        "company": company.replace("-", " ").title(),
                        "title": title,
                        "location": location,
                        "url": job_url,
                        "source": "Lever",
                    })
    except Exception:
        pass
    return jobs


def scan_ashby(company):
    jobs = []
    try:
        url = f"https://api.ashbyhq.com/posting-api/job-board/{company}"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            data = r.json()
            for job in data.get("jobPostings", []):
                title = job.get("title", "")
                location = job.get("locationName", "")
                is_remote_flag = job.get("isRemote", False)
                job_url = f"https://jobs.ashbyhq.com/{company}/{job.get('id', '')}"
                if is_title_match(title) and (is_remote_flag or is_remote(location)):
                    jobs.append({
                        "company": company.replace("-", " ").title(),
                        "title": title,
                        "location": location,
                        "url": job_url,
                        "source": "Ashby",
                    })
    except Exception:
        pass
    return jobs


def scan_remotive():
    jobs = []
    for url in REMOTIVE_CATEGORIES:
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                for job in data.get("jobs", []):
                    title = job.get("title", "")
                    company = job.get("company_name", "")
                    job_url = job.get("url", "")
                    if is_title_match(title):
                        jobs.append({
                            "company": company,
                            "title": title,
                            "location": "Remote",
                            "url": job_url,
                            "source": "Remotive",
                        })
        except Exception:
            pass
        time.sleep(1)
    return jobs


def scan_jobicy():
    jobs = []
    try:
        r = requests.get(JOBICY_URL, timeout=10)
        if r.status_code == 200:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(r.content)
            ns = {"job": "https://jobicy.com/"}
            for item in root.findall(".//item"):
                title_el = item.find("title")
                link_el = item.find("link")
                if title_el is not None and link_el is not None:
                    title = title_el.text or ""
                    link = link_el.text or ""
                    if is_title_match(title):
                        company_el = item.find("job:company", ns)
                        company = company_el.text if company_el is not None else "Unknown"
                        jobs.append({
                            "company": company,
                            "title": title,
                            "location": "Remote",
                            "url": link,
                            "source": "Jobicy",
                        })
    except Exception:
        pass
    return jobs


def write_output(all_jobs):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Deduplicate by URL
    seen = set()
    unique = []
    for job in all_jobs:
        if job["url"] not in seen:
            seen.add(job["url"])
            unique.append(job)

    # Group by source
    by_source = {}
    for job in unique:
        src = job["source"]
        by_source.setdefault(src, []).append(job)

    lines = [
        f"# Raw Job Scan — {now}",
        f"\n**Total matches: {len(unique)}** across {len(by_source)} sources",
        "\n> Review this list manually. Feed to AI scanner for scoring.\n",
        "---\n",
    ]

    for source, jobs in sorted(by_source.items()):
        lines.append(f"## {source} ({len(jobs)} matches)\n")
        lines.append("| Company | Role | Location | URL |")
        lines.append("|---------|------|----------|-----|")
        for job in jobs:
            url = job["url"]
            lines.append(f"| {job['company']} | {job['title']} | {job['location']} | {url} |")
        lines.append("")

    lines.append("---")
    lines.append("\n## Manual Search Targets\n")
    lines.append("These require manual browsing — copy search links and paste into browser:\n")
    manual = [
        ("LinkedIn", "https://www.linkedin.com/jobs/search/?keywords=healthcare+data+analyst&f_WT=2&f_E=1%2C2", "Healthcare Data Analyst, Remote, Entry"),
        ("LinkedIn", "https://www.linkedin.com/jobs/search/?keywords=clinical+data+analyst&f_WT=2&f_E=1%2C2", "Clinical Data Analyst, Remote, Entry"),
        ("LinkedIn", "https://www.linkedin.com/jobs/search/?keywords=business+intelligence+analyst+healthcare&f_WT=2&f_E=1%2C2", "BI Analyst Healthcare, Remote"),
        ("LinkedIn", "https://www.linkedin.com/jobs/search/?keywords=prior+authorization+analyst&f_WT=2&f_E=1%2C2", "Prior Auth Analyst, Remote"),
        ("USAJobs", "https://www.usajobs.gov/search?k=data+analyst&p=1&f=IM", "Federal Data Analyst, Remote"),
        ("USAJobs", "https://www.usajobs.gov/search?k=health+informatics&p=1&f=IM", "Health Informatics, Remote"),
        ("Indeed", "https://www.indeed.com/jobs?q=healthcare+data+analyst&l=Remote&explvl=entry_level", "Healthcare Data Analyst, Remote, Entry"),
        ("Indeed", "https://www.indeed.com/jobs?q=clinical+data+analyst&l=Remote", "Clinical Data Analyst, Remote"),
        ("Glassdoor", "https://www.glassdoor.com/Job/remote-healthcare-data-analyst-jobs-SRCH_IL.0,6_IS11047_KO7,30.htm", "Healthcare Data Analyst Remote"),
        ("Remotive", "https://remotive.com/remote-jobs/data/analyst", "Data Analyst Remote"),
        ("RemoteOK", "https://remoteok.com/remote-data+analyst-jobs", "Data Analyst Remote"),
        ("Jobicy", "https://jobicy.com/jobs/remote-data-analyst", "Data Analyst Remote"),
        ("The Muse", "https://www.themuse.com/jobs?filter=Data+%26+Analytics&filter=100%25+Remote", "Data Analytics Remote"),
        ("Wellfound", "https://wellfound.com/jobs?role=Data+Analyst&remote=true", "Data Analyst Remote Startups"),
        ("Dice", "https://www.dice.com/jobs?q=healthcare+data+analyst&location=Remote", "Healthcare Data Analyst Remote"),
    ]
    lines.append("| Source | Link | Search |")
    lines.append("|--------|------|--------|")
    for source, url, search in manual:
        lines.append(f"| {source} | {url} | {search} |")

    output = "\n".join(lines)
    
    try:
        Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Saved {len(unique)} jobs to {OUTPUT_FILE}")
    except Exception as e:
        print(f"Could not write to {OUTPUT_FILE}: {e}")
        backup = "raw_scan.md"
        with open(backup, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Saved to {backup} instead")

    return unique


def main():
    print(f"Starting free job scan — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    all_jobs = []

    print(f"Scanning {len(GREENHOUSE_COMPANIES)} Greenhouse companies...")
    for i, company in enumerate(GREENHOUSE_COMPANIES):
        jobs = scan_greenhouse(company)
        all_jobs.extend(jobs)
        if jobs:
            print(f"  {company}: {len(jobs)} match(es)")
        if i % 10 == 9:
            time.sleep(1)

    print(f"Scanning {len(LEVER_COMPANIES)} Lever companies...")
    for i, company in enumerate(LEVER_COMPANIES):
        jobs = scan_lever(company)
        all_jobs.extend(jobs)
        if jobs:
            print(f"  {company}: {len(jobs)} match(es)")
        if i % 10 == 9:
            time.sleep(1)

    print(f"Scanning {len(ASHBY_COMPANIES)} Ashby companies...")
    for i, company in enumerate(ASHBY_COMPANIES):
        jobs = scan_ashby(company)
        all_jobs.extend(jobs)
        if jobs:
            print(f"  {company}: {len(jobs)} match(es)")
        if i % 10 == 9:
            time.sleep(1)

    print("Scanning Remotive API...")
    remotive_jobs = scan_remotive()
    all_jobs.extend(remotive_jobs)
    print(f"  Remotive: {len(remotive_jobs)} match(es)")

    print("Scanning Jobicy feed...")
    jobicy_jobs = scan_jobicy()
    all_jobs.extend(jobicy_jobs)
    print(f"  Jobicy: {len(jobicy_jobs)} match(es)")

    unique = write_output(all_jobs)
    print(f"\nDone. {len(unique)} unique jobs found.")
    print(f"Review: {OUTPUT_FILE}")
    return len(unique)


if __name__ == "__main__":
    main()
