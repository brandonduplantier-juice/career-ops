// lib/score.mjs
// Two functions:
//   scoreRole(ai)    -- deterministic scoring from AI classification facts (RETUNE_SPEC_V3)
//   preScoreRole(role) -- heuristic pre-score for shortlist ranking only (unchanged from v2)
//
// scoreRole is the primary export used by lib/aifit.mjs after AI returns structured facts.
// preScoreRole is used by ats_scan.mjs to rank candidates before sending to AI.

// ---------------------------------------------------------------------------
// scoreRole -- exact port of ref/score.mjs
// ---------------------------------------------------------------------------

const CORE_TOOLS = ["SQL", "Python", "R", "Excel", "Power BI", "Tableau", "Looker", "Snowflake"];
const DOMAIN_HIT = new Set(["healthcare", "claims", "bioinformatics", "genomics", "longevity"]);

export function classify(ai) {
  const vetoes = [];
  if (ai.remote_us !== true || ai.work_mode === "hybrid" || ai.work_mode === "onsite") vetoes.push("not fully remote US");
  if (ai.is_analyst_role !== true) vetoes.push("not an analyst role");
  if (typeof ai.max_years_required === "number" && ai.max_years_required > 2) vetoes.push("requires more than 2 years");
  if (ai.degree_hard_required === true) vetoes.push("degree hard-required, no equivalent");
  if (ai.credential_required && String(ai.credential_required).trim() !== "") vetoes.push("requires credential: " + ai.credential_required);
  if (["senior", "lead", "manager"].includes(ai.seniority)) vetoes.push("senior/lead/manager scope");

  let attainability;
  if (vetoes.length > 0) {
    attainability = "low";
  } else {
    const stackOk = Array.isArray(ai.core_stack_matched) && ai.core_stack_matched.length >= 1;
    const yrsOk = !(typeof ai.max_years_required === "number") || ai.max_years_required <= 2;
    if (ai.remote_us === true && ai.entry_level === true && yrsOk && stackOk) {
      attainability = "high";
    } else if (ai.remote_us === true) {
      attainability = "medium";
    } else {
      attainability = "low";
    }
  }
  return { attainability, vetoes };
}

export function fitScore(ai, attainability) {
  let fit = 3.0;
  if (ai.title_match === true) fit += 0.6;
  if (ai.entry_level === true) fit += 0.4;
  const n = Array.isArray(ai.core_stack_matched) ? ai.core_stack_matched.length : 0;
  fit += Math.min(0.8, 0.3 * n);
  if (ai.domain && DOMAIN_HIT.has(ai.domain)) fit += 0.5;
  if (attainability === "high") fit += 0.5;
  fit = Math.min(fit, 5.0);
  if (attainability === "medium") fit = Math.min(fit, 3.9);
  if (attainability === "low") fit = Math.min(fit, 2.5);
  return Math.round(fit * 10) / 10;
}

export function scoreRole(ai) {
  const { attainability, vetoes } = classify(ai);
  const fit = fitScore(ai, attainability);
  const verdict = attainability === "high" ? "apply" : attainability === "medium" ? "consider" : "skip";
  return { attainability, fit, verdict, vetoes };
}

export { CORE_TOOLS };

// ---------------------------------------------------------------------------
// preScoreRole -- heuristic ranking only (v2 logic, renamed from scoreRole)
// Used by ats_scan.mjs to select top-80 shortlist before AI assessment.
// Returns { score: number, reason: string }
// ---------------------------------------------------------------------------

const BASE = 2.5;

const TITLE_MATCH_KW = [
  'data analyst',
  'business analyst',
  'operations analyst',
  'business operations analyst',
  'bi analyst',
  'business intelligence analyst',
  'reporting analyst',
  'analytics analyst',
  'junior analyst',
  'associate analyst',
  'junior data analyst',
  'associate data analyst',
  'healthcare data analyst',
  'health data analyst',
  'healthcare analyst',
  'analyst i',
  'analyst ii'
];

const JD_ENTRY_KW = [
  'entry level',
  'entry-level',
  '0-2 years',
  '0 to 2 years',
  '1-2 years',
  '1 to 2 years',
  'new grad',
  'will train',
  'equivalent experience',
  'no experience required',
  '0+ years',
  'zero to',
  '2 years of experience',
  '1 year of experience',
  'recent graduate',
  'early career'
];

