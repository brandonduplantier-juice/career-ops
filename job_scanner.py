"""
Free Job Scanner - No AI tokens required
- Hits public Greenhouse, Lever, Ashby APIs + Remotive + Jobicy
- Validates every URL (HEAD request, checks 200/301/302)
- Deduplicates against seen_jobs.json (only shows NEW jobs each day)
- Saves raw_scan.md for manual AI review
"""

import requests
import json
import datetime
import time
import hashlib
import re
from pathlib import Path
from xml.etree import ElementTree as ET

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(r"C:\Users\brand\career-ops")
OUTPUT_FILE = BASE_DIR / "data" / "raw_scan.md"
SEEN_FILE = BASE_DIR / "data" / "seen_jobs.json"
LOG_FILE = BASE_DIR / "data" / "scan_log.txt"

# ── KEYWORDS ──────────────────────────────────────────────────────────────────
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
    "informatics analyst", "pharmacy analyst", "claims analyst",
    "quality analyst", "outcomes analyst", "health economist",
]

EXCLUDE_TITLE = [
    "senior", "staff", "principal", "director", "vp ", "vice president",
    "manager", "head of", "lead ", "architect", "wet lab", "bench scientist",
    "laboratory", "chemist", "physician", "nurse", "surgeon",
]

REMOTE_KEYWORDS = [
    "remote", "work from home", "wfh", "distributed", "anywhere us",
    "virtual", "telecommute", "anywhere", "united states",
]

# ── COMPANY LISTS ─────────────────────────────────────────────────────────────
GREENHOUSE_COMPANIES = [
    # Healthcare Payers / Insurance
    "natera", "truveta", "freenome", "flatironhealth", "komodohealth",
    "headway", "modernhealth", "doximity", "cloverhealth", "omadahealth",
    "smarterdx", "oscarhealth", "springhealth66", "rxsense", "veracyte",
    "includedhealth", "cityblock", "vizai", "pathai", "verily",
    "talkiatry", "sondermind", "commure", "akasa", "ambiencehealthcare",
    "abridge", "welbehealth", "mcghealth", "sifthealthcare", "transcarent",
    "ansiblehealth", "quantilehealth", "healthverity", "midihealth",
    "virta", "machinifyinc", "precisionmedicinegroup", "cotiviti",
    "evolent", "insitro", "recursion", "benchling", "guardanthealth",
    "tempus", "sagebionetworks", "primemedicine", "pacbio",
    "exscientia", "owkin", "paige", "scale", "labelbox", "snorkelai",
    "anthropic", "openai", "cohere", "databricks", "hex-inc", "retool",
    "statsig", "apollo", "datavant", "segment", "gitlab", "cloudflare",
    "stripe", "ramp", "brex", "deel", "harnham", "insightglobal",
    "publicconsultinggroup", "10xgenomics", "illumina", "grail",
    "foundationmedicine", "adaptivebiotech", "premierinc",
    "strivehealthmanagement", "nomi-health", "privia",
    "paradigmbiopharma", "roivant", "schrodinger", "deepgenomics",
    "arcus", "novavax", "assemblybio", "envedabio", "vaxcyte",
    "pitchbookdata", "windfall", "openx", "perplexityai",
    "acorns", "goody", "tailscale",
    # Additional Healthcare
    "accolade", "carrotfertility", "hingehealth", "swordhealth",
    "noom", "premisehealth", "crossoverhealth", "collectivehealth",
    "brightspring", "aveanna", "bayada", "kindredhealthcare",
    "molina", "centene", "magellanhealth", "beaconhealthoptions",
    "valueoptions", "multiplan", "zelis", "change-healthcare",
    "experian-health", "inovalon", "healthstream", "healthgrades",
    "castlighthealth", "healtheon", "livanova", "nuvation",
    "tempus-ex-machina", "flatiron", "caris", "foundation-medicine",
    "guardant", "exact-sciences", "neogenomics", "myriad-genetics",
    "navisite", "nuvolo", "nuance", "nuancecommunications",
    "optum", "unitedhealthgroup", "aetna", "cigna", "humana",
    "anthem", "bcbs", "wellmark", "premera", "regence",
    # Analytics / BI Companies
    "tableau", "alteryx", "microstrategy", "qlik", "domo",
    "looker", "thoughtspot", "sisense", "yellowfinbi",
    "gooddata", "metabase", "mode", "sigma-computing",
    "montecarlo", "datafold", "atlan", "alation", "collibra",
    "informatica", "talend", "fivetran", "stitch", "airbyte",
    "dbtlabs", "astronomer", "prefect", "dagster",
    # CROs / Life Sciences Data
    "iqvia", "parexel", "ppd", "medpace", "covance",
    "syneos", "pra", "icon", "ergoresearch", "clinipace",
    "medrio", "medidata", "veeva", "oracle-health",
    "cerner", "epic", "allscripts", "athenahealth",
    "nextgen", "greenway", "eclinicalworks",
    # Staffing / Consulting
    "mckinsey", "boozallen", "leidos", "saic", "mitre",
    "icf", "mathematica", "urban-institute", "rand",
    "norc", "westat", "abt-associates",
]

