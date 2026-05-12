const axios = require('axios');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const RECRUITER_PATTERNS = /recruit|hr|hiring|talent|career|people|job/i;

async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.response?.status === 403) throw err;
      if (err.response?.status === 429 && i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw err;
    }
  }
}

// ─── Hunter: verify a single email address ────────────────────────────────────

async function hunterVerify(hunterKey, email) {
  try {
    const res = await axios.get('https://api.hunter.io/v2/email-verifier', {
      params: { email, api_key: hunterKey },
      timeout: 10000,
    });
    const status = res.data?.data?.status;
    // 'valid' = confirmed deliverable, 'accept_all' = domain accepts all (likely valid)
    return status === 'valid' || status === 'accept_all' ? email : null;
  } catch {
    return null;
  }
}

// ─── Hunter: find email by name + domain ─────────────────────────────────────

async function hunterEmailFinder(hunterKey, domain, firstName, lastName) {
  if (!hunterKey || !domain || !firstName || !lastName) return null;
  try {
    const res = await withRetry(() =>
      axios.get('https://api.hunter.io/v2/email-finder', {
        params: { domain, first_name: firstName, last_name: lastName, api_key: hunterKey },
        timeout: 10000,
      })
    );
    const d = res.data?.data;
    return d?.email && (d?.score ?? 0) >= 50 ? d.email : null;
  } catch {
    return null;
  }
}

// ─── Hunter: domain search — finds any emails at a company ───────────────────

async function hunterDomainSearch(hunterKey, domain) {
  if (!hunterKey || !domain) return null;
  try {
    const res = await withRetry(() =>
      axios.get('https://api.hunter.io/v2/domain-search', {
        params: { domain, api_key: hunterKey, limit: 10 },
        timeout: 10000,
      })
    );
    const emails = res.data?.data?.emails || [];
    if (!emails.length) return null;
    // Prefer recruiting/HR inboxes, else take highest confidence
    const recruiter = emails.find(e => RECRUITER_PATTERNS.test(e.value));
    if (recruiter) return recruiter.value;
    return emails.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]?.value || null;
  } catch {
    return null;
  }
}

// ─── Pattern generation + verification ───────────────────────────────────────
// Generates the most common corporate email formats and verifies each one.

async function guessAndVerify(hunterKey, domain, firstName, lastName) {
  if (!hunterKey || !domain || !firstName) return null;

  const f  = firstName.toLowerCase();
  const l  = lastName?.toLowerCase() || '';
  const fi = f[0] || '';
  const li = l[0] || '';

  // Most common patterns ordered by frequency in corporate email addresses
  const candidates = [
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f}@${domain}`,
    `${fi}${l}@${domain}`,
    `${f}.${li}@${domain}`,
    `${f}-${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${l}${f}@${domain}`,
  ].filter((e, i, arr) => e.includes('@') && arr.indexOf(e) === i); // dedupe

  for (const email of candidates) {
    const verified = await hunterVerify(hunterKey, email);
    if (verified) return verified;
    await sleep(300); // small delay between verifier calls
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function findEmail({ hunterKey, recruiterName, company, companyDomain }) {
  const parts     = (recruiterName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';

  // 1. Hunter email finder — direct name + domain lookup (fewest credits)
  const hunterFound = await hunterEmailFinder(hunterKey, companyDomain, firstName, lastName);
  if (hunterFound) return hunterFound;

  // 2. Pattern generation + Hunter verifier — tries firstname@domain, first.last@domain, etc.
  if (firstName && companyDomain) {
    const guessed = await guessAndVerify(hunterKey, companyDomain, firstName, lastName);
    if (guessed) return guessed;
  }

  // 3. Hunter domain search — finds any HR/recruiting email at the company (no name needed)
  return hunterDomainSearch(hunterKey, companyDomain);
}

function resetFlags() {} // kept for compatibility

module.exports = { findEmail, resetFlags };
