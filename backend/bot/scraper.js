const axios = require('axios');
const cheerio = require('cheerio');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const delay = (lo = 1000, hi = 2500) => sleep(Math.floor(Math.random() * (hi - lo + 1)) + lo);

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

function authHeaders(linkedinCookie) {
  if (!linkedinCookie) return BASE_HEADERS;
  return { ...BASE_HEADERS, Cookie: `li_at=${linkedinCookie.trim()}` };
}

// ─── Guest API: job list (no auth needed) ────────────────────────────────────

async function fetchJobList(keywords, location, start) {
  const params = new URLSearchParams({ keywords, start });
  if (location) params.set('location', location);
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
  const res = await axios.get(url, { headers: BASE_HEADERS, timeout: 15000 });
  return res.data;
}

function parseJobCards(html) {
  const $ = cheerio.load(html);
  const jobs = [];
  $('li').each((_, el) => {
    const urn  = $(el).find('[data-entity-urn]').attr('data-entity-urn') || '';
    const id   = urn.split(':').pop();
    if (!id) return;
    const title   = $(el).find('.base-search-card__title').text().trim();
    const company = $(el).find('.base-search-card__subtitle').text().trim();
    const jobUrl  = $(el).find('a.base-card__full-link').attr('href')?.split('?')[0] || '';
    if (title && company) jobs.push({ id, title, company, jobUrl });
  });
  return jobs;
}

// ─── Authenticated job detail page: gets recruiter name + description ─────────

async function fetchJobDetail(jobId, linkedinCookie) {
  // If we have a cookie, fetch the real job page (has recruiter info)
  // Otherwise fall back to the guest API endpoint
  if (linkedinCookie) {
    const url = `https://www.linkedin.com/jobs/view/${jobId}`;
    const res = await axios.get(url, { headers: authHeaders(linkedinCookie), timeout: 15000 });
    return { html: res.data, authenticated: true };
  }

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
  const res = await axios.get(url, { headers: BASE_HEADERS, timeout: 15000 });
  return { html: res.data, authenticated: false };
}

function parseJobDetail(html, authenticated) {
  const $ = cheerio.load(html);

  // Description
  const description = $('.description__text').text().trim()
    || $('.show-more-less-html__markup').text().trim()
    || $('.jobs-description').text().trim();

  // Company domain from LinkedIn company URL
  const companyHref = $('a[href*="/company/"]').first().attr('href') || '';
  const m = companyHref.match(/\/company\/([^/?]+)/);
  const companyDomain = m ? m[1].toLowerCase() + '.com' : '';

  // Recruiter name — only available on authenticated page
  let recruiterName = '';
  if (authenticated) {
    recruiterName =
      $('.hirer-card__hirer-information a').first().text().trim() ||
      $('.jobs-poster__name').first().text().trim() ||
      $('.message-the-recruiter .artdeco-entity-lockup__title').first().text().trim() ||
      $('.hiring-manager__name').first().text().trim() ||
      $('[data-test-hiring-team-member-name]').first().text().trim() ||
      '';
  }

  return { description, companyDomain, recruiterName };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// Step 1: get the list of job cards (fast, no auth)
async function fetchCards(jobTitle, location, maxResults = 20) {
  const allCards = [];
  let start = 0;

  while (allCards.length < maxResults) {
    try {
      const html  = await fetchJobList(jobTitle, location, start);
      const cards = parseJobCards(html);
      if (!cards.length) break;
      allCards.push(...cards);
      start += 25;
      await delay();
    } catch {
      break;
    }
  }

  return allCards.slice(0, maxResults);
}

// Step 2: get full detail for one card (uses cookie for recruiter name if available)
async function getJobDetail(card, linkedinCookie) {
  try {
    const { html, authenticated } = await fetchJobDetail(card.id, linkedinCookie);
    const detail = parseJobDetail(html, authenticated);
    return {
      title:         card.title,
      company:       card.company,
      jobUrl:        card.jobUrl,
      description:   detail.description,
      companyDomain: detail.companyDomain,
      recruiterName: detail.recruiterName,
    };
  } catch {
    return {
      title: card.title, company: card.company, jobUrl: card.jobUrl,
      description: '', companyDomain: '', recruiterName: '',
    };
  }
}

module.exports = { fetchCards, getJobDetail };