LEVER_COMPANIES = [
    # Healthcare
    "hsag", "headway", "modernhealth", "cityblock", "virta",
    "bighealth", "teselagen", "clover-health", "omada",
    "included-health", "strive-health", "qualified-health-pbc",
    "interra-health", "wellth", "solace", "alignment-healthcare",
    "privia-health", "evolent-health", "devoted-health",
    "insitro", "arc-institute", "formation-bio", "generate-biomedicines",
    "newlimit", "retro-biosciences", "gretel", "cradle",
    "scale-ai", "outlier-ai", "invisible-technologies", "turing",
    "snorkel-ai", "surge-hq", "hex", "retool", "statsig", "mercury",
    "attio", "pave", "linear", "beehiiv", "ramp", "dbt-labs",
    "leavitt-group", "windfall-data", "harnham",
    "catch-health", "bright-health", "devoted-health",
    "collective-health", "accolade", "carebridge", "carrot-fertility",
    "hinge-health", "sword-health", "noom", "ro-health",
    "premise-health", "crossover-health", "apree-health",
    # Additional Health Tech
    "talkspace", "betterhelp", "cerebral", "brightside",
    "ginger", "lyra-health", "spring-health", "vida-health",
    "livongo", "teladoc", "mdlive", "amwell", "doctor-on-demand",
    "98point6", "forward", "one-medical", "carbon-health",
    "color-health", "everlywell", "letsgetchecked", "nurx",
    "thirty-madison", "keeps", "hims", "ro",
    # Pharma Data / RWE
    "flatiron-health", "aetion", "cerner-enviza", "genesis-research",
    "open-health", "purple-squirrel", "inovalon", "healthverity",
    "datavant", "veeva", "medidata", "iqvia", "parexel",
    # Analytics Staffing
    "harnham", "burtch-works", "insight-global", "robert-half",
    "apex-systems", "tek-systems", "kelly-services",
]

ASHBY_COMPANIES = [
    "leavitt", "qualified-health-pbc", "quantilehealth",
    "relationrx", "commure", "akasa", "solace", "wellth",
    "formation-bio", "arc-institute", "newlimit", "cradle",
    "hex", "retool", "cursor", "harvey", "perplexity",
    "goody", "acorns", "levels", "clay", "attio", "pave",
    "statsig", "mercury", "workos", "beehiiv", "apollographql",
    "catch-health", "strive", "interra-health",
    "hinge-health", "sword-health", "carrot-fertility",
    "noom", "ro", "premise-health", "crossover-health",
    "collectivehealth", "accolade",
    # Additional
    "talkspace", "cerebral", "brightside", "ginger",
    "lyra-health", "vida-health", "everlywell", "nurx",
    "thirty-madison", "carbon-health", "color-health",
    "forward-health", "one-medical", "98point6",
    "aetion", "genesis-research", "open-health",
    "purple-squirrel", "inovalon",
    "dbtlabs", "fivetran", "airbyte", "prefect",
    "dagster", "astronomer", "montecarlo", "datafold",
    "atlan", "alation", "collibra", "sigma-computing",
    "mode-analytics", "metabase", "thoughtspot",
]

REMOTIVE_URLS = [
    "https://remotive.com/api/remote-jobs?category=data&limit=150",
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=50",
    "https://remotive.com/api/remote-jobs?search=healthcare+analyst&limit=50",
    "https://remotive.com/api/remote-jobs?search=clinical+data&limit=50",
    "https://remotive.com/api/remote-jobs?search=bioinformatics&limit=50",
]

JOBICY_FEEDS = [
    "https://jobicy.com/?feed=job_feed&job_categories=analyst&job_types=full-time,part-time",
    "https://jobicy.com/?feed=job_feed&search_keywords=healthcare+data+analyst",
    "https://jobicy.com/?feed=job_feed&search_keywords=clinical+data+analyst",
    "https://jobicy.com/?feed=job_feed&search_keywords=bioinformatics",
]