// 8 core tools per spec, cap at +0.8
const CORE_STACK = ['sql', 'python', ' r ', 'excel', 'power bi', 'tableau', 'looker', 'snowflake'];

const DOMAIN_KW = [
  'health',
  'medical',
  'clinical',
  'pharmacy',
  'pharma',
  'biotech',
  'bioinformatics',
  'genomics',
  'longevity',
  'prior auth',
  'prior authorization',
  'wellness',
  'claims'
];

const CONTRACT_KW = ['contract', 'temp ', 'temporary', 'contractor', 'contract-to-hire', 'c2h'];

function parseSize(sizeStr) {
  if (!sizeStr || sizeStr === 'not listed') return null;
  const m = String(sizeStr).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function isRecentPosting(dateStr) {
  if (!dateStr) return false;
  const posted = new Date(dateStr);
  if (isNaN(posted.getTime())) return false;
  const daysDiff = (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
}

export function preScoreRole(role) {
  let score = BASE;
  const factors = [];

  const titleLower = (role._normalized_title || role.title || '').toLowerCase();
  const jdLower = (role.jd_text || '').toLowerCase();
  const companyLower = (role.company || '').toLowerCase();

  // +0.6 title and level match
  if (TITLE_MATCH_KW.some(kw => titleLower.includes(kw))) {
    score += 0.6;
    factors.push('Title match (+0.6)');
  }

  // +0.4 entry-level JD language
  if (JD_ENTRY_KW.some(kw => jdLower.includes(kw))) {
    score += 0.4;
    factors.push('Entry-level JD language (+0.4)');
  }

  // +0.1 per core tool, cap +0.8
  let stackBonus = 0;
  const matchedStack = [];
  for (const kw of CORE_STACK) {
    if (stackBonus >= 0.8) break;
    if (jdLower.includes(kw)) {
      stackBonus = Math.min(stackBonus + 0.1, 0.8);
      matchedStack.push(kw.trim());
    }
  }
  if (stackBonus > 0) {
    score += stackBonus;
    factors.push(`Stack: ${matchedStack.join('/').toUpperCase()} (+${stackBonus.toFixed(1)})`);
  }

  // +0.5 domain match
  const domainMatch = DOMAIN_KW.some(kw => jdLower.includes(kw) || companyLower.includes(kw));
  if (domainMatch) {
    score += 0.5;
    factors.push('Domain match (+0.5)');
  }

  // +0.2 less-competitive signal (first qualifying signal only)
  const size = parseSize(role.employer_size);
  const isSmall = size !== null && size <= 500;
  const isContract = CONTRACT_KW.some(kw => jdLower.includes(kw) || titleLower.includes(kw));
  const isRecent = isRecentPosting(role.published_date);
  if (isSmall || isContract || isRecent) {
    score += 0.2;
    const signal = isSmall ? `small employer ~${size}` : isContract ? 'contract/temp' : 'new posting <7d';
    factors.push(`Less-competitive: ${signal} (+0.2)`);
  }

  // -1.0 degree required without "or equivalent" (pre-score approximation for ranking)
  if (role._degree_penalty) {
    score -= 1.0;
    factors.push('Degree required, no equivalent clause (-1.0)');
  }

  // -2.0 off-target category
  if (role._off_target_category) {
    const labels = {
      'edi-interop': 'EDI/interop specialist',
      'rcm-ops':     'RCM billing/ops',
      'finance-fpa': 'Finance/FP&A',
      'hr-admin':    'HR/benefits admin'
    };
    score -= 2.0;
    factors.push(`${labels[role._off_target_category] || 'Off-target'} (-2.0)`);
  }

  // Cap at 3.4 when remote status cannot be confirmed
  if (role._location_needs_verify && score > 3.4) {
    score = 3.4;
    factors.push('Location unverified - confirm remote (capped 3.4)');
  }

  score = Math.max(0, Math.min(5, score));
  score = Math.round(score * 10) / 10;

  const reason = factors.length > 0 ? factors.join('; ') : 'Base pre-score only';
  return { score, reason };
}
