// lib/aggregators.mjs
// Fetches and normalizes job postings from aggregator APIs.
// Sources: Remotive, Adzuna, USAJobs, Jobicy, Himalayas, Arbeitnow,
//          We Work Remotely (RSS), RemoteOK (JSON), Working Nomads (JSON).
// Returns a flat array of normalized job objects matching the shape from lib/source.mjs.

import { createHash } from 'crypto';

const FETCH_TIMEOUT_MS = 15_000;

// Strip HTML tags and decode common entities
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Compute md5 hash of "company:title" (both lowercased and trimmed)
function makeHash(company, title) {
  const key = `${company.toLowerCase().trim()}:${title.toLowerCase().trim()}`;
  return createHash('md5').update(key).digest('hex');
}

// Fetch with a fixed timeout; throws on network error or abort
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Location allowlist for Remotive
// ---------------------------------------------------------------------------
const RE_LOCATION_KEEP = /worldwide|anywhere|global|north america|americas|\busa\b|united states|^\s*$|\bus\b|\bus,|\(us\)/i;

function keepRemotiveLocation(locationStr) {
  return RE_LOCATION_KEEP.test(locationStr || '');
}

// ---------------------------------------------------------------------------
// Title filter for analyst roles (used by sources that return broad results)
// ---------------------------------------------------------------------------
const ANALYST_TITLE_RE = /\b(data|business|operations|bi|analytics|reporting|insights|healthcare|health)\b.*\banalyst\b|\banalyst\b.*\b(data|bi|business|reporting|analytics|insights)\b/i;

function isAnalystTitle(title) {
  return ANALYST_TITLE_RE.test(title || '');
}

// Location allowlist for sources that may include non-US roles
const RE_US_LOCATION = /worldwide|anywhere|global|north america|americas|\busa\b|united states|\bus\b|\bus,|\(us\)|^\s*$/i;

function keepUSLocation(loc) {
  return RE_US_LOCATION.test(loc || '');
}

