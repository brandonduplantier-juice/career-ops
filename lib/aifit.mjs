// lib/aifit.mjs - RETUNE_SPEC_V3 classification schema
// AI returns structured classification facts only; lib/score.mjs computes scores.
// Input: shortlisted roles (top-80 by pre-score + overrides).
// Returns array of per-role assessments with computed scores.

import { scoreRole } from './score.mjs';

const MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 45_000;
const CONCURRENCY = 5;
const JD_MAX_CHARS = 8000;
const JD_FETCH_MIN = 300;

// Valid core stack values that AI may return
const VALID_CORE_TOOLS = new Set(["SQL", "Python", "R", "Excel", "Power BI", "Tableau", "Looker", "Snowflake"]);

const SYSTEM_PROMPT = `You are classifying a job posting for a specific candidate. Return strict JSON only - no prose, no markdown fences, nothing before or after the JSON object.

Candidate profile:
- About 2 years practical data-analysis experience (independent, freelance, portfolio projects). No full-time analyst title yet.
- No completed bachelor's degree. Currently a Bioinformatics B.S. student, expected December 2027.
- Skills: Python, SQL, R, Power BI, Tableau, Looker Studio, Snowflake, Excel, Flask, automation.
- Healthcare and prior authorization claims data experience from a freelance project.
- CRISPR lab research background (bioinformatics/genomics).
- No professional certifications (no ABMGG, CPA, RN, PMP, security clearance, or similar credentials).
- Wants: fully remote US, entry-level or junior data, BI, or analyst roles.

Classify the posting and return ONLY these classification facts. Do NOT compute fit scores or verdicts - just report what the posting says.

Field definitions:
- remote_us: true only if the role is explicitly fully remote AND open to US workers (or worldwide). false for hybrid, onsite, or non-US-only remote.
- work_mode: "remote" | "hybrid" | "onsite" | "unclear"
- max_years_required: the minimum years of experience required (as a number). Use 0 if no minimum. Use the lower bound of a range (e.g. "2-4 years" -> 2).
- degree_hard_required: true only if a specific degree is stated as a hard requirement with NO "or equivalent experience" language.
- credential_required: the specific credential or license required (e.g. "CPA", "RN", "PMP", "security clearance"). Empty string if none.
- seniority: "entry" | "junior" | "mid" | "senior" | "lead" | "manager" | "unclear"
- is_analyst_role: true if the role is primarily a data, business, BI, reporting, or analytics analyst role.
- entry_level: true if the posting explicitly signals entry-level or junior (0-2 yrs, new grad, will train, etc.).
- title_match: true if the title matches: Data Analyst, Business Analyst, Operations Analyst, BI Analyst, Reporting Analyst, Analytics Analyst, Business Intelligence Analyst, or junior/associate variants of any of these.
- core_stack_matched: array of tools FROM EXACTLY ["SQL","Python","R","Excel","Power BI","Tableau","Looker","Snowflake"] that appear in the job description. No other values.
- domain: "healthcare" | "claims" | "bioinformatics" | "genomics" | "longevity" | "other" (use the domain where the work actually sits, not just keyword mentions)
- posting_complete: false if the description is truncated or too short to evaluate (under ~200 words or clearly cut off mid-sentence).
- reason: one sentence, 25 words max, no em-dashes, summarizing what makes this role fit or not fit.

Do not use em-dashes anywhere in your output. Use a hyphen instead.`;

function buildPrompt(role) {
  const jd = (role.jd_text || '').slice(0, JD_MAX_CHARS);
  return `Classify this job posting for the candidate described in the system prompt.

Company: ${role.company}
Title: ${role.title}
Location: ${role.location || 'not listed'}

Full job description:
${jd || '(no description available)'}

Return only this JSON object:
{
  "remote_us": boolean,
  "work_mode": "remote" | "hybrid" | "onsite" | "unclear",
  "max_years_required": number,
  "degree_hard_required": boolean,
  "credential_required": string,
  "seniority": "entry" | "junior" | "mid" | "senior" | "lead" | "manager" | "unclear",
  "is_analyst_role": boolean,
  "entry_level": boolean,
  "title_match": boolean,
  "core_stack_matched": [],
  "domain": "healthcare" | "claims" | "bioinformatics" | "genomics" | "longevity" | "other",
  "posting_complete": boolean,
  "reason": "one sentence, 25 words max, no em-dashes"
}`;
}

// Attempt to fetch the job URL to supplement a short JD
async function tryFetchJd(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'career-ops/3.0' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    // Strip HTML tags and decode common entities
    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, JD_MAX_CHARS);
  } catch {
    return null;
  }
}