def log(msg):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def job_id(job):
    """Stable hash of company+title+url for dedup."""
    key = f"{job['company'].lower()}|{job['title'].lower()}|{job['url']}"
    return hashlib.md5(key.encode()).hexdigest()


def load_seen():
    if SEEN_FILE.exists():
        try:
            return json.loads(SEEN_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_seen(seen):
    SEEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    SEEN_FILE.write_text(json.dumps(seen, indent=2), encoding="utf-8")


def is_title_match(title):
    t = title.lower()
    if any(kw in t for kw in EXCLUDE_TITLE):
        return False
    return any(kw in t for kw in TITLE_KEYWORDS)


def is_remote_text(text):
    t = text.lower()
    return any(kw in t for kw in REMOTE_KEYWORDS)


def validate_url(url, timeout=6):
    """Returns True if URL responds with 200/301/302/403."""
    if not url or not url.startswith("http"):
        return False
    try:
        r = requests.head(url, timeout=timeout, allow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0"})
        return r.status_code in (200, 301, 302, 403)
    except Exception:
        try:
            r = requests.get(url, timeout=timeout, allow_redirects=True,
                             headers={"User-Agent": "Mozilla/5.0"}, stream=True)
            return r.status_code in (200, 301, 302, 403)
        except Exception:
            return False


def scan_greenhouse(company):
    jobs = []
    try:
        r = requests.get(
            f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs",
            timeout=8)
        if r.status_code == 200:
            for job in r.json().get("jobs", []):
                title = job.get("title", "")
                location = job.get("location", {}).get("name", "")
                url = job.get("absolute_url", "")
                if is_title_match(title) and is_remote_text(location + " " + title):
                    jobs.append({"company": company.replace("-", " ").title(),
                                 "title": title, "location": location,
                                 "url": url, "source": "Greenhouse"})
    except Exception:
        pass
    return jobs


def scan_lever(company):
    jobs = []
    try:
        r = requests.get(
            f"https://api.lever.co/v0/postings/{company}?mode=json",
            timeout=8)
        if r.status_code == 200:
            for job in r.json():
                title = job.get("text", "")
                cats = job.get("categories", {})
                location = cats.get("location", "")
                commitment = cats.get("commitment", "")
                url = job.get("hostedUrl", "")
                if is_title_match(title) and is_remote_text(
                        location + " " + commitment + " " + title):
                    jobs.append({"company": company.replace("-", " ").title(),
                                 "title": title, "location": location,
                                 "url": url, "source": "Lever"})
    except Exception:
        pass
    return jobs


def scan_ashby(company):
    jobs = []
    try:
        r = requests.get(
            f"https://api.ashbyhq.com/posting-api/job-board/{company}",
            timeout=8)
        if r.status_code == 200:
            for job in r.json().get("jobPostings", []):
                title = job.get("title", "")
                location = job.get("locationName", "")
                is_rem = job.get("isRemote", False)
                url = f"https://jobs.ashbyhq.com/{company}/{job.get('id','')}"
                if is_title_match(title) and (is_rem or is_remote_text(location)):
                    jobs.append({"company": company.replace("-", " ").title(),
                                 "title": title, "location": location,
                                 "url": url, "source": "Ashby"})
    except Exception:
        pass
    return jobs


def scan_remotive():
    jobs = []
    seen_urls = set()
    for url in REMOTIVE_URLS:
        try:
            r = requests.get(url, timeout=12)
            if r.status_code == 200:
                for job in r.json().get("jobs", []):
                    title = job.get("title", "")
                    jurl = job.get("url", "")
                    if jurl in seen_urls:
                        continue
                    seen_urls.add(jurl)
                    if is_title_match(title):
                        jobs.append({
                            "company": job.get("company_name", "Unknown"),
                            "title": title, "location": "Remote",
                            "url": jurl, "source": "Remotive"})
        except Exception:
            pass
        time.sleep(1)
    return jobs


def scan_jobicy():
    jobs = []
    for feed_url in JOBICY_FEEDS:
        try:
            r = requests.get(feed_url, timeout=12)
            if r.status_code == 200:
                root = ET.fromstring(r.content)
                ns = {"job": "https://jobicy.com/"}
                for item in root.findall(".//item"):
                    title_el = item.find("title")
                    link_el = item.find("link")
                    if title_el is not None and link_el is not None:
                        title = title_el.text or ""
                        link = link_el.text or ""
                        if is_title_match(title):
                            co_el = item.find("job:company", ns)
                            company = co_el.text if co_el is not None else "Unknown"
                            jobs.append({"company": company, "title": title,
                                         "location": "Remote", "url": link,
                                         "source": "Jobicy"})
        except Exception:
            pass
        time.sleep(1)
    return jobs


def validate_batch(jobs):
    """Check all URLs — returns (valid_jobs, broken_count)."""
    log(f"Validating {len(jobs)} URLs...")
    valid = []
    broken = 0
    for i, job in enumerate(jobs):
        ok = validate_url(job["url"])
        if ok:
            valid.append(job)
        else:
            broken += 1
        if (i + 1) % 20 == 0:
            log(f"  Validated {i+1}/{len(jobs)}...")
        time.sleep(0.3)
    log(f"  Valid: {len(valid)} | Broken/expired: {broken}")
    return valid, broken


def filter_new(jobs, seen):
    """Return only jobs not seen before, update seen dict."""
    today = datetime.date.today().isoformat()
    new_jobs = []
    for job in jobs:
        jid = job_id(job)
        if jid not in seen:
            seen[jid] = {"first_seen": today, "title": job["title"],
                         "company": job["company"]}
            new_jobs.append(job)
    return new_jobs


def write_output(new_jobs, all_valid, broken_count, seen):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    total_seen = len(seen)

    by_source = {}
    for job in new_jobs:
        by_source.setdefault(job["source"], []).append(job)

    lines = [
        f"# Raw Job Scan — {now}",
        f"\n**NEW jobs today: {len(new_jobs)}** | "
        f"Valid URLs: {len(all_valid)} | "
        f"Broken/expired removed: {broken_count} | "
        f"Total in database: {total_seen}",
        "\n> Feed this file to Claude for AI scoring and prioritization.\n",
        "---\n",
    ]

    if not new_jobs:
        lines.append("## No new jobs found today\n")
        lines.append("All discovered jobs have been seen in previous scans.\n")
    else:
        for source, jobs in sorted(by_source.items()):
            lines.append(f"## {source} — {len(jobs)} new\n")
            lines.append("| Company | Role | Location | URL |")
            lines.append("|---------|------|----------|-----|")
            for job in jobs:
                lines.append(
                    f"| {job['company']} | {job['title']} "
                    f"| {job['location']} | {job['url']} |")
            lines.append("")

    lines += [
        "---\n",
        "## Manual Search Links\n",
        "These require browser — open each and scan for new roles:\n",
        "| Source | URL | Search |",
        "|--------|-----|--------|",
        "| LinkedIn | https://www.linkedin.com/jobs/search/?keywords=healthcare+data+analyst&f_WT=2&f_E=1%2C2 | Healthcare Data Analyst Remote Entry |",
        "| LinkedIn | https://www.linkedin.com/jobs/search/?keywords=clinical+data+analyst&f_WT=2&f_E=1%2C2 | Clinical Data Analyst Remote Entry |",
        "| LinkedIn | https://www.linkedin.com/jobs/search/?keywords=prior+authorization+analyst&f_WT=2&f_E=1%2C2 | Prior Auth Analyst Remote |",
        "| LinkedIn | https://www.linkedin.com/jobs/search/?keywords=business+intelligence+analyst+healthcare&f_WT=2 | BI Analyst Healthcare Remote |",
        "| LinkedIn | https://www.linkedin.com/jobs/search/?keywords=power+bi+healthcare+analyst&f_WT=2 | Power BI Healthcare Remote |",
        "| USAJobs | https://www.usajobs.gov/search?k=data+analyst&p=1&f=IM | Federal Data Analyst Remote |",
        "| USAJobs | https://www.usajobs.gov/search?k=health+informatics&p=1&f=IM | Health Informatics Remote |",
        "| USAJobs | https://www.usajobs.gov/search?k=bioinformatics&p=1&f=IM | Bioinformatics Remote |",
        "| Indeed | https://www.indeed.com/jobs?q=healthcare+data+analyst&l=Remote&explvl=entry_level | Healthcare Data Analyst Remote Entry |",
        "| Indeed | https://www.indeed.com/jobs?q=clinical+data+analyst+power+bi&l=Remote | Clinical Data Analyst Power BI |",
        "| Glassdoor | https://www.glassdoor.com/Job/remote-healthcare-data-analyst-jobs-SRCH_IL.0,6_IS11047_KO7,30.htm | Healthcare Data Analyst Remote |",
        "| RemoteOK | https://remoteok.com/remote-data+analyst-jobs | Data Analyst Remote |",
        "| Wellfound | https://wellfound.com/jobs?role=Data+Analyst&remote=true | Data Analyst Startups Remote |",
        "| The Muse | https://www.themuse.com/jobs?filter=Data+%26+Analytics&filter=100%25+Remote | Data Analytics Remote |",
        "| Dice | https://www.dice.com/jobs?q=healthcare+data+analyst&location=Remote | Healthcare Data Analyst Remote |",
        "| Jobright.ai | https://jobright.ai/jobs/Data-Analyst?remote=true | Data Analyst Remote |",
    ]

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    log(f"Saved to {OUTPUT_FILE}")



def scan_arbeitnow():
    jobs = []
    seen_urls = set()
    for page in range(1, 6):
        try:
            r = requests.get(f'https://www.arbeitnow.com/api/job-board-api?page={page}', timeout=12)
            if r.status_code != 200:
                break
            data = r.json().get('data', [])
            if not data:
                break
            for job in data:
                title = job.get('title', '')
                location = job.get('location', '')
                remote = job.get('remote', False)
                url = job.get('url', '')
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                if is_title_match(title) and (remote or is_remote(location + ' ' + title)):
                    jobs.append({'company': job.get('company_name', 'Unknown'), 'title': title, 'location': 'Remote' if remote else location, 'url': url, 'source': 'Arbeitnow'})
        except Exception:
            break
        time.sleep(0.5)
    return jobs

def scan_remoteok():
    jobs = []
    try:
        r = requests.get('https://remoteok.com/api', timeout=12, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            for job in r.json():
                if not isinstance(job, dict):
                    continue
                title = job.get('position', '')
                url = job.get('url', '')
                if not url.startswith('http'):
                    url = 'https://remoteok.com' + url
                if is_title_match(title):
                    jobs.append({'company': job.get('company', 'Unknown'), 'title': title, 'location': 'Remote', 'url': url, 'source': 'RemoteOK'})
    except Exception:
        pass
    return jobs

def main():
    start = datetime.datetime.now()
    log(f"=== Free Job Scanner starting {start.strftime('%Y-%m-%d %H:%M')} ===")

    seen = load_seen()
    log(f"Known jobs in database: {len(seen)}")

    all_jobs = []

    print('Scanning Arbeitnow...')
    arb = scan_arbeitnow()
    print(f'  Arbeitnow: {len(arb)} matches')
    all_jobs.extend(arb)
    print('Scanning RemoteOK...')
    rok = scan_remoteok()
    print(f'  RemoteOK: {len(rok)} matches')
    all_jobs.extend(rok)

    log(f"Scanning {len(GREENHOUSE_COMPANIES)} Greenhouse boards...")
    for i, co in enumerate(GREENHOUSE_COMPANIES):
        found = scan_greenhouse(co)
        if found:
            log(f"  {co}: {len(found)} match(es)")
        all_jobs.extend(found)
        if i % 15 == 14:
            time.sleep(1)

    log(f"Scanning {len(LEVER_COMPANIES)} Lever boards...")
    for i, co in enumerate(LEVER_COMPANIES):
        found = scan_lever(co)
        if found:
            log(f"  {co}: {len(found)} match(es)")
        all_jobs.extend(found)
        if i % 15 == 14:
            time.sleep(1)

    log(f"Scanning {len(ASHBY_COMPANIES)} Ashby boards...")
    for i, co in enumerate(ASHBY_COMPANIES):
        found = scan_ashby(co)
        if found:
            log(f"  {co}: {len(found)} match(es)")
        all_jobs.extend(found)
        if i % 15 == 14:
            time.sleep(1)

    log("Scanning Remotive API...")
    rem = scan_remotive()
    log(f"  Remotive: {len(rem)} match(es)")
    all_jobs.extend(rem)

    log("Scanning Jobicy feeds...")
    job = scan_jobicy()
    log(f"  Jobicy: {len(job)} match(es)")
    all_jobs.extend(job)

    # Deduplicate by URL before validation
    url_seen = set()
    deduped = []
    for j in all_jobs:
        if j["url"] not in url_seen:
            url_seen.add(j["url"])
            deduped.append(j)
    log(f"Total after URL dedup: {len(deduped)}")

    # Validate URLs
    valid_jobs, broken_count = validate_batch(deduped)

    # Filter to only new jobs
    new_jobs = filter_new(valid_jobs, seen)
    log(f"New jobs (not seen before): {len(new_jobs)}")

    # Save seen database
    save_seen(seen)

    # Write output
    write_output(new_jobs, valid_jobs, broken_count, seen)

    elapsed = (datetime.datetime.now() - start).seconds
    log(f"=== Done in {elapsed}s | {len(new_jobs)} new | {broken_count} broken removed ===")


if __name__ == "__main__":
    main()