// ---------------------------------------------------------------------------
// Source: Remotive
// ---------------------------------------------------------------------------
async function fetchRemotive() {
  const url = 'https://remotive.com/api/remote-jobs?search=analyst';
  let data;
  try {
    const res = await fetchWithTimeout(url);
    console.log(`[aggregators] Remotive: HTTP ${res.status}`);
    if (!res.ok) {
      console.warn(`[aggregators] Remotive: HTTP ${res.status} - skipping`);
      return [];
    }
    data = await res.json();
  } catch (err) {
    console.warn(`[aggregators] Remotive: fetch error - ${err.message}`);
    return [];
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  console.log(`[aggregators] Remotive: ${jobs.length} raw results`);
  const kept = [];

  for (const job of jobs) {
    const location = job.candidate_required_location || '';
    if (!keepRemotiveLocation(location)) continue;

    const company = (job.company_name || '').trim();
    const title   = (job.title || '').trim();
    const jdHtml  = job.description || '';

    kept.push({
      id:             `remotive-${job.id}`,
      company,
      title,
      location,
      url:            job.url || '',
      jd_html:        jdHtml,
      jd_text:        stripHtml(jdHtml),
      is_remote:      true,
      published_date: (job.publication_date || '').slice(0, 10),
      ats:            'remotive',
      token:          '',
      employer_size:  'not listed',
      hash:           makeHash(company, title),
    });
  }

  console.log(`[aggregators] Remotive: kept ${kept.length} after location filter`);
  return kept;
}

// ---------------------------------------------------------------------------
// Source: Adzuna
// ---------------------------------------------------------------------------
const ADZUNA_KEYWORDS = [
  'data analyst',
  'business intelligence analyst',
  'healthcare data analyst',
  'reporting analyst',
  'analytics analyst',
  'data reporting analyst',
  'business analyst',
  'operations analyst',
  'insights analyst',
];
const ADZUNA_PAGES = 5;

async function fetchAdzuna() {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.log('[aggregators] Adzuna: skipping - ADZUNA_APP_ID and ADZUNA_APP_KEY not set');
    return [];
  }

  const seenIds = new Set();
  const all = [];

  for (const kw of ADZUNA_KEYWORDS) {
    for (let page = 1; page <= ADZUNA_PAGES; page++) {
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/${page}` +
        `?app_id=${encodeURIComponent(appId)}` +
        `&app_key=${encodeURIComponent(appKey)}` +
        `&results_per_page=50` +
        `&what=${encodeURIComponent(kw)}` +
        `&max_days_old=14` +
        `&content-type=application/json`;

      let data;
      try {
        const res = await fetchWithTimeout(url);
        console.log(`[aggregators] Adzuna "${kw}" page ${page}: HTTP ${res.status}`);
        if (!res.ok) {
          console.warn(`[aggregators] Adzuna: HTTP ${res.status} for "${kw}" p${page} - skipping`);
          continue;
        }
        data = await res.json();
      } catch (err) {
        console.warn(`[aggregators] Adzuna: fetch error for "${kw}" p${page} - ${err.message}`);
        continue;
      }

      const results = Array.isArray(data.results) ? data.results : [];
      console.log(`[aggregators] Adzuna "${kw}" page ${page}: ${results.length} raw results`);

      for (const result of results) {
        const id = result.id;
        if (!id || seenIds.has(String(id))) continue;
        seenIds.add(String(id));

        const company  = (result.company?.display_name || '').trim();
        const title    = (result.title || '').trim();
        const location = (result.location?.display_name || '').trim();
        const desc     = result.description || '';

        const isRemote = /remote/i.test(title) || /remote/i.test(desc);

        all.push({
          id:             `adzuna-${id}`,
          company,
          title,
          location,
          url:            result.redirect_url || '',
          jd_html:        '',
          jd_text:        stripHtml(desc),
          is_remote:      isRemote,
          published_date: (result.created || '').slice(0, 10),
          ats:            'adzuna',
          token:          '',
          employer_size:  'not listed',
          hash:           makeHash(company, title),
        });
      }
    }
  }

  console.log(
    `[aggregators] Adzuna: ${all.length} unique roles` +
    ` (${ADZUNA_KEYWORDS.length} keywords x ${ADZUNA_PAGES} pages)`
  );
  return all;
}

// ---------------------------------------------------------------------------
// Source: USAJobs
// ---------------------------------------------------------------------------
const USAJOBS_KEYWORDS = [
  'data analyst',
  'business intelligence analyst',
  'healthcare data analyst',
  'reporting analyst',
  'analytics analyst',
  'data reporting analyst',
  'business analyst',
  'operations analyst',
  'insights analyst',
];

async function fetchUSAJobs() {
  const apiKey = process.env.USAJOBS_API_KEY;
  const email  = process.env.USAJOBS_EMAIL;

  if (!apiKey || !email) {
    console.log('[aggregators] USAJobs: skipping - USAJOBS_API_KEY and USAJOBS_EMAIL not set');
    return [];
  }

  const seenIds = new Set();
  const all = [];

  for (const kw of USAJOBS_KEYWORDS) {
    const url =
      'https://data.usajobs.gov/api/search' +
      `?Keyword=${encodeURIComponent(kw)}` +
      '&ResultsPerPage=50';

    let data;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'Host':              'data.usajobs.gov',
          'User-Agent':        email,
          'Authorization-Key': apiKey,
        },
      });
      console.log(`[aggregators] USAJobs "${kw}": HTTP ${res.status}`);
      if (!res.ok) {
        console.warn(`[aggregators] USAJobs: HTTP ${res.status} for "${kw}" - skipping`);
        continue;
      }
      const text = await res.text();
      if (text.trimStart().startsWith('<')) {
        console.warn(`[aggregators] USAJobs: HTML response for "${kw}" - verify Host, User-Agent, Authorization-Key headers`);
        continue;
      }
      data = JSON.parse(text);
    } catch (err) {
      console.warn(`[aggregators] USAJobs: fetch error for "${kw}" - ${err.message}`);
      continue;
    }

    const items = data?.SearchResult?.SearchResultItems || [];
    console.log(`[aggregators] USAJobs "${kw}": ${items.length} raw results`);

    for (const item of items) {
      const d = item.MatchedObjectDescriptor || {};
      const id = d.PositionID || d.PositionURI || '';
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const company  = (d.OrganizationName || '').trim();
      const title    = (d.PositionTitle || '').trim();
      const location = (d.PositionLocationDisplay || '').trim();

      const qualSummary = d.QualificationSummary || '';
      const majorDuties = d.UserArea?.Details?.MajorDuties?.[0] || '';
      const jdText      = [qualSummary, majorDuties].filter(Boolean).join(' ').trim();

      const remoteFlag = d.UserArea?.Details?.RemoteIndicator;
      const isRemote   = remoteFlag === true || remoteFlag === 'Yes' || /remote/i.test(location);

      all.push({
        id:             `usajobs-${id}`,
        company,
        title,
        location,
        url:            d.PositionURI || '',
        jd_html:        '',
        jd_text:        jdText,
        is_remote:      isRemote,
        published_date: (d.PublicationStartDate || '').slice(0, 10),
        ats:            'usajobs',
        token:          '',
        employer_size:  'not listed',
        hash:           makeHash(company, title),
      });
    }
  }

  console.log(
    `[aggregators] USAJobs: ${all.length} unique roles across ${USAJOBS_KEYWORDS.length} keywords`
  );
  return all;
}

// ---------------------------------------------------------------------------
// Source: Jobicy
// ---------------------------------------------------------------------------
async function fetchJobicy() {
  const seenIds = new Set();
  const all = [];

  for (const kw of ADZUNA_KEYWORDS) {
    const url =
      `https://jobicy.com/api/v2/remote-jobs?count=100&geo=usa&tag=${encodeURIComponent(kw)}`;

    let data;
    try {
      const res = await fetchWithTimeout(url);
      console.log(`[aggregators] Jobicy "${kw}": HTTP ${res.status}`);
      if (!res.ok) {
        console.warn(`[aggregators] Jobicy: HTTP ${res.status} for "${kw}" - skipping`);
        continue;
      }
      data = await res.json();
    } catch (err) {
      console.warn(`[aggregators] Jobicy: fetch error for "${kw}" - ${err.message}`);
      continue;
    }

    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    console.log(`[aggregators] Jobicy "${kw}": ${jobs.length} raw results`);

    for (const job of jobs) {
      const id = String(job.id || '');
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const company = (job.companyName || '').trim();
      const title   = (job.jobTitle || '').trim();

      all.push({
        id:             `jobicy-${id}`,
        company,
        title,
        location:       job.jobGeo || 'Worldwide',
        url:            job.url || '',
        jd_html:        job.jobDescription || '',
        jd_text:        stripHtml(job.jobDescription || ''),
        is_remote:      true,
        published_date: (job.pubDate || '').slice(0, 10),
        ats:            'jobicy',
        token:          '',
        employer_size:  'not listed',
        hash:           makeHash(company, title),
      });
    }
  }

  console.log(
    `[aggregators] Jobicy: ${all.length} unique roles across ${ADZUNA_KEYWORDS.length} keywords`
  );
  return all;
}

// ---------------------------------------------------------------------------
// Source: Himalayas
// ---------------------------------------------------------------------------
const HIMALAYAS_MAX     = 200;
const HIMALAYAS_MAX_RAW = 2000; // hard page cap: stop after 2000 raw fetches regardless of kept count

function keepHimalayasLocation(locationRestrictions) {
  if (!Array.isArray(locationRestrictions) || locationRestrictions.length === 0) return true;
  return locationRestrictions.some(loc => loc.alpha2 === 'US');
}

async function fetchHimalayas() {
  const seenIds = new Set();
  const all = [];
  let offset = 0;
  let rawFetched = 0;

  while (all.length < HIMALAYAS_MAX && rawFetched < HIMALAYAS_MAX_RAW) {
    const url = `https://himalayas.app/jobs/api?limit=20&offset=${offset}`;

    let data;
    try {
      const res = await fetchWithTimeout(url);
      console.log(`[aggregators] Himalayas offset=${offset}: HTTP ${res.status}`);
      if (!res.ok) {
        console.warn(`[aggregators] Himalayas: HTTP ${res.status} at offset ${offset} - stopping`);
        break;
      }
      data = await res.json();
    } catch (err) {
      console.warn(`[aggregators] Himalayas: fetch error at offset ${offset} - ${err.message}`);
      break;
    }

    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    console.log(`[aggregators] Himalayas offset=${offset}: ${jobs.length} raw results`);
    if (jobs.length === 0) break;
    rawFetched += jobs.length;

    for (const job of jobs) {
      const id = job.guid || '';
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      if (!keepHimalayasLocation(job.locationRestrictions)) continue;

      const company = (job.companyName || '').trim();
      const title   = (job.title || '').trim();

      all.push({
        id:             `himalayas-${id}`,
        company,
        title,
        location:       'Remote',
        url:            job.applicationLink || '',
        jd_html:        job.description || '',
        jd_text:        stripHtml(job.description || ''),
        is_remote:      true,
        published_date: typeof job.pubDate === 'number'
          ? new Date(job.pubDate * 1000).toISOString().slice(0, 10)
          : (job.pubDate || '').slice(0, 10),
        ats:            'himalayas',
        token:          '',
        employer_size:  'not listed',
        hash:           makeHash(company, title),
      });
    }

    const totalCount = data.totalCount || 0;
    offset += 20;
    if (totalCount > 0 && offset >= totalCount) break;
  }

  console.log(`[aggregators] Himalayas: ${all.length} roles kept (US or worldwide)`);
  return all;
}

// ---------------------------------------------------------------------------
// Source: Arbeitnow
// ---------------------------------------------------------------------------
async function fetchArbeitnow() {
  const url = 'https://www.arbeitnow.com/api/job-board-api';

  let data;
  try {
    const res = await fetchWithTimeout(url);
    console.log(`[aggregators] Arbeitnow: HTTP ${res.status}`);
    if (!res.ok) {
      console.warn(`[aggregators] Arbeitnow: HTTP ${res.status} - skipping`);
      return [];
    }
    data = await res.json();
  } catch (err) {
    console.warn(`[aggregators] Arbeitnow: fetch error - ${err.message}`);
    return [];
  }

  const jobs = Array.isArray(data.data) ? data.data : [];
  console.log(`[aggregators] Arbeitnow: ${jobs.length} raw results`);

  const kept = [];
  for (const job of jobs) {
    if (!job.remote) continue;

    const company = (job.company_name || '').trim();
    const title   = (job.title || '').trim();
    const ts      = typeof job.created_at === 'number' ? job.created_at : 0;

    kept.push({
      id:             `arbeitnow-${job.slug || makeHash(company, title)}`,
      company,
      title,
      location:       job.location || 'Remote',
      url:            job.url || '',
      jd_html:        job.description || '',
      jd_text:        stripHtml(job.description || ''),
      is_remote:      true,
      published_date: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '',
      ats:            'arbeitnow',
      token:          '',
      employer_size:  'not listed',
      hash:           makeHash(company, title),
    });
  }

  console.log(`[aggregators] Arbeitnow: ${kept.length} remote roles after filter`);
  return kept;
}

// ---------------------------------------------------------------------------
// Source: We Work Remotely (RSS XML)
// Title format in RSS: "Company: Job Title"
// ---------------------------------------------------------------------------
async function fetchWeWorkRemotely() {
  const url = 'https://weworkremotely.com/categories/remote-data-analytics-jobs.rss';

  let text;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops/3.0)' },
      redirect: 'follow',
    });
    console.log(`[aggregators] WeWorkRemotely: HTTP ${res.status}`);
    if (!res.ok) {
      console.warn(`[aggregators] WeWorkRemotely: HTTP ${res.status} - skipping`);
      return [];
    }
    text = await res.text();
  } catch (err) {
    console.warn(`[aggregators] WeWorkRemotely: fetch error - ${err.message}`);
    return [];
  }

  // Parse RSS items with regex (no XML parser dependency)
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(text)) !== null) {
    items.push(m[1]);
  }
  console.log(`[aggregators] WeWorkRemotely: ${items.length} raw RSS items`);

  const kept = [];
  for (const item of items) {
    const titleMatch    = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i.exec(item);
    const linkMatch     = /<link>([\s\S]*?)<\/link>/i.exec(item);
    const descMatch     = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i.exec(item);
    const regionMatch   = /<region><!\[CDATA\[([\s\S]*?)\]\]><\/region>|<region>([\s\S]*?)<\/region>/i.exec(item);
    const pubDateMatch  = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(item);

    const rawTitle  = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link      = (linkMatch?.[1] || '').trim();
    const descHtml  = (descMatch?.[1] || descMatch?.[2] || '').trim();
    const region    = (regionMatch?.[1] || regionMatch?.[2] || '').trim();
    const pubDate   = (pubDateMatch?.[1] || '').trim();

    // Filter: keep US or worldwide
    if (region && !/worldwide|usa|united states|anywhere|\bus\b/i.test(region)) continue;

    // Title format: "Company: Job Title"
    const colonIdx = rawTitle.indexOf(': ');
    let company, title;
    if (colonIdx > 0) {
      company = rawTitle.slice(0, colonIdx).trim();
      title   = rawTitle.slice(colonIdx + 2).trim();
    } else {
      company = '';
      title   = rawTitle;
    }

    // Filter to analyst titles
    if (!isAnalystTitle(title)) continue;

    if (!company || !title) continue;

    // Parse date
    let dateStr = '';
    if (pubDate) {
      try {
        dateStr = new Date(pubDate).toISOString().slice(0, 10);
      } catch {
        dateStr = '';
      }
    }

    kept.push({
      id:             `wwr-${makeHash(company, title)}`,
      company,
      title,
      location:       region || 'Worldwide',
      url:            link || '',
      jd_html:        descHtml,
      jd_text:        stripHtml(descHtml),
      is_remote:      true,
      published_date: dateStr,
      ats:            'weworkremotely',
      token:          '',
      employer_size:  'not listed',
      hash:           makeHash(company, title),
    });
  }

  console.log(`[aggregators] WeWorkRemotely: ${kept.length} analyst roles kept after filter`);
  return kept;
}

