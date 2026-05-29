"""
LinkedIn Guest API Scraper - No login required
Uses LinkedIn's public jobs-guest endpoint
No Playwright, no account risk, completely free
"""

import requests
import time
import random
import json
import hashlib
import datetime
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(r"C:\Users\brand\career-ops")
OUTPUT_FILE = BASE_DIR / "data" / "linkedin_jobs.md"
SEEN_FILE = BASE_DIR / "data" / "seen_jobs.json"

SEARCHES = [
    "healthcare data analyst",
    "clinical data analyst",
    "business intelligence analyst",
    "prior authorization analyst",
    "revenue cycle analyst",
    "health informatics analyst",
    "power bi analyst",
    "data analyst healthcare",
    "bioinformatics analyst",
    "population health analyst",
    "health data analyst remote",
    "clinical analytics remote",
]

EXCLUDE_TITLE_WORDS = [
    "abstractor", "registrar", "senior ", "staff ", "principal",
    "director", "manager", "head of", "lead ", "architect",
    "secretary", "assistant", "coordinator", "technician",
    "wet lab", "bench", "chemist", "physician", "nurse",
    "surgeon", "accountant", "recruiter", "sales ",
]

ONSITE_CITIES = [
    "new york, ny", "new york, new york", "san francisco, ca",
    "san francisco, california", "boston, ma", "boston, massachusetts",
    "seattle, wa", "chicago, il", "austin, tx", "los angeles, ca",
    "denver, co", "cambridge, ma", "south san francisco",
    "menlo park", "palo alto", "princeton, nj", "washington, dc",
    "philadelphia, pa", "nashville, tn", "atlanta, ga",
    "dallas, tx", "houston, tx", "minneapolis", "fremont, ca",
    "durham, nc", "cary, nc", "nashua, nh", "albuquerque, nm",
    "salina, ks", "peoria, az", "cincinnati", "new york, united states",
    "toronto, oh", "grand rapids, mi", "salt lake city, ut", "tucson, az",
    "troy, mi", "livonia, mi", "marietta, oh", "maryland heights, mo",
    "american fork, ut", "honolulu, hi", "louisville, ky",
    "alberta, united", "florida, united", "colorado, united",
    "california, united", "alabama, united", "ohio, united",
    "michigan, united", "georgia, united", "texas, united",
    "new jersey, united", "virginia, united", "tennessee, united",
]

HEADERS_LIST = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
]


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


def job_id(job):
    key = f"{job['company'].lower()}|{job['title'].lower()}|{job['url']}"
    return hashlib.md5(key.encode()).hexdigest()


def is_onsite(location):
    loc = location.lower()
    return any(city in loc for city in ONSITE_CITIES)


def scrape_linkedin_guest(query, pages=2):
    jobs = []
    seen_urls = set()

    for page in range(pages):
        start = page * 25
        url = (
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
            f"?keywords={requests.utils.quote(query)}"
            "&location=United+States"
            "&f_WT=2"
            "&f_E=1%2C2"
            f"&start={start}"
        )

        headers = {
            "User-Agent": random.choice(HEADERS_LIST),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.linkedin.com/jobs/search/",
        }

        try:
            r = requests.get(url, headers=headers, timeout=15)
            if r.status_code != 200:
                print(f"  [{query}] page {page+1}: status {r.status_code}")
                break

            soup = BeautifulSoup(r.text, "html.parser")
            cards = soup.find_all("li")

            if not cards:
                break

            for card in cards:
                try:
                    title_el = card.find("h3", class_="base-search-card__title")
                    company_el = card.find("h4", class_="base-search-card__subtitle")
                    location_el = card.find("span", class_="job-search-card__location")
                    link_el = card.find("a", class_="base-card__full-link")

                    if not title_el or not link_el:
                        continue

                    title = title_el.get_text(strip=True)
                    company = company_el.get_text(strip=True) if company_el else "Unknown"
                    location = location_el.get_text(strip=True) if location_el else ""
                    job_url = link_el.get("href", "").split("?")[0]

                    if job_url in seen_urls:
                        continue
                    seen_urls.add(job_url)

                    # Skip excluded titles
                    if any(ex in title.lower() for ex in EXCLUDE_TITLE_WORDS):
                        continue

                    # Skip clearly onsite locations
                    if is_onsite(location):
                        continue

                    if job_url and title:
                        jobs.append({
                            "company": company,
                            "title": title,
                            "location": location,
                            "url": job_url,
                            "source": "LinkedIn",
                        })
                except Exception:
                    continue

        except Exception as e:
            print(f"  [{query}] error: {e}")
            break

        time.sleep(random.uniform(3, 6))

    return jobs


def main():
    seen = load_seen()
    print(f"Starting LinkedIn guest scan — {datetime.datetime.now().strftime('%H:%M')}")
    print(f"Known jobs in database: {len(seen)}")

    all_jobs = []

    for query in SEARCHES:
        jobs = scrape_linkedin_guest(query, pages=2)
        print(f"  {query}: {len(jobs)} jobs")
        all_jobs.extend(jobs)
        time.sleep(random.uniform(5, 10))

    # Deduplicate by URL and by company+title (removes state-per-listing spam)
    url_seen = set()
    title_seen = set()
    deduped = []
    for j in all_jobs:
        url_key = j["url"]
        title_key = f"{j['company'].lower()}|{j['title'].lower()}"
        if url_key not in url_seen and title_key not in title_seen:
            url_seen.add(url_key)
            title_seen.add(title_key)
            deduped.append(j)

    print(f"Total unique after dedup: {len(deduped)}")

    # Filter new only
    new_jobs = []
    for job in deduped:
        jid = job_id(job)
        if jid not in seen:
            seen[jid] = {
                "first_seen": datetime.date.today().isoformat(),
                "title": job["title"],
                "company": job["company"],
            }
            new_jobs.append(job)

    save_seen(seen)

    # Write output
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# LinkedIn Job Scan — {now}",
        "",
        f"**NEW jobs: {len(new_jobs)}** | Total in database: {len(seen)}",
        "",
        "---",
        "",
        "| Company | Role | Location | URL |",
        "|---------|------|----------|-----|",
    ]
    for job in new_jobs:
        lines.append(
            f"| {job['company']} | {job['title']} | {job['location']} | {job['url']} |"
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nDone. {len(new_jobs)} new LinkedIn jobs saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