async function classifyRole(role, apiKey) {
  // If JD text is too short, try to fetch the URL for more content
  let roleToUse = role;
  if ((role.jd_text || '').length < JD_FETCH_MIN && role.url) {
    const fetched = await tryFetchJd(role.url);
    if (fetched && fetched.length > (role.jd_text || '').length) {
      roleToUse = { ...role, jd_text: fetched };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json'
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 500,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildPrompt(roleToUse) }]
      })
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`[aifit] ${role.company}/${role.title}: HTTP ${res.status}${body ? ' - ' + body.slice(0, 80) : ''} - skipping`);
      return null;
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text;

    if (!text) {
      console.log(`[aifit] ${role.company}/${role.title}: empty response - skipping`);
      return null;
    }

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let ai;
    try {
      ai = JSON.parse(cleaned);
    } catch {
      console.log(`[aifit] ${role.company}/${role.title}: JSON parse failed - skipping`);
      console.log(`[aifit] Raw (first 200): ${text.slice(0, 200)}`);
      return null;
    }

    if (!ai || typeof ai !== 'object') return null;

    // Sanitize core_stack_matched to only valid tool names
    const rawStack = Array.isArray(ai.core_stack_matched) ? ai.core_stack_matched : [];
    const coreStack = rawStack.filter(t => VALID_CORE_TOOLS.has(t));

    // Build normalized AI facts object
    const aiFacts = {
      remote_us:            ai.remote_us === true,
      work_mode:            typeof ai.work_mode === 'string' ? ai.work_mode : 'unclear',
      max_years_required:   typeof ai.max_years_required === 'number' ? ai.max_years_required : 0,
      degree_hard_required: ai.degree_hard_required === true,
      credential_required:  typeof ai.credential_required === 'string' ? ai.credential_required : '',
      seniority:            typeof ai.seniority === 'string' ? ai.seniority : 'unclear',
      is_analyst_role:      ai.is_analyst_role === true,
      entry_level:          ai.entry_level === true,
      title_match:          ai.title_match === true,
      core_stack_matched:   coreStack,
      domain:               typeof ai.domain === 'string' ? ai.domain : 'other',
      posting_complete:     ai.posting_complete !== false, // default true
      reason:               typeof ai.reason === 'string'
        ? ai.reason.split('').map(c => { const cc = c.charCodeAt(0); return (cc === 0x2014 || cc === 0x2013) ? '-' : c; }).join('').trim()
        : '',
    };

    // Compute deterministic scores from AI facts
    const { attainability, fit, verdict, vetoes } = scoreRole(aiFacts);

    // Build missing_requirements from vetoes
    const missing = vetoes.length > 0 ? [vetoes[0]] : [];

    return {
      hash:                  role.hash,
      // AI classification facts
      remote_us:             aiFacts.remote_us,
      work_mode:             aiFacts.work_mode,
      max_years_required:    aiFacts.max_years_required,
      degree_hard_required:  aiFacts.degree_hard_required,
      credential_required:   aiFacts.credential_required,
      seniority:             aiFacts.seniority,
      is_analyst_role:       aiFacts.is_analyst_role,
      entry_level:           aiFacts.entry_level,
      title_match:           aiFacts.title_match,
      core_stack_matched:    aiFacts.core_stack_matched,
      domain:                aiFacts.domain,
      posting_complete:      aiFacts.posting_complete,
      reason:                aiFacts.reason,
      // Computed scores
      attainability,
      fit,
      verdict,
      vetoes,
      missing_requirements:  missing,
    };

  } catch (err) {
    clearTimeout(timer);
    const isAbort = err.name === 'AbortError';
    console.log(`[aifit] ${role.company}/${role.title}: ${isAbort ? 'timed out' : err.message} - skipping`);
    return null;
  }
}

export async function reviewShortlist(roles) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[aifit] ANTHROPIC_API_KEY not set - skipping AI fit-check');
    return null;
  }

  if (!roles || roles.length === 0) return null;

  console.log(`[aifit] Classifying: ${roles.length} roles (concurrency ${CONCURRENCY})`);

  const results = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < roles.length; i += CONCURRENCY) {
    const batch = roles.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(r => classifyRole(r, apiKey)));
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value !== null) {
        results.push(s.value);
        success++;
      } else {
        failed++;
      }
    }
  }

  if (results.length === 0) {
    console.log('[aifit] All classifications failed - using pre-scores only');
    return null;
  }

  const skipCount     = results.filter(v => v.verdict === 'skip').length;
  const applyCount    = results.filter(v => v.verdict === 'apply').length;
  const considerCount = results.filter(v => v.verdict === 'consider').length;
  const failedNote    = failed > 0 ? `, ${failed} failed/skipped` : '';
  console.log(`[aifit] ${success}/${roles.length} classified: ${applyCount} apply, ${considerCount} consider, ${skipCount} skip${failedNote}`);
  return results;
}