// ---------------------------------------------------------------------------
// Source: RemoteOK (JSON API)
// First element is metadata, skip it.
// ---------------------------------------------------------------------------
async function fetchRemoteOK() {
  const url = 'https://remoteok.com/api?tags=analyst';

  let data;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'career-ops/3.0' },
    });
    console.log(`[aggregators] RemoteOK: HTTP ${res.status}`);
    if (!res.ok) {
      console.warn(`[aggregators] RemoteOK: HTTP ${res.status} - skipping`);
      return [];
    }
    data = await res.json();
  } catch (err) {
    console.warn(`[aggregators] RemoteOK: fetch error - ${err.message}`);
    return [];
  }

  if (!Array.isArray(data)) {
    console.warn('[aggregators] RemoteOK: unexpected response format - skipping');
    return [];
  }

  // First element is metadata
  const jobs = data.slice(1);
  console.log(`[aggregators] RemoteOK: ${jobs.length} raw results`);

  const kept = [];
  const seenIds = new Set();

  for (const job of jobs) {
    const id = String(job.id || job.slug || '');
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const location = (job.location || '').trim();

    // Keep worldwide, US, or empty/null location
    if (location && !/worldwide|usa|united states|\bus\b|\bus,|anywhere/i.test(location)) continue;

    const company = (job.company || '').trim();
    const title   = (job.position || '').trim();

    // Filter to analyst titles
    if (!isAnalystTitle(title)) continue;

    if (!company || !title) continue;

    const descHtml = job.description || '';

    // Parse date: job.date is epoch seconds or ISO string
    let dateStr = '';
    if (job.date) {
      try {
        const d = typeof job.date === 'number'
          ? new Date(job.date * 1000)
          : new Date(job.date);
        dateStr = d.toISOString().slice(0, 10);
      } catch {
        dateStr = '';
      }
    }

    const applyUrl = job.apply_url || job.url || '';

    kept.push({
      id:             `remoteok-${id}`,
      company,
      title,
      location:       location || 'Worldwide',
      url:            applyUrl,
      jd_html:        descHtml,
      jd_text:        stripHtml(descHtml),
      is_remote:      true,
      published_date: dateStr,
      ats:            'remoteok',
      token:          '',
      employer_size:  'not listed',
      hash:           makeHash(company, title),
    });
  }

  console.log(`[aggregators] RemoteOK: ${kept.length} analyst roles kept after filter`);
  return kept;
}

// ---------------------------------------------------------------------------
// Source: Working Nomads (JSON API)
// Two categories: data and it
// ---------------------------------------------------------------------------
async function fetchWorkingNomads() {
  const categories = ['data', 'it'];
  const seenIds = new Set();
  const all = [];

  for (const cat of categories) {
    const url = `https://www.workingnomads.com/api/exposed_jobs/?category=${cat}`;

    let data;
    try {
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'career-ops/3.0' },
      });
      console.log(`[aggregators] WorkingNomads category=${cat}: HTTP ${res.status}`);
      if (!res.ok) {
        console.warn(`[aggregators] WorkingNomads: HTTP ${res.status} for category=${cat} - skipping`);
        continue;
      }
      data = await res.json();
    } catch (err) {
      console.warn(`[aggregators] WorkingNomads: fetch error for category=${cat} - ${err.message}`);
      continue;
    }

    const jobs = Array.isArray(data) ? data : [];
    console.log(`[aggregators] WorkingNomads category=${cat}: ${jobs.length} raw results`);

    for (const job of jobs) {
      const id = String(job.id || '');
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      // Location filter: keep Anywhere, US, or empty/null
      const location = (job.location || '').trim();
      if (location && !/anywhere|usa|united states|\bus\b|worldwide/i.test(location)) continue;

      const company = (job.company_name || '').trim();
      const title   = (job.title || '').trim();

      if (!company || !title) continue;

      const descHtml = job.description || '';

      // Parse date
      let dateStr = '';
      if (job.pub_date) {
        try {
          dateStr = new Date(job.pub_date).toISOString().slice(0, 10);
        } catch {
          dateStr = '';
        }
      }

      all.push({
        id:             `workingnomads-${id}`,
        company,
        title,
        location:       location || 'Anywhere',
        url:            job.url || '',
        jd_html:        descHtml,
        jd_text:        stripHtml(descHtml),
        is_remote:      true,
        published_date: dateStr,
        ats:            'workingnomads',
        token:          '',
        employer_size:  'not listed',
        hash:           makeHash(company, title),
      });
    }
  }

  console.log(
    `[aggregators] WorkingNomads: ${all.length} analyst roles kept across ${categories.length} categories`
  );
  return all;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function fetchAggregated() {
  const [remRes, adRes, usRes, jcRes, hmRes, anRes, wwrRes, rokRes, wnRes] =
    await Promise.allSettled([
      fetchRemotive(),
      fetchAdzuna(),
      fetchUSAJobs(),
      fetchJobicy(),
      fetchHimalayas(),
      fetchArbeitnow(),
      fetchWeWorkRemotely(),
      fetchRemoteOK(),
      fetchWorkingNomads(),
    ]);

  const remotiveJobs     = remRes.status === 'fulfilled' ? remRes.value : [];
  const adzunaJobs       = adRes.status  === 'fulfilled' ? adRes.value  : [];
  const usajobsJobs      = usRes.status  === 'fulfilled' ? usRes.value  : [];
  const jobicyJobs       = jcRes.status  === 'fulfilled' ? jcRes.value  : [];
  const himalayasJobs    = hmRes.status  === 'fulfilled' ? hmRes.value  : [];
  const arbeitnowJobs    = anRes.status  === 'fulfilled' ? anRes.value  : [];
  const wwrJobs          = wwrRes.status === 'fulfilled' ? wwrRes.value : [];
  const remoteokJobs     = rokRes.status === 'fulfilled' ? rokRes.value : [];
  const workingNomadJobs = wnRes.status  === 'fulfilled' ? wnRes.value  : [];

  if (remRes.status === 'rejected') console.warn(`[aggregators] Remotive: unexpected rejection - ${remRes.reason}`);
  if (adRes.status  === 'rejected') console.warn(`[aggregators] Adzuna: unexpected rejection - ${adRes.reason}`);
  if (usRes.status  === 'rejected') console.warn(`[aggregators] USAJobs: unexpected rejection - ${usRes.reason}`);
  if (jcRes.status  === 'rejected') console.warn(`[aggregators] Jobicy: unexpected rejection - ${jcRes.reason}`);
  if (hmRes.status  === 'rejected') console.warn(`[aggregators] Himalayas: unexpected rejection - ${hmRes.reason}`);
  if (anRes.status  === 'rejected') console.warn(`[aggregators] Arbeitnow: unexpected rejection - ${anRes.reason}`);
  if (wwrRes.status === 'rejected') console.warn(`[aggregators] WeWorkRemotely: unexpected rejection - ${wwrRes.reason}`);
  if (rokRes.status === 'rejected') console.warn(`[aggregators] RemoteOK: unexpected rejection - ${rokRes.reason}`);
  if (wnRes.status  === 'rejected') console.warn(`[aggregators] WorkingNomads: unexpected rejection - ${wnRes.reason}`);

  const all = [
    ...remotiveJobs, ...adzunaJobs, ...usajobsJobs,
    ...jobicyJobs, ...himalayasJobs, ...arbeitnowJobs,
    ...wwrJobs, ...remoteokJobs, ...workingNomadJobs,
  ];

  console.log(
    `[aggregators] Total aggregated: ${all.length} roles` +
    ` (remotive: ${remotiveJobs.length}, adzuna: ${adzunaJobs.length}` +
    `, usajobs: ${usajobsJobs.length}, jobicy: ${jobicyJobs.length}` +
    `, himalayas: ${himalayasJobs.length}, arbeitnow: ${arbeitnowJobs.length}` +
    `, weworkremotely: ${wwrJobs.length}, remoteok: ${remoteokJobs.length}` +
    `, workingnomads: ${workingNomadJobs.length})`
  );

  return all;
}
